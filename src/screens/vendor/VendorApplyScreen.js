/**
 * VUMA Store — Vendor Apply Screen
 * Fixed: keyboard issue, Tanzania phone placeholder
 */

import React, { useState } from 'react';
import { t } from '../../i18n';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Platform, Alert, KeyboardAvoidingView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../utils/constants';
import { selectUser } from '../../store/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

const CATEGORIES = [
  'Electronics', 'Fashion', 'Food & Drinks', 'Beauty',
  'Home & Garden', 'Sports', 'Books', 'Toys', 'Health', 'Other'
];

export default function VendorApplyScreen({ navigation }) {
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    storeName: '',
    description: '',
    phone: user?.phone || '',
    category: '',
    experience: '',
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [businessCert, setBusinessCert] = useState(null);
  const [idCard, setIdCard] = useState(null);

  const pickDocument = async (type) => {
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        if (file.size > 10 * 1024 * 1024) {
          Alert.alert('File too large', 'Maximum file size is 10MB.');
          return;
        }
        if (type === 'business') {
          setBusinessCert(file);
          setErrors(p => ({ ...p, businessCert: null }));
        } else {
          setIdCard(file);
          setErrors(p => ({ ...p, idCard: null }));
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open file picker. Please try again.');
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.storeName.trim()) errs.storeName = 'Store name is required.';
    if (!form.description.trim()) errs.description = 'Description is required.';
    if (!form.phone.trim()) errs.phone = 'Phone is required.';
    if (!form.category.trim()) errs.category = 'Category is required.';
    if (!businessCert) errs.businessCert = 'Business certificate is required.';
    if (!idCard) errs.idCard = 'ID card or passport is required.';
    if (!form.address.trim()) errs.address = 'Shop address is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleApply = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { upload } = await import('../../api/client');
      const formData = new FormData();
      formData.append('business_name', form.storeName);
      formData.append('shop_name', form.storeName);
      formData.append('description', form.description);
      formData.append('contact_phone', form.phone);
      formData.append('business_type', form.category);
      formData.append('shop_address', form.address);
      formData.append('business_certificate', {
        uri: businessCert.uri,
        name: businessCert.name || 'business_certificate.pdf',
        type: businessCert.mimeType || 'application/pdf',
      });
      formData.append('id_card_front', {
        uri: idCard.uri,
        name: idCard.name || 'id_card.jpg',
        type: idCard.mimeType || 'image/jpeg',
      });
      await upload('vendors/applications/apply/', formData);
      Alert.alert(
        '✅ Application Submitted!',
        'Your vendor application has been received.\n\nWe will review it within 24-48 hours and notify you by email once approved.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      const msg = error?.message || 'Failed to submit. Please try again.';
      Alert.alert('❌ Submission Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const DocumentUploadBox = ({ label, required, file, onPress, error, hint }) => (
    <View style={styles.docSection}>
      <Text style={styles.docLabel}>{label} {required && <Text style={styles.required}>*</Text>}</Text>
      <Text style={styles.docHint}>{hint}</Text>
      <TouchableOpacity
        style={[styles.docBox, file && styles.docBoxFilled, error && styles.docBoxError]}
        onPress={onPress} activeOpacity={0.7}
      >
        {file ? (
          <View style={styles.docFilled}>
            <Text style={styles.docFilledIcon}>✅</Text>
            <View style={styles.docFilledInfo}>
              <Text style={styles.docFilledName} numberOfLines={1}>{file.name}</Text>
              <Text style={styles.docFilledSize}>{(file.size / 1024).toFixed(0)} KB</Text>
            </View>
            <TouchableOpacity onPress={onPress} style={styles.docChange}>
              <Text style={styles.docChangeText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.docEmpty}>
            <Text style={styles.docEmptyIcon}>📎</Text>
            <Text style={styles.docEmptyText}>Tap to upload</Text>
            <Text style={styles.docEmptyHint}>PDF, JPG, PNG — Max 10MB</Text>
          </View>
        )}
      </TouchableOpacity>
      {error && <Text style={styles.docError}>⚠️ {error}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏪 Become a Vendor</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
      >
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Why sell on VUMA?</Text>
          {[
            '✅ Only 5% commission — keep 95% of sales',
            '✅ Millions of customers across Africa & Asia',
            '✅ Fast payouts to your account',
            '✅ Free store setup and dashboard',
            '✅ 24/7 seller support',
          ].map((b, i) => (
            <Text key={i} style={styles.benefitItem}>{b}</Text>
          ))}
        </View>

        <Text style={styles.sectionTitle}>STORE INFORMATION</Text>
        <View style={styles.card}>
          <Input
            label="Store Name" required value={form.storeName}
            onChangeText={v => { setForm(p => ({ ...p, storeName: v })); if (errors.storeName) setErrors(p => ({ ...p, storeName: null })); }}
            placeholder="e.g. Moha's Electronics" leftIcon="🏪" error={errors.storeName}
          />
          <Input
            label="Store Description" required value={form.description}
            onChangeText={v => { setForm(p => ({ ...p, description: v })); if (errors.description) setErrors(p => ({ ...p, description: null })); }}
            placeholder="Describe what you sell..." leftIcon="📝" error={errors.description}
          />
          <Input
            label="Phone Number" required value={form.phone}
            onChangeText={v => { setForm(p => ({ ...p, phone: v })); if (errors.phone) setErrors(p => ({ ...p, phone: null })); }}
            placeholder="+255 7XX XXX XXX" keyboardType="phone-pad" leftIcon="📱" error={errors.phone}
          />
          <Input
            label="Years of Experience" value={form.experience}
            onChangeText={v => setForm(p => ({ ...p, experience: v }))}
            placeholder="e.g. 2 years" leftIcon="📅" keyboardType="numeric"
          />
          <Input
            label="Shop Address" required value={form.address}
            onChangeText={v => { setForm(p => ({ ...p, address: v })); if (errors.address) setErrors(p => ({ ...p, address: null })); }}
            placeholder="e.g. Kariakoo, Dar es Salaam" leftIcon="📍" error={errors.address}
          />
        </View>

        <Text style={styles.sectionTitle}>MAIN PRODUCT CATEGORY</Text>
        <View style={styles.card}>
          {errors.category && <Text style={styles.categoryError}>⚠️ {errors.category}</Text>}
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryBtn, form.category === cat && styles.categoryBtnActive]}
                onPress={() => { setForm(p => ({ ...p, category: cat })); setErrors(p => ({ ...p, category: null })); }}
              >
                <Text style={[styles.categoryBtnText, form.category === cat && styles.categoryBtnTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>REQUIRED DOCUMENTS</Text>
        <View style={styles.card}>
          <View style={styles.docsNote}>
            <Text style={styles.docsNoteText}>
              🔒 Your documents are encrypted and used only for verification. They will not be shared publicly.
            </Text>
          </View>
          <DocumentUploadBox
            label="Business Registration Certificate" required
            file={businessCert} onPress={() => pickDocument('business')}
            error={errors.businessCert}
            hint="Official business registration document from your government"
          />
          <View style={styles.docDivider} />
          <DocumentUploadBox
            label="Government-issued ID / Passport" required
            file={idCard} onPress={() => pickDocument('id')}
            error={errors.idCard}
            hint="National ID card, passport, or driver's license"
          />
        </View>

        <Button
          title="Submit Application" onPress={handleApply}
          loading={loading} disabled={loading} fullWidth size="lg" style={styles.submitBtn}
        />
        <Text style={styles.note}>
          📋 Applications are reviewed within 24-48 hours.{'\n'}You'll receive an email notification once approved.
        </Text>
        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? SPACING['3xl'] : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  backIcon: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  scroll: { padding: SPACING.base },
  benefitsCard: { backgroundColor: COLORS.primaryFade, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.base, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  benefitsTitle: { fontSize: FONTS.base, fontWeight: FONTS.bold, color: COLORS.primary, marginBottom: SPACING.sm },
  benefitItem: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginBottom: 4, lineHeight: 20 },
  sectionTitle: { fontSize: FONTS.xs, fontWeight: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.base, marginBottom: SPACING.base, ...SHADOWS.sm },
  categoryError: { fontSize: FONTS.xs, color: COLORS.danger, marginBottom: SPACING.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  categoryBtn: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  categoryBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryBtnText: { fontSize: FONTS.sm, color: COLORS.textSecondary, fontWeight: FONTS.medium },
  categoryBtnTextActive: { color: COLORS.textWhite, fontWeight: FONTS.bold },
  docsNote: { backgroundColor: COLORS.infoLight, borderRadius: RADIUS.lg, padding: SPACING.sm, marginBottom: SPACING.base },
  docsNoteText: { fontSize: FONTS.xs, color: COLORS.infoText, lineHeight: 18 },
  docSection: { marginBottom: SPACING.base },
  docLabel: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 2 },
  required: { color: COLORS.danger },
  docHint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginBottom: SPACING.sm },
  docBox: { borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: RADIUS.lg, padding: SPACING.base, backgroundColor: COLORS.surfaceAlt },
  docBoxFilled: { borderStyle: 'solid', borderColor: COLORS.success, backgroundColor: COLORS.successLight },
  docBoxError: { borderColor: COLORS.danger, borderStyle: 'solid' },
  docEmpty: { alignItems: 'center', paddingVertical: SPACING.sm },
  docEmptyIcon: { fontSize: 32, marginBottom: SPACING.xs },
  docEmptyText: { fontSize: FONTS.base, fontWeight: FONTS.semiBold, color: COLORS.primary },
  docEmptyHint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: 2 },
  docFilled: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  docFilledIcon: { fontSize: 24 },
  docFilledInfo: { flex: 1 },
  docFilledName: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.successText },
  docFilledSize: { fontSize: FONTS.xs, color: COLORS.textMuted },
  docChange: { backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  docChangeText: { fontSize: FONTS.xs, color: COLORS.primary, fontWeight: FONTS.semiBold },
  docError: { fontSize: FONTS.xs, color: COLORS.danger, marginTop: SPACING.xs },
  docDivider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.base },
  submitBtn: { marginTop: SPACING.sm, marginBottom: SPACING.base },
  note: { fontSize: FONTS.xs, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
});