import React, { useEffect } from "react";
import { StyleSheet, Text, View, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useStore } from "../store/useStore";
import { THEME } from "../constants/theme";

export const AppToast: React.FC = () => {
  const toast = useStore((state) => state.toast);
  const showToast = useStore((state) => state.showToast);

  useEffect(() => {
    if (!toast) return;

    // Auto-dismiss after 3.5 seconds
    const timer = setTimeout(() => {
      showToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  // Visual variants styling mapping
  const getStylesByVariant = () => {
    switch (toast.type) {
      case "success":
        return {
          container: {
            backgroundColor: "#2C2C2A", // Dark Charcoal background
            borderColor: THEME.colors.primary, // Antique Gold border
          },
          titleColor: "#C9A24B", // Antique Gold
          msgColor: "#FFFFFF",
          iconName: "check-circle" as const,
          iconColor: "#C9A24B",
        };
      case "error":
        return {
          container: {
            backgroundColor: "#FFD6C9", // Soft Peach
            borderColor: "#E6A18B", // Rose Gold
          },
          titleColor: "#2C2C2A", // Dark Charcoal
          msgColor: "#2C2C2A",
          iconName: "alert-triangle" as const,
          iconColor: "#C0533B", // Error red
        };
      case "info":
      default:
        return {
          container: {
            backgroundColor: "#FFD6C9", // Soft Peach
            borderColor: THEME.colors.primary, // Antique Gold
          },
          titleColor: "#2C2C2A", // Dark Charcoal
          msgColor: "#2C2C2A",
          iconName: "info" as const,
          iconColor: "#7A5C3E", // Warm Brown
        };
    }
  };

  const currentStyles = getStylesByVariant();

  return (
    <Pressable
      onPress={() => showToast(null)}
      style={[styles.toastContainer, currentStyles.container]}
    >
      <View style={styles.contentRow}>
        <Feather
          name={currentStyles.iconName}
          size={20}
          color={currentStyles.iconColor}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={[styles.toastTitle, { color: currentStyles.titleColor }]}>
            {toast.title}
          </Text>
          <Text style={[styles.toastMessage, { color: currentStyles.msgColor }]}>
            {toast.message}
          </Text>
        </View>
        <Feather name="x" size={14} color={currentStyles.msgColor} style={styles.closeIcon} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: Platform.OS === "web" ? 20 : 60,
    left: "5%",
    right: "5%",
    alignSelf: "center",
    maxWidth: 550,
    width: "90%",
    borderRadius: THEME.radius.md,
    borderWidth: 1.5,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    zIndex: 9999,
    ...THEME.shadows.drawer,
    // Web shadow enhancement
    ...Platform.select({
      web: {
        boxShadow: "0px 8px 24px rgba(44, 44, 42, 0.15)",
      },
    }),
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: THEME.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  toastTitle: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    marginBottom: 2,
  },
  toastMessage: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  closeIcon: {
    marginLeft: THEME.spacing.md,
    opacity: 0.6,
  },
});
