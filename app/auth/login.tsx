import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { AuthRepository } from "../../src/repository";
import { THEME } from "../../src/constants/theme";
import { useStore } from "../../src/store/useStore";

export default function LoginScreen() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  // Validation errors
  const [nameError, setNameError] = useState("");
  const [mobileError, setMobileError] = useState("");

  const showToast = useStore((state) => state.showToast);

  const handleSendOtp = async () => {
    let hasError = false;

    if (!name.trim()) {
      setNameError("Please enter your name.");
      hasError = true;
    } else if (name.trim().length < 2) {
      setNameError("Name must be at least 2 characters.");
      hasError = true;
    }

    if (!mobile.trim()) {
      setMobileError("Please enter your mobile number.");
      hasError = true;
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      setMobileError("Please enter a valid 10-digit mobile number starting with 6-9.");
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      const res = await AuthRepository.sendOtp(mobile);
      if (res.success) {
        showToast({
          type: "success",
          title: "Code Sent",
          message: res.msg || "Verification OTP code sent successfully.",
        });

        // Navigate to verification screen passing parameters
        router.push({
          pathname: "/auth/otp",
          params: { mobile, name: name.trim() },
        });
      } else {
        showToast({
          type: "error",
          title: "Validation Error",
          message: res.msg,
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Connection Error",
        message: "Could not connect to support service. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = name.trim().length >= 2 && /^[6-9]\d{9}$/.test(mobile);
  const isDisabled = loading || !isFormValid;

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
          <View style={[styles.inputContainer, nameError ? styles.inputContainerError : null]}>
            <Feather name="user" size={16} color={THEME.colors.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Ananya Sharma"
              placeholderTextColor={THEME.colors.inkSoft}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (text.trim().length >= 2) {
                  setNameError("");
                }
              }}
            />
          </View>
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>MOBILE PHONE</Text>
          <View style={[styles.inputContainer, mobileError ? styles.inputContainerError : null]}>
            <Feather name="phone" size={16} color={THEME.colors.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 9876543210"
              placeholderTextColor={THEME.colors.inkSoft}
              value={mobile}
              onChangeText={(text) => {
                const clean = text.replace(/[^0-9]/g, "");
                setMobile(clean);
                if (clean.length === 0 || /^[6-9]\d{9}$/.test(clean)) {
                  setMobileError("");
                } else if (clean.length > 0 && !/^[6-9]/.test(clean)) {
                  setMobileError("Indian mobile number must start with 6-9.");
                } else if (clean.length < 10) {
                  setMobileError("Must be exactly 10 digits.");
                }
              }}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          {mobileError ? <Text style={styles.errorText}>{mobileError}</Text> : null}
        </View>

        <Pressable
          onPress={handleSendOtp}
          disabled={isDisabled}
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && !isDisabled && styles.submitBtnPressed,
            isDisabled && styles.submitBtnDisabled,
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
    zIndex: 10,
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
  inputContainerError: {
    borderColor: THEME.colors.error,
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
  errorText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.error,
    marginTop: 4,
    marginLeft: 4,
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
    opacity: 0.9,
  },
  submitBtnDisabled: {
    opacity: 0.5,
    backgroundColor: THEME.colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
});
