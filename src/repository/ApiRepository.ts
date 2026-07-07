import { IProductRepository, ICouponRepository, IOrderRepository, IAuthRepository } from "./types";
import { Product, Coupon, Order, User } from "../data/types";

/**
 * Configure your live API endpoint URL here.
 * Ready for Next.js production backend connection.
 */
export const API_BASE_URL = "https://pretty-parcel-next.raghu007-java.workers.dev/api";

export class ApiProductRepository implements IProductRepository {
  async getProducts(): Promise<Product[]> {
    throw new Error("ApiProductRepository.getProducts() is not implemented yet. Configure API_BASE_URL.");
  }

  async getProductById(id: string): Promise<Product | null> {
    throw new Error(`ApiProductRepository.getProductById(${id}) is not implemented yet. Configure API_BASE_URL.`);
  }

  async getBestsellers(): Promise<Product[]> {
    throw new Error("ApiProductRepository.getBestsellers() is not implemented yet. Configure API_BASE_URL.");
  }

  async getNewArrivals(): Promise<Product[]> {
    throw new Error("ApiProductRepository.getNewArrivals() is not implemented yet. Configure API_BASE_URL.");
  }
}

export class ApiCouponRepository implements ICouponRepository {
  async getCoupons(): Promise<Record<string, Coupon>> {
    throw new Error("ApiCouponRepository.getCoupons() is not implemented yet. Configure API_BASE_URL.");
  }

  async validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; discount: number; msg: string }> {
    throw new Error(`ApiCouponRepository.validateCoupon(${code}) is not implemented yet. Configure API_BASE_URL.`);
  }
}

export class ApiOrderRepository implements IOrderRepository {
  async getOrders(mobile: string): Promise<Order[]> {
    throw new Error(`ApiOrderRepository.getOrders(${mobile}) is not implemented yet. Configure API_BASE_URL.`);
  }

  async createOrder(order: Order): Promise<Order> {
    throw new Error("ApiOrderRepository.createOrder() is not implemented yet. Configure API_BASE_URL.");
  }
}

export class ApiAuthRepository implements IAuthRepository {
  async sendOtp(mobile: string): Promise<{ success: boolean; msg: string }> {
    throw new Error(`ApiAuthRepository.sendOtp(${mobile}) is not implemented yet. Configure API_BASE_URL.`);
  }

  async verifyOtp(mobile: string, code: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> {
    throw new Error(`ApiAuthRepository.verifyOtp(${mobile}) is not implemented yet. Configure API_BASE_URL.`);
  }
}
