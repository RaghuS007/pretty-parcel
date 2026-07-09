import React from "react";
import { StyleSheet, Text, View, Pressable, Dimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Product } from "../data/types";
import { THEME } from "../constants/theme";
import { useStore } from "../store/useStore";
import { ProductImage } from "./ProductImage";
import { RatingStars } from "./RatingStars";

interface ProductCardProps {
  product: Product;
  variant?: number;
  width?: number; // Optional width, otherwise defaults to two-column grid width
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DEFAULT_CARD_WIDTH = (SCREEN_WIDTH - THEME.spacing.lg * 3) / 2; // Two columns grid with padding

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 0,
  width = DEFAULT_CARD_WIDTH,
}) => {
  const wishlist = useStore((state) => state.wishlist);
  const toggleWishlist = useStore((state) => state.toggleWishlist);
  const addToCart = useStore((state) => state.addToCart);
  const showToast = useStore((state) => state.showToast);
  
  const isWishlisted = wishlist.includes(product.id);

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(product.price);

  const formattedMrp = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(product.mrp);

  const hasDiscount = product.mrp > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const handlePress = () => {
    router.push(`/product/${product.id}`);
  };

  const handleQuickAdd = (e: any) => {
    e.stopPropagation(); // Stop navigation to detail page
    addToCart(product.id, 1);
    showToast({
      type: "success",
      title: "Added to Bag ✨",
      message: `${product.name} has been added to your parcel!`,
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { width },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Product Image Panel */}
      <View style={styles.imageContainer}>
        <ProductImage
          product={product}
          width={width}
          height={width} // Square aspect ratio
          variant={variant}
        />

        {/* Badges Overlay */}
        <View style={styles.badgeRow}>
          {product.bestseller && (
            <View style={[styles.badge, styles.bestsellerBadge]}>
              <Text style={styles.badgeText}>BESTSELLER</Text>
            </View>
          )}
          {product.isNew && (
            <View style={[styles.badge, styles.newBadge]}>
              <Text style={styles.badgeText}>NEW</Text>
            </View>
          )}
        </View>

        {/* Wishlist Button Overlay */}
        <Pressable
          onPress={() => toggleWishlist(product.id)}
          style={({ pressed }) => [
            styles.wishlistBtn,
            pressed && styles.wishlistBtnPressed,
          ]}
        >
          <Feather
            name="heart"
            size={16}
            color={isWishlisted ? THEME.colors.primary : THEME.colors.secondary}
            style={isWishlisted && styles.heartFilled}
          />
        </Pressable>
      </View>

      {/* Product Metadata details */}
      <View style={styles.details}>
        <Text style={styles.category} numberOfLines={1}>
          {product.sub}
        </Text>
        
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.ratingRow}>
          <RatingStars rating={product.rating} size={10} />
          <Text style={styles.reviewsCount}>({product.reviews})</Text>
        </View>

        {/* Price & Action Row */}
        <View style={styles.actionRow}>
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{formattedPrice}</Text>
              {hasDiscount && (
                <Text style={styles.mrp}>{formattedMrp}</Text>
              )}
            </View>
            {hasDiscount && (
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            )}
          </View>
          
          <Pressable
            onPress={handleQuickAdd}
            style={({ pressed }) => [
              styles.quickAddBtn,
              pressed && styles.quickAddBtnPressed,
            ]}
          >
            <Feather name="plus" size={12} color={THEME.colors.primary} />
            <Text style={styles.quickAddText}>Add</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.lg,
    ...THEME.shadows.card,
  },
  cardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    position: "relative",
  },
  badgeRow: {
    position: "absolute",
    top: THEME.spacing.sm,
    left: THEME.spacing.sm,
    flexDirection: "row",
    gap: 4,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: THEME.radius.sm,
  },
  bestsellerBadge: {
    backgroundColor: THEME.colors.secondary, // Warm Brown
  },
  newBadge: {
    backgroundColor: THEME.colors.primary, // Antique Gold
  },
  badgeText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 9,
    color: THEME.colors.white,
  },
  wishlistBtn: {
    position: "absolute",
    top: THEME.spacing.sm,
    right: THEME.spacing.sm,
    width: 32,
    height: 32,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.wishlistBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(201, 162, 75, 0.2)",
  },
  wishlistBtnPressed: {
    backgroundColor: THEME.colors.highlight,
  },
  heartFilled: {
    fontWeight: "bold",
  },
  details: {
    padding: THEME.spacing.sm + 2,
    flex: 1,
  },
  category: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  name: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 18,
    marginBottom: 4,
    height: 36, // Force double-line text height alignment
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewsCount: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.inkSoft,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 4,
  },
  priceContainer: {
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 4,
  },
  price: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 14,
    color: THEME.colors.text,
  },
  mrp: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.inkSoft,
    textDecorationLine: "line-through",
  },
  discountText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.success,
    marginTop: 1,
  },
  quickAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.radius.round,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: THEME.colors.white,
    ...THEME.shadows.button,
    shadowOpacity: 0.05,
    elevation: 1,
  },
  quickAddBtnPressed: {
    backgroundColor: THEME.colors.highlight,
  },
  quickAddText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 11,
    color: THEME.colors.primary,
  },
});
