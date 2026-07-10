import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, Order } from "../data/types";

export interface ToastMessage {
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

interface CartState {
  cart: Record<string, number>; // Maps productId -> quantity
  addToCart: (productId: string, qty?: number) => void;
  changeCartQty: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

interface WishlistState {
  wishlist: string[]; // List of product IDs
  toggleWishlist: (productId: string) => void;
  clearWishlist: () => void;
}

interface RecentlyViewedState {
  recentlyViewed: string[]; // List of product IDs (capped at 20, FIFO)
  addViewedProduct: (productId: string) => void;
  clearViewed: () => void;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logoutUser: () => void;
}

interface OrdersState {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
}

interface CouponState {
  appliedCoupon: string | null;
  setAppliedCoupon: (code: string | null) => void;
}

interface ToastState {
  toast: ToastMessage | null;
  showToast: (toast: ToastMessage | null) => void;
}

interface AppState {
  initialLoaded: boolean;
  setInitialLoaded: (loaded: boolean) => void;
}

type StoreState = CartState &
  WishlistState &
  RecentlyViewedState &
  AuthState &
  OrdersState &
  CouponState &
  ToastState &
  AppState;

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // --- Cart ---
      cart: {},
      addToCart: (productId, qty = 1) =>
        set((state) => {
          const currentQty = state.cart[productId] || 0;
          return {
            cart: {
              ...state.cart,
              [productId]: currentQty + qty,
            },
          };
        }),
      changeCartQty: (productId, delta) =>
        set((state) => {
          const currentQty = state.cart[productId] || 0;
          const newQty = currentQty + delta;
          if (newQty <= 0) {
            const newCart = { ...state.cart };
            delete newCart[productId];
            return { cart: newCart };
          }
          return {
            cart: {
              ...state.cart,
              [productId]: newQty,
            },
          };
        }),
      removeFromCart: (productId) =>
        set((state) => {
          const newCart = { ...state.cart };
          delete newCart[productId];
          return { cart: newCart };
        }),
      clearCart: () => set({ cart: {} }),

      // --- Wishlist ---
      wishlist: [],
      toggleWishlist: (productId) =>
        set((state) => {
          const isInWishlist = state.wishlist.includes(productId);
          return {
            wishlist: isInWishlist
              ? state.wishlist.filter((id) => id !== productId)
              : [...state.wishlist, productId],
          };
        }),
      clearWishlist: () => set({ wishlist: [] }),

      // --- Recently Viewed (FIFO, Max 20) ---
      recentlyViewed: [],
      addViewedProduct: (productId) =>
        set((state) => {
          const filtered = state.recentlyViewed.filter((id) => id !== productId);
          const updated = [productId, ...filtered];
          // Limit to max 20 items
          if (updated.length > 20) {
            updated.pop();
          }
          return { recentlyViewed: updated };
        }),
      clearViewed: () => set({ recentlyViewed: [] }),

      // --- Authentication ---
      user: null,
      setUser: (user) => set({ user }),
      logoutUser: () => set({ user: null, orders: [] }), // Wipe orders when logging out

      // --- Orders ---
      orders: [],
      setOrders: (orders) => set({ orders }),
      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),

      // --- Coupon ---
      appliedCoupon: null,
      setAppliedCoupon: (code) => set({ appliedCoupon: code }),

      // --- Toast (Not persisted) ---
      toast: null,
      showToast: (toast) => set({ toast }),

      // --- App State (Not persisted) ---
      initialLoaded: false,
      setInitialLoaded: (loaded) => set({ initialLoaded: loaded }),
    }),
    {
      name: "pretty-parcel-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        // Exclude toast and initialLoaded from persistence storage to avoid popups on app launch
        const { toast, initialLoaded, ...rest } = state;
        return rest;
      },
    }
  )
);
