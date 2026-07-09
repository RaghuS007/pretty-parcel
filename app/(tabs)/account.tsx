import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Product, Order, Address } from "../../src/data/types";
import { ProductRepository, OrderRepository } from "../../src/repository";
import { THEME } from "../../src/constants/theme";
import { useStore } from "../../src/store/useStore";
import { ProductCard } from "../../src/components/ProductCard";
import { SupportDrawer } from "../../src/components/SupportDrawer";
import { DEFAULT_ADDRESSES } from "../../src/data/mockProducts";
import { DesktopHeader } from "../../src/components/DesktopHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function AccountScreen() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  // Store bindings
  const user = useStore((state) => state.user);
  const logoutUser = useStore((state) => state.logoutUser);
  const wishlist = useStore((state) => state.wishlist);
  const cart = useStore((state) => state.cart);
  const orders = useStore((state) => state.orders);
  const setOrders = useStore((state) => state.setOrders);
  const recentlyViewedIds = useStore((state) => state.recentlyViewed);
  const clearViewed = useStore((state) => state.clearViewed);

  // Fetch catalog on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await ProductRepository.getProducts();
        setAllProducts(data);
      } catch (err) {
        console.error("Error loading products in account:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fetch orders from disk when user mobile session changes
  useEffect(() => {
    if (user) {
      const userMobile = user.mobile;
      async function loadUserOrders() {
        try {
          const list = await OrderRepository.getOrders(userMobile);
          setOrders(list);
        } catch (e) {
          console.error("Failed to load user orders:", e);
        }
      }
      loadUserOrders();
    }
  }, [user]);

  // Resolve objects
  const wishlistedProducts = wishlist
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is Product => !!p);

  const recentlyViewedProducts = recentlyViewedIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is Product => !!p);

  const cartItemCount = Object.values(cart).reduce((acc, qty) => acc + qty, 0);

  const formattedPrice = (priceVal: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(priceVal);
  };

  const handleLogout = () => {
    logoutUser();
    AlertLogoutSuccess();
  };

  const AlertLogoutSuccess = () => {
    // Standard react-native Alert works, but since we are returning a mock clean logout:
    router.replace("/");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Opening profile drawer...</Text>
      </View>
    );
  }

  // 1. GUEST MODE VIEW
  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <DesktopHeader />
        <ScrollView contentContainerStyle={styles.guestScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.guestCard}>
            <View style={styles.guestIconCircle}>
              <Feather name="user-check" size={32} color={THEME.colors.primary} />
            </View>
            <Text style={styles.guestTitle}>Unwrap Personalized Styling</Text>
            <Text style={styles.guestDesc}>
              Log in with your phone number to track pending orders, save shipping addresses, and sync your favorite wishlist items across devices.
            </Text>
            <Pressable
              onPress={() => router.push("/auth/login")}
              style={({ pressed }) => [styles.loginBtn, pressed && styles.loginBtnPressed]}
            >
              <Text style={styles.loginBtnText}>Log In / Register</Text>
              <Feather name="arrow-right" size={14} color={THEME.colors.white} />
            </Pressable>
          </View>

          {/* Recently Viewed Strip even for guests */}
          {recentlyViewedProducts.length > 0 && (
            <View style={styles.guestRecentView}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recently Viewed</Text>
                <Pressable onPress={clearViewed}>
                  <Text style={styles.clearLinkText}>Clear All</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentViewScroll}
              >
                {recentlyViewedProducts.map((p, idx) => (
                  <View key={p.id} style={styles.recentCardWrapper}>
                    <ProductCard product={p} variant={idx} width={130} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
        <SupportDrawer />
      </View>
    );
  }

  // 2. AUTHENTICATED USER PORTAL VIEW
  return (
    <View style={styles.outerContainer}>
      <DesktopHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, isDesktop && { paddingHorizontal: 0 }]}>
        
        {/* Profile Banner - shown on all screen sizes */}
        <View style={[styles.profileHeaderCard, isDesktop && styles.profileHeaderCardDesktop]}>
          {isDesktop ? (
            // Desktop horizontal profile banner
            <View style={styles.desktopProfileInner}>
              <View style={[styles.avatarCircle, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Text style={[styles.avatarLetter, { color: THEME.colors.white }]}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: THEME.colors.white }]}>{user.name}</Text>
                <Text style={[styles.profileMobile, { color: "rgba(255,255,255,0.75)" }]}>+91 {user.mobile}</Text>
              </View>
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [styles.desktopLogoutBtn, pressed && { opacity: 0.8 }]}
              >
                <Feather name="log-out" size={14} color={THEME.colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.desktopLogoutBtnText}>Logout</Text>
              </Pressable>
            </View>
          ) : (
            // Mobile inline row
            <>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.name}</Text>
                <Text style={styles.profileMobile}>+91 {user.mobile}</Text>
              </View>
              <Pressable onPress={handleLogout} style={styles.logoutBtn}>
                <Feather name="log-out" size={16} color={THEME.colors.error} />
              </Pressable>
            </>
          )}
        </View>

        {/* Admin Dashboard Entry Panel */}
        {user.role === "admin" && (
          <Pressable
            onPress={() => router.push("/admin" as any)}
            style={({ pressed }) => [
              styles.adminEntryCard,
              pressed && styles.adminEntryCardPressed
            ]}
          >
            <View style={styles.adminEntryInfo}>
              <Feather name="shield" size={18} color={THEME.colors.primary} style={styles.adminEntryIcon} />
              <View>
                <Text style={styles.adminEntryTitle}>Admin Back-Office Panel</Text>
                <Text style={styles.adminEntrySubtitle}>Manage products, orders, and active coupons</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={THEME.colors.secondary} />
          </Pressable>
        )}

        {/* Overview KPIs metrics */}
        <View style={[styles.kpiRow, isDesktop && { maxWidth: 1100, width: "100%", alignSelf: "center" }]}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{orders.length}</Text>
            <Text style={styles.kpiLabel}>Orders</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{wishlistedProducts.length}</Text>
            <Text style={styles.kpiLabel}>Wishlist</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{cartItemCount}</Text>
            <Text style={styles.kpiLabel}>In Cart</Text>
          </View>
        </View>

        {/* Wishlist Section */}
        <View style={[styles.sectionContainer, isDesktop && { maxWidth: 1100, width: "100%", alignSelf: "center" }]}>
          <Text style={styles.sectionTitle}>My Wishlist ({wishlistedProducts.length})</Text>
          {wishlistedProducts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="heart" size={24} color={THEME.colors.secondary} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyBoxText}>Your wishlist is empty.</Text>
              <Text style={styles.emptyBoxSubText}>Tap heart icons on products to save them here.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.wishlistScroll}
            >
              {wishlistedProducts.map((p, idx) => (
                <View key={p.id} style={styles.wishlistCardWrapper}>
                  <ProductCard product={p} variant={idx + 1} width={140} />
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Order History Section */}
        <View style={[styles.sectionContainer, isDesktop && { maxWidth: 1100, width: "100%", alignSelf: "center" }]}>
          <Text style={styles.sectionTitle}>Order History ({orders.length})</Text>
          {orders.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="clock" size={24} color={THEME.colors.secondary} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyBoxText}>No orders placed yet.</Text>
              <Text style={styles.emptyBoxSubText}>Explore our collection and start styling!</Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {orders.map((ord) => (
                <View key={ord.id} style={styles.orderRowCard}>
                  <View style={styles.orderRowHeader}>
                    <Text style={styles.orderId}>{ord.id}</Text>
                    <Text style={styles.orderDate}>{ord.date}</Text>
                  </View>
                  
                  <View style={styles.orderRowMiddle}>
                    <Text style={styles.orderItemsCount}>
                      {ord.itemCount} Item{ord.itemCount !== 1 ? "s" : ""}
                    </Text>
                    <Text style={styles.orderTotal}>{formattedPrice(ord.total)}</Text>
                  </View>

                  <View style={styles.orderStatusContainer}>
                    <View style={styles.statusOnlineIndicator} />
                    <Text style={styles.orderStatusText}>
                      Status: {ord.status.toUpperCase()}
                    </Text>
                  </View>

                  {/* Render nested items summary */}
                  <View style={styles.orderItemsDetailsBox}>
                    {ord.items.map((item, idx) => {
                      const p = allProducts.find((x) => x.id === item.id);
                      return (
                        <Text key={idx} style={styles.orderItemDetailText} numberOfLines={1}>
                          • {p ? p.name : "Jewellery Item"} (x{item.qty})
                        </Text>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Saved Addresses Section */}
        <View style={[styles.sectionContainer, isDesktop && { maxWidth: 1100, width: "100%", alignSelf: "center" }]}>
          <Text style={styles.sectionTitle}>Saved Delivery Locations</Text>
          <View style={styles.addressesContainer}>
            {DEFAULT_ADDRESSES.map((addr) => (
              <View key={addr.id} style={styles.addressItemCard}>
                <View style={styles.addressHeaderRow}>
                  <View style={styles.addressLabelBadge}>
                    <Text style={styles.addressLabelBadgeText}>{addr.label}</Text>
                  </View>
                  {addr.isDefault && (
                    <Text style={styles.defaultLabelText}>Default</Text>
                  )}
                </View>
                <Text style={styles.addressTextBold}>{addr.name}</Text>
                <Text style={styles.addressText}>{addr.line}</Text>
                <Text style={styles.addressText}>
                  {addr.city}, {addr.state} - {addr.pincode}
                </Text>
                <Text style={styles.addressText}>Phone: +91 {addr.phone}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recently Viewed Section */}
        {recentlyViewedProducts.length > 0 && (
          <View style={[styles.sectionContainer, isDesktop && { maxWidth: 1100, width: "100%", alignSelf: "center" }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Viewed</Text>
              <Pressable onPress={clearViewed}>
                <Text style={styles.clearLinkText}>Clear All</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.wishlistScroll}
            >
              {recentlyViewedProducts.map((p, idx) => (
                <View key={p.id} style={styles.wishlistCardWrapper}>
                  <ProductCard product={p} variant={idx + 6} width={130} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      {/* Floating support bubble */}
      <SupportDrawer />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  guestContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  guestScroll: {
    paddingBottom: 40,
    justifyContent: "center",
  },
  guestCard: {
    backgroundColor: THEME.colors.white,
    marginHorizontal: THEME.spacing.lg,
    marginTop: 80,
    padding: THEME.spacing.xl,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    ...THEME.shadows.card,
  },
  guestIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  guestTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 20,
    color: THEME.colors.text,
    textAlign: "center",
    marginBottom: THEME.spacing.sm,
  },
  guestDesc: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: THEME.spacing.xl,
  },
  loginBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: THEME.radius.round,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...THEME.shadows.button,
  },
  loginBtnPressed: {
    opacity: 0.9,
  },
  loginBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
  guestRecentView: {
    marginTop: THEME.spacing.xxl,
    paddingHorizontal: THEME.spacing.lg,
  },
  recentViewScroll: {
    gap: THEME.spacing.md,
  },
  recentCardWrapper: {
    // sizing
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
  scrollContent: {
    paddingBottom: 80,
  },
  profileHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.white,
    padding: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingTop: 60, // Safety margin for status bars on mobile
  },
  profileHeaderCardDesktop: {
    paddingTop: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.primary,
  },
  desktopProfileInner: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  desktopLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.round,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  desktopLogoutBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarLetter: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 24,
    color: THEME.colors.white,
  },
  profileInfo: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  profileName: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 18,
    color: THEME.colors.text,
  },
  profileMobile: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    marginTop: 2,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.colors.background,
  },
  kpiRow: {
    flexDirection: "row",
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.lg,
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: THEME.spacing.md,
    alignItems: "center",
    ...THEME.shadows.card,
  },
  kpiValue: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 20,
    color: THEME.colors.text,
  },
  kpiLabel: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
    marginTop: 2,
  },
  sectionContainer: {
    paddingVertical: THEME.spacing.lg,
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
    fontSize: 18,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  clearLinkText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.secondary,
    textDecorationLine: "underline",
  },
  emptyBox: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
    alignItems: "center",
  },
  emptyBoxText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.text,
  },
  emptyBoxSubText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.inkSoft,
    marginTop: 2,
    textAlign: "center",
  },
  wishlistScroll: {
    gap: THEME.spacing.md,
  },
  wishlistCardWrapper: {
    // sizing
  },
  ordersList: {
    gap: 12,
  },
  orderRowCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    ...THEME.shadows.card,
  },
  orderRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  orderId: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.text,
  },
  orderDate: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.inkSoft,
  },
  orderRowMiddle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderItemsCount: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
  orderTotal: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 14,
    color: THEME.colors.text,
  },
  orderStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  statusOnlineIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
  },
  orderStatusText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.success,
  },
  orderItemsDetailsBox: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.radius.sm,
    padding: THEME.spacing.sm,
    gap: 4,
  },
  orderItemDetailText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.secondary,
  },
  addressesContainer: {
    gap: 12,
  },
  addressItemCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
  },
  addressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  addressLabelBadge: {
    backgroundColor: THEME.colors.highlight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: THEME.radius.round,
  },
  addressLabelBadgeText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 9,
    color: THEME.colors.secondary,
  },
  defaultLabelText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.primary,
  },
  addressTextBold: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: THEME.colors.text,
    marginBottom: 4,
  },
  addressText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    lineHeight: 16,
  },
  adminEntryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.colors.white,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    ...THEME.shadows.card,
  },
  adminEntryCardPressed: {
    backgroundColor: THEME.colors.background,
  },
  adminEntryInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminEntryIcon: {
    marginRight: 12,
  },
  adminEntryTitle: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: THEME.colors.text,
  },
  adminEntrySubtitle: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
    marginTop: 2,
  },
});
