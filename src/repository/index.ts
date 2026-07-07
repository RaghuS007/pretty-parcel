import { MockProductRepository, MockCouponRepository, MockOrderRepository, MockAuthRepository } from "./MockRepository";
import { ApiProductRepository, ApiCouponRepository, ApiOrderRepository, ApiAuthRepository } from "./ApiRepository";
import { IProductRepository, ICouponRepository, IOrderRepository, IAuthRepository } from "./types";

/**
 * TOGGLE THIS FLAG TO SWITCH THE ENTIRE APP BACKEND:
 * - false: Runs locally using client-side mock data (MOCK_PRODUCTS).
 * - true: Runs against Next.js production backend API (pointing to API_BASE_URL).
 */
const USE_LIVE_API = false;

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
