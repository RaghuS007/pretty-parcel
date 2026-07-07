import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useStore } from "../../src/store/useStore";
import { THEME } from "../../src/constants/theme";

export default function AdminLayout() {
  const user = useStore((state) => state.user);

  // If not logged in, redirect to login page
  React.useEffect(() => {
    if (!user) {
      router.replace("/auth/login");
    }
  }, [user]);

  if (!user) {
    return null;
  }

  // If not an admin, show branded "Not authorised" screen
  if (user.role !== "admin") {
    return (
      <View style={styles.container}>
        <View style={styles.innerCard}>
          <Feather name="shield-off" size={48} color={THEME.colors.error} style={styles.icon} />
          <Text style={styles.title}>Access Denied</Text>
          <Text style={styles.subtitle}>
            This back-office area is restricted to administrative staff only.
          </Text>
          <Pressable onPress={() => router.replace("/")} style={styles.homeBtn}>
            <Text style={styles.homeBtnText}>Return to Shop</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: THEME.colors.white,
        },
        headerTitleStyle: {
          fontFamily: THEME.fonts.display.medium,
          fontSize: 16,
          color: THEME.colors.text,
        },
        headerTintColor: THEME.colors.primary,
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Admin Dashboard",
          headerLeft: () => (
            <Pressable 
              onPress={() => router.replace("/(tabs)/account" as any)} 
              style={{ flexDirection: "row", alignItems: "center", gap: 4, marginRight: 10, paddingVertical: 4 }}
            >
              <Feather name="arrow-left" size={18} color={THEME.colors.primary} />
              <Text style={{ fontFamily: THEME.fonts.body.semibold, fontSize: 13, color: THEME.colors.primary }}>Profile</Text>
            </Pressable>
          )
        }} 
      />
      <Stack.Screen name="products" options={{ title: "Manage Products" }} />
      <Stack.Screen name="orders" options={{ title: "Manage Orders" }} />
      <Stack.Screen name="coupons" options={{ title: "Manage Coupons" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: "center",
    padding: THEME.spacing.lg,
  },
  innerCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.xl,
    alignItems: "center",
    ...THEME.shadows.card,
  },
  icon: {
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 22,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  subtitle: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: THEME.spacing.xl,
  },
  homeBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: THEME.radius.round,
    ...THEME.shadows.button,
  },
  homeBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
});
