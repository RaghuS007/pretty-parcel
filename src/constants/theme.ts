/**
 * Brand Design System Tokens for The Pretty Parcel by Neems.
 * Adapts styles.css global tokens to React Native.
 */

export const THEME = {
  colors: {
    // Brand Palette
    background: "#FBF7F0", // Ivory page background
    primary: "#C9A24B",    // Antique Gold accent (buttons, icons, active tab)
    secondary: "#7A5C3E",  // Warm Brown (muted text, subheadings)
    text: "#2B241C",       // Deep Espresso (headings, primary body text)
    highlight: "#E8C9A0",  // Soft Gold (badges, subtle fills, hover/pressed fills)
    border: "#EADFCF",     // Soft gold/ivory borders and divider lines
    
    // Core Utilities
    white: "#FFFFFF",
    charcoal: "#2C2C2A",
    inkSoft: "#6B6560",
    error: "#C0533B",      // Coupon errors / forms errors
    success: "#2E7D52",    // Active coupon / checkout success
    
    // Transparent Helpers
    headerBg: "rgba(251, 247, 240, 0.94)",
    overlay: "rgba(0, 0, 0, 0.4)",
    wishlistBg: "rgba(251, 247, 240, 0.92)",
    cardLabelBg: "rgba(251, 247, 240, 0.9)",
  },
  
  fonts: {
    display: {
      regular: "CormorantGaramond_500Medium",
      medium: "CormorantGaramond_600SemiBold",
      italic: "CormorantGaramond_500Medium_Italic",
    },
    body: {
      light: "Poppins_300Light",
      regular: "Poppins_400Regular",
      medium: "Poppins_500Medium",
      semibold: "Poppins_600SemiBold",
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  
  radius: {
    sm: 8,
    md: 10,
    lg: 14,
    xl: 20,
    round: 999,
  },
  
  shadows: {
    card: {
      shadowColor: "#2B241C",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
    },
    button: {
      shadowColor: "#C9A24B",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.16,
      shadowRadius: 14,
      elevation: 4,
    },
    drawer: {
      shadowColor: "#000",
      shadowOffset: { width: -4, height: 0 },
      shadowOpacity: 0.08,
      shadowRadius: 30,
      elevation: 10,
    },
  },
  
  layout: {
    maxWidth: 1180,
    shippingThreshold: 999, // Free shipping on orders >= ₹999
    shippingCost: 79,       // Default shipping flat rate
  },
};
