import { Product, Coupon, Order, User } from "../data/types";

export interface IProductRepository {
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  getBestsellers(): Promise<Product[]>;
  getNewArrivals(): Promise<Product[]>;
  getAdminProducts(): Promise<Product[]>;
  getProductsPage(opts: { limit: number; offset: number; sort?: "popular" | "new" }): Promise<{ products: Product[]; total: number; hasMore: boolean }>;
  updateProduct(product: Product): Promise<Product>;
  createProduct(product: Omit<Product, "id" | "rating" | "reviews">): Promise<Product>;
  uploadImage(file: Blob): Promise<string>;
  deleteImage(key: string): Promise<void>;
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
