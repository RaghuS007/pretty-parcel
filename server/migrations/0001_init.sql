-- Pretty Parcel — D1 schema. Money is stored in integer paise unless noted.

CREATE TABLE IF NOT EXISTS users (
  mobile TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS otp_codes (
  mobile TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_sent_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Session tokens are stored as SHA-256 hashes; the raw token only lives in the cookie.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  mobile TEXT NOT NULL REFERENCES users(mobile),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_sessions_mobile ON sessions(mobile);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cat TEXT NOT NULL CHECK (cat IN ('demi-fine', 'oxidised', 'hair')),
  sub TEXT NOT NULL,
  price_paise INTEGER NOT NULL,
  mrp_paise INTEGER NOT NULL,
  material TEXT NOT NULL DEFAULT '',
  collection TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',    -- JSON string[]
  rating REAL NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  bestseller INTEGER NOT NULL DEFAULT 0,
  is_new INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT '',
  images TEXT NOT NULL DEFAULT '[]',  -- JSON string[] of URLs
  is_active INTEGER NOT NULL DEFAULT 1,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('pct', 'flat')),
  value INTEGER NOT NULL,  -- pct: percentage (10 = 10%); flat: whole rupees
  min_rupees INTEGER,      -- minimum subtotal in whole rupees, NULL = no minimum
  label TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,                -- internal uuid
  order_number TEXT NOT NULL UNIQUE,  -- customer-facing, e.g. PP-ORD-4821
  mobile TEXT NOT NULL REFERENCES users(mobile),
  subtotal_paise INTEGER NOT NULL,
  discount_paise INTEGER NOT NULL DEFAULT 0,
  shipping_paise INTEGER NOT NULL DEFAULT 0,
  total_paise INTEGER NOT NULL,
  coupon_code TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cod' CHECK (payment_method IN ('cod', 'upi', 'card')),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address TEXT NOT NULL,     -- JSON Address (src/data/types.ts)
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_orders_mobile ON orders(mobile, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price_paise INTEGER NOT NULL,  -- price captured at checkout
  PRIMARY KEY (order_id, product_id)
);
