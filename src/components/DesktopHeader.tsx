import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, TextInput, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { THEME } from "../constants/theme";
import { useStore } from "../store/useStore";
import { DEFAULT_ADDRESSES } from "../data/mockProducts";

export const DesktopHeader: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const user = useStore((state) => state.user);
  const logoutUser = useStore((state) => state.logoutUser);
  const cart = useStore((state) => state.cart);
  const cartCount = Object.values(cart).reduce((acc, qty) => acc + qty, 0);

  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!isDesktop) return null;

  const handleSearch = () => {
    router.push({
      pathname: "/(tabs)/shop",
      params: { search: searchQuery },
    });
  };

  const handleCategoryPress = (catId: string | null) => {
    router.push({
      pathname: "/(tabs)/shop",
      params: catId ? { category: catId } : {},
    });
  };

  const handleLogoPress = () => {
    router.push("/");
  };

  // Get active address label
  const addressLabel = user && DEFAULT_ADDRESSES.length > 0
    ? `${DEFAULT_ADDRESSES[0].city}, ${DEFAULT_ADDRESSES[0].state}`
    : "Select delivery location";

  return (
    <View style={styles.headerWrapper}>
      {/* Top Bar Row (Brand tab + delivery location) */}
      <View style={styles.topRow}>
        <View style={styles.brandTabs}>
          <Pressable onPress={handleLogoPress} style={[styles.brandTab, styles.brandTabActive]}>
            <Feather name="gift" size={12} color={THEME.colors.primary} />
            <Text style={styles.brandTabActiveText}>Pretty Parcel</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/shop")} style={styles.brandTab}>
            <Feather name="scissors" size={12} color={THEME.colors.secondary} />
            <Text style={styles.brandTabText}>Fashion Edit</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push("/(tabs)/account")} style={styles.locationLink}>
          <Feather name="map-pin" size={13} color={THEME.colors.text} style={{ marginRight: 2 }} />
          <Text style={styles.locationLabelText}>
            Location: <Text style={{ fontFamily: THEME.fonts.body.semibold, color: THEME.colors.primary }}>{addressLabel}</Text>
          </Text>
          <Feather name="chevron-right" size={11} color={THEME.colors.secondary} />
        </Pressable>
      </View>

      {/* Main Search Row */}
      <View style={styles.searchRow}>
        {/* Logo */}
        <Pressable onPress={handleLogoPress} style={styles.logoContainer}>
          <Text style={styles.logoTitle}>The Pretty Parcel</Text>
          <Text style={styles.logoSubtitle}>by Neems</Text>
        </Pressable>

        {/* Flipkart-Style Centered Wide Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={THEME.colors.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for Products, Collections and More..."
            placeholderTextColor={THEME.colors.inkSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} style={styles.clearBtn}>
              <Feather name="x" size={14} color={THEME.colors.inkSoft} />
            </Pressable>
          )}
        </View>

        {/* Right Navigation Controls */}
        <View style={styles.navControls}>
          {/* Account Dropdown / Login */}
          {user ? (
            <View style={styles.dropdownWrapper}>
              <Pressable
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
              >
                <Feather name="user" size={15} color={THEME.colors.text} style={{ marginRight: 4 }} />
                <Text style={styles.navItemText}>{user.name}</Text>
                <Feather name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={11} color={THEME.colors.secondary} style={{ marginLeft: 4 }} />
              </Pressable>
              
              {isDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <Pressable
                    onPress={() => {
                      setIsDropdownOpen(false);
                      router.push("/(tabs)/account");
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>My Profile</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setIsDropdownOpen(false);
                      router.push("/(tabs)/account");
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>Orders History</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setIsDropdownOpen(false);
                      logoutUser();
                      router.replace("/");
                    }}
                    style={[styles.dropdownItem, styles.dropdownItemBorder]}
                  >
                    <Text style={[styles.dropdownItemText, { color: THEME.colors.error }]}>Logout</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <Pressable
              onPress={() => router.push("/auth/login")}
              style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
            >
              <Feather name="user" size={15} color={THEME.colors.text} style={{ marginRight: 4 }} />
              <Text style={styles.navItemText}>Login</Text>
            </Pressable>
          )}

          {/* Support */}
          <Pressable
            onPress={() => router.push("/(tabs)/account")}
            style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
          >
            <Feather name="info" size={15} color={THEME.colors.text} style={{ marginRight: 4 }} />
            <Text style={styles.navItemText}>Support</Text>
          </Pressable>

          {/* Flipkart-Style Cart Link */}
          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={({ pressed }) => [styles.cartBtn, pressed && styles.cartBtnPressed]}
          >
            <View style={styles.cartIconWrapper}>
              <Feather name="shopping-cart" size={16} color={THEME.colors.white} />
              {cartCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cartBtnText}>Cart</Text>
          </Pressable>
        </View>
      </View>

      {/* Bottom Category Row */}
      <View style={styles.categoryRow}>
        <View style={styles.categoryLinks}>
          <Pressable onPress={() => router.push("/")} style={styles.categoryLink}>
            <Text style={styles.categoryLinkText}>For You</Text>
          </Pressable>
          <View style={styles.linkDivider} />
          <Pressable onPress={() => handleCategoryPress("demi-fine")} style={styles.categoryLink}>
            <Text style={styles.categoryLinkText}>Demi-Fine Jewellery</Text>
          </Pressable>
          <View style={styles.linkDivider} />
          <Pressable onPress={() => handleCategoryPress("oxidised")} style={styles.categoryLink}>
            <Text style={styles.categoryLinkText}>Traditional & Oxidised</Text>
          </Pressable>
          <View style={styles.linkDivider} />
          <Pressable onPress={() => handleCategoryPress("hair")} style={styles.categoryLink}>
            <Text style={styles.categoryLinkText}>Hair Styling</Text>
          </Pressable>
          {user?.role === "admin" && (
            <>
              <View style={styles.linkDivider} />
              <Pressable onPress={() => router.push("/admin")} style={styles.categoryLink}>
                <Text style={[styles.categoryLinkText, { color: THEME.colors.primary, fontFamily: THEME.fonts.body.semibold }]}>Admin Panel</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    width: "100%",
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    zIndex: 100,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F4ECE1",
    backgroundColor: "#FAF8F5",
  },
  brandTabs: {
    flexDirection: "row",
    gap: 12,
  },
  brandTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  brandTabActive: {
    backgroundColor: THEME.colors.highlight,
  },
  brandTabActiveText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.primary,
  },
  brandTabText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 10,
    color: THEME.colors.secondary,
  },
  locationLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationLabelText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.text,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  logoContainer: {
    width: 200,
  },
  logoTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 20,
    color: THEME.colors.text,
    letterSpacing: 1,
  },
  logoSubtitle: {
    fontFamily: THEME.fonts.display.italic,
    fontSize: 11,
    color: THEME.colors.primary,
    marginTop: -2,
  },
  searchBar: {
    flex: 1,
    maxWidth: 500,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.round,
    paddingHorizontal: 12,
    height: 38,
    marginHorizontal: 16,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.text,
    // @ts-ignore
    outlineStyle: "none" as any,
  },
  clearBtn: {
    padding: 4,
  },
  navControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  dropdownWrapper: {
    position: "relative",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  navItemPressed: {
    opacity: 0.8,
  },
  navItemText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 13,
    color: THEME.colors.text,
  },
  dropdownMenu: {
    position: "absolute",
    top: 38,
    right: 0,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingVertical: 4,
    width: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dropdownItemBorder: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  dropdownItemText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.text,
  },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.round,
    ...THEME.shadows.button,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  cartBtnPressed: {
    opacity: 0.9,
  },
  cartBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
  cartIconWrapper: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: THEME.colors.success,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 9,
    color: THEME.colors.white,
  },
  categoryRow: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  categoryLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  categoryLink: {
    paddingVertical: 4,
  },
  categoryLinkText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
  linkDivider: {
    width: 1,
    height: 12,
    backgroundColor: THEME.colors.border,
  },
});
