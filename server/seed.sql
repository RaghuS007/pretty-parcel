-- Idempotent seed (INSERT OR IGNORE) mirroring src/data/mockProducts.ts.
-- Prices converted to paise (rupees * 100). Safe to re-run: never clobbers admin edits.

INSERT OR IGNORE INTO products (id, name, cat, sub, price_paise, mrp_paise, material, collection, tags, rating, reviews, bestseller, is_new, icon, images) VALUES
  ('p01', 'Aurelia Layered Necklace', 'demi-fine', 'Necklaces', 149900, 189900, '18k rose-gold plated brass', 'Golden Hour', '["layered","rose-gold","minimal","everyday"]', 4.8, 32, 1, 0, 'necklace', '[]'),
  ('p02', 'Petal Drop Earrings', 'demi-fine', 'Earrings', 89900, 109900, 'Rose-gold plated, cubic zirconia', 'First Light', '["drop","rose-gold","party","zirconia"]', 4.7, 21, 1, 0, 'earring', '[]'),
  ('p03', 'Mira Chain Bracelet', 'demi-fine', 'Bracelets', 74900, 94900, 'Gold-tone stainless steel', 'Golden Hour', '["chain","minimal","everyday","stackable"]', 4.6, 14, 0, 1, 'bracelet', '[]'),
  ('p04', 'Solstice Stacking Rings (Set of 3)', 'demi-fine', 'Rings', 99900, 129900, 'Rose-gold plated brass', 'First Light', '["stackable","minimal","set","rose-gold"]', 4.9, 41, 1, 0, 'ring', '[]'),
  ('p05', 'Sia Pearl Anklet', 'demi-fine', 'Anklets', 64900, 79900, 'Freshwater pearl, gold-tone chain', 'Sea Whisper', '["pearl","dainty","summer"]', 4.5, 9, 0, 1, 'anklet', '[]'),
  ('p06', 'Noor Jewellery Set', 'demi-fine', 'Jewellery Sets', 249900, 319900, 'Rose-gold plated, zirconia', 'Golden Hour', '["set","party","gifting","zirconia","rose-gold"]', 4.8, 18, 0, 1, 'set', '[]'),
  ('p07', 'Rani Oxidised Choker', 'oxidised', 'Necklaces', 129900, 159900, 'Oxidised german silver', 'Raat Rani', '["oxidised","traditional","choker","festive"]', 4.9, 56, 1, 0, 'necklace', '[]'),
  ('p08', 'Jhilmil Jhumkas', 'oxidised', 'Earrings', 79900, 99900, 'Oxidised silver-tone alloy', 'Raat Rani', '["jhumka","oxidised","festive","traditional"]', 4.8, 63, 1, 0, 'jhumka', '[]'),
  ('p09', 'Tara Coin Pendant', 'oxidised', 'Pendants', 69900, 89900, 'Oxidised german silver', 'Mitti', '["coin","oxidised","boho","everyday"]', 4.6, 12, 0, 1, 'pendant', '[]'),
  ('p10', 'Meera Carved Bangles (Pair)', 'oxidised', 'Bangles', 109900, 139900, 'Oxidised brass, hand-carved', 'Mitti', '["bangles","oxidised","traditional","pair"]', 4.7, 24, 0, 0, 'bangle', '[]'),
  ('p11', 'Peach Blush Claw Clip', 'hair', 'Claw Clips', 39900, 49900, 'Cellulose acetate', 'Soft Hour', '["claw","peach","matte","everyday"]', 4.7, 48, 1, 0, 'claw', '[]'),
  ('p12', 'Ivory Pearl Hair Clip Duo', 'hair', 'Hair Clips', 34900, 44900, 'Faux pearl, gold-tone alloy', 'Soft Hour', '["pearl","clip","duo","party"]', 4.6, 17, 0, 1, 'clip', '[]'),
  ('p13', 'Velvet Ribbon Hair Band', 'hair', 'Hair Bands', 29900, 39900, 'Velvet over flexible frame', 'Soft Hour', '["band","velvet","minimal"]', 4.4, 8, 0, 0, 'band', '[]'),
  ('p14', 'Satin Scrunchie Trio', 'hair', 'Scrunchies', 32900, 42900, 'Mulberry satin', 'Soft Hour', '["scrunchie","satin","set","everyday"]', 4.8, 35, 1, 0, 'scrunchie', '[]'),
  ('p15', 'Grand Peach Bow', 'hair', 'Hair Bows', 44900, 54900, 'Structured satin bow', 'Soft Hour', '["bow","peach","statement","gifting"]', 4.9, 26, 0, 1, 'bow', '[]'),
  ('p16', 'Champa Flower Studs', 'oxidised', 'Earrings', 54900, 69900, 'Oxidised silver-tone alloy', 'Mitti', '["studs","oxidised","floral","everyday"]', 4.5, 11, 0, 1, 'earring', '[]');

INSERT OR IGNORE INTO coupons (code, type, value, min_rupees, label, is_active) VALUES
  ('NEEMS10', 'pct', 10, NULL, '10% off', 1),
  ('PARCEL200', 'flat', 200, 1499, '₹200 off on ₹1,499+', 1);

-- Bootstrap admin account (mobile must also be listed in ADMIN_MOBILES wrangler var).
INSERT OR IGNORE INTO users (mobile, name, role) VALUES ('9999999999', 'Store Admin', 'admin');
