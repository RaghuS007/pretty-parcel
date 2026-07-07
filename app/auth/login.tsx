import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { AuthRepository } from "../../src/repository";
import { THEME } from "../../src/constants/theme";

export default function LoginScreen() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!name.trim()) {
      Alert.alert("Required Field", "Please enter your name.");
      return;
    }
    if (!mobile.trim()) {
      Alert.alert("Required Field", "Please enter your mobile number.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await AuthRepository.sendOtp(mobile);
      if (res.success) {
        // Navigate to verification screen passing parameters
        router.push({
          pathname: "/auth/otp",
          params: { mobile, name: name.trim() },
        });
      } else {
        Alert.alert("Validation Error", res.msg);
      }
    } catch (err) {
      Alert.alert("Connection Error", "Could not connect to support service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color={THEME.colors.text} />
      </Pressable>

      <View style={styles.innerCard}>
        <Text style={styles.brandTitle}>The Pretty Parcel</Text>
        <Text style={styles.title}>Join The Parcel Club ✨</Text>
        <Text style={styles.subtitle}>
          Track your orders, customize delivery profiles, and unlock member-only gold promotions.
        </Text>

        {/* Inputs */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>YOUR NAME</Text>
          <View style={styles.inputContainer}>
            <Feather name="user" size={16} color={THEME.colors.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Ananya Sharma"
              placeholderTextColor={THEME.colors.inkSoft}
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>MOBILE PHONE</Text>
          <View style={styles.inputContainer}>
            <Feather name="phone" size={16} color={THEME.colors.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 9876543210"
              placeholderTextColor={THEME.colors.inkSoft}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
        </View>

        <Pressable
          onPress={handleSendOtp}
          disabled={loading}
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && styles.submitBtnPressed,
            loading && { opacity: 0.8 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={THEME.colors.white} />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Get Verification Code</Text>
              <Feather name="shield" size={14} color={THEME.colors.white} />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: "center",
    padding: THEME.spacing.lg,
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: THEME.spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...THEME.shadows.card,
  },
  innerCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.xl,
    ...THEME.shadows.card,
  },
  brandTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 12,
    color: THEME.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 20,
    color: THEME.colors.text,
    textAlign: "center",
    marginBottom: THEME.spacing.sm,
  },
  subtitle: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.secondary,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: THEME.spacing.xl,
  },
  inputGroup: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.secondary,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
    paddingHorizontal: THEME.spacing.md,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: THEME.fonts.body.regular,
    fontSize: 13,
    color: THEME.colors.text,
  },
  submitBtn: {
    backgroundColor: THEME.colors.primary,
    height: 42,
    borderRadius: THEME.radius.round,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: THEME.spacing.md,
    ...THEME.shadows.button,
  },
  submitBtnPressed: {
    opacity: 0.95,
  },
  submitBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
});
