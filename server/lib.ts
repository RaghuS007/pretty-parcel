// Shared helpers for the Pretty Parcel API worker: env typing, JSON/CORS
// responses, session auth, and row → API-shape serializers.

export interface Env {
  DB: D1Database;
  /** Comma-separated mobile numbers granted the admin role at login. */
  ADMIN_MOBILES: string;
  /** "true" (default) returns the generated OTP in the send-otp response — no SMS provider is wired up. */
  OTP_DEV_MODE?: string;
}

export const SESSION_COOKIE = "pp_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_RESEND_COOLDOWN_SECONDS = 30;
export const OTP_MAX_ATTEMPTS = 5;

// Mirrors THEME.layout in src/constants/theme.ts — keep in sync.
export const SHIPPING_THRESHOLD_PAISE = 999 * 100;
export const SHIPPING_COST_PAISE = 79 * 100;

export const MOBILE_RE = /^[6-9]\d{9}$/;

// ---------- responses ----------

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  if (!origin) return {};
  // Assets and API share an origin in production; CORS only matters for
  // local dev (Expo :8081 → worker :8787). Credentials require an exact origin echo.
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req), ...extraHeaders },
  });
}

export function errorJson(req: Request, msg: string, status: number): Response {
  return json(req, { error: msg }, status);
}

export async function readBody(req: Request): Promise<Record<string, any> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, any>) : null;
  } catch {
    return null;
  }
}

// ---------- crypto / sessions ----------

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomOtp(): string {
  // 6 digits, uniform, crypto-backed
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

export function sessionCookie(token: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export interface SessionUser {
  mobile: string;
  name: string;
  role: "customer" | "admin";
}

export async function getSessionUser(req: Request, env: Env): Promise<SessionUser | null> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT u.mobile, u.name, u.role FROM sessions s JOIN users u ON u.mobile = s.mobile
     WHERE s.token_hash = ? AND s.expires_at > unixepoch()`
  ).bind(tokenHash).first<SessionUser>();
  return row ?? null;
}

export function isAdminMobile(env: Env, mobile: string): boolean {
  return env.ADMIN_MOBILES.split(",").map((m) => m.trim()).filter(Boolean).includes(mobile);
}

// ---------- serializers (DB row → API JSON shape expected by src/repository/ApiRepository.ts) ----------

export interface ProductRow {
  id: string;
  name: string;
  cat: string;
  sub: string;
  price_paise: number;
  mrp_paise: number;
  material: string;
  collection: string;
  tags: string;
  rating: number;
  reviews: number;
  bestseller: number;
  is_new: number;
  icon: string;
  images: string;
  is_active: number;
}

export function serializeProduct(row: ProductRow) {
  return {
    id: row.id,
    name: row.name,
    cat: row.cat,
    sub: row.sub,
    pricePaise: row.price_paise,
    mrpPaise: row.mrp_paise,
    material: row.material,
    collection: row.collection,
    tags: JSON.parse(row.tags),
    rating: row.rating,
    reviews: row.reviews,
    bestseller: !!row.bestseller,
    isNew: !!row.is_new,
    icon: row.icon,
    images: JSON.parse(row.images),
    isActive: !!row.is_active,
  };
}

export interface OrderRow {
  id: string;
  order_number: string;
  mobile: string;
  subtotal_paise: number;
  discount_paise: number;
  shipping_paise: number;
  total_paise: number;
  coupon_code: string | null;
  payment_method: string;
  status: string;
  shipping_address: string;
  created_at: number;
}

export interface OrderItemRow {
  order_id: string;
  product_id: string;
  qty: number;
  unit_price_paise: number;
}

export function serializeOrder(row: OrderRow, items: OrderItemRow[]) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    mobile: row.mobile,
    items: items.map((i) => ({ id: i.product_id, qty: i.qty, unitPricePaise: i.unit_price_paise })),
    subtotalPaise: row.subtotal_paise,
    discountPaise: row.discount_paise,
    shippingPaise: row.shipping_paise,
    totalPaise: row.total_paise,
    couponCode: row.coupon_code,
    paymentMethod: row.payment_method,
    status: row.status,
    shippingAddress: JSON.parse(row.shipping_address),
    createdAt: new Date(row.created_at * 1000).toISOString(),
  };
}

export interface CouponRow {
  code: string;
  type: "pct" | "flat";
  value: number;
  min_rupees: number | null;
  label: string;
  is_active: number;
}

export function serializeCoupon(row: CouponRow) {
  return {
    type: row.type,
    value: row.value,
    min: row.min_rupees ?? undefined,
    label: row.label,
    isActive: !!row.is_active,
  };
}

/**
 * Coupon math on a whole-rupee subtotal; matches the client-side rounding in
 * MockCouponRepository so displayed and charged totals never diverge.
 */
export function couponDiscountRupees(coupon: CouponRow, subtotalRupees: number): { valid: boolean; discount: number; msg: string } {
  if (!coupon.is_active) {
    return { valid: false, discount: 0, msg: "This coupon is currently inactive" };
  }
  if (coupon.min_rupees && subtotalRupees < coupon.min_rupees) {
    return {
      valid: false,
      discount: 0,
      msg: `${coupon.code} needs a minimum order of ₹${coupon.min_rupees.toLocaleString("en-IN")}`,
    };
  }
  const discount = coupon.type === "pct" ? Math.round((subtotalRupees * coupon.value) / 100) : coupon.value;
  return { valid: true, discount, msg: `${coupon.code} applied — ${coupon.label} ✓` };
}
