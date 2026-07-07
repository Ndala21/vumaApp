/**
 * VUMA Store — Multi Image Picker Component
 * Allow vendors to upload up to 10 product images
 */

import React, { memo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';

const MAX_IMAGES = 10;

export const MultiImagePicker = memo(({
  images = [],
  onAdd,
  onRemove,
  onSetPrimary,
  uploading = false,
  uploadingIndex = null,
}) => {

  const handleAdd = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES - images.length,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        onAdd(result.assets);
      }
    } catch {
      // Fallback: single image picker
      try {
        const ImagePicker = await import('expo-image-picker');
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
        if (!result.canceled && result.assets?.[0]) {
          onAdd([result.assets[0]]);
        }
      } catch (e) {
        Alert.alert('Error', 'Could not open image picker.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Product Images</Text>
        <Text style={styles.count}>{images.length}/{MAX_IMAGES}</Text>
      </View>
      <Text style={styles.hint}>First image is the main image. Tap ⭐ to set as main.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
        {/* Add button */}
        {images.length < MAX_IMAGES && (
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addIcon}>📷</Text>
            <Text style={styles.addText}>Add</Text>
            <Text style={styles.addSubtext}>Photo</Text>
          </TouchableOpacity>
        )}

        {/* Image thumbnails */}
        {images.map((img, index) => {
          const uri = img.uri || img.image_url || img.url;
          const isPrimary = index === 0 || img.is_primary;
          const isUploading = uploadingIndex === index;

          return (
            <View key={index} style={styles.imageWrap}>
              <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" />

              {/* Uploading overlay */}
              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <Text style={styles.uploadingText}>📤</Text>
                </View>
              )}

              {/* Primary badge */}
              {isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>MAIN</Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.imageActions}>
                {!isPrimary && onSetPrimary && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => onSetPrimary(index)}
                  >
                    <Text style={{ fontSize: 12 }}>⭐</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteActionBtn]}
                  onPress={() => onRemove(index)}
                >
                  <Text style={{ fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {uploading && (
        <View style={styles.uploadingBar}>
          <Text style={styles.uploadingBarText}>📤 Uploading images...</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  count: { fontSize: FONTS.xs, color: COLORS.textMuted },
  hint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.sm },
  imageRow: { gap: SPACING.sm, paddingVertical: 4, paddingRight: SPACING.sm },
  addBtn: { width: 90, height: 90, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryFade, gap: 2 },
  addIcon: { fontSize: 24 },
  addText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.bold },
  addSubtext: { fontSize: FONTS.xs - 1, color: COLORS.primary },
  imageWrap: { width: 90, height: 90, borderRadius: RADIUS.lg, overflow: 'hidden', position: 'relative', ...SHADOWS.sm },
  thumbnail: { width: '100%', height: '100%' },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  uploadingText: { fontSize: 24 },
  primaryBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 4, paddingVertical: 1 },
  primaryBadgeText: { fontSize: 8, color: 'white', fontWeight: FONTS.bold },
  imageActions: { position: 'absolute', bottom: 4, right: 4, flexDirection: 'row', gap: 3 },
  actionBtn: { width: 22, height: 22, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  deleteActionBtn: { backgroundColor: 'rgba(220,53,69,0.9)' },
  uploadingBar: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.sm, alignItems: 'center', marginTop: SPACING.sm },
  uploadingBarText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
});
