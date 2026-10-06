/**
 * VUMA Store — Inline Location Map
 * A real, always-visible interactive map embedded directly in a form
 * (Checkout delivery address, Seller shop registration) - not hidden
 * behind a "tap to open" button. The customer/seller sees the actual
 * map immediately, with a real search bar, GPS button, and draggable
 * center pin, right there in the screen.
 *
 * Shares the same real backend endpoints as MapLocationPicker (Places
 * Autocomplete/Details for search, reverse-geocode on pin settle) -
 * this is the same picker, just rendered inline instead of as a modal.
 *
 * Updated: shows the readable address (never raw GPS coordinates) with a
 * short status line telling the user what was detected and what they
 * still need to fill in. The coordinates are still reported to the
 * parent form for delivery and logistics, they are just not displayed.
 * Also: the zoomed-out national overview is never looked up or reported
 * as if it were a chosen pin, a slow lookup can no longer overwrite a
 * newer one, and the same spot is not looked up twice in a row.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, FlatList, Keyboard,
} from 'react-native';
import MapView from 'react-native-maps';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, API } from '../utils/constants';
import { post } from '../api/client';

const TANZANIA_DEFAULT_REGION = {
  latitude: -6.369,
  longitude: 34.888,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

const MAP_HEIGHT = 280;

// Zoomed right out (the national overview the map starts on) is not a
// real pin, so it is never looked up or reported to the form.
const MAX_PIN_ZOOM_DELTA = 0.5;

const coordKey = (lat, lng) => `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;

const HINT_TEXT = {
  ok: 'Address detected. Not exact? Move the map until the pin sits on your door.',
  noward: "We found your area but couldn't tell the ward. Please choose it below.",
  noregion: "We couldn't match this spot to a region. Please fill in the address below.",
  none: "We couldn't find an address here. Move the pin or fill in the address below.",
  failed: "Couldn't look up the address (check your connection). You can still fill in the fields below.",
  gps: "Couldn't get your GPS location. Search for your place or move the map instead.",
};

// onLocationChange fires every time the pin settles (drag ends, search
// result picked, or GPS used), so the parent form always has the latest
// real location without a separate confirm step. It reports:
// { latitude, longitude, formattedAddress, displayAddress, street, area,
//   landmark, suggestedVillage, suggestedRegion, suggestedDistrict,
//   suggestedWard, rawRegionName, rawDistrictName, geocodeOk }
export default function InlineLocationMap({ initialLatitude, initialLongitude, onLocationChange }) {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(
    initialLatitude && initialLongitude
      ? { latitude: initialLatitude, longitude: initialLongitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : TANZANIA_DEFAULT_REGION
  );
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [address, setAddress] = useState('');
  const [hint, setHint] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [resolvingResult, setResolvingResult] = useState(false);
  const searchDebounceRef = useRef(null);

  const geocodeSeq = useRef(0);   // newest lookup wins
  const lastKey = useRef('');     // last spot we looked up

  const reverseGeocodeAndReport = useCallback(async (lat, lng) => {
    const seq = ++geocodeSeq.current;
    lastKey.current = coordKey(lat, lng);
    setGeocoding(true);
    let g = null;
    try {
      g = await post('/delivery/reverse-geocode/', { latitude: lat, longitude: lng });
    } catch {
      g = null;
    }
    // A newer pin position was looked up while this one was in flight.
    if (seq !== geocodeSeq.current) return;
    setGeocoding(false);

    setAddress(g?.display_address || g?.formatted_address || '');
    if (!g) setHint('failed');
    else if (g.status !== 'OK') setHint('none');
    else if (!g.suggested_region) setHint('noregion');
    else if (!g.suggested_ward) setHint('noward');
    else setHint('ok');

    if (onLocationChange) {
      onLocationChange({
        latitude: lat,
        longitude: lng,
        formattedAddress: g?.formatted_address || '',
        displayAddress: g?.display_address || g?.formatted_address || '',
        street: g?.street || '',
        area: g?.area || '',
        landmark: g?.landmark || '',
        suggestedVillage: g?.suggested_village || '',
        suggestedRegion: g?.suggested_region || null,
        suggestedDistrict: g?.suggested_district || null,
        suggestedWard: g?.suggested_ward || null,
        rawRegionName: g?.raw_region_name || '',
        rawDistrictName: g?.raw_district_name || '',
        geocodeOk: !!g && g.status === 'OK',
      });
    }
  }, [onLocationChange]);

  const runSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `${API.BASE_URL}delivery/places-autocomplete/?query=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();
      setSearchResults(data.predictions || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchTextChange = (text) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => runSearch(text), 400);
  };

  const handleSelectResult = async (result) => {
    Keyboard.dismiss();
    setResolvingResult(true);
    try {
      const res = await fetch(
        `${API.BASE_URL}delivery/place-details/?place_id=${encodeURIComponent(result.place_id)}`
      );
      const data = await res.json();
      if (data.latitude && data.longitude) {
        const newRegion = {
          latitude: data.latitude,
          longitude: data.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 500);
        reverseGeocodeAndReport(data.latitude, data.longitude);
      }
    } catch {
      // Silently fail — the customer can still drag the map manually.
    } finally {
      setResolvingResult(false);
      setSearchQuery(result.description || '');
      setSearchResults([]);
    }
  };

  const goToMyLocation = useCallback(async () => {
    setLocating(true);
    setSearchQuery('');
    setSearchResults([]);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setHint('gps'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newRegion = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
      reverseGeocodeAndReport(loc.coords.latitude, loc.coords.longitude);
    } catch {
      // GPS can fail or time out, especially in rural areas. Say so,
      // the customer can still search or drag the map manually.
      setHint('gps');
    } finally {
      setLocating(false);
    }
  }, [reverseGeocodeAndReport]);

  const handleRegionChangeComplete = (newRegion) => {
    setRegion(newRegion);
    // The national overview is not a chosen pin.
    if (newRegion.latitudeDelta > MAX_PIN_ZOOM_DELTA) return;
    // Already looked up this exact spot (e.g. right after a search or GPS).
    if (coordKey(newRegion.latitude, newRegion.longitude) === lastKey.current) return;
    reverseGeocodeAndReport(newRegion.latitude, newRegion.longitude);
  };

  // If the caller already has coordinates on first mount (e.g. editing
  // an existing address), report the address for them once without
  // waiting for the customer to touch the map.
  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      reverseGeocodeAndReport(initialLatitude, initialLongitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hintText = HINT_TEXT[hint] || '';

  return (
    <View style={styles.wrap}>
      <View style={styles.searchBarWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a location in Tanzania..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={handleSearchTextChange}
          returnKeyType="search"
        />
        {(searching || resolvingResult) && <ActivityIndicator size="small" color={COLORS.primary} />}
      </View>

      {searchResults.length > 0 && (
        <View style={styles.resultsWrap}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectResult(item)}>
                <Text style={styles.resultIcon}>📍</Text>
                <Text style={styles.resultText} numberOfLines={2}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
        />
        <View style={styles.centerPinWrap} pointerEvents="none">
          <Text style={styles.centerPin}>📍</Text>
        </View>
        <TouchableOpacity style={styles.myLocationBtn} onPress={goToMyLocation} disabled={locating}>
          {locating ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Text style={styles.myLocationIcon}>🎯</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.addressWrap}>
        {geocoding ? (
          <View style={styles.addressRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.addressLoadingText}>Finding address...</Text>
          </View>
        ) : address ? (
          <>
            <Text style={styles.addressText} numberOfLines={3}>📍 {address}</Text>
            {!!hintText && (
              <Text style={[styles.hintText, hint !== 'ok' && styles.hintWarn]}>{hintText}</Text>
            )}
          </>
        ) : (
          <Text style={styles.addressPlaceholder}>
            {hintText || 'Search, tap 🎯, or move the map so the pin sits on your exact spot.'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.sm },
  searchBarWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.sm, height: 44, marginBottom: SPACING.xs,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: FONTS.sm, color: COLORS.textPrimary, height: '100%' },
  resultsWrap: {
    backgroundColor: 'white', borderRadius: RADIUS.lg, maxHeight: 220,
    marginBottom: SPACING.xs, ...SHADOWS.md,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  resultIcon: { fontSize: 15 },
  resultText: { flex: 1, fontSize: FONTS.sm, color: COLORS.textPrimary },
  mapWrap: {
    height: MAP_HEIGHT, borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1.5, borderColor: COLORS.border, position: 'relative',
  },
  map: { width: '100%', height: '100%' },
  centerPinWrap: {
    position: 'absolute', top: '50%', left: '50%',
    marginLeft: -14, marginTop: -28, alignItems: 'center',
  },
  centerPin: { fontSize: 28 },
  myLocationBtn: {
    position: 'absolute', right: SPACING.sm, bottom: SPACING.sm,
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.md,
  },
  myLocationIcon: { fontSize: 18 },
  addressWrap: {
    backgroundColor: COLORS.surfaceSunken, borderRadius: RADIUS.lg,
    padding: SPACING.sm, marginTop: SPACING.xs,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  addressLoadingText: { fontSize: FONTS.xs, color: COLORS.textMuted },
  addressText: { fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.semiBold, lineHeight: 18 },
  addressPlaceholder: { fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 16 },
  hintText: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 4, lineHeight: 16 },
  hintWarn: { color: COLORS.primaryDark, fontWeight: FONTS.semiBold },
});