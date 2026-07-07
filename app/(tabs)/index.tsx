import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Product } from "../../src/data/types";
import { ProductRepository } from "../../src/repository";
import { THEME } from "../../src/constants/theme";
import { useStore } from "../../src/store/useStore";
import { ProductCard } from "../../src/components/ProductCard";
import { SupportDrawer } from "../../src/components/SupportDrawer";
import { ProductImage } from "../../src/components/ProductImage";

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Read recently viewed IDs from store
  const recentlyViewedIds = useStore((state) => state.recentlyViewed);
  const clearViewed = useStore((state) => state.clearViewed);
  const showToast = useStore((state) => state.showToast);

  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  // Responsive card width for Best Sellers (4 columns on PC, 2 columns on mobile)
  const cardWidth = isDesktop
    ? (Math.min(windowWidth, THEME.layout.maxWidth) - THEME.spacing.lg * 5) / 4
    : (windowWidth - THEME.spacing.lg * 3) / 2;

  // Testimonial card width
  const testimonialWidth = isDesktop ? 600 : windowWidth - THEME.spacing.lg * 2;

  // Instagram cell size
  const instaCellSize = isDesktop
    ? 180
    : (windowWidth - THEME.spacing.lg * 2 - 24) / 4;

  const contentMaxWidthStyle = isDesktop
    ? { maxWidth: THEME.layout.maxWidth, width: "100%" as const, alignSelf: "center" as const }
    : null;

  // Fetch products catalog on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await ProductRepository.getProducts();
        setProducts(data);
      } catch (err) {
        console.error("Error loading products:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter lists
  const newArrivals = products.filter((p) => p.isNew);
  const bestSellers = products.filter((p) => p.bestseller);
  const hairEssentials = products.filter((p) => p.cat === "hair");
  
  // Resolve recently viewed objects from catalog list
  const recentlyViewedProducts = recentlyViewedIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);

  const handleSubscribe = () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      showToast({
        type: "error",
        title: "Invalid Email",
        message: "Please enter a valid email address.",
      });
      return;
    }
    setSubscribed(true);
    setEmailInput("");
    showToast({
      type: "success",
      title: "Subscribed! ✨",
      message: "Thank you for joining our newsletter. Enjoy exclusive access to new arrivals & promotions.",
    });
  };

  const navigateToCategory = (catId: string) => {
    router.push({
      pathname: "/(tabs)/shop",
      params: { category: catId },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Unwrapping your experience...</Text>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={contentMaxWidthStyle}>
        {/* Branding Header Area */}
        <View style={styles.brandHeader}>
          <Text style={styles.brandTitle}>The Pretty Parcel</Text>
          <Text style={styles.brandSubtitle}>by Neems</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroPreTitle}>CURATED ELEGANCE</Text>
            <Text style={styles.heroTitle}>Handcrafted demi-fine jewellery for every mood</Text>
            <Text style={styles.heroDescription}>
              Carefully wrapped with love, designed to shine in your everyday moments.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/shop")}
              style={({ pressed }) => [
                styles.heroButton,
                pressed && styles.heroButtonPressed,
              ]}
            >
              <Text style={styles.heroButtonText}>Shop New Arrivals</Text>
              <Feather name="arrow-right" size={14} color={THEME.colors.white} />
            </Pressable>
          </View>
        </View>

        {/* Categories Horizontal Band */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {/* Category Card 1 */}
            <Pressable
              onPress={() => navigateToCategory("demi-fine")}
              style={styles.categoryCard}
            >
              <View style={[styles.categoryCircle, { backgroundColor: "#F7E3DA" }]}>
                <Feather name="gift" size={20} color={THEME.colors.secondary} />
              </View>
              <Text style={styles.categoryName}>Demi-Fine</Text>
            </Pressable>

            {/* Category Card 2 */}
            <Pressable
              onPress={() => navigateToCategory("oxidised")}
              style={styles.categoryCard}
            >
              <View style={[styles.categoryCircle, { backgroundColor: "#E9DED8" }]}>
                <Feather name="sunset" size={20} color={THEME.colors.secondary} />
              </View>
              <Text style={styles.categoryName}>Oxidised Edit</Text>
            </Pressable>

            {/* Category Card 3 */}
            <Pressable
              onPress={() => navigateToCategory("hair")}
              style={styles.categoryCard}
            >
              <View style={[styles.categoryCircle, { backgroundColor: "#FFE9E0" }]}>
                <Feather name="scissors" size={20} color={THEME.colors.secondary} />
              </View>
              <Text style={styles.categoryName}>Hair Styling</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* New Arrivals Strip */}
        {newArrivals.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Arrivals</Text>
              <Pressable onPress={() => router.push("/(tabs)/shop")}>
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalGridContainer}
            >
              {newArrivals.map((product, index) => (
                <View key={product.id} style={styles.horizontalCardWrapper}>
                  <ProductCard product={product} variant={index} width={150} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Best Sellers Grid */}
        {bestSellers.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Best Sellers</Text>
            <View style={styles.gridContainer}>
              {bestSellers.map((product, index) => (
                <ProductCard key={product.id} product={product} variant={index} width={cardWidth} />
              ))}
            </View>
          </View>
        )}

        {/* The Oxidised Edit Promo Banner */}
        <View style={styles.promoBanner}>
          <Text style={styles.promoTag}>TRADITIONAL HERITAGE</Text>
          <Text style={styles.promoTitle}>The Silver & Oxidised Collection</Text>
          <Text style={styles.promoText}>
            Timeless carvings and rust-resistant metallic finish. Perfect companion for ethnic wear.
          </Text>
          <Pressable
            onPress={() => navigateToCategory("oxidised")}
            style={({ pressed }) => [
              styles.promoBtn,
              pressed && styles.promoBtnPressed,
            ]}
          >
            <Text style={styles.promoBtnText}>Explore Traditional</Text>
          </Pressable>
        </View>

        {/* Hair Accessories Row */}
        {hairEssentials.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hair Essentials</Text>
              <Pressable onPress={() => navigateToCategory("hair")}>
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalGridContainer}
            >
              {hairEssentials.map((product, index) => (
                <View key={product.id} style={styles.horizontalCardWrapper}>
                  <ProductCard product={product} variant={index + 2} width={150} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recently Viewed Strip */}
        {recentlyViewedProducts.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Viewed</Text>
              <Pressable onPress={clearViewed}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalGridContainer}
            >
              {recentlyViewedProducts.map((product, index) => (
                <View key={product.id} style={styles.horizontalCardWrapper}>
                  <ProductCard product={product} variant={index + 4} width={140} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Testimonials */}
        <View style={[styles.sectionContainer, styles.testimonialBg]}>
          <Text style={styles.sectionTitleCenter}>Loved by Customers</Text>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialsContainer}
          >
            <View style={[styles.testimonialCard, { width: testimonialWidth }]}>
              <View style={styles.quoteIcon}>
                <Feather name="message-circle" size={24} color={THEME.colors.primary} />
              </View>
              <Text style={styles.testimonialText}>
                "The packaging felt like opening a luxury birthday parcel. The Aurelia necklace is super elegant and didn't tarnish after weeks of daily wear."
              </Text>
              <Text style={styles.testimonialAuthor}>— Riya K., Bangalore</Text>
            </View>

            <View style={[styles.testimonialCard, { width: testimonialWidth }]}>
              <View style={styles.quoteIcon}>
                <Feather name="message-circle" size={24} color={THEME.colors.primary} />
              </View>
              <Text style={styles.testimonialText}>
                "Absolutely fell in love with the satin scrunchies and claw clips. Holds my thick hair perfectly and feels incredibly soft. Definitely buying again!"
              </Text>
              <Text style={styles.testimonialAuthor}>— Priya M., Delhi</Text>
            </View>
          </ScrollView>
        </View>

        {/* Instagram Grid Mockup */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitleCenter}>Follow Us On Instagram</Text>
          <Text style={styles.instaHandle}>@theprettyparcel.neems</Text>
          <View style={styles.instaGrid}>
            <View style={[styles.instaCell, { width: instaCellSize, height: instaCellSize }]}>
              <View style={[styles.instaPlaceholder, { backgroundColor: "#F7E3DA" }]} />
              <Feather name="instagram" size={16} color={THEME.colors.text} style={styles.instaIcon} />
            </View>
            <View style={[styles.instaCell, { width: instaCellSize, height: instaCellSize }]}>
              <View style={[styles.instaPlaceholder, { backgroundColor: "#E9DED8" }]} />
              <Feather name="instagram" size={16} color={THEME.colors.text} style={styles.instaIcon} />
            </View>
            <View style={[styles.instaCell, { width: instaCellSize, height: instaCellSize }]}>
              <View style={[styles.instaPlaceholder, { backgroundColor: "#FFE9E0" }]} />
              <Feather name="instagram" size={16} color={THEME.colors.text} style={styles.instaIcon} />
            </View>
            <View style={[styles.instaCell, { width: instaCellSize, height: instaCellSize }]}>
              <View style={[styles.instaPlaceholder, { backgroundColor: "#FBF7F0" }]} />
              <Feather name="instagram" size={16} color={THEME.colors.text} style={styles.instaIcon} />
            </View>
          </View>
        </View>

        {/* Newsletter Section */}
        <View style={styles.newsletterCard}>
          <Feather name="mail" size={24} color={THEME.colors.primary} style={{ alignSelf: "center", marginBottom: 8 }} />
          <Text style={styles.newsletterTitle}>Join the Parcel Club</Text>
          <Text style={styles.newsletterDesc}>
            Subscribe to get early stock drops, styling guides, and first purchase gifts.
          </Text>
          
          <View style={styles.newsletterForm}>
            <TextInput
              style={styles.newsletterInput}
              placeholder="Your email address"
              placeholderTextColor={THEME.colors.inkSoft}
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable onPress={handleSubscribe} style={styles.newsletterBtn}>
              <Text style={styles.newsletterBtnText}>Subscribe</Text>
            </Pressable>
          </View>
        </View>

        {/* Footer Info Box */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerBrand}>The Pretty Parcel by Neems</Text>
          <Text style={styles.footerText}>Handcrafted Demi-Fine & Fashion Jewelry.</Text>
          <Text style={styles.footerText}>Made with 🤍 in Bengaluru, India.</Text>
        </View>
        </View>
      </ScrollView>

      {/* Reusable Support Drawer chat bubble overlay */}
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
  brandHeader: {
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  brandTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 26,
    color: THEME.colors.text,
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontFamily: THEME.fonts.display.italic,
    fontSize: 14,
    color: THEME.colors.primary,
    marginTop: -2,
  },
  heroSection: {
    backgroundColor: "#FFEBE5", // Soft Peach backdrop
    paddingVertical: THEME.spacing.xxl + 8,
    paddingHorizontal: THEME.spacing.lg,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  heroTextContainer: {
    alignItems: "center",
    maxWidth: 320,
  },
  heroPreTitle: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.secondary,
    letterSpacing: 3,
    marginBottom: THEME.spacing.sm,
  },
  heroTitle: {
    fontFamily: THEME.fonts.display.regular,
    fontSize: 22,
    color: THEME.colors.text,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: THEME.spacing.sm,
  },
  heroDescription: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: THEME.spacing.lg,
  },
  heroButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: THEME.radius.round,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...THEME.shadows.button,
  },
  heroButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  heroButtonText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 13,
    color: THEME.colors.white,
  },
  sectionContainer: {
    paddingVertical: THEME.spacing.xl,
    paddingHorizontal: THEME.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 20,
    color: THEME.colors.text,
  },
  sectionTitleCenter: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 20,
    color: THEME.colors.text,
    textAlign: "center",
  },
  seeAllText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.primary,
  },
  clearAllText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.secondary,
    textDecorationLine: "underline",
  },
  categoriesContainer: {
    gap: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
  },
  categoryCard: {
    alignItems: "center",
    width: 90,
  },
  categoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  categoryName: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 11,
    color: THEME.colors.text,
    textAlign: "center",
  },
  horizontalGridContainer: {
    gap: THEME.spacing.md,
  },
  horizontalCardWrapper: {
    // Limits the size of horizontal cards inside rows
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingTop: THEME.spacing.sm,
  },
  promoBanner: {
    backgroundColor: "#F4ECE1", // Warm background block
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.md,
    padding: THEME.spacing.xl,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  promoTag: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 9,
    color: THEME.colors.secondary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  promoTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 20,
    color: THEME.colors.text,
    marginBottom: 6,
  },
  promoText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    lineHeight: 18,
    marginBottom: THEME.spacing.md,
  },
  promoBtn: {
    backgroundColor: THEME.colors.secondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.round,
    alignSelf: "flex-start",
  },
  promoBtnPressed: {
    opacity: 0.9,
  },
  promoBtnText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.white,
  },
  testimonialBg: {
    backgroundColor: THEME.colors.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: THEME.spacing.xl + 6,
  },
  testimonialsContainer: {
    paddingTop: THEME.spacing.lg,
  },
  testimonialCard: {
    // Width is set dynamically via inline style
    alignItems: "center",
    paddingHorizontal: THEME.spacing.lg,
  },
  quoteIcon: {
    marginBottom: THEME.spacing.sm,
  },
  testimonialText: {
    fontFamily: THEME.fonts.display.regular,
    fontSize: 15,
    fontStyle: "italic",
    color: THEME.colors.text,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: THEME.spacing.md,
  },
  testimonialAuthor: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 11,
    color: THEME.colors.secondary,
  },
  instaHandle: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 11,
    color: THEME.colors.primary,
    textAlign: "center",
    marginTop: 2,
    marginBottom: THEME.spacing.md,
  },
  instaGrid: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  instaCell: {
    position: "relative",
    // Width and height are set dynamically via inline style
    borderRadius: THEME.radius.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  instaPlaceholder: {
    width: "100%",
    height: "100%",
  },
  instaIcon: {
    position: "absolute",
    bottom: 6,
    right: 6,
    opacity: 0.6,
  },
  newsletterCard: {
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.xl,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xl,
    ...THEME.shadows.card,
  },
  newsletterTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 18,
    color: THEME.colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  newsletterDesc: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.secondary,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: THEME.spacing.md,
  },
  newsletterForm: {
    gap: 8,
  },
  newsletterInput: {
    height: 40,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.round,
    paddingHorizontal: THEME.spacing.md,
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.text,
  },
  newsletterBtn: {
    backgroundColor: THEME.colors.primary,
    height: 40,
    borderRadius: THEME.radius.round,
    alignItems: "center",
    justifyContent: "center",
  },
  newsletterBtnText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 13,
    color: THEME.colors.white,
  },
  footerContainer: {
    alignItems: "center",
    paddingVertical: THEME.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    marginTop: THEME.spacing.xl,
  },
  footerBrand: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 14,
    color: THEME.colors.text,
    marginBottom: 4,
  },
  footerText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
    lineHeight: 14,
  },
});
