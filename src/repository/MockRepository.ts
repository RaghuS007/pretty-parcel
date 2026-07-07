import { IProductRepository, ICouponRepository, IOrderRepository, IAuthRepository } from "./types";
import { Product, Coupon, Order, User } from "../data/types";
import { MOCK_PRODUCTS, MOCK_COUPONS } from "../data/mockProducts";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Helper to simulate network latency
const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

export class MockProductRepository implements IProductRepository {
  async getProducts(): Promise<Product[]> {
    await delay();
    return [...MOCK_PRODUCTS];
  }

  async getProductById(id: string): Promise<Product | null> {
    await delay();
    const product = MOCK_PRODUCTS.find(p => p.id === id);
    return product ? { ...product } : null;
  }

  async getBestsellers(): Promise<Product[]> {
    await delay();
    return MOCK_PRODUCTS.filter(p => p.bestseller);
  }

  async getNewArrivals(): Promise<Product[]> {
    await delay();
    return MOCK_PRODUCTS.filter(p => p.isNew);
  }
}

export class MockCouponRepository implements ICouponRepository {
  async getCoupons(): Promise<Record<string, Coupon>> {
    await delay();
    return { ...MOCK_COUPONS };
  }

  async validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; discount: number; msg: string }> {
    await delay();
    const cleanCode = code.trim().toUpperCase();
    const coupon = MOCK_COUPONS[cleanCode];
    
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
}

export class MockOrderRepository implements IOrderRepository {
  private STORAGE_KEY = "@pretty_parcel_orders";

  async getOrders(mobile: string): Promise<Order[]> {
    await delay();
    try {
      const ordersJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (ordersJson) {
        const allOrders: Order[] = JSON.parse(ordersJson);
        // Filter by user's mobile number
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
    };
    
    return { success: true, user };
  }
}
