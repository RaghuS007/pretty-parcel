import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../src/constants/theme';
import { useStore } from '../../src/store/useStore';

export default function TabLayout() {
  const cartCount = useStore((state) => 
    Object.values(state.cart).reduce((acc, qty) => acc + qty, 0)
  );

  return (
    <Tabs
      screenOptions={{
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
          height: 60,
          paddingTop: 6,
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
          headerShown: false, // We'll render a custom branding header on Home
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
    </Tabs>
  );
}
