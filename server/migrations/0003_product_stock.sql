ALTER TABLE products ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0;

-- One-time backfill so the existing seeded catalog is purchasable.
UPDATE products SET stock_quantity = 25;
