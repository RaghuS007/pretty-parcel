// Pretty Parcel API — Cloudflare Worker + D1.
// Serves /api/* ; all other paths fall through to the static Expo web assets
// configured in wrangler.toml. Response shapes match src/repository/ApiRepository.ts.

import {
  Env,
  SessionUser,
  SESSION_TTL_SECONDS,
  OTP_TTL_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_ATTEMPTS,
  SHIPPING_THRESHOLD_PAISE,
  SHIPPING_COST_PAISE,
  MOBILE_RE,
  corsHeaders,
  json,
  errorJson,
  readBody,
  sha256Hex,
  randomToken,
  randomOtp,
  sessionCookie,
  getCookie,
  getSessionUser,
  isAdminMobile,
  ProductRow,
  serializeProduct,
  OrderRow,
  OrderItemRow,
  serializeOrder,
  CouponRow,
  serializeCoupon,
  couponDiscountRupees,
  SESSION_COOKIE,
} from "./lib";

const ORDER_STATUSES = ["processing", "shipped", "delivered", "cancelled"] as const;
const PAYMENT_METHODS = ["cod", "upi", "card"] as const;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (!path.startsWith("/api/")) {
      // Assets are served by the platform; reaching here means no asset matched.
      return errorJson(req, "Not found", 404);
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    const route = `${req.method} ${path.slice(4)}`; // strip "/api"

    try {
      switch (route) {
        // --- public catalog ---
        case "GET /products":
          return await listProducts(req, env, url);
        case "GET /coupons":
          return await listCoupons(req, env);
        case "POST /coupons/validate":
          return await validateCoupon(req, env);

        // --- auth ---
        case "POST /auth/send-otp":
          return await sendOtp(req, env);
        case "POST /auth/verify-otp":
          return await verifyOtp(req, env);
        case "POST /auth/logout":
          return await logout(req, env);
        case "GET /auth/me":
          return await me(req, env);

        // --- customer orders ---
        case "GET /orders":
          return await withUser(req, env, listMyOrders);
        case "POST /orders":
          return await withUser(req, env, createOrder);

        // --- admin ---
        case "GET /admin/orders":
          return await withAdmin(req, env, listAllOrders);
        case "POST /admin/orders/status":
          return await withAdmin(req, env, updateOrderStatus);
        case "GET /admin/products":
          return await withAdmin(req, env, listAllProducts);
        case "PUT /admin/products":
          return await withAdmin(req, env, updateProduct);
        case "POST /admin/coupons/active":
          return await withAdmin(req, env, updateCouponActive);
      }

      // GET /products/:id
      const productMatch = path.match(/^\/api\/products\/([\w-]+)$/);
      if (productMatch && req.method === "GET") {
        return await getProduct(req, env, productMatch[1]);
      }

      return errorJson(req, "Not found", 404);
    } catch (e) {
      console.error(`Unhandled error on ${route}:`, e);
      return errorJson(req, "Internal server error", 500);
    }
  },
} satisfies ExportedHandler<Env>;

type AuthedHandler = (req: Request, env: Env, user: SessionUser) => Promise<Response>;

async function withUser(req: Request, env: Env, handler: AuthedHandler): Promise<Response> {
  const user = await getSessionUser(req, env);
  if (!user) return errorJson(req, "Not signed in", 401);
  return handler(req, env, user);
}

async function withAdmin(req: Request, env: Env, handler: AuthedHandler): Promise<Response> {
  const user = await getSessionUser(req, env);
  if (!user) return errorJson(req, "Not signed in", 401);
  if (user.role !== "admin") return errorJson(req, "Admin access required", 403);
  return handler(req, env, user);
}

// ---------- catalog ----------

async function listProducts(req: Request, env: Env, url: URL): Promise<Response> {
  const sort = url.searchParams.get("sort");
  const orderBy =
    sort === "popular" ? "ORDER BY bestseller DESC, rating * reviews DESC"
    : sort === "new" ? "ORDER BY is_new DESC, updated_at DESC"
    : "ORDER BY id";
  const { results } = await env.DB.prepare(`SELECT * FROM products WHERE is_active = 1 ${orderBy}`).all<ProductRow>();
  return json(req, { products: results.map(serializeProduct) });
}

