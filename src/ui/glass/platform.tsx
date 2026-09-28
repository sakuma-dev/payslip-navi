import React, { ReactNode, RefObject } from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';
import type { Capability, PrefAction } from './glassMode';
import { PREF_KEYS } from './glassMode';

// 既定の実装（.ios / .android / .web 以外。vitest・tsc もこのファイルを解決する）。
// 実素材は使わず、solid の同じ形で表示する。各 platform ファイルは同じ export を持つ。

export const needsTarget = false;

export function detectCapability(): Capability {
  return 'none';
}

export function subscribePreferences(dispatch: (action: PrefAction) => void): () => void {
  for (const key of PREF_KEYS) dispatch({ type: 'unsupported', key });
  return () => {};
}

// native Liquid Glass の内側の層（mode が native の時だけ使われる）
export function NativeGlass({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={style}>{children}</View>;
}

// blur の時にクリップする内側の層へ付けるスタイル（Web の backdrop-filter だけ）
export const blurContainerStyle: ViewStyle | null = null;

// blur の背景層（absoluteFill）。mode が blur の時だけ使われる。
export function BlurBackdrop(_props: { targetRef: RefObject<View | null> }) {
  return null;
}

export function BlurTargetView({ ref, ...props }: ViewProps & { ref?: RefObject<View | null> }) {
  return <View ref={ref} {...props} />;
}
