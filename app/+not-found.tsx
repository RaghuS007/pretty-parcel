import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { THEME } from "../src/constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page Not Found" }} />
      <View style={styles.container}>
        <Feather name="map-pin" size={48} color={THEME.colors.primary} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Oops! This page doesn't exist.</Text>
        <Text style={styles.subtitle}>
          The link you followed may be broken or the page may have been removed.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>← Back to Home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: THEME.colors.background,
  },
  title: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 22,
    color: THEME.colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 13,
    color: THEME.colors.secondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  link: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: THEME.radius.round,
  },
  linkText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 13,
    color: THEME.colors.white,
  },
});
