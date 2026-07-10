import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Product, Address, Order, OrderItem } from "../../src/data/types";
import { ProductRepository, CouponRepository, OrderRepository } from "../../src/repository";
import { THEME } from "../../src/constants/theme";
import { useStore } from "../../src/store/useStore";
import { ProductImage } from "../../src/components/ProductImage";
import { ProductCard } from "../../src/components/ProductCard";
import { COMPLEMENT_RULES, DEFAULT_ADDRESSES } from "../../src/data/mockProducts";
import { SupportDrawer } from "../../src/components/SupportDrawer";
import { DesktopHeader } from "../../src/components/DesktopHeader";

export default function CartScreen() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;

  // Wizard steps: 1 = Review, 2 = Shipping, 3 = Payment
  const [step, setStep] = useState(1);
  
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Inputs for Shipping
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [line, setLine] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi" | "card">("cod");
  const [placingOrder, setPlacingOrder] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Store bindings
  const cart = useStore((state) => state.cart);
  const changeCartQty = useStore((state) => state.changeCartQty);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const clearCart = useStore((state) => state.clearCart);
  const appliedCoupon = useStore((state) => state.appliedCoupon);
  const setAppliedCoupon = useStore((state) => state.setAppliedCoupon);
  const addOrder = useStore((state) => state.addOrder);
  const user = useStore((state) => state.user);
  const showToast = useStore((state) => state.showToast);

  // Load catalog on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await ProductRepository.getProducts();
        setAllProducts(data);
      } catch (err) {
        console.error("Error loading products in cart:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Pre-fill user profile info if logged in
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.mobile);
      // Pre-fill default address
      if (DEFAULT_ADDRESSES.length > 0) {
        const addr = DEFAULT_ADDRESSES[0];
        setLine(addr.line);
        setCity(addr.city);
        setStateName(addr.state);
        setPincode(addr.pincode);
      }
    }
  }, [user]);

  // Convert cart object keys into actual Product rows
  const cartProducts = Object.entries(cart)
    .map(([id, qty]) => {
      const p = allProducts.find((item) => item.id === id);
      return p ? { product: p, qty } : null;
    })
    .filter((item): item is { product: Product; qty: number } => !!item);

  // Calculate totals
  const subtotal = cartProducts.reduce((acc, item) => acc + item.product.price * item.qty, 0);
  const isFreeShipping = subtotal >= THEME.layout.shippingThreshold;
  const shippingCost = subtotal === 0 ? 0 : isFreeShipping ? 0 : THEME.layout.shippingCost;

  // Validate coupon dynamically based on subtotal
  useEffect(() => {
    if (appliedCoupon && subtotal > 0) {
      const activeCode = appliedCoupon;
      async function validateActiveCoupon() {
        const res = await CouponRepository.validateCoupon(activeCode, subtotal);
        if (res.valid) {
          setCouponDiscount(res.discount);
          setCouponSuccess(res.msg);
          setCouponError(null);
        } else {
          // Reset coupon if subtotal falls below threshold
          setAppliedCoupon(null);
          setCouponDiscount(0);
          setCouponSuccess(null);
          setCouponError(res.msg);
        }
      }
      validateActiveCoupon();
    } else {
      setCouponDiscount(0);
      setCouponSuccess(null);
    }
  }, [appliedCoupon, subtotal]);

  const total = Math.max(0, subtotal - couponDiscount + shippingCost);

  // Apply coupon click handler
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError(null);
    setCouponSuccess(null);
    const res = await CouponRepository.validateCoupon(couponInput, subtotal);
    if (res.valid) {
      setAppliedCoupon(couponInput.trim().toUpperCase());
      setCouponInput("");
    } else {
      setCouponError(res.msg);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponSuccess(null);
    setCouponError(null);
  };

  // 1. COMPLETE THE LOOK LOGIC (PRD §8)
  const getCompleteTheLookItems = (): Product[] => {
    if (cartProducts.length === 0) return [];
    
    // Find all subcategories in cart
    const cartSubs = cartProducts.map((item) => item.product.sub);
    const cartProductIds = cartProducts.map((item) => item.product.id);

    // Map to complementary subcategories
    const targetSubs = new Set<string>();
    cartSubs.forEach((sub) => {
      const complements = COMPLEMENT_RULES[sub] || [];
      complements.forEach((c) => targetSubs.add(c));
    });

    // Filter catalog products that belong to target categories and are not in cart
    return allProducts.filter(
      (p) => targetSubs.has(p.sub) && !cartProductIds.includes(p.id)
    );
  };

  const lookItems = getCompleteTheLookItems().slice(0, 5);

  // Form Validations
  const handleNextStep = () => {
    if (step === 1) {
      if (cartProducts.length === 0) {
        showToast({
          type: "error",
          title: "Empty Cart",
          message: "Please add some items to your cart first.",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!name.trim() || !phone.trim() || !line.trim() || !city.trim() || !stateName.trim() || !pincode.trim()) {
        showToast({
          type: "error",
          title: "Required Fields",
          message: "Please fill in all shipping details.",
        });
        return;
      }
      if (!/^[6-9]\d{9}$/.test(phone)) {
        showToast({
          type: "error",
          title: "Invalid Phone",
          message: "Please enter a valid 10-digit mobile number.",
        });
        return;
      }
      if (!/^\d{6}$/.test(pincode)) {
        showToast({
          type: "error",
          title: "Invalid Pincode",
          message: "Please enter a valid 6-digit postal code.",
        });
        return;
      }
      setStep(3);
    }
  };

  // Place order simulated trigger
  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    const orderId = `PP-ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateFormatted = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const items: OrderItem[] = cartProducts.map((item) => ({
      id: item.product.id,
      qty: item.qty,
      price: item.product.price,
    }));

    const finalAddress: Address = {
      id: `addr_${Date.now()}`,
      label: "Delivery Address",
      name,
      line,
      city,
      state: stateName,
      pincode,
      phone,
      isDefault: false,
    };

    const newOrder: Order = {
      id: orderId,
      date: dateFormatted,
      items,
      itemCount: cartProducts.reduce((acc, item) => acc + item.qty, 0),
      total,
      discount: couponDiscount,
      shippingCost,
      shippingAddress: finalAddress,
      paymentMethod,
      status: "processing",
    };

    try {
      // Persist the order (live API recomputes totals server-side and returns
      // the authoritative order; mock mode echoes it back from AsyncStorage)
      const savedOrder = await OrderRepository.createOrder(newOrder);
      // Sync into memory Zustand store cached orders
      addOrder(savedOrder);

      // Complete and clear
      clearCart();
      setAppliedCoupon(null);
      setStep(1);

      // Navigate to success screen passing parameters
      router.push({
        pathname: "/checkout/success",
        params: { orderId: savedOrder.id, total: savedOrder.total },
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Checkout Error",
        message: "Failed to place your order. Please try again.",
      });
    } finally {
      setPlacingOrder(false);
    }
  };

  const formattedValue = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Unfolding your parcel...</Text>
      </View>
    );
  }

  // --- RENDERING TABS/STEPS ---

  const renderShippingProgressBar = () => {
    if (subtotal === 0) return null;
    const percentage = Math.min(100, (subtotal / THEME.layout.shippingThreshold) * 100);
    const amountNeeded = THEME.layout.shippingThreshold - subtotal;

    return (
      <View style={styles.shippingProgressCard}>
        <View style={styles.progressTextRow}>
          <Feather name="truck" size={16} color={THEME.colors.primary} />
          <Text style={styles.progressLabel}>
            {isFreeShipping
              ? "Yay! You qualify for FREE shipping! 🎉"
              : `Add ${formattedValue(amountNeeded)} more for FREE shipping`}
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
        </View>
      </View>
    );
  };

  const renderSummaryBlock = () => {
    return (
      <View style={styles.summaryCard}>
        <Text style={styles.summaryCardTitle}>Order Summary</Text>
        
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryVal}>{formattedValue(subtotal)}</Text>
        </View>

        {couponDiscount > 0 && (
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: THEME.colors.success }]}>Coupon Discount</Text>
            <Text style={[styles.summaryVal, { color: THEME.colors.success }]}>
              -{formattedValue(couponDiscount)}
            </Text>
          </View>
        )}

        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>Shipping</Text>
          <Text style={styles.summaryVal}>
            {shippingCost === 0 ? "FREE" : formattedValue(shippingCost)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryTotalLine}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalVal}>{formattedValue(total)}</Text>
        </View>
      </View>
    );
  };

  const renderCouponSection = () => {
    return (
      <View style={styles.couponSection}>
        <Text style={styles.couponHeading}>Offer Coupon Code</Text>
        {appliedCoupon ? (
          <View style={styles.appliedCouponBadge}>
            <Feather name="tag" size={14} color={THEME.colors.success} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.appliedCouponText}>
                {couponSuccess || `Coupon ${appliedCoupon} Active`}
              </Text>
              <Text style={styles.appliedCouponSavings}>
                Saved {formattedValue(couponDiscount)}
              </Text>
            </View>
            <Pressable onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
              <Text style={styles.removeCouponText}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.couponFormRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="Enter Coupon (e.g. NEEMS10)"
              placeholderTextColor={THEME.colors.inkSoft}
              value={couponInput}
              onChangeText={setCouponInput}
              autoCapitalize="characters"
            />
            <Pressable onPress={handleApplyCoupon} style={styles.couponApplyBtn}>
              <Text style={styles.couponApplyBtnText}>Apply</Text>
            </Pressable>
          </View>
        )}
        {couponError && (
          <Text style={styles.couponErrorMsg}>{couponError}</Text>
        )}
        {!appliedCoupon && (
          <View style={styles.suggestedCouponsRow}>
            <Text style={styles.couponSuggestedLabel}>Available Offers (Tap to Apply):</Text>
            <View style={styles.couponBadgesList}>
              <Pressable
                onPress={() => {
                  setCouponError(null);
                  CouponRepository.validateCoupon("NEEMS10", subtotal).then(res => {
                    if (res.valid) {
                      setAppliedCoupon("NEEMS10");
                    } else {
                      setCouponError(res.msg);
                    }
                  });
                }}
                style={styles.couponSelectBadge}
              >
                <Text style={styles.couponSelectBadgeText}>NEEMS10 (10% Off)</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setCouponError(null);
                  CouponRepository.validateCoupon("PARCEL200", subtotal).then(res => {
                    if (res.valid) {
                      setAppliedCoupon("PARCEL200");
                    } else {
                      setCouponError(res.msg);
                    }
                  });
                }}
                style={styles.couponSelectBadge}
              >
                <Text style={styles.couponSelectBadgeText}>PARCEL200 (₹200 Off)</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderCartItems = () => {
    if (cartProducts.length === 0) {
      return (
        <View style={styles.emptyCartBox}>
          <Feather name="shopping-bag" size={48} color={THEME.colors.secondary} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyCartTitle}>Your Parcel is Empty</Text>
          <Text style={styles.emptyCartDesc}>
            Looks like you haven't added any gorgeous treasures to your parcel yet.
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/shop")} style={styles.shopNowBtn}>
            <Text style={styles.shopNowText}>Start Shopping</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.cartItemsList}>
        {cartProducts.map(({ product: p, qty }) => {
          const isOutOfStock = p.stockQuantity === 0;
          const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= 5;
          return (
            <View key={p.id} style={styles.cartItemRow}>
              <ProductImage product={p} width={70} height={70} />
              <View style={styles.cartItemDetails}>
                <Text style={styles.cartItemCategory}>{p.sub}</Text>
                <Text style={styles.cartItemName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.cartItemPrice}>{formattedValue(p.price)}</Text>
                {isOutOfStock ? (
                  <Text style={styles.cartStockWarning}>Out of stock</Text>
                ) : isLowStock ? (
                  <Text style={styles.cartStockWarning}>Only {p.stockQuantity} left</Text>
                ) : null}
              </View>

              {/* Stepper Control and deletion panel */}
              <View style={styles.cartRightPanel}>
                <Pressable
                  onPress={() => removeFromCart(p.id)}
                  style={styles.cartItemDeleteBtn}
                >
                  <Feather name="trash-2" size={14} color={THEME.colors.error} />
                </Pressable>

                <View style={styles.cartStepper}>
                  <Pressable
                    onPress={() => changeCartQty(p.id, -1)}
                    style={styles.stepperSubBtn}
                  >
                    <Feather name="minus" size={10} color={THEME.colors.text} />
                  </Pressable>
                  <Text style={styles.stepperQtyText}>{qty}</Text>
                  <Pressable
                    onPress={() => changeCartQty(p.id, 1)}
                    style={styles.stepperSubBtn}
                    disabled={qty >= p.stockQuantity}
                  >
                    <Feather
                      name="plus"
                      size={10}
                      color={qty >= p.stockQuantity ? THEME.colors.inkSoft : THEME.colors.text}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.outerContainer}>
      <DesktopHeader />
      {/* Wizard step breadcrumbs bar */}
      <View style={[styles.stepIndicatorRow, isDesktop && { maxWidth: 1200, width: "100%", alignSelf: "center", borderLeftWidth: 1, borderRightWidth: 1, borderColor: THEME.colors.border }]}>
        <View style={styles.stepCell}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
            <Text style={[styles.stepNum, step >= 1 && styles.stepNumActive]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Bag</Text>
        </View>

        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />

        <View style={styles.stepCell}>
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
            <Text style={[styles.stepNum, step >= 2 && styles.stepNumActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Delivery</Text>
        </View>

        <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />

        <View style={styles.stepCell}>
          <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]}>
            <Text style={[styles.stepNum, step >= 3 && styles.stepNumActive]}>3</Text>
          </View>
          <Text style={[styles.stepLabel, step === 3 && styles.stepLabelActive]}>Payment</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isDesktop && { maxWidth: 1200, width: "100%", alignSelf: "center" }]}
      >
        {step === 1 && (
          <>
            {cartProducts.length === 0 ? (
              renderCartItems()
            ) : isDesktop ? (
              <View style={{ flexDirection: "row", gap: 24, padding: 20, width: "100%" }}>
                {/* Left Column: items list, shipping bar, coupon, suggestions */}
                <View style={{ flex: 1.5, gap: 16 }}>
                  {renderShippingProgressBar()}
                  {renderCartItems()}

                  {/* Labeled Coupon Form Block */}
                  {renderCouponSection()}

                  {/* Complete the look suggestions (PRD §8) */}
                  {lookItems.length > 0 && (
                    <View style={styles.lookSection}>
                      <Text style={styles.lookTitle}>Complete The Look</Text>
                      <Text style={styles.lookSubtitle}>Perfect complements for items in your bag</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.lookScroll}
                      >
                        {lookItems.map((lookItem, index) => (
                          <View key={lookItem.id} style={styles.lookCardWrapper}>
                            <ProductCard product={lookItem} variant={index + 5} width={130} />
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Right Column: Order summary block */}
                <View style={{ flex: 1, minWidth: 320 }}>
                  {renderSummaryBlock()}
                </View>
              </View>
            ) : (
              <>
                {renderShippingProgressBar()}
                {renderCartItems()}

                {/* Labeled Coupon Form Block */}
                {renderCouponSection()}

                {renderSummaryBlock()}

                {/* Complete the look suggestions (PRD §8) */}
                {lookItems.length > 0 && (
                  <View style={styles.lookSection}>
                    <Text style={styles.lookTitle}>Complete The Look</Text>
                    <Text style={styles.lookSubtitle}>Perfect complements for items in your bag</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.lookScroll}
                    >
                      {lookItems.map((lookItem, index) => (
                        <View key={lookItem.id} style={styles.lookCardWrapper}>
                          <ProductCard product={lookItem} variant={index + 5} width={130} />
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {step === 2 && (
          <View style={[styles.shippingFormCard, isDesktop && { maxWidth: 600, width: "100%", alignSelf: "center", marginTop: 24 }]}>
            <Text style={styles.formTitle}>Shipping Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <View style={styles.formInputContainer}>
                <Feather name="user" size={14} color={THEME.colors.secondary} style={styles.formInputIcon} />
                <TextInput
                  style={styles.formTextInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Ananya Sharma"
                  placeholderTextColor={THEME.colors.inkSoft}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile Phone *</Text>
              <View style={styles.formInputContainer}>
                <Feather name="phone" size={14} color={THEME.colors.secondary} style={styles.formInputIcon} />
                <TextInput
                  style={styles.formTextInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit number"
                  placeholderTextColor={THEME.colors.inkSoft}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address Line *</Text>
              <View style={styles.formInputContainer}>
                <Feather name="map-pin" size={14} color={THEME.colors.secondary} style={styles.formInputIcon} />
                <TextInput
                  style={styles.formTextInput}
                  value={line}
                  onChangeText={setLine}
                  placeholder="Flat / House / Street Name"
                  placeholderTextColor={THEME.colors.inkSoft}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City *</Text>
              <View style={styles.formInputContainer}>
                <Feather name="map" size={14} color={THEME.colors.secondary} style={styles.formInputIcon} />
                <TextInput
                  style={styles.formTextInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Bengaluru"
                  placeholderTextColor={THEME.colors.inkSoft}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>State *</Text>
                <View style={styles.formInputContainer}>
                  <Feather name="globe" size={14} color={THEME.colors.secondary} style={styles.formInputIcon} />
                  <TextInput
                    style={styles.formTextInput}
                    value={stateName}
                    onChangeText={setStateName}
                    placeholder="Karnataka"
                    placeholderTextColor={THEME.colors.inkSoft}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Pincode *</Text>
                <View style={styles.formInputContainer}>
                  <Feather name="hash" size={14} color={THEME.colors.secondary} style={styles.formInputIcon} />
                  <TextInput
                    style={styles.formTextInput}
                    value={pincode}
                    onChangeText={setPincode}
                    placeholder="6-digit PIN"
                    placeholderTextColor={THEME.colors.inkSoft}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={[styles.paymentSection, isDesktop && { maxWidth: 600, width: "100%", alignSelf: "center", marginTop: 24 }]}>
            <Text style={styles.formTitle}>Choose Payment Method</Text>
            
            <View style={styles.secureBadgeRow}>
              <Feather name="shield" size={14} color={THEME.colors.success} style={{ marginRight: 4 }} />
              <Text style={styles.secureBadgeText}>100% SSL Secure Checkout & Encrypted Transactions</Text>
            </View>
            
            {/* COD Option */}
            <Pressable
              onPress={() => setPaymentMethod("cod")}
              style={[styles.paymentRow, paymentMethod === "cod" && styles.paymentRowActive]}
            >
              <View style={[styles.radioDot, paymentMethod === "cod" && styles.radioDotActive]} />
              <View style={styles.paymentMeta}>
                <Text style={styles.paymentName}>Cash on Delivery (COD)</Text>
                <Text style={styles.paymentDesc}>Pay in cash when order is delivered.</Text>
              </View>
              <Feather name="dollar-sign" size={20} color={THEME.colors.secondary} />
            </Pressable>

            {/* UPI Option */}
            <Pressable
              onPress={() => setPaymentMethod("upi")}
              style={[styles.paymentRow, paymentMethod === "upi" && styles.paymentRowActive]}
            >
              <View style={[styles.radioDot, paymentMethod === "upi" && styles.radioDotActive]} />
              <View style={styles.paymentMeta}>
                <Text style={styles.paymentName}>UPI (GPay / PhonePe / Paytm)</Text>
                <Text style={styles.paymentDesc}>Instant secure checkout via UPI apps.</Text>
              </View>
              <Feather name="zap" size={20} color={THEME.colors.secondary} />
            </Pressable>

            {/* Card Option */}
            <Pressable
              onPress={() => setPaymentMethod("card")}
              style={[styles.paymentRow, paymentMethod === "card" && styles.paymentRowActive]}
            >
              <View style={[styles.radioDot, paymentMethod === "card" && styles.radioDotActive]} />
              <View style={styles.paymentMeta}>
                <Text style={styles.paymentName}>Credit / Debit Cards</Text>
                <Text style={styles.paymentDesc}>Accepts Visa, Mastercard, RuPay.</Text>
              </View>
              <Feather name="credit-card" size={20} color={THEME.colors.secondary} />
            </Pressable>

            {renderSummaryBlock()}

            {/* Address Confirmation Review card */}
            <View style={styles.reviewAddressCard}>
              <View style={styles.reviewAddressHeader}>
                <Text style={styles.reviewAddressTitle}>Delivering to:</Text>
                <Pressable onPress={() => setStep(2)}>
                  <Text style={styles.editAddressLink}>Edit</Text>
                </Pressable>
              </View>
              <Text style={styles.reviewAddressText}>{name} ({phone})</Text>
              <Text style={styles.reviewAddressText}>
                {line}, {city}, {stateName} - {pincode}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Buttons Footer */}
      {cartProducts.length > 0 && (
        <View style={[styles.stickyCheckoutFooter, isDesktop && { maxWidth: 1200, width: "100%", alignSelf: "center", borderLeftWidth: 1, borderRightWidth: 1, borderColor: THEME.colors.border }]}>
          {step === 1 && (
            <View style={styles.footerSummaryRow}>
              <View>
                <Text style={styles.footerTotalLabel}>Total Amount</Text>
                <Text style={styles.footerTotalVal}>{formattedValue(total)}</Text>
              </View>
              <Pressable
                onPress={handleNextStep}
                style={({ pressed }) => [styles.checkoutBtn, pressed && styles.checkoutBtnPressed]}
              >
                <Text style={styles.checkoutBtnText}>Checkout Details</Text>
                <Feather name="arrow-right" size={14} color={THEME.colors.white} />
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View style={styles.footerSummaryRow}>
              <Pressable onPress={() => setStep(1)} style={styles.backButtonOutline}>
                <Text style={styles.backButtonOutlineText}>Back</Text>
              </Pressable>
              <Pressable
                onPress={handleNextStep}
                style={({ pressed }) => [styles.checkoutBtn, { flex: 1 }, pressed && styles.checkoutBtnPressed]}
              >
                <Text style={styles.checkoutBtnText}>Continue to Payment</Text>
                <Feather name="arrow-right" size={14} color={THEME.colors.white} />
              </Pressable>
            </View>
          )}

          {step === 3 && (
            <View style={styles.footerSummaryRow}>
              <Pressable onPress={() => setStep(2)} style={styles.backButtonOutline}>
                <Text style={styles.backButtonOutlineText}>Back</Text>
              </Pressable>
              
              <Pressable
                onPress={handlePlaceOrder}
                disabled={placingOrder}
                style={({ pressed }) => [
                  styles.checkoutBtn,
                  { flex: 1, backgroundColor: THEME.colors.success },
                  pressed && styles.checkoutBtnPressed,
                  placingOrder && { opacity: 0.8 },
                ]}
              >
                {placingOrder ? (
                  <ActivityIndicator size="small" color={THEME.colors.white} />
                ) : (
                  <>
                    <Text style={styles.checkoutBtnText}>Pay & Place Order</Text>
                    <Feather name="check" size={14} color={THEME.colors.white} />
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Floating support drawer bubble */}
      <SupportDrawer />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
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
  stepIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.colors.white,
    paddingVertical: THEME.spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingHorizontal: 30,
    marginTop: 45, // Safety margin for native phones top bars
  },
  stepCell: {
    alignItems: "center",
    width: 60,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  stepNum: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.secondary,
  },
  stepNumActive: {
    color: THEME.colors.white,
  },
  stepLabel: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
  },
  stepLabelActive: {
    fontFamily: THEME.fonts.body.semibold,
    color: THEME.colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
    marginBottom: 14, // Aligned center with stepDot row
  },
  stepLineActive: {
    backgroundColor: THEME.colors.primary,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  shippingProgressCard: {
    backgroundColor: THEME.colors.white,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.lg,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  progressTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.text,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.background,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
  },
  emptyCartBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: THEME.spacing.xl,
  },
  emptyCartTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 20,
    color: THEME.colors.text,
    marginBottom: 6,
  },
  emptyCartDesc: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: THEME.spacing.xl,
  },
  shopNowBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: THEME.radius.round,
  },
  shopNowText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
  cartItemsList: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
    gap: 12,
  },
  cartItemRow: {
    flexDirection: "row",
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.sm + 2,
    alignItems: "center",
  },
  cartItemDetails: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  cartItemCategory: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 9,
    color: THEME.colors.secondary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  cartItemName: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 13,
    color: THEME.colors.text,
    marginBottom: 4,
  },
  cartItemPrice: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.text,
  },
  cartStockWarning: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.error,
    marginTop: 4,
  },
  cartRightPanel: {
    alignItems: "flex-end",
    gap: 8,
  },
  cartItemDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cartStepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.background,
  },
  stepperSubBtn: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperQtyText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 11,
    width: 16,
    textAlign: "center",
    color: THEME.colors.text,
  },
  couponSection: {
    marginHorizontal: THEME.spacing.lg,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  couponHeading: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 15,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  couponFormRow: {
    flexDirection: "row",
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 38,
    borderRadius: THEME.radius.round,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
    paddingHorizontal: THEME.spacing.md,
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.text,
  },
  couponApplyBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.round,
    justifyContent: "center",
  },
  couponApplyBtnText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.white,
  },
  appliedCouponBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 125, 82, 0.1)",
    borderWidth: 1,
    borderColor: THEME.colors.success,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.sm + 2,
  },
  appliedCouponText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 11,
    color: THEME.colors.success,
  },
  appliedCouponSavings: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
  },
  removeCouponBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeCouponText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 11,
    color: THEME.colors.error,
  },
  couponErrorMsg: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.error,
    marginTop: 6,
  },
  couponMutedHint: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.inkSoft,
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    ...THEME.shadows.card,
  },
  summaryCardTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 16,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
  summaryVal: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: THEME.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },
  summaryTotalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  totalLabel: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 14,
    color: THEME.colors.text,
  },
  totalVal: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 18,
    color: THEME.colors.text,
  },
  lookSection: {
    paddingVertical: THEME.spacing.xl,
    paddingHorizontal: THEME.spacing.lg,
  },
  lookTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 18,
    color: THEME.colors.text,
  },
  lookSubtitle: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.secondary,
    marginBottom: THEME.spacing.md,
  },
  lookScroll: {
    gap: THEME.spacing.md,
  },
  lookCardWrapper: {
    // sizing
  },
  shippingFormCard: {
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.lg,
    ...THEME.shadows.card,
  },
  formTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 18,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  inputGroup: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 11,
    color: THEME.colors.secondary,
    marginBottom: 4,
  },
  formInput: {
    height: 40,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.spacing.md,
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.text,
  },
  formInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
    paddingHorizontal: THEME.spacing.md,
  },
  formInputIcon: {
    marginRight: 8,
  },
  formTextInput: {
    flex: 1,
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.text,
  },
  secureBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 125, 82, 0.05)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.sm,
    marginBottom: THEME.spacing.sm,
  },
  secureBadgeText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 10,
    color: THEME.colors.success,
  },
  suggestedCouponsRow: {
    marginTop: THEME.spacing.sm,
  },
  couponSuggestedLabel: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.secondary,
    marginBottom: 6,
  },
  couponBadgesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  couponSelectBadge: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  couponSelectBadgeText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.primary,
  },
  rowInputs: {
    flexDirection: "row",
  },
  paymentSection: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
    gap: 12,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
  },
  paymentRowActive: {
    borderColor: THEME.colors.primary,
    borderWidth: 1.5,
  },
  radioDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: THEME.colors.secondary,
    marginRight: 12,
  },
  radioDotActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primary,
  },
  paymentMeta: {
    flex: 1,
  },
  paymentName: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.text,
  },
  paymentDesc: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
    marginTop: 2,
  },
  reviewAddressCard: {
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    marginHorizontal: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  reviewAddressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  reviewAddressTitle: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 11,
    color: THEME.colors.secondary,
  },
  editAddressLink: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 11,
    color: THEME.colors.primary,
    textDecorationLine: "underline",
  },
  reviewAddressText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.text,
    lineHeight: 16,
  },
  stickyCheckoutFooter: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: THEME.colors.white,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm + 4,
    ...THEME.shadows.drawer,
  },
  footerSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  footerTotalLabel: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
  },
  footerTotalVal: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 16,
    color: THEME.colors.text,
  },
  checkoutBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: THEME.radius.round,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...THEME.shadows.button,
  },
  checkoutBtnPressed: {
    opacity: 0.9,
  },
  checkoutBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.white,
  },
  backButtonOutline: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.round,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: THEME.colors.background,
  },
  backButtonOutlineText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 13,
    color: THEME.colors.text,
  },
});