async function getProduct(req: Request, env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first<ProductRow>();
  if (!row || !row.is_active) return errorJson(req, "Product not found", 404);
  return json(req, { product: serializeProduct(row) });
}

async function listAllProducts(req: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM products ORDER BY id").all<ProductRow>();
  return json(req, { products: results.map(serializeProduct) });
}

async function updateProduct(req: Request, env: Env): Promise<Response> {
  const body = await readBody(req);
  if (!body?.id) return errorJson(req, "Product id is required", 400);

  const existing = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(body.id).first<ProductRow>();
  if (!existing) return errorJson(req, "Product not found", 404);

  const pricePaise = Number.isFinite(body.pricePaise) ? Math.round(body.pricePaise) : existing.price_paise;
  const mrpPaise = Number.isFinite(body.mrpPaise) ? Math.round(body.mrpPaise) : existing.mrp_paise;
  if (pricePaise <= 0 || mrpPaise <= 0) return errorJson(req, "Prices must be positive", 400);

  await env.DB.prepare(
    `UPDATE products SET name = ?, price_paise = ?, mrp_paise = ?, bestseller = ?, is_new = ?,
       tags = ?, material = ?, collection = ?, images = ?, is_active = ?, updated_at = unixepoch()
     WHERE id = ?`
  ).bind(
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : existing.name,
    pricePaise,
    mrpPaise,
    body.bestseller !== undefined ? (body.bestseller ? 1 : 0) : existing.bestseller,
    body.isNew !== undefined ? (body.isNew ? 1 : 0) : existing.is_new,
    Array.isArray(body.tags) ? JSON.stringify(body.tags) : existing.tags,
    typeof body.material === "string" ? body.material : existing.material,
    typeof body.collection === "string" ? body.collection : existing.collection,
    Array.isArray(body.images) ? JSON.stringify(body.images) : existing.images,
    typeof body.isActive === "boolean" ? (body.isActive ? 1 : 0) : existing.is_active,
    body.id
  ).run();

  const updated = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(body.id).first<ProductRow>();
  return json(req, { product: serializeProduct(updated!) });
}

// ---------- coupons ----------

async function listCoupons(req: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM coupons ORDER BY code").all<CouponRow>();
  const coupons: Record<string, ReturnType<typeof serializeCoupon>> = {};
  for (const row of results) coupons[row.code] = serializeCoupon(row);
  return json(req, { coupons });
}

async function validateCoupon(req: Request, env: Env): Promise<Response> {
  const body = await readBody(req);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const subtotal = Number(body?.subtotal);
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
    return errorJson(req, "code and subtotal are required", 400);
  }
  const row = await env.DB.prepare("SELECT * FROM coupons WHERE code = ?").bind(code).first<CouponRow>();
  if (!row) return json(req, { valid: false, discount: 0, msg: "Hmm, that code isn't valid" });
  return json(req, couponDiscountRupees(row, subtotal));
}

async function updateCouponActive(req: Request, env: Env): Promise<Response> {
  const body = await readBody(req);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code || typeof body?.isActive !== "boolean") {
    return errorJson(req, "code and isActive are required", 400);
  }
  const result = await env.DB.prepare("UPDATE coupons SET is_active = ? WHERE code = ?")
    .bind(body.isActive ? 1 : 0, code).run();
  if (!result.meta.changes) return errorJson(req, "Coupon not found", 404);
  return json(req, { ok: true });
}

// ---------- auth ----------

async function sendOtp(req: Request, env: Env): Promise<Response> {
  const body = await readBody(req);
  const mobile = typeof body?.mobile === "string" ? body.mobile.trim() : "";
  if (!MOBILE_RE.test(mobile)) {
    return errorJson(req, "Please enter a valid 10-digit mobile number starting with 6-9", 400);
  }

  const existing = await env.DB.prepare("SELECT last_sent_at FROM otp_codes WHERE mobile = ?")
    .bind(mobile).first<{ last_sent_at: number }>();
  const now = Math.floor(Date.now() / 1000);
  if (existing && now - existing.last_sent_at < OTP_RESEND_COOLDOWN_SECONDS) {
    return errorJson(req, "Please wait a moment before requesting another OTP", 429);
  }

  const code = randomOtp();
  await env.DB.prepare(
    `INSERT INTO otp_codes (mobile, code, expires_at, attempts, last_sent_at)
     VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(mobile) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at,
       attempts = 0, last_sent_at = excluded.last_sent_at`
  ).bind(mobile, await sha256Hex(code), now + OTP_TTL_SECONDS, now).run();

  // No SMS provider integrated yet. In dev mode the OTP is returned in the
  // response so the flow is fully testable; wire an SMS gateway here for production.
  const devMode = env.OTP_DEV_MODE !== "false";
  return json(req, devMode ? { ok: true, devOtp: code } : { ok: true });
}

