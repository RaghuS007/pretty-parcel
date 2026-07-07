import { IProductRepository, ICouponRepository, IOrderRepository, IAuthRepository } from "./types";
import { Product, Coupon, Order, User } from "../data/types";
import { MOCK_PRODUCTS, MOCK_COUPONS } from "../data/mockProducts";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Helper to simulate network latency
const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

export class MockProductRepository implements IProductRepository {
  private OVERLAY_KEY = "@pretty_parcel_products_overlay";

  private async getMergedProducts(): Promise<Product[]> {
    try {
      const json = await AsyncStorage.getItem(this.OVERLAY_KEY);
      if (json) {
        const overlays = JSON.parse(json);
        return MOCK_PRODUCTS.map(p => {
          if (overlays[p.id]) {
            return { ...p, ...overlays[p.id] };
          }
          return p;
        });
      }
    } catch (e) {
      console.error("Failed to load products overlay:", e);
    }
    return [...MOCK_PRODUCTS];
  }

  async getProducts(): Promise<Product[]> {
    await delay();
    return await this.getMergedProducts();
  }

  async getProductById(id: string): Promise<Product | null> {
    await delay();
    const products = await this.getMergedProducts();
    const product = products.find(p => p.id === id);
    return product ? { ...product } : null;
  }

  async getBestsellers(): Promise<Product[]> {
    await delay();
    const products = await this.getMergedProducts();
    return products.filter(p => p.bestseller);
  }

  async getNewArrivals(): Promise<Product[]> {
    await delay();
    const products = await this.getMergedProducts();
    return products.filter(p => p.isNew);
  }

  async updateProduct(product: Product): Promise<Product> {
    await delay();
    try {
      const json = await AsyncStorage.getItem(this.OVERLAY_KEY);
      const overlays = json ? JSON.parse(json) : {};
      overlays[product.id] = {
        name: product.name,
        price: product.price,
        mrp: product.mrp,
        bestseller: product.bestseller,
        isNew: product.isNew,
        tags: product.tags,
        material: product.material,
        collection: product.collection
      };
      await AsyncStorage.setItem(this.OVERLAY_KEY, JSON.stringify(overlays));
    } catch (e) {
      console.error("Failed to save product overlay:", e);
    }
    return product;
  }
}

export class MockCouponRepository implements ICouponRepository {
  private OVERLAY_KEY = "@pretty_parcel_coupons_overlay";

  private async getMergedCoupons(): Promise<Record<string, Coupon & { isActive?: boolean }>> {
    try {
      const json = await AsyncStorage.getItem(this.OVERLAY_KEY);
      const activeMap = json ? JSON.parse(json) : {};
      const result: Record<string, Coupon & { isActive?: boolean }> = {};
      
      for (const code of Object.keys(MOCK_COUPONS)) {
        const mockCoupon = MOCK_COUPONS[code as keyof typeof MOCK_COUPONS];
        result[code] = {
          ...mockCoupon,
          isActive: activeMap[code] !== undefined ? activeMap[code] : true
        };
      }
      return result;
    } catch (e) {
      console.error("Failed to load coupons overlay:", e);
    }

    const result: Record<string, Coupon & { isActive?: boolean }> = {};
    for (const code of Object.keys(MOCK_COUPONS)) {
      result[code] = { ...MOCK_COUPONS[code as keyof typeof MOCK_COUPONS], isActive: true };
    }
    return result;
  }

  async getCoupons(): Promise<Record<string, Coupon & { isActive?: boolean }>> {
    await delay();
    return await this.getMergedCoupons();
  }

  async validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; discount: number; msg: string }> {
    await delay();
    const cleanCode = code.trim().toUpperCase();
    const coupons = await this.getMergedCoupons();
    const coupon = coupons[cleanCode];
    
    if (!coupon) {
      return { valid: false, discount: 0, msg: "Hmm, that code isn't valid" };
    }

    if (coupon.isActive === false) {
      return { valid: false, discount: 0, msg: "This coupon is currently inactive" };
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
    await delay();
    try {
      const json = await AsyncStorage.getItem(this.OVERLAY_KEY);
      const activeMap = json ? JSON.parse(json) : {};
      activeMap[code] = isActive;
      await AsyncStorage.setItem(this.OVERLAY_KEY, JSON.stringify(activeMap));
    } catch (e) {
      console.error("Failed to save coupon active overlay:", e);
    }
  }
}

export class MockOrderRepository implements IOrderRepository {
  private STORAGE_KEY = "@pretty_parcel_orders";

  async getOrders(mobile: string): Promise<Order[]> {
    await delay();
    try {
      const ordersJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (ordersJson) {
        const allOrders: Order[] = JSON.parse(ordersJson);
        return allOrders.filter(o => o.shippingAddress.phone === mobile);
      }
    } catch (e) {
      console.error("Failed to load mock orders:", e);
    }
    return [];
  }

  async createOrder(order: Order): Promise<Order> {
    await delay();
    try {
      const ordersJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      const allOrders: Order[] = ordersJson ? JSON.parse(ordersJson) : [];
      allOrders.unshift(order);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(allOrders));
      return order;
    } catch (e) {
      console.error("Failed to save mock order:", e);
      throw e;
    }
  }

  async getAllOrders(): Promise<Order[]> {
    await delay();
    try {
      const ordersJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      return ordersJson ? JSON.parse(ordersJson) : [];
    } catch (e) {
      console.error("Failed to load all mock orders:", e);
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
    await delay();
    try {
      const ordersJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (ordersJson) {
        const allOrders: Order[] = JSON.parse(ordersJson);
        const updated = allOrders.map(o => o.id === orderId ? { ...o, status } : o);
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Failed to update mock order status:", e);
    }
  }
}

export class MockAuthRepository implements IAuthRepository {
  async sendOtp(mobile: string): Promise<{ success: boolean; msg: string }> {
    await delay();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return { success: false, msg: "Please enter a valid 10-digit mobile number starting with 6-9" };
    }
    return { success: true, msg: "OTP sent successfully! Demo code: 123456" };
  }

  async verifyOtp(mobile: string, code: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> {
    await delay();
    if (code !== "123456") {
      return { success: false, error: "Incorrect OTP code. Try entering 123456" };
    }
    
    const user: User = {
      name: name.trim() || "Lovely Customer",
      mobile,
      role: mobile === "9999999999" ? "admin" : "customer"
    };
    
    return { success: true, user };
  }
}
