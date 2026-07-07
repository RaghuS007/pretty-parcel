import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { ProductRepository, OrderRepository } from "../../src/repository";
import { THEME } from "../../src/constants/theme";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [ordersToday, setOrdersToday] = useState(0);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const products = await ProductRepository.getProducts();
      const orders = await OrderRepository.getAllOrders();

      const todayStr = new Date().toDateString();
      const revenueSum = orders.reduce((sum, o) => sum + o.total, 0);
      const todayCount = orders.filter(o => {
        // Date parsing support for both locales
        try {
          return new Date(o.date).toDateString() === todayStr;
        } catch {
          return false;
        }
      }).length;

      setProductsCount(products.length);
      setOrdersCount(orders.length);
      setRevenue(revenueSum);
      setOrdersToday(todayCount);
    } catch (e) {
      console.error("Failed to load dashboard statistics:", e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Loading Dashboard Stats...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>Back-Office Management</Text>
        <Text style={styles.welcomeSubtitle}>
          Real-time metrics and operations overlay for the demo store database.
        </Text>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.grid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TOTAL PRODUCTS</Text>
            <Feather name="box" size={16} color={THEME.colors.primary} />
          </View>
          <Text style={styles.kpiValue}>{productsCount}</Text>
          <Text style={styles.kpiFooter}>Catalogue count</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TOTAL ORDERS</Text>
            <Feather name="shopping-bag" size={16} color={THEME.colors.primary} />
          </View>
          <Text style={styles.kpiValue}>{ordersCount}</Text>
          <Text style={styles.kpiFooter}>All time transactions</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>TOTAL REVENUE</Text>
            <Feather name="dollar-sign" size={16} color={THEME.colors.primary} />
          </View>
          <Text style={[styles.kpiValue, styles.revenueText]}>{formatCurrency(revenue)}</Text>
          <Text style={styles.kpiFooter}>Gross sales value</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Text style={styles.kpiLabel}>ORDERS TODAY</Text>
            <Feather name="clock" size={16} color={THEME.colors.primary} />
          </View>
          <Text style={styles.kpiValue}>{ordersToday}</Text>
          <Text style={styles.kpiFooter}>Daily transaction velocity</Text>
        </View>
      </View>

      {/* Security Warning Notice */}
      <View style={styles.noticeCard}>
        <Feather name="shield" size={18} color="#C0533B" style={styles.noticeIcon} />
        <View style={styles.noticeTextContainer}>
          <Text style={styles.noticeTitle}>Security Notice (Demo Phase)</Text>
          <Text style={styles.noticeBody}>
            This back-office dashboard runs as a client-side gating layer. Persistent modifications in mock mode are saved locally using AsyncStorage. Once the Next.js and Postgres API routes are connected, all mutations and access permissions MUST be validated server-side to guarantee database security.
          </Text>
        </View>
      </View>

      {/* Management Quick Links */}
      <Text style={styles.sectionTitle}>Operations</Text>
      <View style={styles.linksContainer}>
        <Pressable
          onPress={() => router.push("/admin/products" as any)}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
        >
          <View style={styles.linkInfo}>
            <Feather name="list" size={20} color={THEME.colors.primary} style={styles.linkIcon} />
            <View>
              <Text style={styles.linkTitle}>Product Catalogue</Text>
              <Text style={styles.linkDesc}>Update product names, pricing, and display flags.</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={THEME.colors.secondary} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/admin/orders" as any)}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
        >
          <View style={styles.linkInfo}>
            <Feather name="shopping-cart" size={20} color={THEME.colors.primary} style={styles.linkIcon} />
            <View>
              <Text style={styles.linkTitle}>Order Management</Text>
              <Text style={styles.linkDesc}>Track order pipelines and advance status levels.</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={THEME.colors.secondary} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/admin/coupons" as any)}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
        >
          <View style={styles.linkInfo}>
            <Feather name="gift" size={20} color={THEME.colors.primary} style={styles.linkIcon} />
            <View>
              <Text style={styles.linkTitle}>Promo Coupons</Text>
              <Text style={styles.linkDesc}>Configure active toggles for promotional codes.</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={THEME.colors.secondary} />
        </Pressable>
      </View>
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
  loadingText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.secondary,
    marginTop: THEME.spacing.sm,
  },
  header: {
    marginBottom: THEME.spacing.xl,
  },
  welcomeTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 24,
    color: THEME.colors.text,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.xl,
  },
  kpiCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: Platform.OS === "web" ? "22%" : "45%",
    minWidth: 160,
    ...THEME.shadows.card,
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiLabel: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 9,
    color: THEME.colors.secondary,
    letterSpacing: 1,
  },
  kpiValue: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 24,
    color: THEME.colors.text,
    marginBottom: 4,
  },
  revenueText: {
    fontSize: 20,
    marginTop: 4,
  },
  kpiFooter: {
    fontFamily: THEME.fonts.body.light,
    fontSize: 9,
    color: THEME.colors.inkSoft,
  },
  noticeCard: {
    flexDirection: "row",
    backgroundColor: "#FBF7F0",
    borderRadius: THEME.radius.md,
    borderWidth: 1.5,
    borderColor: "#E6A18B", // Rose Gold border
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.xl,
  },
  noticeIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  noticeTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: "#2C2C2A",
    marginBottom: 4,
  },
  noticeBody: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
    lineHeight: 15,
  },
  sectionTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 18,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  linksContainer: {
    gap: THEME.spacing.sm,
  },
  linkCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
    ...THEME.shadows.card,
  },
  linkCardPressed: {
    backgroundColor: THEME.colors.background,
  },
  linkInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  linkIcon: {
    marginRight: THEME.spacing.md,
  },
  linkTitle: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.text,
    marginBottom: 2,
  },
  linkDesc: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
  },
});
