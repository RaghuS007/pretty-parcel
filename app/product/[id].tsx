import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Product, Review } from "../../src/data/types";
import { ProductRepository } from "../../src/repository";
import { THEME } from "../../src/constants/theme";
import { useStore } from "../../src/store/useStore";
import { ProductImage } from "../../src/components/ProductImage";
import { RatingStars } from "../../src/components/RatingStars";
import { ProductCard } from "../../src/components/ProductCard";
import { SupportDrawer } from "../../src/components/SupportDrawer";

// Mock reviews generation based on product categories
const MOCK_REVIEWS_CATALOG: Record<string, Review[]> = {
  "demi-fine": [
    { name: "Meera Nair", rating: 5, date: "12 May 2026", text: "Stunning finish! It has a very luxury feel and looks beautiful when layered." },
    { name: "Kriti S.", rating: 4, date: "28 April 2026", text: "Very delicate and pretty. Just make sure to keep it dry as recommended." },
    { name: "Aaradhya G.", rating: 5, date: "15 April 2026", text: "Perfect gift! The packaging is superb." }
  ],
  "oxidised": [
    { name: "Aditi Sharma", rating: 5, date: "02 June 2026", text: "Gorgeous carvings! Looks very authentic and pairs beautifully with traditional kurtas." },
    { name: "Nisha Patel", rating: 4, date: "19 May 2026", text: "Nice weight and antique silver look. Got many compliments at the festival!" }
  ],
  "hair": [
    { name: "Tanya Sen", rating: 5, date: "10 June 2026", text: "Incredibly smooth. Doesn't pull on hair at all and looks very aesthetic." },
    { name: "Pooja R.", rating: 5, date: "24 May 2026", text: "Holds my thick hair perfectly. Beautiful pastel shade!" }
  ]
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Gallery Variant index State
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Stepper State
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  // Accordion Expand States
  const [isMaterialExpanded, setIsMaterialExpanded] = useState(true);
  const [isCareExpanded, setIsCareExpanded] = useState(false);
  const [isShippingExpanded, setIsShippingExpanded] = useState(false);

  // Store actions
  const wishlist = useStore((state) => state.wishlist);
  const toggleWishlist = useStore((state) => state.toggleWishlist);
  const addToCart = useStore((state) => state.addToCart);
  const addViewedProduct = useStore((state) => state.addViewedProduct);

  const isWishlisted = product ? wishlist.includes(product.id) : false;

  useEffect(() => {
    async function loadProductData() {
      if (!id) return;
      try {
        setLoading(true);
        const [prodItem, catalog] = await Promise.all([
          ProductRepository.getProductById(id),
          ProductRepository.getProducts(),
        ]);
        
        if (prodItem) {
          setProduct(prodItem);
          setAllProducts(catalog);
          
          // Track recently viewed view on load
          addViewedProduct(prodItem.id);
        }
      } catch (err) {
        console.error("Failed to load product details:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadProductData();
  }, [id]);

  // Stepper Handlers
  const handleIncrement = () => setQuantity((prev) => prev + 1);
  const handleDecrement = () => setQuantity((prev) => Math.max(1, prev - 1));

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product.id, quantity);
    setAddedFeedback(true);
    setTimeout(() => {
      setAddedFeedback(false);
    }, 2500);
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out the gorgeous ${product.name} at The Pretty Parcel! ✨ Only for ${formattedPrice(product.price)}`,
      });
    } catch (e) {
      console.error("Failed to share product:", e);
    }
  };

  // RECOMMENDATION ENGINE LOGIC (PRD §8 - Content-Based Scoring)
  const getRecommendedProducts = (): Product[] => {
    if (!product) return [];

    const calculateJaccard = (tagsA: string[], tagsB: string[]): number => {
      const setA = new Set(tagsA.map((t) => t.toLowerCase()));
      const setB = new Set(tagsB.map((t) => t.toLowerCase()));
      const intersection = new Set([...setA].filter((x) => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      return union.size > 0 ? intersection.size / union.size : 0;
    };

    const getMaterialMatch = (matA: string, matB: string): number => {
      const keywords = ["gold", "silver", "satin", "pearl", "brass", "zirconia", "velvet", "cellulose"];
      const wordsA = matA.toLowerCase().split(/[\s,]+/);
      const match = wordsA.some((w) => matB.toLowerCase().includes(w) && keywords.includes(w));
      return match ? 10 : 0;
    };

    const scored = allProducts
      .filter((p) => p.id !== product.id) // Exclude current product
      .map((p) => {
        let score = 0;

        // 1. Category Match (45 Points)
        if (p.cat === product.cat) score += 45;

        // 2. Tag Jaccard Similarity (25 Points)
        const jaccard = calculateJaccard(p.tags, product.tags);
        score += jaccard * 25;

        // 3. Price ±30% Proximity band (15 Points)
        const priceDiff = Math.abs(p.price - product.price);
        const withinBand = priceDiff / product.price <= 0.3;
        if (withinBand) score += 15;

        // 4. Material Match (10 Points)
        score += getMaterialMatch(p.material, product.material);

        // 5. Collection Match (5 Points)
        if (p.collection === product.collection) score += 5;

        return { product: p, score };
      });

    // Sort descending by score and pick top 4 items
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => item.product);
  };

  const formattedPrice = (priceVal: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(priceVal);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Polishing details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-triangle" size={32} color={THEME.colors.primary} />
        <Text style={styles.errorText}>Oops! Product not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isDesktop = windowWidth >= 768;
  const SCREEN_WIDTH = isDesktop ? Math.min(windowWidth, 1200) / 2 : windowWidth;

  const discountPercent = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  const reviewsList = MOCK_REVIEWS_CATALOG[product.cat] || MOCK_REVIEWS_CATALOG["demi-fine"];
  const recommendedItems = getRecommendedProducts();

  return (
    <View style={styles.outerContainer}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[isDesktop && { flexDirection: "row", maxWidth: 1200, width: "100%", alignSelf: "center", gap: 24, padding: 24 }]}>
          
          {/* Left Column: Gallery Image Box */}
          <View style={isDesktop ? { width: "50%" } : null}>
            <View style={styles.galleryContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const offset = e.nativeEvent.contentOffset.x;
                  const index = Math.round(offset / SCREEN_WIDTH);
                  setActiveImageIndex(index);
                }}
                scrollEventThrottle={16}
              >
                <View style={[styles.gallerySlide, { width: SCREEN_WIDTH, height: SCREEN_WIDTH }]}>
                  <ProductImage product={product} width={SCREEN_WIDTH} height={SCREEN_WIDTH} variant={0} />
                </View>
                <View style={[styles.gallerySlide, { width: SCREEN_WIDTH, height: SCREEN_WIDTH }]}>
                  <ProductImage product={product} width={SCREEN_WIDTH} height={SCREEN_WIDTH} variant={1} />
                </View>
              </ScrollView>

            {/* Dots Indicator */}
            <View style={styles.indicatorContainer}>
              <View style={[styles.dot, activeImageIndex === 0 && styles.activeDot]} />
              <View style={[styles.dot, activeImageIndex === 1 && styles.activeDot]} />
            </View>
          </View>
          </View>

          {/* Right Column: Title, pricing, CTA, details */}
          <View style={isDesktop ? { width: "50%" } : null}>
            {/* Product Details Panel */}
            <View style={styles.infoCard}>
          <View style={styles.metaRow}>
            <Text style={styles.categoryTag}>{product.sub}</Text>
            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <Feather name="share-2" size={16} color={THEME.colors.secondary} />
            </Pressable>
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.collectionText}>Collection: {product.collection}</Text>

          <View style={styles.ratingRow}>
            <RatingStars rating={product.rating} reviews={product.reviews} size={13} />
          </View>

          {/* Price panel */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formattedPrice(product.price)}</Text>
            {product.mrp > product.price && (
              <>
                <Text style={styles.mrp}>{formattedPrice(product.mrp)}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>Save {discountPercent}%</Text>
                </View>
              </>
            )}
          </View>

          {/* CTA controls */}
          <View style={styles.ctaRow}>
            {/* Stepper */}
            <View style={styles.stepperContainer}>
              <Pressable onPress={handleDecrement} style={styles.stepperBtn}>
                <Feather name="minus" size={14} color={THEME.colors.text} />
              </Pressable>
              <Text style={styles.stepperValue}>{quantity}</Text>
              <Pressable onPress={handleIncrement} style={styles.stepperBtn}>
                <Feather name="plus" size={14} color={THEME.colors.text} />
              </Pressable>
            </View>

            {/* Add button */}
            <Pressable
              onPress={handleAddToCart}
              style={({ pressed }) => [
                styles.addToCartBtn,
                addedFeedback && styles.addToCartBtnSuccess,
                pressed && styles.addToCartBtnPressed,
              ]}
            >
              <Feather
                name={addedFeedback ? "check-circle" : "shopping-bag"}
                size={16}
                color={THEME.colors.white}
              />
              <Text style={styles.addToCartText}>
                {addedFeedback ? "Added to Parcel!" : "Add to Cart"}
              </Text>
            </Pressable>
          </View>

          {/* Wishlist toggle anchor */}
          <Pressable
            onPress={() => toggleWishlist(product.id)}
            style={({ pressed }) => [
              styles.wishlistBar,
              pressed && styles.wishlistBarPressed,
            ]}
          >
            <Feather
              name="heart"
              size={16}
              color={isWishlisted ? THEME.colors.primary : THEME.colors.secondary}
            />
            <Text style={[styles.wishlistBarText, isWishlisted && styles.wishlistBarTextActive]}>
              {isWishlisted ? "In Wishlist (Tap to Remove)" : "Add to Wishlist"}
            </Text>
          </Pressable>
        </View>

        {/* Collapsible details (Accordions) */}
        <View style={styles.accordionContainer}>
          {/* 1. Material */}
          <View style={styles.accordionItem}>
            <Pressable
              onPress={() => setIsMaterialExpanded(!isMaterialExpanded)}
              style={styles.accordionHeader}
            >
              <Text style={styles.accordionTitle}>Material & Composition</Text>
              <Feather
                name={isMaterialExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={THEME.colors.text}
              />
            </Pressable>
            {isMaterialExpanded && (
              <View style={styles.accordionBody}>
                <Text style={styles.accordionBodyText}>
                  This piece is handcrafted in {product.material} with premium shine coatings to ensure rust resistance.
                </Text>
              </View>
            )}
          </View>

          {/* 2. Care Instructions */}
          <View style={styles.accordionItem}>
            <Pressable
              onPress={() => setIsCareExpanded(!isCareExpanded)}
              style={styles.accordionHeader}
            >
              <Text style={styles.accordionTitle}>Jewellery Care Guide</Text>
              <Feather
                name={isCareExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={THEME.colors.text}
              />
            </Pressable>
            {isCareExpanded && (
              <View style={styles.accordionBody}>
                <Text style={styles.accordionBodyText}>
                  • Avoid contact with cosmetics, perfume, hairsprays, or water.{"\n"}
                  • Remove before workouts, showers, or sleep.{"\n"}
                  • Store individually in airtight plastic zip lock baggies.{"\n"}
                  • Gently clean using soft microfiber cloths after wear.
                </Text>
              </View>
            )}
          </View>

          {/* 3. Shipping & Returns */}
          <View style={styles.accordionItem}>
            <Pressable
              onPress={() => setIsShippingExpanded(!isShippingExpanded)}
              style={styles.accordionHeader}
            >
              <Text style={styles.accordionTitle}>Shipping & Returns</Text>
              <Feather
                name={isShippingExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={THEME.colors.text}
              />
            </Pressable>
            {isShippingExpanded && (
              <View style={styles.accordionBody}>
                <Text style={styles.accordionBodyText}>
                  • **Free standard delivery** across India on order totals above ₹999.{"\n"}
                  • Flat ₹79 shipping charge applied otherwise.{"\n"}
                  • Dispatched within 24 hours, delivered in 3-5 business days.{"\n"}
                  • Hassle-free **7-day return policy** on unworn jewelry items.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Reviews list */}
        <View style={[styles.sectionContainer, isDesktop && { maxWidth: 1200, width: "100%", alignSelf: "center" }]}>
          <Text style={styles.sectionTitle}>Customer Reviews</Text>
          <View style={styles.reviewsSummaryCard}>
            <Text style={styles.summaryValue}>{product.rating}</Text>
            <View style={styles.summaryStarsRow}>
              <RatingStars rating={product.rating} size={14} />
              <Text style={styles.summaryCount}>Based on {product.reviews} reviews</Text>
            </View>
          </View>

          <View style={styles.reviewsListContainer}>
            {reviewsList.map((rev, idx) => (
              <View key={idx} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>{rev.name}</Text>
                  <Text style={styles.reviewDate}>{rev.date}</Text>
                </View>
                <View style={styles.reviewStarsRow}>
                  <RatingStars rating={rev.rating} size={10} />
                </View>
                <Text style={styles.reviewBodyText}>{rev.text}</Text>
              </View>
            ))}
          </View>
        </View>
        </View> {/* Close right column */}
        </View> {/* Close split columns wrapper */}

        {/* "You may also love" recommendations (Scored) */}
        {recommendedItems.length > 0 && (
          <View style={[styles.sectionContainer, isDesktop && { maxWidth: 1200, width: "100%", alignSelf: "center" }]}>
            <Text style={styles.sectionTitle}>You May Also Love</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScrollContainer}
            >
              {recommendedItems.map((recProd, index) => (
                <View key={recProd.id} style={styles.recommendedCardWrapper}>
                  <ProductCard product={recProd} variant={index + 3} width={150} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      {/* Support chat bubble overlay */}
      <SupportDrawer />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: THEME.fonts.body.medium,
    color: THEME.colors.primary,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 30,
  },
  errorText: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 18,
    color: THEME.colors.text,
  },
  backBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: THEME.radius.round,
  },
  backBtnText: {
    fontFamily: THEME.fonts.body.medium,
    color: THEME.colors.white,
    fontSize: 12,
  },
  galleryContainer: {
    position: "relative",
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  gallerySlide: {
    // Width and height handled dynamically in render
  },
  indicatorContainer: {
    position: "absolute",
    bottom: THEME.spacing.md,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(44, 44, 42, 0.2)",
  },
  activeDot: {
    backgroundColor: THEME.colors.primary,
    width: 14,
  },
  infoCard: {
    backgroundColor: THEME.colors.white,
    padding: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    ...THEME.shadows.card,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  categoryTag: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  shareBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 22,
    color: THEME.colors.text,
    lineHeight: 28,
    marginBottom: 2,
  },
  collectionText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.inkSoft,
    marginBottom: THEME.spacing.sm,
  },
  ratingRow: {
    marginBottom: THEME.spacing.md,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: THEME.spacing.lg,
  },
  price: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 20,
    color: THEME.colors.text,
  },
  mrp: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 14,
    color: THEME.colors.inkSoft,
    textDecorationLine: "line-through",
  },
  discountBadge: {
    backgroundColor: THEME.colors.highlight,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: THEME.radius.sm,
  },
  discountText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.secondary,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: THEME.spacing.md,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.background,
    overflow: "hidden",
  },
  stepperBtn: {
    width: 36,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    width: 24,
    textAlign: "center",
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.text,
  },
  addToCartBtn: {
    flex: 1,
    height: 40,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.round,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...THEME.shadows.button,
  },
  addToCartBtnSuccess: {
    backgroundColor: THEME.colors.success,
  },
  addToCartBtnPressed: {
    opacity: 0.9,
  },
  addToCartText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
  wishlistBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.round,
    marginTop: 4,
  },
  wishlistBarPressed: {
    backgroundColor: THEME.colors.background,
  },
  wishlistBarText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
  wishlistBarTextActive: {
    color: THEME.colors.primary,
  },
  accordionContainer: {
    marginTop: THEME.spacing.md,
    backgroundColor: THEME.colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
  },
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
  },
  accordionTitle: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 13,
    color: THEME.colors.text,
  },
  accordionBody: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
  },
  accordionBodyText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    lineHeight: 18,
  },
  sectionContainer: {
    paddingVertical: THEME.spacing.xl,
    paddingHorizontal: THEME.spacing.lg,
  },
  sectionTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 18,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  reviewsSummaryCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: THEME.spacing.lg,
  },
  summaryValue: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 32,
    color: THEME.colors.text,
  },
  summaryStarsRow: {
    flex: 1,
    gap: 4,
  },
  summaryCount: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.inkSoft,
  },
  reviewsListContainer: {
    gap: 12,
  },
  reviewItem: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  reviewAuthor: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: THEME.colors.text,
  },
  reviewDate: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.inkSoft,
  },
  reviewStarsRow: {
    marginBottom: 6,
  },
  reviewBodyText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    lineHeight: 18,
  },
  horizontalScrollContainer: {
    gap: THEME.spacing.md,
  },
  recommendedCardWrapper: {
    // Limits the size of horizontal cards inside rows
  },
});
