import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Switch,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ProductRepository } from "../../src/repository";
import { Product } from "../../src/data/types";
import { THEME } from "../../src/constants/theme";
import { ProductImage } from "../../src/components/ProductImage";
import { useStore } from "../../src/store/useStore";

export default function AdminProducts() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  
  // Edit Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editPriceRupees, setEditPriceRupees] = useState("");
  const [editMrpRupees, setEditMrpRupees] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editIsNew, setEditIsNew] = useState(false);
  const [editBestseller, setEditBestseller] = useState(false);
  const [saving, setSaving] = useState(false);

  const showToast = useStore((state) => state.showToast);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await ProductRepository.getProducts();
      setProducts(data);
    } catch (e) {
      console.error("Failed to load products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleEditClick = (p: Product) => {
    setSelectedProduct(p);
    setEditName(p.name);
    setEditPriceRupees(String(p.price));
    setEditMrpRupees(String(p.mrp));
    setEditTags(p.tags.join(", "));
    setEditIsNew(p.isNew);
    setEditBestseller(p.bestseller);
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    if (!editName.trim()) {
      showToast({ type: "error", title: "Missing Name", message: "Product name cannot be empty." });
      return;
    }

    const priceNum = parseFloat(editPriceRupees);
    const mrpNum = parseFloat(editMrpRupees);

    if (isNaN(priceNum) || priceNum <= 0) {
      showToast({ type: "error", title: "Invalid Price", message: "Enter a valid product price." });
      return;
    }

    setSaving(true);
    try {
      const updatedProduct: Product = {
        ...selectedProduct,
        name: editName.trim(),
        price: priceNum,
        mrp: isNaN(mrpNum) ? priceNum : mrpNum,
        isNew: editIsNew,
        bestseller: editBestseller,
        tags: editTags.split(",").map(t => t.trim()).filter(Boolean),
      };

      await ProductRepository.updateProduct(updatedProduct);
      
      // Update local state list
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      
      showToast({
        type: "success",
        title: "Product Updated",
        message: `${updatedProduct.name} saved successfully.`,
      });
      setSelectedProduct(null);
    } catch (e) {
      showToast({
        type: "error",
        title: "Update Failed",
        message: "Failed to update product database overlay.",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p =>
    [p.name, p.collection, p.sub, ...p.tags].join(" ").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBarContainer}>
        <Feather name="search" size={16} color={THEME.colors.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products by name, collection, tag..."
          placeholderTextColor={THEME.colors.inkSoft}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <Pressable onPress={() => setSearch("")} style={styles.clearBtn}>
            <Feather name="x" size={14} color={THEME.colors.secondary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {filteredProducts.map(p => (
          <Pressable
            key={p.id}
            onPress={() => handleEditClick(p)}
            style={({ pressed }) => [styles.productRow, pressed && styles.productRowPressed]}
          >
            <View style={styles.productCellImage}>
              <ProductImage product={p} width={48} height={48} />
            </View>
            <View style={styles.productCellInfo}>
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productSub}>
                {p.collection} &bull; {p.sub}
              </Text>
              <View style={styles.flagsRow}>
                {p.bestseller && (
                  <View style={[styles.flagBadge, styles.bestsellerBadge]}>
                    <Text style={styles.flagText}>Bestseller</Text>
                  </View>
                )}
                {p.isNew && (
                  <View style={[styles.flagBadge, styles.newBadge]}>
                    <Text style={styles.flagText}>New</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.productCellPrice}>
              <Text style={styles.priceText}>₹{p.price.toLocaleString("en-IN")}</Text>
              <Text style={styles.mrpText}>₹{p.mrp.toLocaleString("en-IN")}</Text>
              <Feather name="edit-2" size={12} color={THEME.colors.primary} style={styles.editIcon} />
            </View>
          </Pressable>
        ))}

        {filteredProducts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matching products found.</Text>
          </View>
        )}
      </ScrollView>

      {/* Edit Overlay Modal */}
      {selectedProduct && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedProduct(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Product</Text>
                <Pressable onPress={() => setSelectedProduct(null)} style={styles.modalCloseBtn}>
                  <Feather name="x" size={18} color={THEME.colors.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                {/* Product Identifier Block */}
                <View style={styles.modalProductPreview}>
                  <ProductImage product={selectedProduct} width={60} height={60} />
                  <View style={styles.previewTextContainer}>
                    <Text style={styles.previewId}>ID: {selectedProduct.id}</Text>
                    <Text style={styles.previewMeta}>Category: {selectedProduct.cat} / {selectedProduct.sub}</Text>
                  </View>
                </View>

                {/* Input Fields */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>PRODUCT NAME</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter name"
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>PRICE (₹)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editPriceRupees}
                      onChangeText={setEditPriceRupees}
                      keyboardType="numeric"
                      placeholder="e.g. 1499"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>MRP (₹)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={editMrpRupees}
                      onChangeText={setEditMrpRupees}
                      keyboardType="numeric"
                      placeholder="e.g. 1899"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>TAGS (comma separated)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editTags}
                    onChangeText={setEditTags}
                    placeholder="e.g. layered, gold, minimal"
                  />
                </View>

                {/* Switches */}
                <View style={styles.switchGroup}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Bestseller Flag</Text>
                    <Switch
                      value={editBestseller}
                      onValueChange={setEditBestseller}
                      trackColor={{ false: THEME.colors.border, true: THEME.colors.primary }}
                      thumbColor={THEME.colors.white}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>New Arrival Flag</Text>
                    <Switch
                      value={editIsNew}
                      onValueChange={setEditIsNew}
                      trackColor={{ false: THEME.colors.border, true: THEME.colors.primary }}
                      thumbColor={THEME.colors.white}
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setSelectedProduct(null)}
                  style={styles.cancelBtn}
                  disabled={saving}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  style={styles.saveBtn}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={THEME.colors.white} />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    justifyContent: "center",
    alignItems: "center",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.white,
    margin: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.md,
    height: 40,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.card,
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
  clearBtn: {
    padding: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.xl,
    maxWidth: THEME.layout.maxWidth,
    width: "100%",
    alignSelf: "center",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.white,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.sm,
    ...THEME.shadows.card,
  },
  productRowPressed: {
    backgroundColor: THEME.colors.background,
  },
  productCellImage: {
    marginRight: THEME.spacing.md,
    borderRadius: THEME.radius.sm,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  productCellInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: THEME.colors.text,
    marginBottom: 2,
  },
  productSub: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.secondary,
    marginBottom: 4,
  },
  flagsRow: {
    flexDirection: "row",
    gap: 4,
  },
  flagBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: THEME.radius.round,
  },
  bestsellerBadge: {
    backgroundColor: "#F7E3DA",
  },
  newBadge: {
    backgroundColor: "#FFE9E0",
  },
  flagText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 8,
    color: THEME.colors.secondary,
  },
  productCellPrice: {
    alignItems: "flex-end",
    marginLeft: THEME.spacing.md,
  },
  priceText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: THEME.colors.text,
  },
  mrpText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.inkSoft,
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  editIcon: {
    marginTop: 4,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.lg,
  },
  modalCard: {
    backgroundColor: THEME.colors.white,
    borderRadius: THEME.radius.lg,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    width: "100%",
    maxWidth: 480,
    maxHeight: "90%",
    ...THEME.shadows.drawer,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  modalTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 18,
    color: THEME.colors.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalForm: {
    padding: THEME.spacing.lg,
  },
  modalProductPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  previewTextContainer: {
    marginLeft: THEME.spacing.md,
  },
  previewId: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.secondary,
  },
  previewMeta: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 10,
    color: THEME.colors.inkSoft,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: THEME.spacing.md,
  },
  formLabel: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 9,
    color: THEME.colors.secondary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  formInput: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.text,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.sm,
    paddingHorizontal: THEME.spacing.md,
    height: 38,
  },
  rowInputs: {
    flexDirection: "row",
    gap: THEME.spacing.md,
  },
  switchGroup: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.xl,
    gap: THEME.spacing.sm,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 11,
    color: THEME.colors.text,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: THEME.spacing.md,
    padding: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.round,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 12,
    color: THEME.colors.secondary,
  },
  saveBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: THEME.radius.round,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
    ...THEME.shadows.button,
  },
  saveBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: THEME.colors.white,
  },
});
