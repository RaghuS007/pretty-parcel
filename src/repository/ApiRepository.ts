import { Platform } from "react-native";
import { IProductRepository, ICouponRepository, IOrderRepository, IAuthRepository } from "./types";
import { Product, Coupon, Order, User } from "../data/types";
import { useStore } from "../store/useStore";

const rawUrl = process.env.EXPO_PUBLIC_API_URL || "";
const isDev = __DEV__;

// Guard for localhost in production
const containsLocalhost = rawUrl.toLowerCase().includes("localhost") || rawUrl.includes("127.0.0.1");
const isWebProduction = Platform.OS === "web" && !isDev;

export const API_BASE_URL = containsLocalhost && isWebProduction ? "" : rawUrl;

if (containsLocalhost && isWebProduction) {
  console.warn("EXPO_PUBLIC_API_URL contains localhost in web production. Forcing mock repository mode.");
}

function mapProduct(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    cat: p.cat,
    sub: p.sub,
    price: p.pricePaise / 100,
    mrp: p.mrpPaise / 100,
    material: p.material || "",
    collection: p.collection || "",
    tags: p.tags || [],
    rating: p.rating || 0,
    reviews: p.reviews || 0,
    bestseller: p.bestseller || p.isBestseller || false,
    isNew: p.isNew || false,
    icon: p.icon || "",
    images: p.images || [],
  };
}

export class ApiProductRepository implements IProductRepository {
  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      return (data.products || []).map(mapProduct);
    } catch (e) {
      console.error("Error in getProducts:", e);
      return [];
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Failed to fetch product ${id}`);
      const data = await res.json();
      return data.product ? mapProduct(data.product) : null;
    } catch (e) {
      console.error(`Error in getProductById(${id}):`, e);
      return null;
    }
  }

  async getBestsellers(): Promise<Product[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/products?sort=popular`);
      if (!res.ok) throw new Error("Failed to fetch bestsellers");
      const data = await res.json();
      return (data.products || []).map(mapProduct).filter((p: Product) => p.bestseller);
    } catch (e) {
      console.error("Error in getBestsellers:", e);
      return [];
    }
  }

  async getNewArrivals(): Promise<Product[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/products?sort=new`);
      if (!res.ok) throw new Error("Failed to fetch new arrivals");
      const data = await res.json();
      return (data.products || []).map(mapProduct).filter((p: Product) => p.isNew);
    } catch (e) {
      console.error("Error in getNewArrivals:", e);
      return [];
    }
  }

  async updateProduct(product: Product): Promise<Product> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/products`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          pricePaise: Math.round(product.price * 100),
          mrpPaise: Math.round(product.mrp * 100),
          bestseller: product.bestseller,
          isNew: product.isNew,
          tags: product.tags,
          material: product.material,
          collection: product.collection
        })
      });
      if (!res.ok) throw new Error("Failed to update product");
      return product;
    } catch (e) {
      console.error("Error in updateProduct:", e);
      throw e;
    }
  }
}

export class ApiCouponRepository implements ICouponRepository {
  async getCoupons(): Promise<Record<string, Coupon & { isActive?: boolean }>> {
    // Note: When calling backend, coupons status would normally be loaded from server.
    // For local stub fallback:
    return {
      NEEMS10: { type: "pct", value: 10, label: "10% off", isActive: true },
      PARCEL200: { type: "flat", value: 200, min: 1499, label: "₹200 off on ₹1,499+", isActive: true }
    };
  }

  async validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; discount: number; msg: string }> {
    const cleanCode = code.trim().toUpperCase();
    const coupons: Record<string, { type: "pct" | "flat"; value: number; min?: number; label: string }> = {
      NEEMS10: { type: "pct", value: 10, label: "10% off" },
      PARCEL200: { type: "flat", value: 200, min: 1499, label: "₹200 off on ₹1,499+" }
    };
    
    const coupon = coupons[cleanCode as keyof typeof coupons];
    if (!coupon) {
      return { valid: false, discount: 0, msg: "Hmm, that code isn't valid" };
    }
    
    if (coupon.min && subtotal < coupon.min) {
      return {
        valid: false,
        discount: 0,
        msg: `${cleanCode} needs a minimum order of ₹${coupon.min.toLocaleString("en-IN")}`,
      };
    }
    
    const discount = coupon.type === "pct" 
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;
      
    return {
      valid: true,
      discount,
      msg: `${cleanCode} applied — ${coupon.label} ✓`,
    };
  }

  async updateCouponActive(code: string, isActive: boolean): Promise<void> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/coupons/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, isActive })
      });
      if (!res.ok) throw new Error("Failed to update coupon status");
    } catch (e) {
      console.error("Error in updateCouponActive:", e);
      throw e;
    }
  }
}

