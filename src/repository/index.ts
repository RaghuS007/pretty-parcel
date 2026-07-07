import { MockProductRepository, MockCouponRepository, MockOrderRepository, MockAuthRepository } from "./MockRepository";
import { ApiProductRepository, ApiCouponRepository, ApiOrderRepository, ApiAuthRepository } from "./ApiRepository";
import { IProductRepository, ICouponRepository, IOrderRepository, IAuthRepository } from "./types";
import { API_BASE_URL } from "./ApiRepository";

/**
 * Toggle backend mode dynamically depending on environment configuration.
 * Evaluates to true if API_BASE_URL is non-empty (and not filtered by localhost guard).
 */
export const USE_LIVE_API = !!API_BASE_URL;

export const ProductRepository: IProductRepository = USE_LIVE_API
  ? new ApiProductRepository()
  : new MockProductRepository();

export const CouponRepository: ICouponRepository = USE_LIVE_API
  ? new ApiCouponRepository()
  : new MockCouponRepository();

export const OrderRepository: IOrderRepository = USE_LIVE_API
  ? new ApiOrderRepository()
  : new MockOrderRepository();

export const AuthRepository: IAuthRepository = USE_LIVE_API
  ? new ApiAuthRepository()
  : new MockAuthRepository();
