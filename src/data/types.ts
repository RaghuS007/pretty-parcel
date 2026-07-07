/**
 * Core Data Type Definitions for The Pretty Parcel App.
 */

export interface Product {
  id: string;
  name: string;
  cat: "demi-fine" | "oxidised" | "hair";
  sub: string;
  price: number; // In Rupees (e.g. 1499)
  mrp: number;   // Original/Max retail price
  material: string;
  collection: string;
  tags: string[];
  rating: number;
  reviews: number;
  bestseller: boolean;
  isNew: boolean;
  icon: string;  // Leftover from HTML SVG mappings
  images: string[]; // Renders remote URLs, falls back to local SVG components
}

export interface Review {
  name: string;
  text: string;
  rating: number;
  date: string;
}

export interface User {
  name: string;
  mobile: string;
  email?: string;
  role: "customer" | "admin";
}

export interface Address {
  id: string;
  label: string; // e.g. "Home", "Work"
  name: string;
  line: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  qty: number;
  price: number; // Captured price at checkout
}

export interface Order {
  id: string;
  date: string; // Formatting localized to en-IN
  items: OrderItem[];
  itemCount: number;
  total: number;        // In Rupees
  discount: number;     // Coupon discount value in Rupees
  shippingCost: number; // Shipping charge in Rupees
  shippingAddress: Address;
  paymentMethod: "cod" | "upi" | "card";
  status: "processing" | "shipped" | "delivered" | "cancelled";
}

export interface Coupon {
  type: "pct" | "flat";
  value: number; // percentage value or flat Rupees discount
  min?: number;  // minimum order threshold
  label: string;
}
