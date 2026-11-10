/**
 * VUMA Store - the VUMA logo, drawn from the real logo files in one place.
 *
 *   variant 'mark' : the VUMA word only (headers, receipts)  - assets/logo-wordmark.png, 420 x 88
 *   variant 'full' : the VUMA word with "Shop Smarter. Live Better." - assets/logo.png, 786 x 266
 *
 * You give the height; the width follows the picture, so the logo is never stretched.
 */
import React from 'react';
import { Image } from 'react-native';

const MARK = require('../../assets/logo-wordmark.png');
const FULL = require('../../assets/logo.png');

export const LOGO_RATIO = { mark: 420 / 88, full: 786 / 266 };

export function logoSize(variant, height) {
  const ratio = LOGO_RATIO[variant] || LOGO_RATIO.mark;
  return { width: Math.round(height * ratio), height };
}

export default function BrandLogo({ variant = 'mark', height = 28, style }) {
  const v = variant === 'full' ? 'full' : 'mark';
  return (
    <Image
      source={v === 'full' ? FULL : MARK}
      style={[logoSize(v, height), style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="VUMA"
    />
  );
}
