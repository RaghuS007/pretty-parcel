import { Product, Coupon, Order, User } from "../data/types";

export interface IProductRepository {
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  getBestsellers(): Promise<Product[]>;
  getNewArrivals(): Promise<Product[]>;
  getAdminProducts(): Promise<Product[]>;
  updateProduct(product: Product): Promise<Product>;
}

export interface ICouponRepository {
  getCoupons(): Promise<Record<string, Coupon & { isActive?: boolean }>>;
  validateCoupon(code: string, subtotal: number): Promise<{ valid: boolean; discount: number; msg: string }>;
  updateCouponActive(code: string, isActive: boolean): Promise<void>;
}

export interface IOrderRepository {
  getOrders(mobile: string): Promise<Order[]>;
  createOrder(order: Order): Promise<Order>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: Order["status"]): Promise<void>;
}

export interface IAuthRepository {
  sendOtp(mobile: string): Promise<{ success: boolean; msg: string }>;
  verifyOtp(mobile: string, code: string, name: string): Promise<{ success: boolean; user?: User; error?: string }>;
}
