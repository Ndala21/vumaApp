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
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionAccent} />
          <Text style={styles.label}>Product Images</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.count}>{images.length}/{MAX_IMAGES}</Text>
        </View>
      </View>
      <Text style={styles.hint}>First image is the main image. Tap the star to set as main.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
        {images.length < MAX_IMAGES && (
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
            <Text style={styles.addIcon}>📷</Text>
            <Text style={styles.addText}>Add Photo</Text>
          </TouchableOpacity>
        )}

        {images.map((img, index) => {
          const uri = img.uri || img.image_url || img.url;
          const isPrimary = index === 0 || img.is_primary;
          const isUploading = uploadingIndex === index;

          return (
            <View key={index} style={styles.imageWrap}>
              <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" />

              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <Text style={styles.uploadingText}>📤</Text>
                </View>
              )}

              {isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>MAIN</Text>
                </View>
              )}

              <View style={styles.imageActions}>
                {!isPrimary && onSetPrimary && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => onSetPrimary(index)}>
                    <Text style={styles.actionBtnIcon}>⭐</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteActionBtn]}
                  onPress={() => onRemove(index)}
                >
                  <Text style={styles.actionBtnIconWhite}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {uploading && (
        <View style={styles.uploadingBar}>
          <Text style={styles.uploadingBarText}>Uploading images...</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 4, height: 14, borderRadius: 2, backgroundColor: COLORS.primary },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  countPill: { backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2 },
  count: { fontSize: FONTS.xs, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  hint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.sm },
  imageRow: { gap: SPACING.sm, paddingVertical: 4, paddingRight: SPACING.sm },
  addBtn: {
    width: 92, height: 92, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed',
    borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primaryFade, gap: 4,
  },
  addIcon: { fontSize: 24 },
  addText: { fontSize: 10.5, color: COLORS.primaryDark, fontWeight: FONTS.bold, textAlign: 'center' },
  imageWrap: { width: 92, height: 92, borderRadius: RADIUS.lg, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.xs },
  thumbnail: { width: '100%', height: '100%' },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.scrim, alignItems: 'center', justifyContent: 'center' },
  uploadingText: { fontSize: 24 },
  primaryBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 2 },
  primaryBadgeText: { fontSize: 8, color: COLORS.textWhite, fontWeight: FONTS.bold, letterSpacing: 0.3 },
  imageActions: { position: 'absolute', bottom: 5, right: 5, flexDirection: 'row', gap: 4 },
  actionBtn: { width: 23, height: 23, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  actionBtnIcon: { fontSize: 11 },
  actionBtnIconWhite: { fontSize: 11, color: COLORS.textWhite },
  deleteActionBtn: { backgroundColor: COLORS.danger },
  uploadingBar: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.lg, padding: SPACING.sm, alignItems: 'center', marginTop: SPACING.sm },
  uploadingBarText: { fontSize: FONTS.sm, color: COLORS.primaryDark, fontWeight: FONTS.semiBold },
});