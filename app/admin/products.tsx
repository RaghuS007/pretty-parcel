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
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ProductRepository } from "../../src/repository";
import { Product } from "../../src/data/types";
import { THEME } from "../../src/constants/theme";
import { ProductImage } from "../../src/components/ProductImage";
import { useStore } from "../../src/store/useStore";

const CATEGORIES: { value: Product["cat"]; label: string }[] = [
  { value: "demi-fine", label: "Demi-Fine" },
  { value: "oxidised", label: "Oxidised" },
  { value: "hair", label: "Hair" },
];

const SUBCATEGORIES: Record<Product["cat"], string[]> = {
  "demi-fine": ["Necklaces", "Earrings", "Bracelets", "Rings", "Anklets", "Pendants", "Jewellery Sets"],
  "oxidised": ["Necklaces", "Earrings", "Pendants", "Bangles", "Rings"],
  "hair": ["Claw Clips", "Hair Clips", "Hair Bands", "Scrunchies", "Hair Bows"],
};

// Pulls the R2 key back out of a URL this screen previously uploaded
function extractUploadedKey(url: string): string | null {
  const match = url.match(/\/api\/images\/(products\/[\w-]+\.(?:jpg|jpeg|png|webp))(?:$|[?#])/);
  return match ? match[1] : null;
}

type ModalMode = "edit" | "create" | null;

interface FormState {
  name: string;
  cat: Product["cat"];
  sub: string;
  price: string;
  mrp: string;
  material: string;
  collection: string;
  tags: string;
  stockQuantity: string;
  isNew: boolean;
  bestseller: boolean;
  imageUrl: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  cat: "demi-fine",
  sub: "Necklaces",
  price: "",
  mrp: "",
  material: "",
  collection: "",
  tags: "",
  stockQuantity: "0",
  isNew: false,
  bestseller: false,
  imageUrl: "",
  isActive: true,
};

export default function AdminProducts() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const showToast = useStore((state) => state.showToast);

  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await ProductRepository.getAdminProducts();
      setProducts(data);
    } catch (e) {
      console.error("Failed to load products:", e);
      showToast({ type: "error", title: "Load Failed", message: "Could not load product catalog." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // --- Open modals ---

  const openCreate = () => {
    setSelectedProduct(null);
    setForm(EMPTY_FORM);
    setModalMode("create");
  };

  const openEdit = (p: Product) => {
    setSelectedProduct(p);
    setForm({
      name: p.name,
      cat: p.cat,
      sub: p.sub,
      price: String(p.price),
      mrp: String(p.mrp),
      material: p.material,
      collection: p.collection,
      tags: p.tags.join(", "),
      stockQuantity: String(p.stockQuantity ?? 0),
      isNew: p.isNew,
      bestseller: p.bestseller,
      imageUrl: p.images && p.images.length > 0 ? p.images[0] : "",
      isActive: p.isActive !== false,
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedProduct(null);
  };

  // --- Archive toggle ---

  const handleToggleArchive = async (p: Product) => {
    const updated: Product = { ...p, isActive: !p.isActive };
    try {
      await ProductRepository.updateProduct(updated);
      setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showToast({
        type: "success",
        title: updated.isActive ? "Product Restored" : "Product Archived",
        message: `${updated.name} is now ${updated.isActive ? "visible" : "hidden"} to customers.`,
      });
    } catch {
      showToast({ type: "error", title: "Update Failed", message: "Failed to update product status." });
    }
  };

  // --- Image upload ---

  const handleFileSelect = () => {
    if (Platform.OS === "web") {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onerror = () =>
              showToast({ type: "error", title: "Read Error", message: "Failed to read file." });
            reader.onload = (event: any) => {
              if (event.target?.result) {
                const img = new window.Image();
                img.onerror = () =>
                  showToast({ type: "error", title: "Load Error", message: "Not a valid image." });
                img.onload = () => {
                  try {
                    const canvas = document.createElement("canvas");
                    const maxSize = 400;
                    let w = img.width, h = img.height;
                    if (w > h) { if (w > maxSize) { h *= maxSize / w; w = maxSize; } }
                    else { if (h > maxSize) { w *= maxSize / h; h = maxSize; } }
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
                    canvas.toBlob(async (blob) => {
                      if (!blob) {
                        showToast({ type: "error", title: "Error", message: "Failed to compress photo." });
                        return;
                      }
                      const previousUrl = form.imageUrl;
                      setUploading(true);
                      try {
                        const url = await ProductRepository.uploadImage(blob);
                        updateForm({ imageUrl: url });
                        const prevKey = extractUploadedKey(previousUrl);
                        if (prevKey) ProductRepository.deleteImage(prevKey);
                      } catch {
                        showToast({ type: "error", title: "Upload Failed", message: "Try again." });
                      } finally {
                        setUploading(false);
                      }
                    }, "image/jpeg", 0.7);
                  } catch {
                    showToast({ type: "error", title: "Error", message: "Failed to process photo." });
                  }
                };
                img.src = event.target.result as string;
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } catch {
        showToast({ type: "error", title: "Error", message: "Could not open file picker." });
      }
    } else {
      showToast({ type: "info", title: "Web Only", message: "File selection is web-only. Enter a URL." });
    }
  };

  // --- Save (create or update) ---

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast({ type: "error", title: "Missing Name", message: "Product name is required." });
      return;
    }
    const priceNum = parseFloat(form.price);
    const mrpNum = parseFloat(form.mrp);
    if (isNaN(priceNum) || priceNum <= 0) {
      showToast({ type: "error", title: "Invalid Price", message: "Enter a valid price." });
      return;
    }
    const stockNum = parseInt(form.stockQuantity, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      showToast({ type: "error", title: "Invalid Stock", message: "Stock must be a non-negative number." });
      return;
    }

    setSaving(true);
    try {
      const productData = {
        name: form.name.trim(),
        cat: form.cat,
        sub: form.sub,
        price: priceNum,
        mrp: isNaN(mrpNum) || mrpNum <= 0 ? priceNum : mrpNum,
        material: form.material.trim(),
        collection: form.collection.trim(),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isNew: form.isNew,
        bestseller: form.bestseller,
        icon: "",
        images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
        isActive: form.isActive,
        stockQuantity: stockNum,
      };

      if (modalMode === "create") {
        const created = await ProductRepository.createProduct(productData);
        setProducts((prev) => [created, ...prev]);
        showToast({ type: "success", title: "Product Created", message: `${created.name} added to catalog.` });
      } else if (selectedProduct) {
        const updated: Product = {
          ...selectedProduct,
          ...productData,
        };
        await ProductRepository.updateProduct(updated);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast({ type: "success", title: "Product Updated", message: `${updated.name} saved.` });
      }
      closeModal();
    } catch (e: any) {
      showToast({
        type: "error",
        title: modalMode === "create" ? "Create Failed" : "Update Failed",
        message: e?.message || "Something went wrong.",
      });
    } finally {
      setSaving(false);
    }
  };

  // --- Filtering ---

  const filteredProducts = products.filter((p) =>
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
      {/* Header Row */}
      <View style={styles.headerRow}>
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
        <Pressable onPress={openCreate} style={styles.addButton}>
          <Feather name="plus" size={16} color={THEME.colors.white} />
          <Text style={styles.addButtonText}>Add Product</Text>
        </Pressable>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {products.length} product{products.length !== 1 ? "s" : ""} total
          {" · "}
          <Text style={{ color: THEME.colors.success }}>{products.filter((p) => p.isActive !== false).length} active</Text>
          {" · "}
          <Text style={{ color: THEME.colors.error }}>{products.filter((p) => p.isActive === false).length} archived</Text>
        </Text>
      </View>

      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {filteredProducts.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => openEdit(p)}
            style={({ pressed }) => [
              styles.productRow,
              pressed && styles.productRowPressed,
              p.isActive === false && styles.productRowArchived,
            ]}
          >
            <View style={styles.productCellImage}>
              <ProductImage product={p} width={48} height={48} />
            </View>
            <View style={styles.productCellInfo}>
              <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.productSub}>
                {p.collection ? `${p.collection} · ` : ""}{p.sub}
              </Text>
              <View style={styles.flagsRow}>
                {p.isActive === false && (
                  <View style={[styles.flagBadge, styles.archivedBadge]}>
                    <Text style={styles.flagText}>Archived</Text>
                  </View>
                )}
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
              {p.mrp > p.price && (
                <Text style={styles.mrpText}>₹{p.mrp.toLocaleString("en-IN")}</Text>
              )}
              <View style={styles.rowActions}>
                <Pressable onPress={() => handleToggleArchive(p)} style={styles.archiveBtn} hitSlop={8}>
                  <Feather
                    name={p.isActive !== false ? "archive" : "rotate-ccw"}
                    size={12}
                    color={p.isActive !== false ? THEME.colors.error : THEME.colors.success}
                  />
                </Pressable>
                <Feather name="edit-2" size={12} color={THEME.colors.primary} />
              </View>
            </View>
          </Pressable>
        ))}

        {filteredProducts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Feather name="package" size={40} color={THEME.colors.border} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              {search ? "Try a different search term." : "Add your first product to get started!"}
            </Text>
            {!search && (
              <Pressable onPress={openCreate} style={[styles.addButton, { marginTop: 16 }]}>
                <Feather name="plus" size={16} color={THEME.colors.white} />
                <Text style={styles.addButtonText}>Add Product</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create / Edit Modal */}
      {modalMode && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={closeModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {modalMode === "create" ? "Add New Product" : "Edit Product"}
                </Text>
                <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                  <Feather name="x" size={18} color={THEME.colors.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                {/* Edit preview */}
                {modalMode === "edit" && selectedProduct && (
                  <View style={styles.modalProductPreview}>
                    <ProductImage product={selectedProduct} width={50} height={50} />
                    <View style={styles.previewTextContainer}>
                      <Text style={styles.previewId}>ID: {selectedProduct.id}</Text>
                      <Text style={styles.previewMeta}>
                        {selectedProduct.cat} / {selectedProduct.sub}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Name */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>PRODUCT NAME *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.name}
                    onChangeText={(v) => updateForm({ name: v })}
                    placeholder="e.g. Aurelia Layered Necklace"
                    placeholderTextColor={THEME.colors.inkSoft}
                  />
                </View>

                {/* Category + Sub */}
                {modalMode === "create" && (
                  <View style={styles.rowInputs}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.formLabel}>CATEGORY *</Text>
                      <View style={styles.pickerRow}>
                        {CATEGORIES.map((c) => (
                          <Pressable
                            key={c.value}
                            onPress={() => updateForm({ cat: c.value, sub: SUBCATEGORIES[c.value][0] })}
                            style={[styles.pickerChip, form.cat === c.value && styles.pickerChipActive]}
                          >
                            <Text
                              style={[
                                styles.pickerChipText,
                                form.cat === c.value && styles.pickerChipTextActive,
                              ]}
                            >
                              {c.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {modalMode === "create" && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>SUBCATEGORY *</Text>
                    <View style={styles.pickerRow}>
                      {(SUBCATEGORIES[form.cat] || []).map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => updateForm({ sub: s })}
                          style={[styles.pickerChip, form.sub === s && styles.pickerChipActive]}
                        >
                          <Text style={[styles.pickerChipText, form.sub === s && styles.pickerChipTextActive]}>
                            {s}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Photo */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>PRODUCT PHOTO</Text>
                  <View style={styles.imageEditRow}>
                    {form.imageUrl ? (
                      <Image source={{ uri: form.imageUrl }} style={styles.editImagePreview} />
                    ) : (
                      <View style={styles.editImagePlaceholder}>
                        <Feather name="image" size={24} color={THEME.colors.secondary} />
                      </View>
                    )}
                    <View style={styles.imageActionButtons}>
                      <Pressable onPress={handleFileSelect} style={styles.uploadBtn} disabled={uploading}>
                        {uploading ? (
                          <ActivityIndicator size="small" color={THEME.colors.primary} />
                        ) : (
                          <Text style={styles.uploadBtnText}>
                            <Feather name="upload" size={10} /> Upload
                          </Text>
                        )}
                      </Pressable>
                      {form.imageUrl ? (
                        <Pressable
                          onPress={() => {
                            const key = extractUploadedKey(form.imageUrl);
                            if (key) ProductRepository.deleteImage(key);
                            updateForm({ imageUrl: "" });
                          }}
                          style={styles.removeBtn}
                          disabled={uploading}
                        >
                          <Text style={styles.removeBtnText}>Remove</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <TextInput
                    style={[styles.formInput, { marginTop: 8 }]}
                    value={form.imageUrl}
                    onChangeText={(v) => updateForm({ imageUrl: v })}
                    placeholder="Or enter image URL (https://...)"
                    placeholderTextColor={THEME.colors.inkSoft}
                  />
                </View>

                {/* Price / MRP */}
                <View style={styles.rowInputs}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>PRICE (₹) *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={form.price}
                      onChangeText={(v) => updateForm({ price: v })}
                      keyboardType="numeric"
                      placeholder="e.g. 1499"
                      placeholderTextColor={THEME.colors.inkSoft}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>MRP (₹)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={form.mrp}
                      onChangeText={(v) => updateForm({ mrp: v })}
                      keyboardType="numeric"
                      placeholder="e.g. 1899"
                      placeholderTextColor={THEME.colors.inkSoft}
                    />
                  </View>
                </View>

                {/* Material / Collection */}
                <View style={styles.rowInputs}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>MATERIAL</Text>
                    <TextInput
                      style={styles.formInput}
                      value={form.material}
                      onChangeText={(v) => updateForm({ material: v })}
                      placeholder="e.g. 18k gold plated"
                      placeholderTextColor={THEME.colors.inkSoft}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>COLLECTION</Text>
                    <TextInput
                      style={styles.formInput}
                      value={form.collection}
                      onChangeText={(v) => updateForm({ collection: v })}
                      placeholder="e.g. Golden Hour"
                      placeholderTextColor={THEME.colors.inkSoft}
                    />
                  </View>
                </View>

                {/* Tags */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>TAGS (comma separated)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.tags}
                    onChangeText={(v) => updateForm({ tags: v })}
                    placeholder="e.g. layered, gold, minimal"
                    placeholderTextColor={THEME.colors.inkSoft}
                  />
                </View>

                {/* Stock */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>STOCK QUANTITY</Text>
                  <TextInput
                    style={[styles.formInput, { maxWidth: 120 }]}
                    value={form.stockQuantity}
                    onChangeText={(v) => updateForm({ stockQuantity: v })}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={THEME.colors.inkSoft}
                  />
                </View>

                {/* Toggle switches */}
                <View style={styles.switchGroup}>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Active (visible to customers)</Text>
                    <Switch
                      value={form.isActive}
                      onValueChange={(v) => updateForm({ isActive: v })}
                      trackColor={{ false: THEME.colors.border, true: THEME.colors.success }}
                      thumbColor={THEME.colors.white}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Bestseller Flag</Text>
                    <Switch
                      value={form.bestseller}
                      onValueChange={(v) => updateForm({ bestseller: v })}
                      trackColor={{ false: THEME.colors.border, true: THEME.colors.primary }}
                      thumbColor={THEME.colors.white}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>New Arrival Flag</Text>
                    <Switch
                      value={form.isNew}
                      onValueChange={(v) => updateForm({ isNew: v })}
                      trackColor={{ false: THEME.colors.border, true: THEME.colors.primary }}
                      thumbColor={THEME.colors.white}
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.modalActions}>
                <Pressable onPress={closeModal} style={styles.cancelBtn} disabled={saving}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSave} style={styles.saveBtn} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color={THEME.colors.white} />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      {modalMode === "create" ? "Create Product" : "Save Changes"}
                    </Text>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
    gap: THEME.spacing.md,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.white,
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: THEME.radius.round,
    gap: 6,
    ...THEME.shadows.button,
  },
  addButtonText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: THEME.colors.white,
  },
  statsBar: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.sm,
  },
  statsText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 11,
    color: THEME.colors.secondary,
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
  productRowArchived: {
    opacity: 0.55,
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
  archivedBadge: {
    backgroundColor: THEME.colors.border,
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
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  archiveBtn: {
    padding: 2,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: THEME.fonts.display.medium,
    fontSize: 16,
    color: THEME.colors.text,
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: THEME.fonts.body.regular,
    fontSize: 12,
    color: THEME.colors.secondary,
    textAlign: "center",
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
    maxWidth: 520,
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
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pickerChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.round,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },
  pickerChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  pickerChipText: {
    fontFamily: THEME.fonts.body.medium,
    fontSize: 11,
    color: THEME.colors.secondary,
  },
  pickerChipTextActive: {
    color: THEME.colors.white,
  },
  imageEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.spacing.md,
  },
  editImagePreview: {
    width: 60,
    height: 60,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  editImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  imageActionButtons: {
    flexDirection: "row",
    gap: THEME.spacing.sm,
  },
  uploadBtn: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.round,
  },
  uploadBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.primary,
  },
  removeBtn: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.error,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.round,
  },
  removeBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 10,
    color: THEME.colors.error,
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
    minWidth: 130,
    ...THEME.shadows.button,
  },
  saveBtnText: {
    fontFamily: THEME.fonts.body.semibold,
    fontSize: 12,
    color: THEME.colors.white,
  },
});