export class ApiOrderRepository implements IOrderRepository {
  async getOrders(mobile: string): Promise<Order[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      return (data.orders || []).map((o: any) => ({
        id: o.orderNumber,
        date: new Date(o.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }),
        items: (o.items || []).map((i: any) => ({
          id: i.id,
          qty: i.qty,
          price: i.unitPricePaise / 100
        })),
        itemCount: (o.items || []).reduce((acc: number, item: any) => acc + item.qty, 0),
        total: o.totalPaise / 100,
        discount: o.discountPaise / 100,
        shippingCost: o.shippingPaise / 100,
        shippingAddress: o.shippingAddress || {
          id: "addr_1",
          label: "Home",
          name: "Customer",
          line: "Main St",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          phone: mobile,
          isDefault: true
        },
        paymentMethod: o.paymentMethod || "cod",
        status: o.status
      }));
    } catch (e) {
      console.error("Error in getOrders:", e);
      return [];
    }
  }

  async createOrder(order: Order): Promise<Order> {
    try {
      const appliedCoupon = useStore.getState().appliedCoupon;
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: order.items.map(i => ({ id: i.id, qty: i.qty })),
          couponCode: appliedCoupon,
          shippingAddress: order.shippingAddress,
          paymentMethod: order.paymentMethod
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to place order");
      }
      const data = await res.json();
      const o = data.order;
      return {
        id: o.orderNumber,
        date: new Date(o.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }),
        items: (o.items || []).map((i: any) => ({
          id: i.id,
          qty: i.qty,
          price: i.unitPricePaise / 100
        })),
        itemCount: (o.items || []).reduce((acc: number, item: any) => acc + item.qty, 0),
        total: o.totalPaise / 100,
        discount: o.discountPaise / 100,
        shippingCost: o.shippingPaise / 100,
        shippingAddress: o.shippingAddress || order.shippingAddress,
        paymentMethod: o.paymentMethod || order.paymentMethod,
        status: o.status
      };
    } catch (e) {
      console.error("Error in createOrder:", e);
      throw e;
    }
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch all orders");
      const data = await res.json();
      return (data.orders || []).map((o: any) => ({
        id: o.orderNumber,
        date: new Date(o.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }),
        items: (o.items || []).map((i: any) => ({
          id: i.id,
          qty: i.qty,
          price: i.unitPricePaise / 100
        })),
        itemCount: (o.items || []).reduce((acc: number, item: any) => acc + item.qty, 0),
        total: o.totalPaise / 100,
        discount: o.discountPaise / 100,
        shippingCost: o.shippingPaise / 100,
        shippingAddress: o.shippingAddress || {
          id: "addr_1",
          label: "Home",
          name: "Customer",
          line: "Main St",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          phone: o.mobile,
          isDefault: true
        },
        paymentMethod: o.paymentMethod || "cod",
        status: o.status
      }));
    } catch (e) {
      console.error("Error in getAllOrders:", e);
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/orders/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderId, status })
      });
      if (!res.ok) throw new Error("Failed to update order status");
    } catch (e) {
      console.error("Error in updateOrderStatus:", e);
      throw e;
    }
  }
}

export class ApiAuthRepository implements IAuthRepository {
  async sendOtp(mobile: string): Promise<{ success: boolean; msg: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, msg: data.error || "Failed to send OTP" };
      }
      return {
        success: true,
        msg: data.devOtp ? `OTP sent successfully! Demo code: ${data.devOtp}` : "OTP sent successfully!"
      };
    } catch (e) {
      console.error("Error in sendOtp:", e);
      return { success: false, msg: "Failed to connect to authentication server" };
    }
  }

  async verifyOtp(mobile: string, code: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const guestViews = useStore.getState().recentlyViewed;
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp: code, name, guestViews })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Incorrect OTP code. Try entering 123456" };
      }
      return {
        success: true,
        user: {
          name: data.user.name,
          mobile: data.user.mobile,
          role: data.user.role || (data.user.mobile === "9999999999" ? "admin" : "customer")
        }
      };
    } catch (e) {
      console.error("Error in verifyOtp:", e);
      return { success: false, error: "Authentication connection error" };
    }
  }
}
