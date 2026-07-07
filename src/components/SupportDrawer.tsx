import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { THEME } from "../constants/theme";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
}

export const SupportDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_init",
      text: "Hi there! ✨ Welcome to The Pretty Parcel. I'm your virtual styling & support assistant. How can I help you today?",
      isUser: false,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const QUICK_REPLIES = [
    { label: "Track Order 📦", response: "To track your parcel, please paste your 8-character Order ID (e.g., #ORD-1234) or log in to check your account orders tab." },
    { label: "Shipping Rates 🚚", response: "We offer free standard shipping across India on orders above ₹999. For orders below ₹999, a flat delivery fee of ₹79 applies. Delivery takes 3-5 business days." },
    { label: "Returns Info 🔄", response: "We have a hassle-free 7-day return policy for unused jewellery in original packaging. To initiate a return, visit your account portal or email care@prettyparcel.in." },
    { label: "Care Guide ✨", response: "Keep your demi-fine jewellery shining! Store in an airtight pouch, avoid contact with perfume/water, and gently wipe with a soft microfiber cloth after wear." },
    { label: "Talk to a Human 📞", response: "Our support agents are active Mon-Sat 10 AM - 7 PM. You can email us at care@prettyparcel.in or WhatsApp us directly at +91 79753 81312." },
  ];

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const appendMessage = (text: string, isUser: boolean) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        text,
        isUser,
      },
    ]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleQuickReply = (label: string, response: string) => {
    appendMessage(label, true);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      appendMessage(response, false);
    }, 800);
  };

  const handleSendCustomText = () => {
    if (!inputText.trim()) return;
    const userText = inputText.trim();
    setInputText("");
    appendMessage(userText, true);
    
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const query = userText.toLowerCase();
      let response = "I'm a simulated assistant! Please try tapping one of the quick replies or write to us at care@prettyparcel.in.";

      if (query.includes("order") || query.includes("track")) {
        response = "To track your parcel, please paste your 8-character Order ID (e.g., #ORD-1234) or log in to check your account orders tab.";
      } else if (query.includes("shipping") || query.includes("delivery") || query.includes("charge")) {
        response = "We offer free standard shipping across India on orders above ₹999. For orders below ₹999, a flat delivery fee of ₹79 applies. Delivery takes 3-5 business days.";
      } else if (query.includes("return") || query.includes("refund") || query.includes("exchange")) {
        response = "We have a hassle-free 7-day return policy for unused jewellery in original packaging. To initiate a return, visit your account portal or email care@prettyparcel.in.";
      } else if (query.includes("care") || query.includes("polish") || query.includes("clean")) {
        response = "Keep your demi-fine jewellery shining! Store in an airtight pouch, avoid contact with perfume/water, and gently wipe with a soft microfiber cloth after wear.";
      } else if (query.includes("human") || query.includes("whatsapp") || query.includes("call") || query.includes("phone")) {
        response = "Our support agents are active Mon-Sat 10 AM - 7 PM. You can email us at care@prettyparcel.in or WhatsApp us directly at +91 79753 81312.";
      }

      appendMessage(response, false);
    }, 1000);
  };

  const handleCallWhatsApp = async () => {
    const url = "whatsapp://send?phone=917975381312&text=Hello%20Pretty%20Parcel%20Support";
    const webFallback = "https://wa.me/917975381312?text=Hello%20Pretty%20Parcel%20Support";
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(webFallback);
      }
    } catch {
      await Linking.openURL(webFallback);
    }
  };

  return (
    <>
      {/* Floating Chat Bubble Button */}
      <Pressable onPress={handleOpen} style={styles.floatingBtn}>
        <Feather name="message-square" size={22} color={THEME.colors.white} />
      </Pressable>

      {/* Drawer Overlay Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.dismissOverlay} onPress={handleClose} />
          
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.drawerContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerTitle}>Help & Support</Text>
              </View>
              <Pressable onPress={handleClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color={THEME.colors.text} />
              </Pressable>
            </View>

            {/* Chat Body */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.chatBody}
              contentContainerStyle={styles.chatContent}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubble,
                    msg.isUser ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.isUser ? styles.userText : styles.botText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}

              {isTyping && (
                <View style={[styles.messageBubble, styles.botBubble, styles.typingRow]}>
                  <ActivityIndicator size="small" color={THEME.colors.primary} />
                  <Text style={styles.typingText}>typing...</Text>
                </View>
              )}
            </ScrollView>

            {/* Quick Replies Panel */}
            <View style={styles.quickRepliesSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickRepliesContainer}
              >
                {QUICK_REPLIES.map((reply, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleQuickReply(reply.label, reply.response)}
                    style={styles.quickReplyBadge}
                  >
                    <Text style={styles.quickReplyText}>{reply.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Input Footer */}
            <View style={styles.footerInputContainer}>
              <Pressable onPress={handleCallWhatsApp} style={styles.whatsappDirectBtn}>
                <Feather name="phone" size={18} color={THEME.colors.primary} />
              </Pressable>
              
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask about shipping, returns..."
                placeholderTextColor={THEME.colors.inkSoft}
                style={styles.textInput}
                onSubmitEditing={handleSendCustomText}
              />
              
              <Pressable onPress={handleSendCustomText} style={styles.sendBtn}>
                <Feather name="send" size={16} color={THEME.colors.white} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingBtn: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 1000,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.overlay,
    justifyContent: "flex-end",
  },
  dismissOverlay: {
    flex: 1,
  },
  drawerContent: {
    height: "65%",
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.radius.xl,
    borderTopRightRadius: THEME.radius.xl,
    ...THEME.shadows.drawer,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.success,
  },
  headerTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 18,
    color: THEME.colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBody: {
    flex: 1,
  },
  chatContent: {
    padding: THEME.spacing.lg,
    gap: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingVertical: THEME.spacing.sm + 2,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
  },
  botBubble: {
    backgroundColor: THEME.colors.white,
    alignSelf: "flex-start",
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  userBubble: {
    backgroundColor: THEME.colors.primary,
    alignSelf: "flex-end",
    borderTopRightRadius: 2,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  botText: {
    fontFamily: THEME.fonts.body.regular,
    color: THEME.colors.text,
  },
  userText: {
    fontFamily: THEME.fonts.body.medium,
    color: THEME.colors.white,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typingText: {
    fontSize: 12,
    fontFamily: THEME.fonts.body.light,
    color: THEME.colors.secondary,
  },
  quickRepliesSection: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.white,
  },
  quickRepliesContainer: {
    paddingHorizontal: THEME.spacing.lg,
    gap: 8,
  },
  quickReplyBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  quickReplyText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 11,
    color: THEME.colors.secondary,
  },
  footerInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.white,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  whatsappDirectBtn: {
    width: 38,
    height: 38,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.colors.background,
  },
  textInput: {
    flex: 1,
    height: 38,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: THEME.spacing.md,
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.text,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
