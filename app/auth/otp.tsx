import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { AuthRepository, OrderRepository, USE_LIVE_API } from "../../src/repository";
import { THEME } from "../../src/constants/theme";
import { useStore } from "../../src/store/useStore";

export default function OtpScreen() {
  const { mobile, name } = useLocalSearchParams<{ mobile: string; name: string }>();
  
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Array of refs for textinputs
  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  // Store actions
  const setUser = useStore((state) => state.setUser);
  const setOrders = useStore((state) => state.setOrders);
  const showToast = useStore((state) => state.showToast);

  // 30s Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 200);
  }, []);

  const handleChangeText = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text.slice(-1); // Only keep the single character
    setCode(newCode);

    if (text.length > 0 && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && code[index] === "" && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = code.join("");
    if (otpString.length < 6) {
      showToast({
        type: "error",
        title: "Incomplete Code",
        message: "Please enter the full 6-digit verification code.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await AuthRepository.verifyOtp(mobile, otpString, name);
      if (res.success && res.user) {
        setUser(res.user);
        
        // Fetch and cache orders history for this mobile number
        const userOrders = await OrderRepository.getOrders(mobile);
        setOrders(userOrders);
        
        Keyboard.dismiss();
        showToast({
          type: "success",
          title: "Welcome! ✨",
          message: `Logged in successfully as ${res.user.name}.`,
        });
        
        // Redirect after a 600ms delay to let the toast display
        setTimeout(() => {
          router.replace("/(tabs)/account");
        }, 600);
      } else {
        showToast({
          type: "error",
          title: "Verification Failed",
          message: res.error || "Wrong OTP. Try entering 123456.",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        message: "Could not verify code. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const res = await AuthRepository.sendOtp(mobile);
      if (res.success) {
        setTimer(30);
        setCode(["", "", "", "", "", ""]);
        inputRefs[0].current?.focus();
        showToast({
          type: "success",
          title: "Code Sent",
          message: "A new OTP verification code has been sent. Demo: 123456.",
        });
      } else {
        showToast({
          type: "error",
          title: "Resend Failed",
          message: res.msg,
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Error",
        message: "Could not resend OTP.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color={THEME.colors.text} />
      </Pressable>

      <View style={styles.innerCard}>
        <Text style={styles.brandTitle}>SECURE LOGIN</Text>
        <Text style={styles.title}>Enter OTP Code</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit OTP verification code to +91 {mobile}. Please enter it below.
        </Text>

        {/* Demo warning banner in mock mode */}
        {!USE_LIVE_API && (
          <View style={styles.demoBanner}>
            <Feather name="info" size={14} color="#7A5C3E" style={styles.demoBannerIcon} />
            <Text style={styles.demoBannerText}>
              Demo mode — use code <Text style={styles.demoBannerBold}>123456</Text>
            </Text>
          </View>
        )}

        {/* 6 Digit Input Row */}
        <View style={styles.otpRow}>
          {code.map((val, idx) => (
            <TextInput
              key={idx}
              ref={inputRefs[idx]}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={1}
              value={val}
              onChangeText={(text) => handleChangeText(text, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
            />
          ))}
        </View>

        {/* Verification Trigger Button */}
        <Pressable
          onPress={handleVerifyOtp}
          disabled={loading}
          style={({ pressed }) => [
            styles.verifyBtn,
            pressed && styles.verifyBtnPressed,
            loading && { opacity: 0.8 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={THEME.colors.white} />
          ) : (
            <>
              <Text style={styles.verifyBtnText}>Verify & Proceed</Text>
              <Feather name="check" size={14} color={THEME.colors.white} />
            </>
          )}
        </Pressable>

        {/* Resend Panel */}
        <View style={styles.resendContainer}>
          {timer > 0 ? (
            <Text style={styles.resendMutedText}>Resend code in {timer}s</Text>
          ) : (
            <Pressable onPress={handleResendOtp} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color={THEME.colors.primary} />
              ) : (
                <Text style={styles.resendActiveText}>Resend OTP</Text>
              )}
            </Pressable>
          )}
        </View>
        
        <Text style={styles.demoMutedText}>Demo tip: Enter "123456"</Text>
      </View>
    </View>
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
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.primary,
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
  demoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD6C9", // Soft Peach
    borderColor: "#E6A18B", // Rose Gold
    borderWidth: 1.5,
    borderRadius: THEME.radius.sm,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  demoBannerIcon: {
    marginRight: 8,
  },
  demoBannerText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 11,
    color: "#2C2C2A", // Dark Charcoal
  },
  demoBannerBold: {
    fontFamily: THEME.fonts.body.semibold,
    color: "#C0533B",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: THEME.spacing.xl,
  },
  otpInput: {
    width: 36,
    height: 44,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.background,
    textAlign: "center",
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 16,
    color: THEME.colors.text,
  },
  verifyBtn: {
    backgroundColor: THEME.colors.primary,
    height: 42,
    borderRadius: THEME.radius.round,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...THEME.shadows.button,
  },
  verifyBtnPressed: {
    opacity: 0.95,
  },
  verifyBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
  resendContainer: {
    marginTop: THEME.spacing.lg,
    alignItems: "center",
  },
  resendMutedText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.inkSoft,
  },
  resendActiveText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: THEME.colors.primary,
    textDecorationLine: "underline",
  },
  demoMutedText: {
    fontFamily: THEME.fonts.body.light,
    fontSize: 10,
    color: THEME.colors.secondary,
    textAlign: "center",
    marginTop: 16,
  },
});
