import { Tabs, router } from 'expo-router';
import { Pressable, useWindowDimensions, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../src/constants/theme';
import { useStore } from '../../src/store/useStore';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const cartCount = useStore((state) => 
    Object.values(state.cart).reduce((acc, qty) => acc + qty, 0)
  );

  const initialLoaded = useStore((state) => state.initialLoaded);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: !isDesktop,
          tabBarActiveTintColor: THEME.colors.primary,
          tabBarInactiveTintColor: THEME.colors.inkSoft,
          tabBarLabelStyle: {
            fontFamily: THEME.fonts.body.medium,
            fontSize: 11,
            marginBottom: 4,
          },
          tabBarStyle: {
            backgroundColor: THEME.colors.background,
            borderTopWidth: 1,
            borderTopColor: THEME.colors.border,
            height: isDesktop ? 0 : 60,
            paddingTop: 6,
            display: isDesktop ? "none" : "flex",
          },
          headerStyle: {
            backgroundColor: THEME.colors.background,
            borderBottomWidth: 1,
            borderBottomColor: THEME.colors.border,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            fontFamily: THEME.fonts.display.medium,
            fontSize: 20,
            color: THEME.colors.text,
          },
          headerTitleAlign: "center",
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            headerShown: false, // We'll render a custom branding header on Home (on mobile only)
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            title: 'Shop',
            headerTitle: 'Our Collection',
            tabBarIcon: ({ color, size }) => (
              <Feather name="shopping-bag" color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'Cart',
            headerTitle: 'Your Parcel',
            tabBarBadge: cartCount > 0 ? cartCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: THEME.colors.primary,
              color: '#fff',
              fontFamily: THEME.fonts.body.semibold,
              fontSize: 10,
            },
            tabBarIcon: ({ color, size }) => (
              <Feather name="shopping-cart" color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Account',
            headerTitle: 'Your Account',
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" color={color} size={size - 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="product/[id]"
          options={{
            href: null,
            title: "Product Details",
            headerTitle: "Product Details",
            headerTintColor: THEME.colors.primary,
            headerShadowVisible: false,
            headerLeft: () => (
              <Pressable onPress={() => router.back()} style={{ marginLeft: 16 }}>
                <Feather name="arrow-left" size={22} color={THEME.colors.primary} />
              </Pressable>
            ),
          }}
        />
      </Tabs>

      {!initialLoaded && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer, { zIndex: 9999 }]}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Unwrapping your experience...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
