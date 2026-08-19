/**
 * VUMA Store — Map Location Picker
 * Reusable interactive location picker: draggable map with a fixed center
 * pin (Uber/Bolt style). On confirm, captures GPS coordinates and calls
 * the backend's reverse-geocode endpoint to suggest a readable address —
 * Region/District/Ward matched against VUMA's real Tanzania data where
 * possible. The caller always gets both the raw coordinates (source of
 * truth for delivery) and the human-readable guess (which the customer
 * or seller can freely edit, since Tanzania map data is often incomplete).
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../utils/constants';
import { post } from '../api/client';

const { width, height } = Dimensions.get('window');

// Rough center of mainland Tanzania — used only if we have no GPS yet.
const TANZANIA_DEFAULT_REGION = {
  latitude: -6.369,
  longitude: 34.888,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

export default function MapLocationPicker({ visible, onClose, onConfirm, initialLatitude, initialLongitude }) {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(
    initialLatitude && initialLongitude
      ? { latitude: initialLatitude, longitude: initialLongitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : TANZANIA_DEFAULT_REGION
  );
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const goToMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocating(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
    } catch {
      // Silently fail — the customer can still drag the map manually.
    } finally {
      setLocating(false);
    }
  }, []);

  const handleConfirm = async () => {
    setConfirming(true);
    const { latitude, longitude } = region;
    let geocodeResult = null;
    try {
      geocodeResult = await post('/delivery/reverse-geocode/', { latitude, longitude });
    } catch {
      // Reverse geocoding failing shouldn't block confirming a location —
      // the customer can still fill in the address fields manually.
      geocodeResult = null;
    }
    setConfirming(false);
    onConfirm({
      latitude,
      longitude,
      formattedAddress: geocodeResult?.formatted_address || '',
      street: geocodeResult?.street || '',
      suggestedRegion: geocodeResult?.suggested_region || null,
      suggestedDistrict: geocodeResult?.suggested_district || null,
      suggestedWard: geocodeResult?.suggested_ward || null,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={setRegion}
        />

        {/* Fixed center pin — the map moves underneath it, matching how
            Uber/Bolt-style pickers work, and how the reference screenshot
            shows a single pin at the center of the visible map. */}
        <View style={styles.centerPinWrap} pointerEvents="none">
          <Text style={styles.centerPin}>📍</Text>
        </View>

        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Move the map to pin your location</Text>
        </View>

        <TouchableOpacity style={styles.myLocationBtn} onPress={goToMyLocation} disabled={locating}>
          {locating ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Text style={styles.myLocationIcon}>🎯</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.coordsText}>
            {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
          </Text>
          <TouchableOpacity
            style={[styles.confirmBtn, confirming && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={confirming}
            activeOpacity={0.85}
          >
            {confirming ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.confirmBtnText}>Confirm This Location</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { width, height },
  centerPinWrap: {
    position: 'absolute', top: '50%', left: '50%',
    marginLeft: -18, marginTop: -36,
    alignItems: 'center',
  },
  centerPin: { fontSize: 36 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingTop: Platform.OS === 'ios' ? 54 : SPACING.xl,
    paddingHorizontal: SPACING.base, paddingBottom: SPACING.base,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: FONTS.lg, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  headerTitle: { flex: 1, fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  myLocationBtn: {
    position: 'absolute', right: SPACING.base, bottom: 140,
    width: 48, height: 48, borderRadius: RADIUS.full,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.md,
  },
  myLocationIcon: { fontSize: 22 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', padding: SPACING.base,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.base,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    ...SHADOWS.lg,
  },
  coordsText: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.sm },
  confirmBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
    paddingVertical: SPACING.base, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmBtnText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
});