async function verifyOtp(req: Request, env: Env): Promise<Response> {
  const body = await readBody(req);
  const mobile = typeof body?.mobile === "string" ? body.mobile.trim() : "";
  const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!MOBILE_RE.test(mobile) || !/^\d{6}$/.test(otp)) {
    return errorJson(req, "Mobile number and 6-digit OTP are required", 400);
  }

  const row = await env.DB.prepare("SELECT code, expires_at, attempts FROM otp_codes WHERE mobile = ?")
    .bind(mobile).first<{ code: string; expires_at: number; attempts: number }>();
  const now = Math.floor(Date.now() / 1000);

  if (!row || row.expires_at < now) {
    return errorJson(req, "OTP expired. Please request a new code", 400);
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return errorJson(req, "Too many attempts. Please request a new code", 429);
  }
  if (row.code !== (await sha256Hex(otp))) {
    await env.DB.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE mobile = ?").bind(mobile).run();
    return errorJson(req, "Incorrect OTP code. Please try again", 400);
  }

  const role = isAdminMobile(env, mobile) ? "admin" : "customer";
  const token = randomToken();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM otp_codes WHERE mobile = ?").bind(mobile),
    env.DB.prepare(
      `INSERT INTO users (mobile, name, role) VALUES (?, ?, ?)
       ON CONFLICT(mobile) DO UPDATE SET
         name = CASE WHEN excluded.name != '' THEN excluded.name ELSE users.name END,
         role = excluded.role`
    ).bind(mobile, name, role),
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < unixepoch()"),
    env.DB.prepare("INSERT INTO sessions (token_hash, mobile, expires_at) VALUES (?, ?, ?)")
      .bind(await sha256Hex(token), mobile, now + SESSION_TTL_SECONDS),
  ]);

  const user = await env.DB.prepare("SELECT mobile, name, role FROM users WHERE mobile = ?")
    .bind(mobile).first<SessionUser>();
  return json(req, { user }, 200, { "Set-Cookie": sessionCookie(token, SESSION_TTL_SECONDS) });
}

