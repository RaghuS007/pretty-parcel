/* ============================================================
   The Pretty Parcel by Neems — app logic (no dependencies)
   ============================================================ */

const INR = n => "₹" + n.toLocaleString("en-IN");

/* ---------------- storage ---------------- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem("tpp_" + k)) ?? d; } catch { return d; } },
  set(k, v) { localStorage.setItem("tpp_" + k, JSON.stringify(v)); }
};

// Apply custom catalog overrides and load custom products
(function() {
  const overrides = store.get("catalog_overrides", {});
  PRODUCTS.forEach(p => {
    if (overrides[p.id]) {
      Object.assign(p, overrides[p.id]);
    }
  });
  
  const custom = store.get("custom_products", []);
  custom.forEach(cp => {
    if (!PRODUCTS.some(p => p.id === cp.id)) {
      PRODUCTS.push(cp);
    }
  });
})();

function saveProductEdit(p) {
  const customList = store.get("custom_products", []);
  const isCustom = customList.some(x => x.id === p.id);
  if (isCustom) {
    const idx = customList.findIndex(x => x.id === p.id);
    if (idx > -1) customList[idx] = p;
    store.set("custom_products", customList);
  } else {
    // If it's a default product, save to overrides
    const isDefault = PRODUCTS.some(x => x.id === p.id);
    if (isDefault) {
      const overrides = store.get("catalog_overrides", {});
      overrides[p.id] = p;
      store.set("catalog_overrides", overrides);
    } else {
      // It's a new custom product
      customList.push(p);
      store.set("custom_products", customList);
    }
  }
  // Apply update to in-memory PRODUCTS array
  const idx = PRODUCTS.findIndex(x => x.id === p.id);
  if (idx > -1) Object.assign(PRODUCTS[idx], p);
  else PRODUCTS.push(p);
}

function deleteProduct(id) {
  const customList = store.get("custom_products", []);
  const filteredCustom = customList.filter(x => x.id !== id);
  store.set("custom_products", filteredCustom);
  
  const idx = PRODUCTS.findIndex(x => x.id === id);
  if (idx > -1) PRODUCTS.splice(idx, 1);
}

const DEFAULT_STOCKS = { p01:14, p02:22, p03:8, p04:31, p05:4, p06:11, p07:19, p08:38, p09:9, p10:6, p11:44, p12:16, p13:3, p14:52, p15:12, p16:7 };
const getStocks = () => store.get("stocks", DEFAULT_STOCKS);
const saveStocks = s => store.set("stocks", s);
function updateStock(id, qty) {
  const stocks = getStocks();
  stocks[id] = qty;
  saveStocks(stocks);
}
const decrementStocksForOrder = items => {
  const stocks = getStocks();
  items.forEach(item => {
    if (stocks[item.id] !== undefined) {
      stocks[item.id] = Math.max(0, stocks[item.id] - item.qty);
    }
  });
  saveStocks(stocks);
};
const getCart = () => store.get("cart", {});          // {id: qty}
const setCart = c => { store.set("cart", c); updateBadges(); };
const getWish = () => store.get("wishlist", []);
const setWish = w => { store.set("wishlist", w); updateBadges(); };
const getUser = () => store.get("user", null);
const setUser = u => store.set("user", u);

/* ---------------- recently viewed (PRD §7) ---------------- */
const RV_GUEST_CAP = 20;
function getRecentlyViewed() {
  const u = getUser();
  return u ? store.get("rv_user_" + u.mobile, []) : store.get("rv_guest", []);
}
function trackView(id) {
  const key = getUser() ? "rv_user_" + getUser().mobile : "rv_guest";
  let list = store.get(key, []).filter(x => x !== id);
  list.unshift(id);
  if (!getUser() && list.length > RV_GUEST_CAP) list = list.slice(0, RV_GUEST_CAP); // FIFO cap for guests
  store.set(key, list);
}
function clearRecentlyViewed() {
  const key = getUser() ? "rv_user_" + getUser().mobile : "rv_guest";
  store.set(key, []);
}
/* guest → account merge, deduped, recency-sorted (PRD merge flow) */
function mergeGuestHistory(mobile) {
  const guest = store.get("rv_guest", []);
  const server = store.get("rv_user_" + mobile, []);
  const merged = [...new Set([...guest, ...server])];
  store.set("rv_user_" + mobile, merged);
  store.set("rv_guest", []);
  return guest.length;
}

