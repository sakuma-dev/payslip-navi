import React, { ReactNode, RefObject } from 'react';
import { AccessibilityInfo, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import type * as GlassModule from 'expo-glass-effect';
import type * as BlurModule from 'expo-blur';
import type { Capability, PrefAction } from './glassMode';
import { subscribeNativePrefs } from './nativePrefs';

// iOS: 26以降で API が使えれば native Liquid Glass、それ以外は expo-blur。
// どちらのモジュールも読み込み時に native view を要求するため、遅延 require して例外を捕まえる
// （未再ビルドの dev client でもアプリ全体を落とさない）。docs/UI-GLASS-DESIGN.md §3。

// 実機のナビで文字の画素コントラストが4.5未満だった場合の切替点（§3 の手順）。
const USE_NATIVE_GLASS = true;
const NATIVE_TINT: string | undefined = undefined;

let glass: typeof GlassModule | null | undefined;
let blur: typeof BlurModule | null | undefined;

function loadGlass() {
  if (glass === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      glass = require('expo-glass-effect') as typeof GlassModule;
    } catch {
      glass = null;
    }
  }
  return glass;
}

function loadBlur() {
  if (blur === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      blur = require('expo-blur') as typeof BlurModule;
    } catch {
      blur = null;
    }
  }
  return blur;
}

export const needsTarget = false;

export function detectCapability(): Capability {
  if (USE_NATIVE_GLASS) {
    try {
      const g = loadGlass();
      if (g && g.isGlassEffectAPIAvailable() && g.isLiquidGlassAvailable()) return 'native';
    } catch {
      // guard 自体が失敗した場合は blur へ
    }
  }
  return loadBlur() ? 'blur' : 'none';
}

export function subscribePreferences(dispatch: (action: PrefAction) => void): () => void {
  return subscribeNativePrefs(
    dispatch,
    [
      { key: 'reduceTransparency', event: 'reduceTransparencyChanged', query: () => AccessibilityInfo.isReduceTransparencyEnabled() },
      // 「コントラストを上げる」
      { key: 'increaseContrast', event: 'darkerSystemColorsChanged', query: () => AccessibilityInfo.isDarkerSystemColorsEnabled() },
    ],
    ['forcedColors'],
  );
}

// アプリは light 固定。押下の反応は子のピルで示すので、面全体は interactive にしない（D-M4）。
export function NativeGlass({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  const g = loadGlass();
  if (!g) return <View style={style}>{children}</View>;
  return (
    <g.GlassView style={style} glassEffectStyle="regular" colorScheme="light" isInteractive={false} tintColor={NATIVE_TINT}>
      {children}
    </g.GlassView>
  );
}

export const blurContainerStyle: ViewStyle | null = null;

export function BlurBackdrop(_props: { targetRef: RefObject<View | null> }) {
  const b = loadBlur();
  if (!b) return null;
  return <b.BlurView style={StyleSheet.absoluteFill} tint="light" intensity={50} pointerEvents="none" />;
}

export function BlurTargetView({ ref, ...props }: ViewProps & { ref?: RefObject<View | null> }) {
  return <View ref={ref} {...props} />;
}
