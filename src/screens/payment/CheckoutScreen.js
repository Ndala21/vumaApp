/**
 * VUMA Store — Tanzania Checkout Screen
 * Mobile-first, GPS-first, fast checkout for Tanzanian users
 * + Commission breakdown added
 * Fixed: Order Summary NaN price, commission calc using correct subtotal.
 * Fixed: Region -> District -> Ward now load dynamically from the real
 * delivery API (all 31 regions, 174 districts, 3664 wards) instead of a
 * hardcoded 6-region stub that showed "Select Region First" incorrectly.
 * Added: free-text Village/Mtaa/Street field (Tanzania's official admin
 * data stops at Ward level — this lets customers specify their own
 * village/mtaa/street rather than picking from an incomplete list).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, Platform, StatusBar, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, selectIsAuthenticated } from '../../store/authSlice';
import { removeFromCartAndSave } from '../../store/cartSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { getEffectivePrice } from '../../utils/helpers';
import Button from '../../components/common/Button';
import { get, post } from '../../api/client';
import { CommissionBreakdown } from '../../components/CommissionCalculator';

const PickerModal = ({ visible, title, data, onSelect, onClose, loading, searchable, onSearch }) => {
  const [query, setQuery] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.pickerCloseBtn}>
              <Text style={styles.pickerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {searchable && (
            <View style={styles.pickerSearchWrap}>
              <TextInput
                style={styles.pickerSearchInput}
                value={query}
                onChangeText={(t) => { setQuery(t); onSearch && onSearch(t); }}
                placeholder="Search..."
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          )}
          {loading ? (
            <View style={styles.pickerLoading}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={item => typeof item === 'string' ? item : item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerItem} onPress={() => { onSelect(item); onClose(); }} activeOpacity={0.75}>
                  <Text style={styles.pickerItemText}>{typeof item === 'string' ? item : item.name}</Text>
                  {typeof item !== 'string' && item.area && (
                    <Text style={styles.pickerItemSub}>{item.area} · {item.open}</Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.pickerEmpty}>No results found.</Text>}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

export default function CheckoutScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  // Buy Now (from a product page) and Checkout Cart (from the cart screen,
  // possibly only some items selected) both navigate here with an explicit
  // `items` array + `total` + `source` — this screen NEVER falls back to
  // "whatever is in the cart right now", so a Buy Now purchase can never
  // silently combine with unrelated items still sitting in the cart.
  const routeItems = route?.params?.items;
  const routeTotal = route?.params?.total;
  const purchaseSource = route?.params?.source; // 'cart' | 'buyNow'
  const purchaseItems = Array.isArray(routeItems) ? routeItems : [];
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [deliveryType, setDeliveryType] = useState('home');
  const [phone, setPhone] = useState(user?.phone || '');

  // Region -> District -> Ward, loaded dynamically from the real API
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const [region, setRegion] = useState(null);       // { id, name }
  const [district, setDistrict] = useState(null);    // { id, name }
  const [ward, setWard] = useState(null);             // { id, name }
  const [village, setVillage] = useState('');         // free text — Village/Mtaa/Street
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [pickupPoint, setPickupPoint] = useState(null);
  const [pickupPoints, setPickupPoints] = useState([]);
  const [loadingPickupPoints, setLoadingPickupPoints] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [buildingDetail, setBuildingDetail] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedSaved, setSelectedSaved] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [placing, setPlacing] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showWardPicker, setShowWardPicker] = useState(false);
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [pickupSearch, setPickupSearch] = useState('');

  // Subtotal/total are computed ONLY from the items this specific purchase
  // is for (Buy Now's single item, or whichever items were selected on the
  // Cart screen) — never from the customer's whole cart, so an unrelated
  // item still sitting in the cart can never get pulled into this order.
  const cartSubtotal = purchaseItems.reduce((sum, item) => {
    const unitPrice = getEffectivePrice(item.product) + Number(item.selectedVariant?.price_adjustment || 0);
    return sum + unitPrice * item.quantity;
  }, 0);
  const cartTotal = typeof routeTotal === 'number' ? routeTotal : cartSubtotal;

  useEffect(() => {
    if (isAuthenticated) loadSavedAddresses();
    loadRegions();
  }, [isAuthenticated]);

  const loadSavedAddresses = async () => {
    try {
      const data = await get('/orders/addresses/');
      setSavedAddresses(data?.results || data || []);
    } catch {}
  };

  // ── Region / District / Ward — real API, not hardcoded ──
  const loadRegions = async () => {
    setLoadingRegions(true);
    try {
      const data = await get('/delivery/regions/');
      setRegions(Array.isArray(data) ? data : data?.results || []);
    } catch {
      setRegions([]);
    } finally {
      setLoadingRegions(false);
    }
  };

  const loadDistricts = async (regionId) => {
    setLoadingDistricts(true);
    try {
      const data = await get('/delivery/districts/', { region: regionId });
      setDistricts(Array.isArray(data) ? data : data?.results || []);
    } catch {
      setDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const loadWards = async (districtId) => {
    setLoadingWards(true);
    try {
      const data = await get('/delivery/wards/', { district: districtId });
      setWards(Array.isArray(data) ? data : data?.results || []);
    } catch {
      setWards([]);
    } finally {
      setLoadingWards(false);
    }
  };

  const handleSelectRegion = (r) => {
    setRegion(r);
    setDistrict(null);
    setWard(null);
    setDistricts([]);
    setWards([]);
    loadDistricts(r.id);
  };

  const handleSelectDistrict = (d) => {
    setDistrict(d);
    setWard(null);
    setWards([]);
    loadWards(d.id);
  };

  // ── Pickup Points — real API, searchable by institution name ──
  const loadPickupPoints = useCallback(async (search = '') => {
    setLoadingPickupPoints(true);
    try {
      const params = search ? { search } : {};
      const data = await get('/delivery/pickup-points/', params);
      const list = Array.isArray(data) ? data : data?.results || [];
      setPickupPoints(list.map(p => ({
        id: p.id,
        name: p.name,
        area: [p.address, p.district_name, p.region_name].filter(Boolean).join(', '),
        open: p.opening_hours || '',
        pointType: p.point_type,
      })));
    } catch {
      setPickupPoints([]);
    } finally {
      setLoadingPickupPoints(false);
    }
  }, []);

  const openPickupPicker = () => {
    setShowPickupPicker(true);
    loadPickupPoints();
  };

  const getGPS = async () => {
    setGpsLoading(true);
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow location access.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
      Alert.alert('📍 Location Pinned!', `Accuracy: ±${Math.round(loc.coords.accuracy)} meters\n\nPlease still select your Region, District and Ward below, and add a landmark to help the delivery rider.`);
    } catch { Alert.alert('Error', 'Could not get GPS. Try again.'); }
    finally { setGpsLoading(false); }
  };

  const useSavedAddress = (addr) => {
    setSelectedSaved(addr);
    setPhone(addr.phone || phone);
    setLandmark(addr.landmark || '');
    if (addr.latitude) { setLatitude(addr.latitude); setLongitude(addr.longitude); }
    setDeliveryType(addr.delivery_type || 'home');
    // Saved addresses store plain city/ward strings from before this fix —
    // we can't safely re-select the matching region/district objects here,
    // so leave the pickers for the customer to reselect if needed.
  };

  const validate = () => {
    if (!phone.trim() || phone.trim().length < 9) { Alert.alert('Required', 'Please enter a valid phone number.'); return false; }
    if (deliveryType === 'home') {
      if (!region) { Alert.alert('Required', 'Please select your region.'); return false; }
      if (!district) { Alert.alert('Required', 'Please select your district.'); return false; }
      if (!ward) { Alert.alert('Required', 'Please select your ward.'); return false; }
    } else {
      if (!pickupPoint) { Alert.alert('Required', 'Please select a pickup station.'); return false; }
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validate() || placing) return;
    if (purchaseItems.length === 0) {
      Alert.alert('Nothing to order', 'No items were selected for this purchase. Please go back and select at least one item.');
      return;
    }
    setPlacing(true);
    try {
      const shippingAddress = deliveryType === 'pickup'
        ? { delivery_type: 'pickup', pickup_point_id: pickupPoint.id, pickup_point_name: pickupPoint.name, phone }
        : {
            delivery_type: 'home',
            full_name: user?.username || '',
            phone,
            region_id: region.id,
            region: region.name,
            district_id: district.id,
            district: district.name,
            ward_id: ward.id,
            ward: ward.name,
            village,
            landmark,
            building_detail: buildingDetail,
            latitude,
            longitude,
          };

      const result = await post('/orders/', {
        items: purchaseItems.map(item => ({
          product_id: item.product?.id || item.id,
          variant_id: item.selectedVariant?.id || undefined,
          quantity: item.quantity,
        })),
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        total_amount: cartTotal,
      });

      if (result.id || result.order_number) {
        // Only the items that were actually just purchased leave the cart —
        // e.g. if the customer bought 2 of 5 selected items, the other 3
        // (and anything they never selected at all) stay exactly as they
        // were. A Buy Now purchase never touched the cart in the first
        // place, so there's nothing to remove here for that case.
        if (purchaseSource === 'cart') {
          purchaseItems.forEach(item => {
            if (item.product?.id) dispatch(removeFromCartAndSave(item.product.id));
          });
        }
        if (paymentMethod === 'mobile_money') {
          navigation.replace('MobileMoney', { orderId: result.id, orderNumber: result.order_number, amount: cartTotal });
        } else if (paymentMethod === 'bank_transfer') {
          navigation.replace('BankTransfer', { orderId: result.id, orderNumber: result.order_number, amount: cartTotal });
        } else {
          navigation.replace('OrderDetail', { orderId: result.id });
        }
      }
    } catch (err) {
      const data = err?.response?.data;
      let message = 'Could not place order. Please try again.';
      if (data && typeof data === 'object') {
        const fieldErrors = Object.entries(data)
          .map(([field, msg]) => Array.isArray(msg) ? msg.join(' ') : String(msg))
          .filter(Boolean);
        if (fieldErrors.length > 0) message = fieldErrors.join('\n');
        else if (data.detail) message = String(data.detail);
      } else if (err?.message && err.message !== 'Network Error') {
        message = err.message;
      } else if (!err?.response) {
        message = 'Could not reach the server. Please check your internet connection and try again.';
      }
      Alert.alert('Order Failed', message);
    } finally {
      setPlacing(false);
    }
  };

  // Get first item category for commission display
  const firstItemCategory = purchaseItems?.[0]?.product?.category_slug
    || purchaseItems?.[0]?.product?.category?.slug
    || 'others';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrap}>
          <Text style={styles.backBtn}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        enableOnAndroid extraScrollHeight={100}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.summaryTitle}>Order Summary</Text>
          </View>
          {purchaseItems.map((item, i) => {
            const unitPrice = getEffectivePrice(item.product);
            const lineTotal = unitPrice * item.quantity;
            return (
              <View key={i} style={styles.summaryRow}>
                <Text style={styles.summaryItem} numberOfLines={1}>{item.product?.name} ×{item.quantity}</Text>
                <Text style={styles.summaryPrice}>TZS {Number(lineTotal || 0).toLocaleString()}</Text>
              </View>
            );
          })}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryItem}>Delivery</Text>
            <Text style={[styles.summaryPrice, { color: COLORS.success }]}>FREE</Text>
          </View>
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>TZS {Number(cartTotal || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Commission Breakdown */}
        <CommissionBreakdown
          categorySlug={firstItemCategory}
          price={cartSubtotal}
          quantity={1}
          style={styles.commissionCard}
        />

        {/* Saved Addresses */}
        {savedAddresses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Saved Addresses</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {savedAddresses.map(addr => (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.savedCard, selectedSaved?.id === addr.id && styles.savedCardActive]}
                  onPress={() => useSavedAddress(addr)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.savedLabel}>{addr.label || 'Home'}</Text>
                  <Text style={styles.savedText} numberOfLines={2}>{addr.display_address || addr.ward}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.savedNew} onPress={() => setSelectedSaved(null)} activeOpacity={0.8}>
                <Text style={styles.savedNewText}>+ New</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Delivery Type */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Delivery Method</Text>
          </View>
          <View style={styles.deliveryRow}>
            {[
              { value: 'home', icon: '🏠', label: 'Home Delivery' },
              { value: 'pickup', icon: '📦', label: 'Pickup Point' },
            ].map(dt => (
              <TouchableOpacity
                key={dt.value}
                style={[styles.deliveryBtn, deliveryType === dt.value && styles.deliveryBtnActive]}
                onPress={() => setDeliveryType(dt.value)}
                activeOpacity={0.8}
              >
                <Text style={styles.deliveryIcon}>{dt.icon}</Text>
                <Text style={[styles.deliveryLabel, deliveryType === dt.value && styles.deliveryLabelActive]}>
                  {dt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Phone */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Contact</Text>
          </View>
          <Text style={styles.fieldLabel}>Phone Number *</Text>
          <View style={styles.phoneWrap}>
            <View style={styles.phoneFlag}><Text style={styles.phoneFlagText}>🇹🇿 +255</Text></View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="7XX XXX XXX"
              keyboardType="phone-pad"
              maxLength={12}
              placeholderTextColor={COLORS.textLight}
            />
          </View>
        </View>

        {/* Pickup Point */}
        {deliveryType === 'pickup' && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Pickup Station</Text>
            </View>
            {pickupPoint ? (
              <View style={styles.selectedPickup}>
                <View style={styles.selectedPickupInfo}>
                  <Text style={styles.selectedPickupName}>{pickupPoint.name}</Text>
                  <Text style={styles.selectedPickupSub}>{pickupPoint.area} {pickupPoint.open ? `· ${pickupPoint.open}` : ''}</Text>
                </View>
                <TouchableOpacity onPress={openPickupPicker}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.pickupSelectBtn} onPress={openPickupPicker} activeOpacity={0.85}>
                <Text style={styles.pickupSelectText}>Select or search pickup station / institution</Text>
                <Text style={styles.pickupSelectArrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Home Delivery */}
        {deliveryType === 'home' && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
            </View>
            <TouchableOpacity
              style={[styles.gpsBtn, latitude && styles.gpsBtnDone]}
              onPress={getGPS} disabled={gpsLoading}
              activeOpacity={0.85}
            >
              {gpsLoading ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Text style={styles.gpsBtnIcon}>📍</Text>}
              <View style={styles.gpsBtnText}>
                <Text style={[styles.gpsBtnTitle, latitude && { color: COLORS.success }]}>
                  {gpsLoading ? 'Getting your location...' : latitude ? '✓ Location pinned' : 'Use my location (GPS)'}
                </Text>
                <Text style={styles.gpsBtnSub}>
                  {latitude ? `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}` : 'Tap to pin your exact location'}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Region *</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowRegionPicker(true)} activeOpacity={0.8}>
              <Text style={region ? styles.selectorValue : styles.selectorPlaceholder}>{region?.name || 'Select your region...'}</Text>
              <Text style={styles.selectorArrow}>⌄</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>District *</Text>
            <TouchableOpacity
              style={[styles.selector, !region && styles.selectorDisabled]}
              onPress={() => region ? setShowDistrictPicker(true) : Alert.alert('', 'Please select a region first.')}
              activeOpacity={0.8}
            >
              <Text style={district ? styles.selectorValue : styles.selectorPlaceholder}>
                {district?.name || (region ? 'Select district...' : 'Select region first')}
              </Text>
              <Text style={styles.selectorArrow}>⌄</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Ward *</Text>
            <TouchableOpacity
              style={[styles.selector, !district && styles.selectorDisabled]}
              onPress={() => district ? setShowWardPicker(true) : Alert.alert('', 'Please select a district first.')}
              activeOpacity={0.8}
            >
              <Text style={ward ? styles.selectorValue : styles.selectorPlaceholder}>
                {ward?.name || (district ? 'Select ward...' : 'Select district first')}
              </Text>
              <Text style={styles.selectorArrow}>⌄</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Village / Mtaa / Street <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input} value={village} onChangeText={setVillage}
              placeholder="e.g. Mtaa wa Kariakoo, Mtaa 5, Kijiji cha..."
              placeholderTextColor={COLORS.textLight}
            />

            <Text style={styles.fieldLabel}>Landmark <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input} value={landmark} onChangeText={setLandmark}
              placeholder="e.g. dukani, sokoni, karibu na shule, kanisani, msikitini, stendi ya basi"
              placeholderTextColor={COLORS.textLight}
            />

            <TouchableOpacity style={styles.moreBtn} onPress={() => setShowMore(v => !v)}>
              <Text style={styles.moreBtnText}>{showMore ? '▲ Less details' : '▼ More details (building, floor, etc.)'}</Text>
            </TouchableOpacity>

            {showMore && (
              <>
                <Text style={styles.fieldLabel}>Building / Floor / Room <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput
                  style={styles.input} value={buildingDetail} onChangeText={setBuildingDetail}
                  placeholder="e.g. Urafiki Tower, 3rd Floor, Room 4"
                  placeholderTextColor={COLORS.textLight}
                />
              </>
            )}
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          {[
            { value: 'mobile_money', icon: '📱', label: 'Mobile Money', sub: 'M-Pesa, Airtel, Tigo, Halopesa' },
            { value: 'bank_transfer', icon: '🏦', label: 'Bank Transfer', sub: 'CRDB, NMB' },
            { value: 'wallet', icon: '💰', label: 'VUMA Wallet', sub: 'Pay from your balance' },
          ].map(pm => (
            <TouchableOpacity
              key={pm.value}
              style={[styles.paymentCard, paymentMethod === pm.value && styles.paymentCardActive]}
              onPress={() => setPaymentMethod(pm.value)}
              activeOpacity={0.8}
            >
              <View style={styles.paymentIconChip}>
                <Text style={styles.paymentIcon}>{pm.icon}</Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={[styles.paymentLabel, paymentMethod === pm.value && styles.paymentLabelActive]}>{pm.label}</Text>
                <Text style={styles.paymentSub}>{pm.sub}</Text>
              </View>
              <View style={[styles.radio, paymentMethod === pm.value && styles.radioActive]}>
                {paymentMethod === pm.value && <Text style={styles.radioTick}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Place Order */}
        <View style={styles.placeOrderSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total to pay</Text>
            <Text style={styles.totalValue}>TZS {Number(cartTotal || 0).toLocaleString()}</Text>
          </View>
          <Button
            title={placing ? 'Placing Order...' : `Place Order — TZS ${Number(cartTotal || 0).toLocaleString()}`}
            onPress={handlePlaceOrder}
            loading={placing}
            fullWidth
            style={styles.placeBtn}
          />
          <View style={styles.secureRow}>
            <Text style={styles.secureIcon}>🔒</Text>
            <Text style={styles.secureText}>Secured by AzamPay · Free delivery on all orders</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </KeyboardAwareScrollView>

      <PickerModal visible={showRegionPicker} title="Select Region"
        data={regions} loading={loadingRegions}
        onSelect={handleSelectRegion} onClose={() => setShowRegionPicker(false)} />
      <PickerModal visible={showDistrictPicker} title={`Districts in ${region?.name || ''}`}
        data={districts} loading={loadingDistricts}
        onSelect={handleSelectDistrict} onClose={() => setShowDistrictPicker(false)} />
      <PickerModal visible={showWardPicker} title={`Wards in ${district?.name || ''}`}
        data={wards} loading={loadingWards}
        onSelect={setWard} onClose={() => setShowWardPicker(false)} />
      <PickerModal visible={showPickupPicker} title="Select Pickup Station"
        data={pickupPoints} loading={loadingPickupPoints} searchable
        onSearch={(q) => loadPickupPoints(q)}
        onSelect={p => setPickupPoint(p)} onClose={() => setShowPickupPicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base,
    paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  backBtnWrap: { width: 36, height: 36, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  backBtn: { fontSize: 24, color: COLORS.textPrimary, fontWeight: FONTS.bold, marginTop: -2 },
  scroll: { padding: SPACING.base },
  summaryCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.xs },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  sectionAccent: { width: 4, height: 15, borderRadius: 2, backgroundColor: COLORS.primary },
  summaryTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryItem: { flex: 1, fontSize: FONTS.sm, color: COLORS.textSecondary },
  summaryPrice: { fontSize: FONTS.sm, color: COLORS.textPrimary, fontWeight: FONTS.semiBold },
  summaryTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.divider, marginTop: SPACING.sm, paddingTop: SPACING.sm },
  summaryTotalLabel: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  summaryTotalValue: { fontSize: FONTS.base, fontWeight: FONTS.black, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  commissionCard: { marginBottom: SPACING.sm },
  section: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.xs },
  sectionTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  savedCard: { width: 140, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border },
  savedCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  savedLabel: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.textPrimary, marginBottom: 4 },
  savedText: { fontSize: FONTS.xs, color: COLORS.textMuted, lineHeight: 16 },
  savedNew: { width: 80, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  savedNewText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
  deliveryRow: { flexDirection: 'row', gap: SPACING.sm },
  deliveryBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.base, alignItems: 'center', backgroundColor: COLORS.surface },
  deliveryBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  deliveryIcon: { fontSize: 27, marginBottom: 4 },
  deliveryLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary },
  deliveryLabelActive: { color: COLORS.primaryDark, fontWeight: FONTS.bold },
  phoneWrap: { flexDirection: 'row', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden' },
  phoneFlag: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SPACING.sm, justifyContent: 'center', borderRightWidth: 1, borderRightColor: COLORS.border },
  phoneFlagText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.semiBold },
  phoneInput: { flex: 1, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.lg, color: COLORS.textPrimary, letterSpacing: 1 },
  selectedPickup: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.xl, padding: SPACING.base, borderWidth: 1.5, borderColor: COLORS.primary },
  selectedPickupInfo: { flex: 1 },
  selectedPickupName: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  selectedPickupSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  changeText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.bold },
  pickupSelectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.xl, padding: SPACING.base,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  pickupSelectText: { fontSize: FONTS.base, color: COLORS.primaryDark, fontWeight: FONTS.semiBold },
  pickupSelectArrow: { fontSize: FONTS.xl, color: COLORS.primary },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary,
    borderRadius: RADIUS.xl, padding: SPACING.base, backgroundColor: COLORS.primaryFade,
    marginBottom: SPACING.sm, gap: SPACING.sm,
  },
  gpsBtnDone: { borderColor: COLORS.success, backgroundColor: COLORS.successLight },
  gpsBtnIcon: { fontSize: 25 },
  gpsBtnText: { flex: 1 },
  gpsBtnTitle: { fontSize: FONTS.sm, fontWeight: FONTS.bold, color: COLORS.primaryDark },
  gpsBtnSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  fieldLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  optional: { fontSize: FONTS.xs, color: COLORS.textMuted, fontWeight: FONTS.regular },
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, marginBottom: SPACING.xs,
  },
  selectorDisabled: { opacity: 0.5 },
  selectorValue: { fontSize: FONTS.base, color: COLORS.textPrimary },
  selectorPlaceholder: { fontSize: FONTS.base, color: COLORS.textLight },
  selectorArrow: { fontSize: FONTS.base, color: COLORS.textMuted },
  input: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2, fontSize: FONTS.base, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  moreBtn: { paddingVertical: SPACING.sm, alignItems: 'center' },
  moreBtnText: { fontSize: FONTS.sm, color: COLORS.primary, fontWeight: FONTS.semiBold },
  paymentCard: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface, gap: SPACING.sm,
  },
  paymentCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryFade },
  paymentIconChip: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  paymentIcon: { fontSize: 20 },
  paymentInfo: { flex: 1 },
  paymentLabel: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.textPrimary },
  paymentLabelActive: { color: COLORS.primaryDark },
  paymentSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  radioTick: { color: COLORS.textWhite, fontSize: FONTS.xs, fontWeight: FONTS.bold },
  placeOrderSection: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.base },
  totalLabel: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  totalValue: { fontSize: FONTS.xl, fontWeight: FONTS.black, color: COLORS.textPrimary, letterSpacing: FONTS.trackTight },
  placeBtn: { borderRadius: RADIUS.xl, marginBottom: SPACING.sm },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  secureIcon: { fontSize: 11 },
  secureText: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(18,22,43,0.55)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'],
    maxHeight: '75%', paddingBottom: Platform.OS === 'ios' ? 34 : 16, paddingTop: 10,
  },
  pickerHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  pickerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  pickerCloseBtn: { width: 28, height: 28, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  pickerClose: { fontSize: FONTS.base, color: COLORS.textMuted, fontWeight: FONTS.bold },
  pickerSearchWrap: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.sm },
  pickerSearchInput: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, fontSize: FONTS.base, color: COLORS.textPrimary },
  pickerLoading: { padding: SPACING.xl, alignItems: 'center' },
  pickerEmpty: { textAlign: 'center', padding: SPACING.xl, color: COLORS.textMuted, fontSize: FONTS.sm },
  pickerItem: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  pickerItemText: { fontSize: FONTS.base, color: COLORS.textPrimary },
  pickerItemSub: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
});