/* ---------------- product helpers ---------------- */
const byId = id => PRODUCTS.find(p => p.id === id);

/* SVG placeholder “photography” — gradient + line icon per product */
const ICONS = {
  necklace: '<path d="M25 30 Q60 78 95 30" fill="none" stroke-width="2.5"/><circle cx="60" cy="80" r="7" fill="none" stroke-width="2.5"/>',
  earring:  '<circle cx="45" cy="38" r="5" fill="none" stroke-width="2.5"/><path d="M45 43 q-8 18 0 26 q10 8 0 14" fill="none" stroke-width="2.5"/><circle cx="75" cy="38" r="5" fill="none" stroke-width="2.5"/><path d="M75 43 q8 18 0 26 q-10 8 0 14" fill="none" stroke-width="2.5"/>',
  jhumka:   '<circle cx="60" cy="35" r="5" fill="none" stroke-width="2.5"/><path d="M45 55 a15 15 0 0 1 30 0 l-4 22 h-22 z" fill="none" stroke-width="2.5"/><circle cx="52" cy="84" r="2.5"/><circle cx="60" cy="86" r="2.5"/><circle cx="68" cy="84" r="2.5"/>',
  bracelet: '<ellipse cx="60" cy="60" rx="30" ry="24" fill="none" stroke-width="2.5" stroke-dasharray="6 5"/>',
  ring:     '<circle cx="60" cy="64" r="20" fill="none" stroke-width="2.5"/><path d="M52 44 l8 -10 8 10 z" fill="none" stroke-width="2.5"/>',
  anklet:   '<path d="M28 60 q32 26 64 0" fill="none" stroke-width="2.5" stroke-dasharray="2 6"/><circle cx="60" cy="73" r="4" fill="none" stroke-width="2.5"/>',
  set:      '<path d="M35 32 Q60 62 85 32" fill="none" stroke-width="2.5"/><circle cx="42" cy="80" r="9" fill="none" stroke-width="2.5"/><circle cx="78" cy="80" r="9" fill="none" stroke-width="2.5"/>',
  pendant:  '<path d="M40 28 Q60 48 80 28" fill="none" stroke-width="2.5"/><circle cx="60" cy="58" r="14" fill="none" stroke-width="2.5"/><circle cx="60" cy="58" r="5" fill="none" stroke-width="2"/>',
  bangle:   '<circle cx="60" cy="60" r="27" fill="none" stroke-width="2.5"/><circle cx="60" cy="60" r="20" fill="none" stroke-width="2"/>',
  claw:     '<path d="M35 55 q25 -30 50 0" fill="none" stroke-width="2.5"/><path d="M38 55 v14 M46 58 v16 M54 60 v18 M62 60 v18 M70 58 v16 M78 55 v14" stroke-width="2.5"/>',
  clip:     '<path d="M32 66 l40 -22 a8 8 0 0 1 8 14 l-40 22 z" fill="none" stroke-width="2.5"/><circle cx="72" cy="50" r="3"/>',
  band:     '<path d="M30 82 a34 34 0 0 1 60 0" fill="none" stroke-width="6" stroke-linecap="round"/>',
  scrunchie:'<circle cx="60" cy="60" r="24" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="10 7"/>',
  bow:      '<path d="M60 60 L30 42 q-6 18 0 36 z M60 60 L90 42 q6 18 0 36 z" fill="none" stroke-width="2.5"/><rect x="54" y="54" width="12" height="12" rx="3" fill="none" stroke-width="2.5"/>'
};
function productSVG(p, variant = 0) {
  const [c1, c2] = PALETTES[p.cat];
  const shift = variant * 12;
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${p.name}">
    <defs><linearGradient id="g${p.id}${variant}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="120" height="120" fill="url(#g${p.id}${variant})"/>
    <circle cx="${95 - shift}" cy="${22 + shift}" r="30" fill="rgba(255,255,255,.25)"/>
    <g stroke="#2C2C2A" fill="#2C2C2A" transform="rotate(${variant * 6} 60 60)">${ICONS[p.icon] || ICONS.set}</g>
  </svg>`;
}

/* ---------------- recommendations (PRD §8) ----------------
   Content-based score: category 45 · tag Jaccard 25 · price ±30% 15 · material 10 · collection 5 */
function relatedProducts(p, n = 8) {
  return PRODUCTS.filter(x => x.id !== p.id).map(x => {
    let s = 0;
    if (x.cat === p.cat) s += 45;
    if (x.sub === p.sub) s += 10;
    const a = new Set(p.tags), b = new Set(x.tags);
    const inter = [...a].filter(t => b.has(t)).length;
    s += 25 * (inter / (a.size + b.size - inter || 1));
    const diff = Math.abs(x.price - p.price) / p.price;
    if (diff <= 0.30) s += 15 * (1 - diff / 0.30);
    if (x.material.split(",")[0] === p.material.split(",")[0]) s += 10;
    if (x.collection === p.collection) s += 5;
    return { x, s };
  }).sort((u, v) => v.s - u.s).slice(0, n).map(r => r.x);
}
/* “Complete the look” — complementary category rules fallback (PRD §8b) */
function completeTheLook(cartIds, n = 4) {
  const inCart = new Set(cartIds), wish = new Set(getWish());
  const scores = {};
  cartIds.forEach(id => {
    const p = byId(id); if (!p) return;
    (COMPLEMENT_RULES[p.sub] || []).forEach((sub, i) => {
      PRODUCTS.forEach(x => {
        if (x.sub === sub && !inCart.has(x.id) && !wish.has(x.id)) {
          scores[x.id] = (scores[x.id] || 0) + (2 - i) + (x.bestseller ? 0.5 : 0);
        }
      });
    });
  });
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => byId(id));
}

/* ---------------- card renderer ---------------- */
function cardHTML(p) {
  const wished = getWish().includes(p.id);
  const flag = p.bestseller ? '<span class="chip flag">Bestseller</span>' : (p.isNew ? '<span class="chip outline flag" style="background:#fff">New</span>' : "");
  return `<article class="card" data-id="${p.id}">
    <a class="ph" href="product.html?id=${p.id}">${productSVG(p)}${flag}</a>
    <button class="wish ${wished ? "on" : ""}" aria-label="Add ${p.name} to wishlist" onclick="toggleWish('${p.id}',this)">${heartSVG()}</button>
    <div class="card-body">
      <span class="cat">${p.sub}</span>
      <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
      <div class="price">${INR(p.price)} <s>${INR(p.mrp)}</s></div>
      <div class="card-actions"><button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}')">Add to cart</button></div>
    </div>
  </article>`;
}
const heartSVG = () => '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.9-10-9.3C.4 8.5 2.2 4.6 5.9 4.1c2-.3 4 .7 6.1 3 2.1-2.3 4.1-3.3 6.1-3 3.7.5 5.5 4.4 3.9 7.6C19.5 16.1 12 21 12 21z"/></svg>';
function renderCards(el, list) {
  if (!el) return;
  el.innerHTML = list.map(cardHTML).join("");
}

/* ---------------- cart / wishlist actions ---------------- */
function addToCart(id, qty = 1) {
  const c = getCart(); c[id] = (c[id] || 0) + qty; setCart(c);
  toast(byId(id).name + " added to cart");
  if (typeof renderCartPage === "function" && document.querySelector(".cart-layout")) {
    renderCartPage();
  } else {
    openCartDrawer();
  }
}
function toggleWish(id, btn) {
  let w = getWish();
  if (w.includes(id)) { w = w.filter(x => x !== id); toast("Removed from wishlist"); }
  else { w.push(id); toast("Saved to wishlist"); }
  setWish(w);
  document.querySelectorAll(`.card[data-id="${id}"] .wish, .wish[data-id="${id}"]`).forEach(b => b.classList.toggle("on", w.includes(id)));
  if (btn) btn.classList.toggle("on", w.includes(id));
}
function updateBadges() {
  const c = Object.values(getCart()).reduce((a, b) => a + b, 0);
  const cb = document.getElementById("cartCount"); if (cb) { cb.textContent = c; cb.style.display = c ? "flex" : "none"; }
  const w = getWish().length;
  const wb = document.getElementById("wishCount"); if (wb) { wb.textContent = w; wb.style.display = w ? "flex" : "none"; }
}

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------------- shared chrome ---------------- */
/* ---------------- shared chrome ---------------- */
function renderHeader(active) {
  const u = getUser();
  document.getElementById("siteHeader").innerHTML = `
  <div class="topbar">Free shipping on orders over ₹999 · Wrapped with love in Bengaluru</div>
  <header class="site"><nav class="nav">
    <button class="icon-btn hamburger" aria-label="Menu" onclick="document.getElementById('navLinks').classList.toggle('open')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    <a class="brand" href="index.html">The Pretty Parcel<small>by Neems</small></a>
    <div class="nav-links" id="navLinks">
      <a href="index.html" class="${active === "home" ? "active" : ""}">Home</a>
      <a href="shop.html" class="${active === "shop" ? "active" : ""}">Shop</a>
      <a href="shop.html?cat=demi-fine">Demi-Fine</a>
      <a href="shop.html?cat=oxidised">Oxidised</a>
      <a href="shop.html?cat=hair">Hair Accessories</a>
      <a href="admin.html">Admin</a>
    </div>
    <div class="nav-icons">
      <a class="icon-btn" href="${u ? "account.html" : "login.html"}" aria-label="Account" title="${u ? "Hi, " + u.name.split(" ")[0] : "Login"}">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg></a>
      <a class="icon-btn" href="account.html#wishlist" aria-label="Wishlist">
        ${heartSVG().replace('fill="currentColor"', 'fill="none" stroke="currentColor" stroke-width="1.8"')}
        <span class="count" id="wishCount"></span></a>
      <a class="icon-btn" href="cart.html" onclick="if(document.body.dataset.page!=='cart'){event.preventDefault();openCartDrawer();}" aria-label="Cart">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7h12l1.5 13h-15z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>
        <span class="count" id="cartCount"></span></a>
    </div>
  </nav></header>`;
  updateBadges();
}
function renderFooter() {
  const f = document.getElementById("siteFooter");
  if (!f) return;
  f.innerHTML = `
  <footer class="site"><div class="footer-grid">
    <div><h4>The Pretty Parcel by Neems</h4>
      <p style="color:var(--ink-soft)">Curated with Love, Wrapped in Elegance. Premium demi-fine jewellery, traditional pieces and hair accessories from Bengaluru — delivered pan-India.</p></div>
    <div><h4>Shop</h4><ul>
      <li><a href="shop.html?cat=demi-fine">Demi-Fine Jewellery</a></li>
      <li><a href="shop.html?cat=oxidised">Traditional &amp; Oxidised</a></li>
      <li><a href="shop.html?cat=hair">Hair Accessories</a></li>
      <li><a href="shop.html">All Products</a></li></ul></div>
    <div><h4>Help</h4><ul>
      <li><a href="#" onclick="event.preventDefault(); openSupportDrawer();">Customer Support Chat</a></li>
      <li><a href="#">Shipping &amp; Returns</a></li><li><a href="#">Care Guide</a></li>
      <li><a href="#">Privacy Policy</a></li></ul></div>
    <div><h4>Get in touch</h4><ul>
      <li>theprettyparcelbyneems@gmail.com</li><li>+91 79753 81312</li>
      <li><a href="#">Instagram</a> · <a href="#">Facebook</a></li></ul></div>
  </div><div class="footnote">© 2026 The Pretty Parcel by Neems · Bengaluru, India</div></footer>
  <button class="support-float" id="supportFloatBtn" onclick="openSupportDrawer()" aria-label="Customer Support" title="Help & Support">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  </button>`;
}

/* ---------------- recently viewed strip ---------------- */
function renderRecentlyViewed(containerId, full = false) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const list = getRecentlyViewed().map(byId).filter(Boolean);
  if (!list.length) { wrap.style.display = "none"; return; }   // hidden when empty (PRD)
  wrap.style.display = "";
  const items = full ? list : list.slice(0, 12);
  wrap.querySelector(full ? ".grid" : ".scroll-row").innerHTML = items.map(cardHTML).join("");
}

/* ---------------- boot ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initCartDrawer();
  if (document.getElementById("siteHeader")) renderHeader(document.body.dataset.page);
  renderFooter();
});

/* ---------------- theme support ---------------- */
function initTheme() {
  // Force Light Mode only
  document.body.classList.remove("dark-theme");
  store.set("theme", "light");
}
function toggleTheme() {}
function updateThemeToggleIcon() {}

/* ---------------- customer support drawer ---------------- */
function initSupportDrawer() {
  if (document.getElementById("supportDrawerOverlay")) return;
  
  const overlay = document.createElement("div");
  overlay.id = "supportDrawerOverlay";
  overlay.className = "support-drawer-overlay";
  overlay.onclick = closeSupportDrawer;
  
  const drawer = document.createElement("div");
  drawer.id = "supportDrawer";
  drawer.className = "support-drawer";
  
  drawer.innerHTML = `
    <div class="support-drawer-header">
      <div>
        <h2>Help &amp; Support</h2>
        <p>Typically replies instantly</p>
      </div>
      <button class="support-drawer-close" onclick="closeSupportDrawer()" aria-label="Close support">&times;</button>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-quick-replies" id="chatQuickReplies">
      <button class="quick-reply-btn" onclick="handleQuickReply('Where is my order?')">Track Order</button>
      <button class="quick-reply-btn" onclick="handleQuickReply('What are the shipping charges?')">Shipping Rates</button>
      <button class="quick-reply-btn" onclick="handleQuickReply('What is the return policy?')">Returns Info</button>
      <button class="quick-reply-btn" onclick="handleQuickReply('How do I care for my jewellery?')">Care Guide</button>
      <button class="quick-reply-btn" onclick="handleQuickReply('Talk to a human')">Talk to a Human</button>
    </div>
    <div class="chat-input-area">
      <input type="text" id="chatInput" placeholder="Type your message..." onkeydown="if(event.key==='Enter')sendUserChatMessage()">
      <button class="chat-send-btn" onclick="sendUserChatMessage()" aria-label="Send message">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
}

