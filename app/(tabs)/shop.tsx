import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Product } from "../../src/data/types";
import { ProductRepository } from "../../src/repository";
import { THEME } from "../../src/constants/theme";
import { ProductCard } from "../../src/components/ProductCard";
import { SupportDrawer } from "../../src/components/SupportDrawer";
import { CATEGORIES } from "../../src/data/mockProducts";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating-desc", label: "Customer Rating" },
];

const PRICE_RANGES = [
  { value: "under-500", label: "Under ₹500" },
  { value: "500-1000", label: "₹500 - ₹1,000" },
  { value: "above-1000", label: "Above ₹1,000" },
];

const COLLECTIONS = [
  "Golden Hour",
  "First Light",
  "Sea Whisper",
  "Raat Rani",
  "Mitti",
  "Soft Hour",
];

export default function ShopScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const numColumns = isDesktop ? 4 : 2;
  const cardWidth = isDesktop
    ? (Math.min(windowWidth, THEME.layout.maxWidth) - THEME.spacing.lg * 5) / 4
    : (windowWidth - THEME.spacing.lg * 3) / 2;
  
  // Data State
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  
  // Sort State
  const [activeSort, setActiveSort] = useState("featured");
  const [isSortOpen, setIsSortOpen] = useState(false);
  
  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch catalog on mount
  useEffect(() => {
    async function loadData() {
      try {
        const data = await ProductRepository.getProducts();
        setAllProducts(data);
      } catch (err) {
        console.error("Error loading products in shop:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Listen to deep-link category changes from Home Category Row
  useEffect(() => {
    if (params.category) {
      setSelectedCategory(params.category);
    }
  }, [params.category]);

  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSelectedCollection(null);
    setSelectedPriceRange(null);
    setSearchQuery("");
    setActiveSort("featured");
  };

  // 1. FILTER LOGIC
  const filteredProducts = allProducts.filter((p) => {
    // Category filter
    if (selectedCategory && p.cat !== selectedCategory) return false;

    // Collection filter
    if (selectedCollection && p.collection !== selectedCollection) return false;

    // Price Range filter
    if (selectedPriceRange) {
      if (selectedPriceRange === "under-500" && p.price >= 500) return false;
      if (selectedPriceRange === "500-1000" && (p.price < 500 || p.price > 1000)) return false;
      if (selectedPriceRange === "above-1000" && p.price <= 1000) return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCat = p.sub.toLowerCase().includes(q);
      const matchCol = p.collection.toLowerCase().includes(q);
      const matchTags = p.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchCat && !matchCol && !matchTags) return false;
    }

    return true;
  });

  // 2. SORTING LOGIC
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (activeSort) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "rating-desc":
        return b.rating - a.rating;
      case "featured":
      default:
        // Keep default product sequence (matching database mockProducts.ts arrays)
        return 0;
    }
  });

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory) count++;
    if (selectedCollection) count++;
    if (selectedPriceRange) count++;
    return count;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Unpacking collection...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header Row */}
      <View style={[styles.searchBarRow, isDesktop && { maxWidth: THEME.layout.maxWidth, width: '100%', alignSelf: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: THEME.colors.border }]}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color={THEME.colors.secondary} style={styles.searchIcon} />
          <TextInput
            placeholder="Search necklaces, clips, earrings..."
            placeholderTextColor={THEME.colors.inkSoft}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Control Buttons (Sort & Filter Drawer togglers) */}
      <View style={[styles.controlRow, isDesktop && { maxWidth: THEME.layout.maxWidth, width: '100%', alignSelf: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: THEME.colors.border }]}>
        <Pressable
          onPress={() => setIsSortOpen(true)}
          style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
        >
          <Feather name="align-left" size={14} color={THEME.colors.text} />
          <Text style={styles.controlBtnText}>
            Sort: {SORT_OPTIONS.find((o) => o.value === activeSort)?.label}
          </Text>
          <Feather name="chevron-down" size={12} color={THEME.colors.secondary} />
        </Pressable>

        <View style={styles.verticalDivider} />

        <Pressable
          onPress={() => setIsFilterOpen(true)}
          style={({ pressed }) => [styles.controlBtn, pressed && styles.controlBtnPressed]}
        >
          <Feather name="sliders" size={14} color={THEME.colors.text} />
          <Text style={styles.controlBtnText}>
            Filter
            {getActiveFilterCount() > 0 ? ` (${getActiveFilterCount()})` : ""}
          </Text>
          <Feather name="chevron-down" size={12} color={THEME.colors.secondary} />
        </Pressable>
      </View>

      {/* Products Grid list */}
      <FlatList
        key={isDesktop ? "desktop-grid" : "mobile-grid"}
        data={sortedProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ProductCard product={item} variant={index} width={cardWidth} />
        )}
        numColumns={numColumns}
        contentContainerStyle={[styles.listContent, isDesktop && { maxWidth: THEME.layout.maxWidth, width: "100%", alignSelf: "center" }]}
        columnWrapperStyle={styles.listColumnWrapper}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="compass" size={48} color={THEME.colors.secondary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Treasures Found</Text>
            <Text style={styles.emptyDesc}>
              We couldn't find any matching products. Adjust your search keywords or clear your filters to explore.
            </Text>
            <Pressable onPress={handleResetFilters} style={styles.resetBtn}>
              <Text style={styles.resetBtnText}>Clear All Filters</Text>
            </Pressable>
          </View>
        }
      />

      {/* Floating Support assistant */}
      <SupportDrawer />

      {/* 1. Sort Selection Modal (Slide-up menu) */}
      <Modal
        visible={isSortOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSortOpen(false)}
      >
        <View style={[styles.modalBg, isDesktop && { justifyContent: "center", padding: 20 }]}>
        <Pressable style={styles.modalDismissOverlay} onPress={() => setIsSortOpen(false)} />
        <View style={[styles.sortSheetContent, isDesktop && { maxWidth: 500, width: "100%", borderRadius: THEME.radius.lg, overflow: "hidden" }]}>
          <View style={styles.sheetHeader}>
              <Text style={styles.sheetHeaderTitle}>Sort By</Text>
              <Pressable onPress={() => setIsSortOpen(false)}>
                <Feather name="x" size={18} color={THEME.colors.text} />
              </Pressable>
            </View>

            <View style={styles.sheetOptions}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setActiveSort(opt.value);
                    setIsSortOpen(false);
                  }}
                  style={styles.sortOptionRow}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      activeSort === opt.value && styles.activeSortOptionText,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {activeSort === opt.value && (
                    <Feather name="check" size={16} color={THEME.colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Filters Bottom Sheet Modal */}
      <Modal
        visible={isFilterOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsFilterOpen(false)}
      >
        <View style={[styles.modalBg, isDesktop && { justifyContent: "center", padding: 20 }]}>
        <Pressable style={styles.modalDismissOverlay} onPress={() => setIsFilterOpen(false)} />
        <View style={[styles.filterSheetContent, isDesktop && { maxWidth: 500, width: "100%", height: Math.min(550, windowHeight * 0.8), borderRadius: THEME.radius.lg, overflow: "hidden" }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
              <Text style={styles.sheetHeaderTitle}>Filters</Text>
              <View style={styles.sheetActionsRow}>
                <Pressable onPress={handleResetFilters} style={styles.resetLink}>
                  <Text style={styles.resetLinkText}>Reset All</Text>
                </Pressable>
                <Pressable onPress={() => setIsFilterOpen(false)} style={styles.closeSheetBtn}>
                  <Feather name="x" size={18} color={THEME.colors.text} />
                </Pressable>
              </View>
            </View>

            {/* Scrollable Filter Chips selection */}
            <ScrollView style={styles.filterScroll} showsVerticalScrollIndicator={false}>
              
              {/* Category Group */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Categories</Text>
                <View style={styles.chipsRow}>
                  {Object.entries(CATEGORIES).map(([catKey, catVal]) => {
                    const isSelected = selectedCategory === catKey;
                    return (
                      <Pressable
                        key={catKey}
                        onPress={() => setSelectedCategory(isSelected ? null : catKey)}
                        style={[styles.chip, isSelected && styles.activeChip]}
                      >
                        <Text style={[styles.chipLabel, isSelected && styles.activeChipLabel]}>
                          {catVal}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Collection Group */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Collections</Text>
                <View style={styles.chipsRow}>
                  {COLLECTIONS.map((colName) => {
                    const isSelected = selectedCollection === colName;
                    return (
                      <Pressable
                        key={colName}
                        onPress={() => setSelectedCollection(isSelected ? null : colName)}
                        style={[styles.chip, isSelected && styles.activeChip]}
                      >
                        <Text style={[styles.chipLabel, isSelected && styles.activeChipLabel]}>
                          {colName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Price Group */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Price Ranges</Text>
                <View style={styles.chipsRow}>
                  {PRICE_RANGES.map((range) => {
                    const isSelected = selectedPriceRange === range.value;
                    return (
                      <Pressable
                        key={range.value}
                        onPress={() => setSelectedPriceRange(isSelected ? null : range.value)}
                        style={[styles.chip, isSelected && styles.activeChip]}
                      >
                        <Text style={[styles.chipLabel, isSelected && styles.activeChipLabel]}>
                          {range.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Sticky bottom Action Button */}
            <View style={styles.sheetFooter}>
              <Pressable
                onPress={() => setIsFilterOpen(false)}
                style={({ pressed }) => [styles.applyBtn, pressed && styles.applyBtnPressed]}
              >
                <Text style={styles.applyBtnText}>
                  Show {sortedProducts.length} Product{sortedProducts.length !== 1 ? "s" : ""}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  searchBarRow: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 50,
    paddingBottom: THEME.spacing.sm,
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.round,
    paddingHorizontal: THEME.spacing.md,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.text,
  },
  controlRow: {
    flexDirection: "row",
    backgroundColor: THEME.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    height: 44,
  },
  controlBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  controlBtnPressed: {
    backgroundColor: THEME.colors.background,
  },
  controlBtnText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.text,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: THEME.colors.border,
    height: "100%",
  },
  listContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 80,
  },
  listColumnWrapper: {
    justifyContent: "space-between",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: THEME.spacing.xl,
  },
  emptyTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 20,
    color: THEME.colors.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: THEME.spacing.lg,
  },
  resetBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: THEME.radius.round,
  },
  resetBtnText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 13,
    color: THEME.colors.white,
  },
  modalBg: {
    flex: 1,
    backgroundColor: THEME.colors.overlay,
    justifyContent: "flex-end",
  },
  modalDismissOverlay: {
    flex: 1,
  },
  sortSheetContent: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.radius.xl,
    borderTopRightRadius: THEME.radius.xl,
    paddingBottom: 24,
    ...THEME.shadows.drawer,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  sheetHeaderTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 18,
    color: THEME.colors.text,
  },
  sheetActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sheetOptions: {
    paddingVertical: THEME.spacing.sm,
  },
  sortOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
  },
  sortOptionText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 14,
    color: THEME.colors.secondary,
  },
  activeSortOptionText: {
    fontFamily: THEME.fonts.body.medium,
    color: THEME.colors.primary,
  },
  filterSheetContent: {
    height: 500,
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.radius.xl,
    borderTopRightRadius: THEME.radius.xl,
    ...THEME.shadows.drawer,
  },
  closeSheetBtn: {
    padding: 4,
  },
  resetLink: {
    paddingVertical: 4,
  },
  resetLinkText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.secondary,
    textDecorationLine: "underline",
  },
  filterScroll: {
    flex: 1,
    padding: THEME.spacing.lg,
  },
  filterGroup: {
    marginBottom: THEME.spacing.xl,
  },
  filterGroupTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 16,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm + 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.white,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  activeChip: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  chipLabel: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
  activeChipLabel: {
    fontFamily: THEME.fonts.body.medium,
    color: THEME.colors.white,
  },
  sheetFooter: {
    padding: THEME.spacing.lg,
    backgroundColor: THEME.colors.white,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  applyBtn: {
    backgroundColor: THEME.colors.primary,
    height: 44,
    borderRadius: THEME.radius.round,
    alignItems: "center",
    justifyContent: "center",
    ...THEME.shadows.button,
  },
  applyBtnPressed: {
    opacity: 0.9,
  },
  applyBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 14,
    color: THEME.colors.white,
  },
});
