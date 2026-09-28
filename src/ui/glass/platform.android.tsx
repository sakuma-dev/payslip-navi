import React, { ReactNode, RefObject } from 'react';
import { AccessibilityInfo, Platform, StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import type * as BlurModule from 'expo-blur';
import type { Capability, PrefAction } from './glassMode';
import { subscribeNativePrefs } from './nativePrefs';

// Android: API 31以上は expo-blur（BlurTargetView の ref を blurTarget へ渡す）。30以下は不透明。
// Apple の Liquid Glass ではない近似表現。docs/UI-GLASS-DESIGN.md §3。

let blur: typeof BlurModule | null | undefined;

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

// BlurView は BlurTargetView の外側（兄弟）に置き、target の layout 後に使う。
export const needsTarget = true;

export function detectCapability(): Capability {
  return typeof Platform.Version === 'number' && Platform.Version >= 31 && loadBlur() ? 'blur' : 'none';
}

export function subscribePreferences(dispatch: (action: PrefAction) => void): () => void {
  // 透明度の問い合わせは Android では常に false を返すだけなので、許可の証拠にしない（unsupported）。
  return subscribeNativePrefs(
    dispatch,
    [{ key: 'increaseContrast', event: 'highTextContrastChanged', query: () => AccessibilityInfo.isHighTextContrastEnabled() }],
    ['reduceTransparency', 'forcedColors'],
  );
}

export function NativeGlass({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={style}>{children}</View>;
}

export const blurContainerStyle: ViewStyle | null = null;

export function BlurBackdrop({ targetRef }: { targetRef: RefObject<View | null> }) {
  const b = loadBlur();
  if (!b) return null;
  return (
    <b.BlurView
      style={StyleSheet.absoluteFill}
      blurTarget={targetRef}
      blurMethod="dimezisBlurViewSdk31Plus"
      tint="light"
      intensity={50}
      pointerEvents="none"
    />
  );
}

export function BlurTargetView({ ref, ...props }: ViewProps & { ref?: RefObject<View | null> }) {
  const b = loadBlur();
  if (!b) return <View ref={ref} {...props} />;
  return <b.BlurTargetView ref={ref} {...props} />;
}