function openSupportDrawer() {
  initSupportDrawer();
  document.getElementById("supportDrawerOverlay").classList.add("open");
  document.getElementById("supportDrawer").classList.add("open");
  if (!document.querySelector("#chatMessages .chat-bubble")) {
    renderInitialSupportMessages();
  }
}

function closeSupportDrawer() {
  const overlay = document.getElementById("supportDrawerOverlay");
  const drawer = document.getElementById("supportDrawer");
  if (overlay) overlay.classList.remove("open");
  if (drawer) drawer.classList.remove("open");
}

function renderInitialSupportMessages() {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;
  chatMessages.innerHTML = `
    <div class="chat-bubble bot">
      Hi there! Welcome to <strong>The Pretty Parcel by Neems</strong>. How can we help you today?
    </div>
  `;
}

function addChatMessage(sender, text) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}`;
  bubble.innerHTML = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendUserChatMessage() {
  const input = document.getElementById("chatInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  addChatMessage("user", text);
  input.value = "";
  showBotTypingAndReply(text);
}

function handleQuickReply(option) {
  addChatMessage("user", option);
  showBotTypingAndReply(option);
}

function showBotTypingAndReply(userMessage) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;
  
  const typing = document.createElement("div");
  typing.className = "chat-bubble bot typing-indicator";
  typing.innerHTML = `<span style="display:inline-flex;gap:4px;"><span class="dot" style="animation: typing-dot 1.2s infinite; width:6px; height:6px; background:#6b6560; border-radius:50%"></span><span class="dot" style="animation: typing-dot 1.2s infinite 0.2s; width:6px; height:6px; background:#6b6560; border-radius:50%"></span><span class="dot" style="animation: typing-dot 1.2s infinite 0.4s; width:6px; height:6px; background:#6b6560; border-radius:50%"></span></span>`;
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  if (!document.getElementById("typing-dot-style")) {
    const style = document.createElement("style");
    style.id = "typing-dot-style";
    style.innerHTML = `@keyframes typing-dot { 0%, 100% { opacity: 0.2; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }`;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    typing.remove();
    let botReply = "";
    const msg = userMessage.toLowerCase();
    
    if (msg.includes("order") || msg.includes("track")) {
      botReply = "You can view your order history and track active shipments under the **Orders** tab on your <a href='account.html#orders'>Account Page</a>. All shipments are dispatched within 24-48 hours!";
    } else if (msg.includes("shipping") || msg.includes("charge") || msg.includes("delivery") || msg.includes("rate")) {
      botReply = "We offer **Free Shipping** pan-India for all orders of **₹999 and above**. For orders below ₹999, a flat shipping charge of ₹79 is applied at checkout. Delivery typically takes 3 to 5 business days.";
    } else if (msg.includes("return") || msg.includes("refund") || msg.includes("cancel")) {
      botReply = "We offer a hassle-free **7-day return policy** on all unused items in their original packaging. To request a return or exchange, please email us at **theprettyparcelbyneems@gmail.com** or send a request from your orders portal.";
    } else if (msg.includes("care") || msg.includes("material") || msg.includes("tarnish")) {
      botReply = "Our products are curated premium pieces (such as 18k rose-gold plating or German silver). To preserve their shine, keep them dry and store them in airtight containers. Avoid perfume, lotion, and water contact.";
    } else if (msg.includes("human") || msg.includes("agent") || msg.includes("person") || msg.includes("speak") || msg.includes("support")) {
      botReply = "A customer support specialist has been alerted and will reach out to you via your registered phone number or email shortly! You can also contact us directly at **+91 79753 81312**.";
    } else {
      botReply = "Thank you for message! I'm your digital assistant. You can ask about:<br>• **Track Order** (order status)<br>• **Shipping Rates** (costs & speed)<br>• **Returns Info** (exchange policy)<br>• **Care Guide** (jewelry upkeep)<br>• **Talk to a Human** (speak with an agent)";
    }
    
    addChatMessage("bot", botReply);
  }, 1000);
}

/* ---------------- cart drawer ---------------- */
function initCartDrawer() {
  if (document.getElementById("cartDrawerOverlay")) return;
  
  const overlay = document.createElement("div");
  overlay.id = "cartDrawerOverlay";
  overlay.className = "cart-drawer-overlay";
  overlay.onclick = closeCartDrawer;
  
  const drawer = document.createElement("div");
  drawer.id = "cartDrawer";
  drawer.className = "cart-drawer";
  
  document.body.appendChild(overlay);
  document.body.appendChild(drawer);
}
function openCartDrawer() {
  initCartDrawer();
  renderCartDrawer();
  document.getElementById("cartDrawerOverlay").classList.add("open");
  document.getElementById("cartDrawer").classList.add("open");
}
function closeCartDrawer() {
  const overlay = document.getElementById("cartDrawerOverlay");
  const drawer = document.getElementById("cartDrawer");
  if (overlay) overlay.classList.remove("open");
  if (drawer) drawer.classList.remove("open");
}
function renderCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  if (!drawer) return;
  
  const cart = getCart();
  const ids = Object.keys(cart).filter(id => byId(id));
  
  let contentHtml = `
    <div class="cart-drawer-header">
      <h2>Your Parcel</h2>
      <button class="cart-drawer-close" onclick="closeCartDrawer()" aria-label="Close cart">&times;</button>
    </div>
  `;
  
  if (!ids.length) {
    contentHtml += `
      <div class="cart-drawer-items" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px;">
        <p style="font-size:18px;font-family:var(--font-display);font-style:italic;margin-bottom:18px;color:var(--ink-soft)">Your parcel is empty</p>
        <button class="btn btn-primary btn-sm" onclick="closeCartDrawer()">Continue Shopping</button>
      </div>
    `;
    drawer.innerHTML = contentHtml;
    return;
  }
  
  const subtotal = ids.reduce((s, id) => s + byId(id).price * cart[id], 0);
  
  // Calculate coupons
  const customCoupons = store.get("custom_coupons", {});
  const allCoupons = { ...COUPONS_STATIC, ...customCoupons };
  const appliedCoupon = store.get("coupon", null);
  let discount = 0;
  if (appliedCoupon && allCoupons[appliedCoupon]) {
    const c = allCoupons[appliedCoupon];
    if (!c.min || subtotal >= c.min) {
      discount = c.type === "pct" ? Math.round(subtotal * c.value / 100) : c.value;
    }
  }
  
  const threshold = 999;
  const shipping = (subtotal - discount) >= threshold ? 0 : 79;
  const total = subtotal - discount + shipping;
  const progressPercent = Math.min(100, ((subtotal - discount) / threshold) * 100);
  const remainingForFree = threshold - (subtotal - discount);
  
  contentHtml += `
    <div class="cart-drawer-items">
      ${ids.map(id => {
        const p = byId(id);
        return `
          <div class="cart-drawer-item">
            <a class="ph" href="product.html?id=${p.id}">${productSVG(p)}</a>
            <div style="flex:1; min-width: 0;">
              <span class="cat">${p.sub}</span>
              <h3 style="font-size:13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 2px 0 4px;"><a href="product.html?id=${p.id}">${p.name}</a></h3>
              <div style="font-weight:600;font-size:12.5px;">${INR(p.price)}</div>
              <div class="qty" style="margin-top:6px;">
                <button onclick="changeQtyDrawer('${p.id}', -1)">−</button>
                <span>${cart[id]}</span>
                <button onclick="changeQtyDrawer('${p.id}', 1)">+</button>
              </div>
            </div>
            <div style="text-align:right; margin-left: 12px; display:flex; flex-direction:column; align-items:flex-end;">
              <div style="font-weight:600;font-size:13px;">${INR(p.price * cart[id])}</div>
              <button class="remove-link" onclick="removeItemDrawer('${p.id}')" style="margin-top:6px;">Remove</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
    
    <div class="cart-drawer-footer">
      <div class="cart-drawer-shipping-progress">
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:500;color:var(--ink-soft);margin-bottom:4px;">
          <span>${remainingForFree > 0 ? `Add ${INR(remainingForFree)} more for Free Shipping` : `You qualify for Free Shipping! ✓`}</span>
          <span>${remainingForFree > 0 ? `${Math.round(progressPercent)}%` : ""}</span>
        </div>
        <div class="shipping-progress-bar">
          <div class="shipping-progress-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>
      
      <div class="sum-row"><span>Subtotal</span><span>${INR(subtotal)}</span></div>
      ${discount ? `<div class="sum-row"><span>Discount (${appliedCoupon})</span><span style="color:#2E7D52">− ${INR(discount)}</span></div>` : ""}
      <div class="sum-row"><span>Shipping</span><span>${shipping ? INR(shipping) : "Free ✓"}</span></div>
      <div class="sum-row total"><span>Total</span><span>${INR(total)}</span></div>
      
      <a class="btn btn-primary" href="cart.html" style="width:100%;margin-top:14px;padding:12px 20px;font-size:12px;">Proceed to Checkout</a>
    </div>
  `;
  
  drawer.innerHTML = contentHtml;
}
function changeQtyDrawer(id, d) {
  const c = getCart();
  c[id] = Math.max(1, (c[id] || 1) + d);
  setCart(c);
  renderCartDrawer();
  if (typeof renderCartPage === "function" && document.querySelector(".cart-layout")) renderCartPage();
}
function removeItemDrawer(id) {
  const c = getCart();
  delete c[id];
  setCart(c);
  renderCartDrawer();
  toast("Removed from cart");
  if (typeof renderCartPage === "function" && document.querySelector(".cart-layout")) renderCartPage();
}

/* ---------------- coupons registry ---------------- */
const COUPONS_STATIC = {
  NEEMS10: { type: "pct", value: 10, label: "10% off" },
  PARCEL200: { type: "flat", value: 200, min: 1499, label: "₹200 off on ₹1,499+" }
};
function getCoupons() {
  const custom = store.get("custom_coupons", {});
  return { ...COUPONS_STATIC, ...custom };
}
function addCoupon(code, couponObj) {
  const custom = store.get("custom_coupons", {});
  custom[code.toUpperCase()] = couponObj;
  store.set("custom_coupons", custom);
}
function deleteCoupon(code) {
  const custom = store.get("custom_coupons", {});
  delete custom[code.toUpperCase()];
  store.set("custom_coupons", custom);
}

/* ---------------- dynamic reviews ---------------- */
function getReviews(productId) {
  const defaultReviews = [
    { name: "Ananya", text: "Exactly like the pictures — the finish is gorgeous and it hasn't tarnished at all.", rating: 5, date: "2 days ago" },
    { name: "Divya", text: "The packaging alone is worth it. Felt like receiving a gift from a friend.", rating: 5, date: "1 week ago" },
    { name: "Ritika", text: "Lightweight and so comfortable, I forgot I was wearing it all day.", rating: 5, date: "2 weeks ago" }
  ];
  const custom = store.get("reviews_" + productId, []);
  return [...custom, ...defaultReviews];
}
function addReview(productId, name, text, rating) {
  const custom = store.get("reviews_" + productId, []);
  custom.unshift({
    name,
    text,
    rating: parseInt(rating),
    date: "Just now"
  });
  store.set("reviews_" + productId, custom);
  
  // Recalculate average rating & counts
  const p = byId(productId);
  if (p) {
    const totalReviews = p.reviews + 1;
    const newRating = parseFloat(((p.rating * p.reviews + rating) / totalReviews).toFixed(1));
    p.reviews = totalReviews;
    p.rating = newRating;
    saveProductEdit(p);
  }
}

/* ---------------- address book CRUD ---------------- */
const DEFAULT_ADDRESSES = [
  { id: "addr_default", label: "Home", name: "Ananya Sharma", line: "221, 4th Cross, Indiranagar", city: "Bengaluru", state: "Karnataka", pincode: "560038", phone: "9876543210", isDefault: true }
];
function getAddresses() {
  const u = getUser();
  if (!u) return [];
  const key = "addresses_user_" + u.mobile;
  let list = store.get(key, []);
  if (!list.length) {
    const defaultAddr = { ...DEFAULT_ADDRESSES[0], name: u.name, phone: u.mobile };
    list = [defaultAddr];
    store.set(key, list);
  }
  return list;
}
function saveAddress(addr) {
  const u = getUser();
  if (!u) return;
  const key = "addresses_user_" + u.mobile;
  let list = getAddresses();
  
  if (addr.isDefault) {
    list.forEach(a => a.isDefault = false);
  }
  
  if (addr.id) {
    const idx = list.findIndex(x => x.id === addr.id);
    if (idx > -1) list[idx] = addr;
  } else {
    addr.id = "addr_" + Date.now();
    if (list.length === 0) addr.isDefault = true;
    list.push(addr);
  }
  store.set(key, list);
}
function deleteAddress(id) {
  const u = getUser();
  if (!u) return;
  const key = "addresses_user_" + u.mobile;
  let list = getAddresses();
  const wasDefault = list.some(x => x.id === id && x.isDefault);
  list = list.filter(x => x.id !== id);
  if (wasDefault && list.length > 0) {
    list[0].isDefault = true;
  }
  store.set(key, list);
}
function setDefaultAddress(id) {
  const u = getUser();
  if (!u) return;
  const key = "addresses_user_" + u.mobile;
  const list = getAddresses();
  list.forEach(a => a.isDefault = (a.id === id));
  store.set(key, list);
}
