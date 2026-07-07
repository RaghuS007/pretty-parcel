import { Product, Coupon, Order, User } from "../data/types";

export interface IProductRepository {
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  getBestsellers(): Promise<Product[]>;
  getNewArrivals(): Promise<Product[]>;
}

export interface ICouponRepository {
  getCoupons(): Promise<Record<string, Coupon>>;
  validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; discount: number; msg: string }>;
}

export interface IOrderRepository {
  getOrders(mobile: string): Promise<Order[]>;
  createOrder(order: Order): Promise<Order>;
}

export interface IAuthRepository {
  sendOtp(mobile: string): Promise<{ success: boolean; msg: string }>;
  verifyOtp(mobile: string, code: string, name: string): Promise<{ success: boolean; user?: User; error?: string }>;
}
