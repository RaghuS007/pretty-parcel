/* The Pretty Parcel by Neems — mock catalogue (prices in INR) */
const CATEGORIES = {
  "demi-fine": "Demi-Fine Jewellery",
  "oxidised": "Traditional & Oxidised",
  "hair": "Hair Accessories"
};

const PALETTES = {
  "demi-fine": ["#F7E3DA", "#EFC9B8"],
  "oxidised":  ["#E9DED8", "#CBB8AE"],
  "hair":      ["#FFE9E0", "#FFD6C9"]
};

// icon: simple line-art per subcategory used by the SVG placeholder
const PRODUCTS = [
  { id:"p01", name:"Aurelia Layered Necklace", cat:"demi-fine", sub:"Necklaces", price:1499, mrp:1899, material:"18k rose-gold plated brass", collection:"Golden Hour", tags:["layered","rose-gold","minimal","everyday"], rating:4.8, reviews:32, bestseller:true, isNew:false, icon:"necklace" },
  { id:"p02", name:"Petal Drop Earrings", cat:"demi-fine", sub:"Earrings", price:899, mrp:1099, material:"Rose-gold plated, cubic zirconia", collection:"First Light", tags:["drop","rose-gold","party","zirconia"], rating:4.7, reviews:21, bestseller:true, isNew:false, icon:"earring" },
  { id:"p03", name:"Mira Chain Bracelet", cat:"demi-fine", sub:"Bracelets", price:749, mrp:949, material:"Gold-tone stainless steel", collection:"Golden Hour", tags:["chain","minimal","everyday","stackable"], rating:4.6, reviews:14, bestseller:false, isNew:true, icon:"bracelet" },
  { id:"p04", name:"Solstice Stacking Rings (Set of 3)", cat:"demi-fine", sub:"Rings", price:999, mrp:1299, material:"Rose-gold plated brass", collection:"First Light", tags:["stackable","minimal","set","rose-gold"], rating:4.9, reviews:41, bestseller:true, isNew:false, icon:"ring" },
  { id:"p05", name:"Sia Pearl Anklet", cat:"demi-fine", sub:"Anklets", price:649, mrp:799, material:"Freshwater pearl, gold-tone chain", collection:"Sea Whisper", tags:["pearl","dainty","summer"], rating:4.5, reviews:9, bestseller:false, isNew:true, icon:"anklet" },
  { id:"p06", name:"Noor Jewellery Set", cat:"demi-fine", sub:"Jewellery Sets", price:2499, mrp:3199, material:"Rose-gold plated, zirconia", collection:"Golden Hour", tags:["set","party","gifting","zirconia","rose-gold"], rating:4.8, reviews:18, bestseller:false, isNew:true, icon:"set" },

  { id:"p07", name:"Rani Oxidised Choker", cat:"oxidised", sub:"Necklaces", price:1299, mrp:1599, material:"Oxidised german silver", collection:"Raat Rani", tags:["oxidised","traditional","choker","festive"], rating:4.9, reviews:56, bestseller:true, isNew:false, icon:"necklace" },
  { id:"p08", name:"Jhilmil Jhumkas", cat:"oxidised", sub:"Earrings", price:799, mrp:999, material:"Oxidised silver-tone alloy", collection:"Raat Rani", tags:["jhumka","oxidised","festive","traditional"], rating:4.8, reviews:63, bestseller:true, isNew:false, icon:"jhumka" },
  { id:"p09", name:"Tara Coin Pendant", cat:"oxidised", sub:"Pendants", price:699, mrp:899, material:"Oxidised german silver", collection:"Mitti", tags:["coin","oxidised","boho","everyday"], rating:4.6, reviews:12, bestseller:false, isNew:true, icon:"pendant" },
  { id:"p10", name:"Meera Carved Bangles (Pair)", cat:"oxidised", sub:"Bangles", price:1099, mrp:1399, material:"Oxidised brass, hand-carved", collection:"Mitti", tags:["bangles","oxidised","traditional","pair"], rating:4.7, reviews:24, bestseller:false, isNew:false, icon:"bangle" },

  { id:"p11", name:"Peach Blush Claw Clip", cat:"hair", sub:"Claw Clips", price:399, mrp:499, material:"Cellulose acetate", collection:"Soft Hour", tags:["claw","peach","matte","everyday"], rating:4.7, reviews:48, bestseller:true, isNew:false, icon:"claw" },
  { id:"p12", name:"Ivory Pearl Hair Clip Duo", cat:"hair", sub:"Hair Clips", price:349, mrp:449, material:"Faux pearl, gold-tone alloy", collection:"Soft Hour", tags:["pearl","clip","duo","party"], rating:4.6, reviews:17, bestseller:false, isNew:true, icon:"clip" },
  { id:"p13", name:"Velvet Ribbon Hair Band", cat:"hair", sub:"Hair Bands", price:299, mrp:399, material:"Velvet over flexible frame", collection:"Soft Hour", tags:["band","velvet","minimal"], rating:4.4, reviews:8, bestseller:false, isNew:false, icon:"band" },
  { id:"p14", name:"Satin Scrunchie Trio", cat:"hair", sub:"Scrunchies", price:329, mrp:429, material:"Mulberry satin", collection:"Soft Hour", tags:["scrunchie","satin","set","everyday"], rating:4.8, reviews:35, bestseller:true, isNew:false, icon:"scrunchie" },
  { id:"p15", name:"Grand Peach Bow", cat:"hair", sub:"Hair Bows", price:449, mrp:549, material:"Structured satin bow", collection:"Soft Hour", tags:["bow","peach","statement","gifting"], rating:4.9, reviews:26, bestseller:false, isNew:true, icon:"bow" },
  { id:"p16", name:"Champa Flower Studs", cat:"oxidised", sub:"Earrings", price:549, mrp:699, material:"Oxidised silver-tone alloy", collection:"Mitti", tags:["studs","oxidised","floral","everyday"], rating:4.5, reviews:11, bestseller:false, isNew:true, icon:"earring" }
];

/* Complementary category rules (PRD §8b fallback) */
const COMPLEMENT_RULES = {
  "Necklaces": ["Earrings", "Bracelets"],
  "Claw Clips": ["Scrunchies", "Hair Bows"],
  "Hair Clips": ["Scrunchies", "Hair Bows"],
  "Earrings": ["Necklaces", "Pendants"],
  "Pendants": ["Earrings"],
  "Bangles": ["Earrings", "Rings"],
  "Rings": ["Bracelets"],
  "Bracelets": ["Rings", "Necklaces"],
  "Scrunchies": ["Claw Clips", "Hair Bows"],
  "Hair Bows": ["Claw Clips", "Scrunchies"],
  "Hair Bands": ["Hair Clips"],
  "Anklets": ["Bracelets"],
  "Jewellery Sets": ["Rings"]
};