async function logout(req: Request, env: Env): Promise<Response> {
  const token = getCookie(req, SESSION_COOKIE);
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  }
  return json(req, { ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}

async function me(req: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(req, env);
  if (!user) return errorJson(req, "Not signed in", 401);
  return json(req, { user });
}

// ---------- orders ----------

async function orderItemsFor(env: Env, orderIds: string[]): Promise<Map<string, OrderItemRow[]>> {
  const map = new Map<string, OrderItemRow[]>();
  if (!orderIds.length) return map;
  const placeholders = orderIds.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT * FROM order_items WHERE order_id IN (${placeholders})`
  ).bind(...orderIds).all<OrderItemRow>();
  for (const item of results) {
    const list = map.get(item.order_id) ?? [];
    list.push(item);
    map.set(item.order_id, list);
  }
  return map;
}

async function listMyOrders(req: Request, env: Env, user: SessionUser): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM orders WHERE mobile = ? ORDER BY created_at DESC"
  ).bind(user.mobile).all<OrderRow>();
  const items = await orderItemsFor(env, results.map((o) => o.id));
  return json(req, { orders: results.map((o) => serializeOrder(o, items.get(o.id) ?? [])) });
}

async function listAllOrders(req: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all<OrderRow>();
  const items = await orderItemsFor(env, results.map((o) => o.id));
  return json(req, { orders: results.map((o) => serializeOrder(o, items.get(o.id) ?? [])) });
}

async function createOrder(req: Request, env: Env, user: SessionUser): Promise<Response> {
  const body = await readBody(req);
  const rawItems: any[] = Array.isArray(body?.items) ? body!.items : [];
  const address = body?.shippingAddress;
  const paymentMethod = PAYMENT_METHODS.includes(body?.paymentMethod) ? body!.paymentMethod : "cod";

  if (!rawItems.length) return errorJson(req, "Your cart is empty", 400);
  if (!address || typeof address !== "object" || !address.line || !address.pincode) {
    return errorJson(req, "A shipping address is required", 400);
  }

  // Merge duplicate ids, clamp quantities
  const qtyById = new Map<string, number>();
  for (const item of rawItems) {
    const id = typeof item?.id === "string" ? item.id : "";
    const qty = Math.floor(Number(item?.qty));
    if (!id || !Number.isFinite(qty) || qty < 1 || qty > 99) {
      return errorJson(req, "Invalid cart items", 400);
    }
    qtyById.set(id, Math.min(99, (qtyById.get(id) ?? 0) + qty));
  }

  const ids = [...qtyById.keys()];
  const placeholders = ids.map(() => "?").join(",");
  const { results: products } = await env.DB.prepare(
    `SELECT id, price_paise, is_active FROM products WHERE id IN (${placeholders})`
  ).bind(...ids).all<{ id: string; price_paise: number; is_active: number }>();
  if (products.length !== ids.length || products.some((p) => !p.is_active)) {
    return errorJson(req, "Some items in your cart are no longer available", 400);
  }

  // Server-authoritative pricing: recompute everything from the DB.
  let subtotalPaise = 0;
  for (const p of products) subtotalPaise += p.price_paise * qtyById.get(p.id)!;

  let discountPaise = 0;
  let couponCode: string | null = null;
  if (typeof body?.couponCode === "string" && body.couponCode.trim()) {
    const code = body.couponCode.trim().toUpperCase();
    const coupon = await env.DB.prepare("SELECT * FROM coupons WHERE code = ?").bind(code).first<CouponRow>();
    if (!coupon) return errorJson(req, "That coupon code isn't valid", 400);
    const check = couponDiscountRupees(coupon, subtotalPaise / 100);
    if (!check.valid) return errorJson(req, check.msg, 400);
    discountPaise = check.discount * 100;
    couponCode = code;
  }

  const shippingPaise = subtotalPaise >= SHIPPING_THRESHOLD_PAISE ? 0 : SHIPPING_COST_PAISE;
  const totalPaise = Math.max(0, subtotalPaise - discountPaise + shippingPaise);

  const orderId = crypto.randomUUID();
  const orderNumber = `PP-ORD-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;
  const now = Math.floor(Date.now() / 1000);

  const statements = [
    env.DB.prepare(
      `INSERT INTO orders (id, order_number, mobile, subtotal_paise, discount_paise, shipping_paise,
         total_paise, coupon_code, payment_method, status, shipping_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?)`
    ).bind(orderId, orderNumber, user.mobile, subtotalPaise, discountPaise, shippingPaise,
           totalPaise, couponCode, paymentMethod, JSON.stringify(address), now),
    ...products.map((p) =>
      env.DB.prepare(
        "INSERT INTO order_items (order_id, product_id, qty, unit_price_paise) VALUES (?, ?, ?, ?)"
      ).bind(orderId, p.id, qtyById.get(p.id)!, p.price_paise)
    ),
  ];
  await env.DB.batch(statements);

  const row = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first<OrderRow>();
  const items = await orderItemsFor(env, [orderId]);
  return json(req, { order: serializeOrder(row!, items.get(orderId) ?? []) }, 201);
}

async function updateOrderStatus(req: Request, env: Env): Promise<Response> {
  const body = await readBody(req);
  const orderNumber = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  const status = body?.status;
  if (!orderNumber || !ORDER_STATUSES.includes(status)) {
    return errorJson(req, "orderId and a valid status are required", 400);
  }
  const result = await env.DB.prepare("UPDATE orders SET status = ? WHERE order_number = ?")
    .bind(status, orderNumber).run();
  if (!result.meta.changes) return errorJson(req, "Order not found", 404);
  return json(req, { ok: true });
}
