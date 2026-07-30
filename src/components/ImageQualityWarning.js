/**
 * VUMA Image Quality Warning System
 * Shows quality feedback when seller uploads product images
 *
 * Usage:
 *   import { ImageQualityWarning, useImageUpload } from './ImageQualityWarning';
 *
 *   const { uploadImage, uploading, quality } = useImageUpload(token);
 *   <ImageQualityWarning quality={quality} onDismiss={() => {}} onRetry={pickImage} />
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, ActivityIndicator, Animated, Image,
} from 'react-native';

const API = 'https://vumastore.store/api/v1';

const C = {
  orange:  '#FF6B00',
  orangeL: '#FFF3E8',
  green:   '#22C55E',
  greenL:  '#F0FDF4',
  red:     '#EF4444',
  redL:    '#FFF5F5',
  yellow:  '#F59E0B',
  yellowL: '#FFFBEB',
  blue:    '#3B82F6',
  blueL:   '#EFF6FF',
  text:    '#1F2937',
  textSec: '#6B7280',
  textMut: '#9CA3AF',
  border:  '#E5E7EB',
  white:   '#FFFFFF',
  bg:      '#F8F9FA',
};

// ── Grade color mapping ───────────────────────────────
const GRADE_CONFIG = {
  A: { color: C.green,  bg: C.greenL,  label: 'Excellent',   icon: '🏆' },
  B: { color: C.blue,   bg: C.blueL,   label: 'Good',        icon: '✅' },
  C: { color: C.yellow, bg: C.yellowL, label: 'Acceptable',  icon: '⚠️' },
  F: { color: C.red,    bg: C.redL,    label: 'Poor',        icon: '❌' },
};

// ── Quality Score Circle ──────────────────────────────
const QualityScoreCircle = ({ score, grade }) => {
  const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.C;
  return (
    <View style={[styles.scoreCircle, { borderColor: cfg.color }]}>
      <Text style={[styles.scoreNumber, { color: cfg.color }]}>{score}</Text>
      <Text style={styles.scoreLabel}>/ 100</Text>
      <Text style={styles.gradeText}>{cfg.icon} {cfg.label}</Text>
    </View>
  );
};

// ── Quality Bar ───────────────────────────────────────
const QualityBar = ({ label, value, max, color }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricBarBg}>
        <View style={[styles.metricBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.metricValue, { color }]}>{Math.round(value)}</Text>
    </View>
  );
};

// ── Main Warning Component ────────────────────────────
export const ImageQualityWarning = ({
  quality,
  visible,
  onDismiss,
  onRetry,
  onPublishAnyway,
  imageUri,
}) => {
  if (!quality || !visible) return null;

  const { score = 0, grade = 'F', passed = false, issues = [], suggestions = [], metrics = {} } = quality;
  const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.F;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: cfg.bg }]}>
              <QualityScoreCircle score={score} grade={grade} />
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Image Quality Check</Text>
                <Text style={[styles.headerStatus, { color: cfg.color }]}>
                  {passed ? '✅ Ready to publish' : '⚠️ Issues detected'}
                </Text>
                {imageUri && (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewThumb}
                    resizeMode="cover"
                  />
                )}
              </View>
            </View>

            {/* Issues */}
            {issues.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>❌ Issues Found</Text>
                {issues.map((issue, i) => (
                  <View key={i} style={styles.issueRow}>
                    <View style={styles.issueDot} />
                    <Text style={styles.issueText}>{issue}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>💡 How to Improve</Text>
                {suggestions.map((s, i) => (
                  <View key={i} style={styles.suggestionRow}>
                    <Text style={styles.suggestionBullet}>→</Text>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Metrics */}
            {Object.keys(metrics).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Image Metrics</Text>
                <View style={styles.metricsGrid}>
                  {metrics.resolution && (
                    <View style={styles.metricChip}>
                      <Text style={styles.metricChipLabel}>Resolution</Text>
                      <Text style={styles.metricChipValue}>{metrics.resolution}</Text>
                    </View>
                  )}
                  {metrics.blur_score !== undefined && (
                    <View style={[styles.metricChip, {
                      backgroundColor: metrics.blur_score < 150 ? C.redL : C.greenL
                    }]}>
                      <Text style={styles.metricChipLabel}>Sharpness</Text>
                      <Text style={[styles.metricChipValue, {
                        color: metrics.blur_score < 150 ? C.red : C.green
                      }]}>{metrics.blur_score < 150 ? 'Blurry' : 'Sharp'}</Text>
                    </View>
                  )}
                  {metrics.brightness !== undefined && (
                    <View style={[styles.metricChip, {
                      backgroundColor: metrics.brightness < 80 || metrics.brightness > 200 ? C.yellowL : C.greenL
                    }]}>
                      <Text style={styles.metricChipLabel}>Brightness</Text>
                      <Text style={[styles.metricChipValue, {
                        color: metrics.brightness < 80 ? C.red : metrics.brightness > 200 ? C.yellow : C.green
                      }]}>
                        {metrics.brightness < 80 ? 'Too Dark' : metrics.brightness > 200 ? 'Too Bright' : 'Good'}
                      </Text>
                    </View>
                  )}
                  {metrics.contrast !== undefined && (
                    <View style={[styles.metricChip, {
                      backgroundColor: metrics.contrast < 25 ? C.redL : C.greenL
                    }]}>
                      <Text style={styles.metricChipLabel}>Contrast</Text>
                      <Text style={[styles.metricChipValue, {
                        color: metrics.contrast < 25 ? C.red : C.green
                      }]}>{metrics.contrast < 25 ? 'Low' : 'Good'}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Tips */}
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>📸 VUMA Photo Tips</Text>
              {[
                'Use natural daylight — avoid dark rooms',
                'Place product on plain white or light background',
                'Hold camera steady — use timer if needed',
                'Fill 70-80% of frame with your product',
                'Minimum 400×400 pixels for best display',
                'Avoid watermarks, logos, or text overlays',
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                <Text style={styles.retryBtnText}>📷 Upload Better Image</Text>
              </TouchableOpacity>

              {passed && (
                <TouchableOpacity style={styles.publishBtn} onPress={onDismiss}>
                  <Text style={styles.publishBtnText}>✅ Looks Good — Continue</Text>
                </TouchableOpacity>
              )}

              {!passed && onPublishAnyway && (
                <TouchableOpacity style={styles.publishAnywayBtn} onPress={onPublishAnyway}>
                  <Text style={styles.publishAnywayBtnText}>Publish Anyway (not recommended)</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
                <Text style={styles.dismissBtnText}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Inline Quality Badge ──────────────────────────────
export const ImageQualityBadge = ({ quality, onPress }) => {
  if (!quality) return null;
  const { score, grade, passed } = quality;
  const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.C;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.qualityBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}
    >
      <Text style={styles.qualityBadgeIcon}>{cfg.icon}</Text>
      <View>
        <Text style={[styles.qualityBadgeGrade, { color: cfg.color }]}>
          Grade {grade} — {score}/100
        </Text>
        <Text style={styles.qualityBadgeLabel}>
          {passed ? 'Image passed quality check' : 'Tap to see quality issues'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Upload Hook ───────────────────────────────────────
export const useImageUpload = (token, productId) => {
  const [uploading, setUploading] = useState(false);
  const [quality, setQuality]     = useState(null);
  const [error, setError]         = useState(null);
  const [imageUri, setImageUri]   = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  const uploadImage = useCallback(async (imageAsset) => {
    setUploading(true);
    setError(null);
    setQuality(null);

    try {
      const uri  = imageAsset.uri;
      const name = imageAsset.fileName || `product_${Date.now()}.jpg`;
      const type = imageAsset.type || 'image/jpeg';

      setImageUri(uri);

      const formData = new FormData();
      formData.append('image', { uri, name, type });

      const response = await fetch(`${API}/products/${productId}/images/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (response.status === 400 && data.issues) {
        // Quality blocked
        setQuality({
          score:       data.quality_score || 0,
          grade:       'F',
          passed:      false,
          issues:      data.issues || [],
          suggestions: data.suggestions || [],
          metrics:     {},
        });
        setShowWarning(true);
        setUploading(false);
        return { success: false, blocked: true, quality: data };
      }

      if (response.ok) {
        const q = data.image_quality;
        if (q) {
          setQuality(q);
          // Show warning if issues found even if passed
          if (!q.passed || q.warnings?.length > 0) {
            setShowWarning(true);
          }
        }
        setUploading(false);
        return { success: true, data, quality: q };
      }

      setError(data.error || 'Upload failed');
      setUploading(false);
      return { success: false, error: data.error };

    } catch (e) {
      setError('Network error — please try again');
      setUploading(false);
      return { success: false, error: e.message };
    }
  }, [token, productId]);

  return {
    uploadImage,
    uploading,
    quality,
    error,
    imageUri,
    showWarning,
    setShowWarning,
  };
};

// ── Upload Button with Quality ────────────────────────
export const SmartImageUploadButton = ({
  token,
  productId,
  onSuccess,
  style,
}) => {
  const {
    uploadImage, uploading, quality,
    imageUri, showWarning, setShowWarning,
  } = useImageUpload(token, productId);

  const [localImageUri, setLocalImageUri] = useState(null);

  const pickAndUpload = async () => {
    try {
      const { launchImageLibrary } = require('react-native-image-picker');
      launchImageLibrary(
        { mediaType: 'photo', quality: 1, includeBase64: false },
        async (response) => {
          if (response.didCancel || response.errorCode) return;
          const asset = response.assets?.[0];
          if (!asset) return;
          setLocalImageUri(asset.uri);
          const result = await uploadImage(asset);
          if (result.success && onSuccess) {
            onSuccess(result.data);
          }
        }
      );
    } catch (e) {
      console.error('Image picker error:', e);
    }
  };

  return (
    <View style={style}>
      <TouchableOpacity
        style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
        onPress={pickAndUpload}
        disabled={uploading}
        activeOpacity={0.8}
      >
        {uploading ? (
          <View style={styles.uploadBtnInner}>
            <ActivityIndicator color={C.white} size="small" />
            <Text style={styles.uploadBtnText}>Processing image…</Text>
          </View>
        ) : (
          <View style={styles.uploadBtnInner}>
            <Text style={styles.uploadBtnIcon}>📷</Text>
            <Text style={styles.uploadBtnText}>Upload Product Image</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Preview with quality badge */}
      {localImageUri && (
        <View style={styles.previewCard}>
          <Image source={{ uri: localImageUri }} style={styles.preview} resizeMode="cover" />
          {quality && (
            <ImageQualityBadge quality={quality} onPress={() => setShowWarning(true)} />
          )}
        </View>
      )}

      {/* Quality warning modal */}
      <ImageQualityWarning
        quality={quality}
        visible={showWarning}
        imageUri={localImageUri}
        onDismiss={() => setShowWarning(false)}
        onRetry={() => { setShowWarning(false); pickAndUpload(); }}
        onPublishAnyway={() => setShowWarning(false)}
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay:      { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
  sheet:        { backgroundColor:C.white, borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'92%', paddingTop:12 },
  handleBar:    { width:40, height:4, backgroundColor:C.border, borderRadius:2, alignSelf:'center', marginBottom:8 },

  header:       { flexDirection:'row', alignItems:'center', padding:20, gap:16 },
  headerText:   { flex:1 },
  headerTitle:  { fontSize:16, fontWeight:'700', color:C.text, marginBottom:4 },
  headerStatus: { fontSize:13, fontWeight:'600' },
  previewThumb: { width:60, height:60, borderRadius:8, marginTop:8, borderWidth:1, borderColor:C.border },

  scoreCircle:  { width:80, height:80, borderRadius:40, borderWidth:3, alignItems:'center', justifyContent:'center', backgroundColor:C.white },
  scoreNumber:  { fontSize:22, fontWeight:'800', lineHeight:26 },
  scoreLabel:   { fontSize:9, color:C.textMut },
  gradeText:    { fontSize:9, fontWeight:'600', marginTop:2, textAlign:'center' },

  section:      { paddingHorizontal:20, paddingVertical:12, borderBottomWidth:1, borderBottomColor:C.border },
  sectionTitle: { fontSize:13, fontWeight:'700', color:C.text, marginBottom:10 },

  issueRow:     { flexDirection:'row', alignItems:'flex-start', gap:8, marginBottom:6 },
  issueDot:     { width:6, height:6, borderRadius:3, backgroundColor:C.red, marginTop:6, flexShrink:0 },
  issueText:    { fontSize:13, color:C.red, flex:1, lineHeight:18 },

  suggestionRow:{ flexDirection:'row', alignItems:'flex-start', gap:8, marginBottom:6 },
  suggestionBullet:{ fontSize:14, color:C.orange, fontWeight:'700', width:16 },
  suggestionText:{ fontSize:13, color:C.text, flex:1, lineHeight:18 },

  metricsGrid:  { flexDirection:'row', flexWrap:'wrap', gap:8 },
  metricChip:   { backgroundColor:C.bg, borderRadius:8, padding:10, minWidth:80, alignItems:'center', borderWidth:1, borderColor:C.border },
  metricChipLabel:{ fontSize:10, color:C.textMut, textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 },
  metricChipValue:{ fontSize:13, fontWeight:'700', color:C.text },

  metricRow:    { flexDirection:'row', alignItems:'center', gap:8, marginBottom:6 },
  metricLabel:  { fontSize:11, color:C.textSec, width:80 },
  metricBarBg:  { flex:1, height:6, backgroundColor:C.border, borderRadius:3, overflow:'hidden' },
  metricBarFill:{ height:'100%', borderRadius:3 },
  metricValue:  { fontSize:11, fontWeight:'600', width:40, textAlign:'right' },

  tipsCard:     { margin:16, backgroundColor:C.orangeL, borderRadius:12, padding:16, borderWidth:1, borderColor:`${C.orange}30` },
  tipsTitle:    { fontSize:13, fontWeight:'700', color:C.orange, marginBottom:10 },
  tipRow:       { flexDirection:'row', gap:8, marginBottom:5 },
  tipBullet:    { fontSize:12, color:C.orange, fontWeight:'700', width:12 },
  tipText:      { fontSize:12, color:C.text, flex:1, lineHeight:17 },

  actions:      { padding:16, gap:10 },
  retryBtn:     { backgroundColor:C.orange, borderRadius:12, paddingVertical:14, alignItems:'center' },
  retryBtnText: { color:C.white, fontSize:14, fontWeight:'700' },
  publishBtn:   { backgroundColor:C.green, borderRadius:12, paddingVertical:14, alignItems:'center' },
  publishBtnText:{ color:C.white, fontSize:14, fontWeight:'700' },
  publishAnywayBtn:{ backgroundColor:C.bg, borderRadius:12, paddingVertical:12, alignItems:'center', borderWidth:1, borderColor:C.border },
  publishAnywayBtnText:{ color:C.textSec, fontSize:13 },
  dismissBtn:   { paddingVertical:10, alignItems:'center' },
  dismissBtnText:{ color:C.textMut, fontSize:13 },

  qualityBadge: { flexDirection:'row', alignItems:'center', gap:10, padding:12, borderRadius:10, borderWidth:1, marginTop:8 },
  qualityBadgeIcon:{ fontSize:20 },
  qualityBadgeGrade:{ fontSize:13, fontWeight:'700' },
  qualityBadgeLabel:{ fontSize:11, color:C.textSec, marginTop:2 },

  uploadBtn:     { backgroundColor:C.orange, borderRadius:12, paddingVertical:14, alignItems:'center' },
  uploadBtnDisabled:{ backgroundColor:C.textMut },
  uploadBtnInner:{ flexDirection:'row', alignItems:'center', gap:8 },
  uploadBtnIcon: { fontSize:18 },
  uploadBtnText: { color:C.white, fontSize:14, fontWeight:'700' },

  previewCard:   { marginTop:12, borderRadius:12, overflow:'hidden', borderWidth:1, borderColor:C.border },
  preview:       { width:'100%', height:200 },
});