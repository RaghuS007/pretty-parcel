import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { OrderRepository } from "../../src/repository";
import { Order } from "../../src/data/types";
import { THEME } from "../../src/constants/theme";
import { useStore } from "../../src/store/useStore";

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const showToast = useStore((state) => state.showToast);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await OrderRepository.getAllOrders();
      setOrders(data);
    } catch (e) {
      console.error("Failed to load orders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const getStatusLabelAndColor = (status: Order["status"] | "packed") => {
    switch (status) {
      case "processing":
        return { label: "Placed", bgColor: "#EADFCF", textColor: "#7A5C3E" };
      case "packed":
        return { label: "Packed", bgColor: "#FFD6C9", textColor: "#2C2C2A" };
      case "shipped":
        return { label: "Shipped", bgColor: "#E8C9A0", textColor: "#2C2C2A" };
      case "delivered":
        return { label: "Delivered", bgColor: "#D4EDDA", textColor: THEME.colors.success };
      case "cancelled":
        return { label: "Cancelled", bgColor: "#F8D7DA", textColor: THEME.colors.error };
      default:
        return { label: String(status), bgColor: "#EADFCF", textColor: "#2B241C" };
    }
  };

  const getNextStatus = (currentStatus: Order["status"] | "packed"): Order["status"] | "packed" | null => {
    switch (currentStatus) {
      case "processing":
        return "packed";
      case "packed":
        return "shipped";
      case "shipped":
        return "delivered";
      default:
        return null;
    }
  };

  const handleAdvanceStatus = async (orderId: string, currentStatus: Order["status"]) => {
    const next = getNextStatus(currentStatus);
    if (!next) return;

    setUpdatingId(orderId);
    try {
      await OrderRepository.updateOrderStatus(orderId, next as Order["status"]);
      
      // Update local state list
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: next as Order["status"] } : o));
      
      showToast({
        type: "success",
        title: "Order Advanced",
        message: `Order status successfully advanced to ${next.toUpperCase()}.`,
      });
    } catch (e) {
      showToast({
        type: "error",
        title: "Failed to Update",
        message: "Failed to update order status overlay in AsyncStorage.",
      });
    } finally {
      setUpdatingId(null);
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
        Manage order pipeline from Packed through Delivered. All client-side updates are synced to database.
      </Text>

      {orders.map(o => {
        const badge = getStatusLabelAndColor(o.status);
        const nextStatus = getNextStatus(o.status);
        const isUpdating = updatingId === o.id;

        return (
          <View key={o.id} style={styles.orderCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.orderNumber}>{o.id}</Text>
                <Text style={styles.orderDate}>{o.date}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: badge.bgColor }]}>
                <Text style={[styles.statusBadgeText, { color: badge.textColor }]}>
                  {badge.label}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardBody}>
              <View style={styles.metaRow}>
                <Feather name="phone" size={12} color={THEME.colors.secondary} style={styles.metaIcon} />
                <Text style={styles.metaText}>Mobile: +91 {o.shippingAddress?.phone || "Guest"}</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="user" size={12} color={THEME.colors.secondary} style={styles.metaIcon} />
                <Text style={styles.metaText}>Recipient: {o.shippingAddress?.name || "Customer"}</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="map-pin" size={12} color={THEME.colors.secondary} style={styles.metaIcon} />
                <Text style={styles.metaText}>
                  Address: {o.shippingAddress?.line}, {o.shippingAddress?.city}, {o.shippingAddress?.pincode}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.itemsLabel}>ITEMS COUNT</Text>
                <Text style={styles.itemsValue}>{o.itemCount} items</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>TOTAL AMOUNT</Text>
                <Text style={styles.priceValue}>₹{o.total.toLocaleString("en-IN")}</Text>
              </View>
            </View>

            {nextStatus && (
              <Pressable
                onPress={() => handleAdvanceStatus(o.id, o.status)}
                disabled={isUpdating}
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.actionBtnPressed,
                  isUpdating && { opacity: 0.7 }
                ]}
              >{isUpdating ? (
                <ActivityIndicator size="small" color={THEME.colors.white} />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.actionBtnText}>
                    Mark as {getStatusLabelAndColor(nextStatus).label}
                  </Text>
                  <Feather name="arrow-right" size={12} color={THEME.colors.white} />
                </View>
              )}</Pressable>
            )}
          </View>
        );
      })}

      {orders.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No orders registered in mock database.</Text>
        </View>
      )}
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
  orderCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderNumber: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.text,
  },
  orderDate: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.inkSoft,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: THEME.radius.sm,
  },
  statusBadgeText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },
  cardBody: {
    gap: THEME.spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    marginRight: 8,
    width: 14,
  },
  metaText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.secondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
  },
  itemsLabel: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 8,
    color: THEME.colors.inkSoft,
  },
  itemsValue: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.text,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 8,
    color: THEME.colors.inkSoft,
  },
  priceValue: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 14,
    color: THEME.colors.primary,
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: THEME.colors.primary,
    height: 36,
    borderRadius: THEME.radius.round,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...THEME.shadows.button,
  },
  actionBtnPressed: {
    opacity: 0.9,
  },
  actionBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 11,
    color: THEME.colors.white,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
});
