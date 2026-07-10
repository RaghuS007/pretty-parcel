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

// Extension is always derived from this allowlist, never from the client's
// filename or a raw declared type outside it — see uploadImage().
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const SAFE_IMAGE_KEY_RE = /^products\/[\w-]+\.(?:jpg|jpeg|png|webp)$/;

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
        case "POST /admin/upload":
          return await withAdmin(req, env, uploadImage);
        case "DELETE /admin/upload":
          return await withAdmin(req, env, deleteImage);
      }

      // GET /products/:id
      const productMatch = path.match(/^\/api\/products\/([\w-]+)$/);
      if (productMatch && req.method === "GET") {
        return await getProduct(req, env, productMatch[1]);
      }

      // GET /images/* (public, no auth)
      const imageMatch = path.match(/^\/api\/images\/(.+)$/);
      if (imageMatch && req.method === "GET") {
        return await serveImage(req, env, imageMatch[1]);
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
  // `, id` tiebreakers make popular/new deterministic across repeated pages —
  // bestseller/rating*reviews and is_new/updated_at are not unique on their own.
  const orderBy =
    sort === "popular" ? "ORDER BY bestseller DESC, rating * reviews DESC, id"
    : sort === "new" ? "ORDER BY is_new DESC, updated_at DESC, id"
    : "ORDER BY id";
  const where = "WHERE is_active = 1";

  const limitParam = url.searchParams.get("limit");
  if (limitParam === null) {
    // Legacy shape: full catalog, no pagination metadata. Existing callers
    // that never pass `limit` must see byte-for-byte identical responses.
    const { results } = await env.DB.prepare(`SELECT * FROM products ${where} ${orderBy}`).all<ProductRow>();
    return json(req, { products: results.map(serializeProduct) });
  }

  const rawLimit = Number(limitParam);
  if (!Number.isFinite(rawLimit) || !Number.isInteger(rawLimit)) {
    return errorJson(req, "limit must be an integer", 400);
  }
  const limit = Math.min(100, Math.max(1, rawLimit));

  const offsetParam = url.searchParams.get("offset");
  const rawOffset = offsetParam !== null ? Number(offsetParam) : 0;
  if (!Number.isFinite(rawOffset) || !Number.isInteger(rawOffset)) {
    return errorJson(req, "offset must be an integer", 400);
  }
  const offset = Math.max(0, rawOffset);

  const { results } = await env.DB.prepare(
    `SELECT * FROM products ${where} ${orderBy} LIMIT ? OFFSET ?`
  ).bind(limit, offset).all<ProductRow>();
  const countRow = await env.DB.prepare(`SELECT COUNT(*) as count FROM products ${where}`).first<{ count: number }>();
  const total = countRow?.count ?? 0;

  return json(req, {
    products: results.map(serializeProduct),
    total,
    limit,
    offset,
    hasMore: offset + results.length < total,
  });
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

  if (body.stockQuantity !== undefined && (!Number.isInteger(body.stockQuantity) || body.stockQuantity < 0)) {
    return errorJson(req, "stockQuantity must be a non-negative integer", 400);
  }
  const stockQuantity = body.stockQuantity !== undefined ? body.stockQuantity : existing.stock_quantity;

  await env.DB.prepare(
    `UPDATE products SET name = ?, price_paise = ?, mrp_paise = ?, bestseller = ?, is_new = ?,
       tags = ?, material = ?, collection = ?, images = ?, is_active = ?, stock_quantity = ?, updated_at = unixepoch()
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
    stockQuantity,
    body.id
  ).run();

  const updated = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(body.id).first<ProductRow>();
  return json(req, { product: serializeProduct(updated!) });
}

// ---------- images (R2) ----------

async function uploadImage(req: Request, env: Env): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return errorJson(req, "Invalid form data", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorJson(req, "A file field is required", 400);
  }

  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) {
    return errorJson(req, "Only JPEG, PNG, or WebP images are allowed", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return errorJson(req, "Image must be 5 MB or smaller", 400);
  }

  const key = `products/${crypto.randomUUID()}.${ext}`;
  await env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type } });

  return json(req, { url: `/api/images/${key}`, key }, 201);
}

async function deleteImage(req: Request, env: Env): Promise<Response> {
  const body = await readBody(req);
  const key = typeof body?.key === "string" ? body.key : "";
  if (!SAFE_IMAGE_KEY_RE.test(key)) {
    return errorJson(req, "Invalid image key", 400);
  }
  await env.IMAGES.delete(key);
  return json(req, { ok: true });
}

async function serveImage(req: Request, env: Env, key: string): Promise<Response> {
  if (!SAFE_IMAGE_KEY_RE.test(key)) {
    return errorJson(req, "Not found", 404);
  }
  const object = await env.IMAGES.get(key);
  if (!object) return errorJson(req, "Not found", 404);

  return new Response(object.body, {
    status: 200,
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ...corsHeaders(req),
    },
  });
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

function formatStockShortageMessage(shortages: { name: string; available: number }[]): string {
  return shortages
    .map((s) => (s.available > 0 ? `Only ${s.available} left of ${s.name}` : `${s.name} is out of stock`))
    .join("; ");
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
    `SELECT id, name, price_paise, is_active, stock_quantity FROM products WHERE id IN (${placeholders})`
  ).bind(...ids).all<{ id: string; name: string; price_paise: number; is_active: number; stock_quantity: number }>();
  if (products.length !== ids.length || products.some((p) => !p.is_active)) {
    return errorJson(req, "Some items in your cart are no longer available", 400);
  }

  // Fast-path availability check. This is advisory only — a concurrent order
  // can still consume the stock between this check and the batch below, so
  // it is not itself the source of correctness (the guarded UPDATE is).
  const shortages = products
    .filter((p) => qtyById.get(p.id)! > p.stock_quantity)
    .map((p) => ({ name: p.name, available: p.stock_quantity }));
  if (shortages.length) {
    return errorJson(req, formatStockShortageMessage(shortages), 409);
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

  // D1 has no interactive transactions — env.DB.batch() is the only atomic
  // primitive, and it only rolls back when a statement ERRORS. A guarded
  // UPDATE that matches zero rows does NOT error, it just reports
  // meta.changes = 0. So we bundle the decrement into the same batch as the
  // order/order_items inserts (cheap, single round trip for the common
  // case), then inspect meta.changes per decrement below and manually
  // compensate if a concurrent order won the race on any item.
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
    ...products.map((p) =>
      env.DB.prepare(
        "UPDATE products SET stock_quantity = stock_quantity - ?1 WHERE id = ?2 AND stock_quantity >= ?1"
      ).bind(qtyById.get(p.id)!, p.id)
    ),
  ];
  const results = await env.DB.batch(statements);

  // Statements are [order insert, ...order_items inserts, ...stock decrements]
  // in that fixed order, so this slice aligns 1:1 with `products`.
  const decrementResults = results.slice(1 + products.length);
  const failed = products.filter((_, i) => !decrementResults[i].meta.changes);

  if (failed.length) {
    // Lost the race: someone else's checkout claimed stock between our
    // fast-path check and this batch committing. Undo what the batch just
    // did — delete the order we inserted (order_items cascade via
    // ON DELETE CASCADE) and give back stock only to the items whose
    // decrement DID succeed — so no partial order or stock drift survives.
    const succeeded = products.filter((_, i) => decrementResults[i].meta.changes);
    const compensation = [
      env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(orderId),
      ...succeeded.map((p) =>
        env.DB.prepare("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?")
          .bind(qtyById.get(p.id)!, p.id)
      ),
    ];
    await env.DB.batch(compensation);
    const names = failed.map((p) => p.name).join(", ");
    return errorJson(req, `Sorry, ${names} just sold out while you were checking out. Please update your cart and try again.`, 409);
  }

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
  // TODO: restock — cancelling an order does not currently return its items'
  // stock_quantity. Out of scope for now; needs order_items lookup + a
  // guarded increment batch similar to createOrder()'s decrement.
  const result = await env.DB.prepare("UPDATE orders SET status = ? WHERE order_number = ?")
    .bind(status, orderNumber).run();
  if (!result.meta.changes) return errorJson(req, "Order not found", 404);
  return json(req, { ok: true });
}
