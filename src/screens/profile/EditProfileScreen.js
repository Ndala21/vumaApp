/**
 * VUMA Store — Edit Profile Screen
 * Uses the real, confirmed endpoints: API.PROFILE (GET) and
 * API.PROFILE_UPDATE (users/profile/update/).
 *
 * Honest note: the exact HTTP method/field names accepted by the
 * real PROFILE_UPDATE serializer haven't been verified against the
 * live backend in this exchange (frontend-only work) — this uses
 * PATCH with username/phone, matching what ProfileScreen already
 * displays from real user data. Worth a quick real test after
 * applying, in case the backend expects POST or different field
 * names.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, Platform, Alert, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, setUser } from '../../store/authSlice';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, API } from '../../utils/constants';
import { patch } from '../../api/client';

export default function EditProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Required', 'Please enter a name.');
      return;
    }
    setSaving(true);
    try {
      const updated = await patch(API.PROFILE_UPDATE, {
        username: username.trim(),
        phone: phone.trim(),
      });
      if (setUser) dispatch(setUser({ ...user, ...updated }));
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not update your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(username || user?.email || 'U')[0].toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Your name"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+255 7XX XXX XXX"
          keyboardType="phone-pad"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>Email</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyText}>{user?.email}</Text>
        </View>
        <Text style={styles.hint}>Email address cannot be changed here. Contact support if you need to update it.</Text>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.base, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.base, paddingBottom: SPACING.base, borderBottomWidth: 1, borderBottomColor: COLORS.divider, ...SHADOWS.sm },
  backIcon: { fontSize: FONTS.xl, color: COLORS.textPrimary, fontWeight: FONTS.bold },
  headerTitle: { fontSize: FONTS.lg, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  scroll: { padding: SPACING.base },
  avatarWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  avatar: { width: 84, height: 84, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryFade, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FONTS['3xl'], fontWeight: FONTS.black, color: COLORS.primary },
  label: { fontSize: FONTS.sm, fontWeight: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.xs, marginTop: SPACING.base },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4, fontSize: FONTS.base, color: COLORS.textPrimary },
  readOnlyField: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.borderLight, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 4 },
  readOnlyText: { fontSize: FONTS.base, color: COLORS.textMuted },
  hint: { fontSize: FONTS.xs, color: COLORS.textMuted, marginTop: SPACING.xs },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: SPACING.base, alignItems: 'center', marginTop: SPACING.xl },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: 'white', fontSize: FONTS.base, fontWeight: FONTS.bold },
});