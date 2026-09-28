import React, { ReactNode, RefObject } from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import type { Capability, PrefAction, PrefKey } from './glassMode';

// Web: CSS の backdrop-filter による近似表現（Apple の屈折とは別物）。
// 設定は matchMedia で読む（RN Web の AccessibilityInfo には透明度 API が無い）。DOM・CSS の扱いはこのファイルの中だけ。

export const needsTarget = false;

function supportsBackdrop(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
  return CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
}

export function detectCapability(): Capability {
  return supportsBackdrop() ? 'blur' : 'none';
}

const QUERIES: Record<PrefKey, string> = {
  reduceTransparency: '(prefers-reduced-transparency: reduce)',
  increaseContrast: '(prefers-contrast: more)',
  // Windows のハイコントラスト等。影と背景色がシステム色に置き換わる（D-M3）。
  forcedColors: '(forced-colors: active)',
};

export function subscribePreferences(dispatch: (action: PrefAction) => void): () => void {
  let active = true;
  const cleanups: (() => void)[] = [];
  for (const [key, query] of Object.entries(QUERIES) as [PrefKey, string][]) {
    let list: MediaQueryList | null = null;
    try {
      list = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null;
    } catch {
      list = null;
    }
    // 未対応のメディア特性は 'not all' になる。false を許可の証拠にしない。
    if (!list || list.media === 'not all') {
      dispatch({ type: 'unsupported', key });
      continue;
    }
    const mql = list;
    const onChange = (event: MediaQueryListEvent) => {
      if (active) dispatch({ type: 'event', key, on: event.matches });
    };
    mql.addEventListener('change', onChange);
    cleanups.push(() => mql.removeEventListener('change', onChange));
    dispatch({ type: 'query', key, on: mql.matches });
  }
  return () => {
    active = false;
    for (const cleanup of cleanups) cleanup();
  };
}

export function NativeGlass({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={style}>{children}</View>;
}

// expo-blur の Web 版は背景色を tint で上書きするので使わない。
// backdrop-filter はクリップする内側の層そのものに付け（角丸の内側だけをぼかす）、色は GlassSurface の glassTint 層が持つ。
export const blurContainerStyle = {
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
} as unknown as ViewStyle;

export function BlurBackdrop(_props: { targetRef: RefObject<View | null> }) {
  return null;
}

export function BlurTargetView({ ref, ...props }: ViewProps & { ref?: RefObject<View | null> }) {
  return <View ref={ref} {...props} />;
}
