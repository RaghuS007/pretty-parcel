import React from "react";
import { StyleSheet, Text, View, Pressable, useWindowDimensions } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { THEME } from "../../src/constants/theme";
import { DesktopHeader } from "../../src/components/DesktopHeader";

export default function OrderSuccessScreen() {
  const { orderId, total } = useLocalSearchParams<{ orderId: string; total: string }>();

  const handleContinueShopping = () => {
    router.replace("/(tabs)/shop");
  };

  const formattedTotal = () => {
    if (!total) return "₹0";
    const numericTotal = parseFloat(total);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(numericTotal);
  };

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <View style={styles.outerContainer}>
      <DesktopHeader />
      <View style={styles.container}>
        <View style={[styles.successContent, isDesktop && { maxWidth: 500, width: "100%", alignSelf: "center" }]}>
          {/* Visual Rich Success Checkmark Badge */}
          <View style={styles.successBadge}>
            <Feather name="check" size={32} color={THEME.colors.primary} />
          </View>

          <Text style={styles.brandTitle}>The Pretty Parcel</Text>
          <Text style={styles.title}>Thank You For Your Order! ✨</Text>
          
          <Text style={styles.description}>
            We are preparing your handcrafted treasures with absolute care. You'll receive shipping updates shortly.
          </Text>

          {/* Order Info Summary Box */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order ID</Text>
              <Text style={styles.infoValue}>{orderId || "#ORD-XXXX"}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Amount Paid</Text>
              <Text style={styles.infoValue}>{formattedTotal()}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Shipping Status</Text>
              <Text style={[styles.infoValue, { color: THEME.colors.success }]}>
                Processing
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleContinueShopping}
            style={({ pressed }) => [
              styles.continueBtn,
              pressed && styles.continueBtnPressed,
            ]}
          >
            <Text style={styles.continueBtnText}>Continue Shopping</Text>
            <Feather name="shopping-bag" size={14} color={THEME.colors.white} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.xl,
  },
  successContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  successBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.white,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: THEME.spacing.xl,
    ...THEME.shadows.card,
  },
  brandTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 14,
    color: THEME.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 22,
    color: THEME.colors.text,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: THEME.spacing.md,
  },
  description: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 290,
    marginBottom: THEME.spacing.xxl,
  },
  infoCard: {
    width: "100%",
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
    gap: 10,
    marginBottom: THEME.spacing.xxl + 8,
    ...THEME.shadows.card,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
  infoValue: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.text,
  },
  continueBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: THEME.radius.round,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...THEME.shadows.button,
  },
  continueBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  continueBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
});
