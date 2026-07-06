# The Pretty Parcel by Neems — Interactive Prototype

A fully working, zero-dependency prototype of the e-commerce experience from the PRD & Claude Design brief. Pure HTML/CSS/JS — no build step, no npm install.

## Run it locally

**Option A — Python (pre-installed on Mac/Linux, easy on Windows):**
```bash
cd pretty-parcel
python3 -m http.server 8000
```
Then open http://localhost:8000

**Option B — Node:**
```bash
cd pretty-parcel
npx serve .
```

**Option C —** just double-click `index.html` (everything works except Google Fonts if offline; elegant fallbacks are built in).

## What's implemented

| Screen | File | Working features |
|---|---|---|
| Home | `index.html` | Hero, New Arrivals, Best Sellers, collection bands, Oxidised edit, Hair row, **Recently Viewed strip** (hidden when empty, clear-all), testimonials, Instagram grid, newsletter, WhatsApp float |
| Shop | `shop.html` | Live search, category/price/collection filters, 4 sort options, empty state, `?cat=` deep links |
| Product | `product.html` | Gallery with thumbnails, accordions (material/care/shipping), reviews, **"You may also love"** — content-based scoring (category 45 · tags 25 · price ±30% 15 · material 10 · collection 5), view tracking |
| Cart | `cart.html` | Qty steppers, remove, **coupons** (`NEEMS10`, `PARCEL200`), free-shipping threshold at ₹999, **"Complete the look"** via complementary-category rules, mock checkout → order history |
| Login | `login.html` | Name + mobile → 6-digit OTP (demo code **123456**), auto-advance boxes, paste support, 30s resend timer, **guest→account Recently-Viewed merge** with dedupe |
| Account | `account.html` | Overview KPIs, Wishlist, Orders, Recently Viewed (full list + clear), Addresses, Profile, logout |
| Admin | `admin.html` | KPI cards, weekly sales chart, inventory table with low-stock flags, recent orders (includes your prototype orders), coupon table |

All state (cart, wishlist, recently viewed, user, orders) lives in `localStorage` — clear your browser storage to reset the demo.

## Structure
```
pretty-parcel/
├── index.html        Home
├── shop.html         Shop / category
├── product.html      Product detail (?id=p01…p16)
├── cart.html         Cart & checkout
├── login.html        OTP login
├── account.html      Customer account
├── admin.html        Admin dashboard
└── assets/
    ├── styles.css    Design system (brand tokens at the top)
    ├── data.js       16-product mock catalogue + complementary rules
    └── app.js        Cart/wishlist/RV storage, recommendations, rendering
```

## Notes
- Product "photos" are generated SVG placeholders — drop real photography into the cards by replacing `productSVG()` output with `<img>` tags when you have shots.
- This is the **design/UX prototype**. The production build (Next.js 14 + Neon Postgres + MSG91 OTP per your architecture) replaces `localStorage` with the real API but can reuse this markup and CSS almost 1:1.
