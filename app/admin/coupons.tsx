import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { CouponRepository } from "../../src/repository";
import { Coupon } from "../../src/data/types";
import { THEME } from "../../src/constants/theme";
import { useStore } from "../../src/store/useStore";

interface CouponItem {
  code: string;
  type: "pct" | "flat";
  value: number;
  min?: number;
  label: string;
  isActive: boolean;
}

export default function AdminCoupons() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  const showToast = useStore((state) => state.showToast);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await CouponRepository.getCoupons();
      const mapped = Object.keys(data).map(code => ({
        code,
        type: data[code].type,
        value: data[code].value,
        min: data[code].min,
        label: data[code].label,
        isActive: data[code].isActive !== false
      }));
      setCoupons(mapped);
    } catch (e) {
      console.error("Failed to load coupons:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleToggleActive = async (code: string, currentVal: boolean) => {
    setTogglingCode(code);
    try {
      await CouponRepository.updateCouponActive(code, !currentVal);
      setCoupons(prev => prev.map(c => c.code === code ? { ...c, isActive: !currentVal } : c));
      
      showToast({
        type: "success",
        title: "Coupon Updated",
        message: `${code} is now ${!currentVal ? "ACTIVE" : "INACTIVE"}.`,
      });
    } catch (e) {
      showToast({
        type: "error",
        title: "Failed to Update",
        message: "Failed to update coupon status overlay in AsyncStorage.",
      });
    } finally {
      setTogglingCode(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.welcomeSubtitle}>
        Configure promo code active states. Inactive coupons will be rejected in the cart checkout wizard.
      </Text>

      {coupons.map(c => (
        <View key={c.code} style={[styles.couponCard, !c.isActive && styles.couponCardInactive]}>
          <View style={styles.cardHeader}>
            <View style={styles.couponCodeContainer}>
              <Feather name="gift" size={16} color={c.isActive ? THEME.colors.primary : THEME.colors.secondary} />
              <Text style={[styles.couponCode, !c.isActive && styles.couponCodeMuted]}>{c.code}</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={c.isActive}
                onValueChange={() => handleToggleActive(c.code, c.isActive)}
                disabled={togglingCode === c.code}
                trackColor={{ false: THEME.colors.border, true: THEME.colors.primary }}
                thumbColor={THEME.colors.white}
              />
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>DISCOUNT TYPE</Text>
              <Text style={styles.infoValue}>{c.type === "pct" ? "Percentage Off (%)" : "Flat Cash Off (₹)"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>VALUE</Text>
              <Text style={styles.infoValue}>{c.type === "pct" ? `${c.value}%` : `₹${c.value}`}</Text>
            </View>
            {c.min !== undefined && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MINIMUM ORDER</Text>
                <Text style={styles.infoValue}>₹{c.min.toLocaleString("en-IN")}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>DISPLAY LABEL</Text>
              <Text style={styles.infoValue}>{c.label}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.lg,
    maxWidth: THEME.layout.maxWidth,
    width: "100%",
    alignSelf: "center",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeSubtitle: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.secondary,
    marginBottom: THEME.spacing.lg,
  },
  couponCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.card,
  },
  couponCardInactive: {
    backgroundColor: "#FBFBFB",
    borderColor: THEME.colors.border,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  couponCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  couponCode: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 14,
    color: THEME.colors.text,
    letterSpacing: 0.5,
  },
  couponCodeMuted: {
    color: THEME.colors.secondary,
    textDecorationLine: "line-through",
  },
  switchContainer: {
    height: 28,
    justifyContent: "center",
  },
  cardDivider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },
  cardBody: {
    gap: THEME.spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 8,
    color: THEME.colors.inkSoft,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 11,
    color: THEME.colors.text,
  },
});
