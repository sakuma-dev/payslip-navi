import React, { ReactNode } from 'react';
import { Animated, StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native';
import { EnterOptions, useEnterAnimation } from './motion';
import { CONTENT_MAX_WIDTH, layoutMetrics, LayoutMetrics, tileSpacing } from './visual';

export const NAV_HEIGHT = 64;
export const NAV_GAP = 12;

// タブ画面の末尾に確保する余白（浮遊ナビ＋safe area＋呼吸の余白）
export function navReserve(insetBottom: number): number {
  return NAV_HEIGHT + NAV_GAP + insetBottom + 24;
}

export function useLayoutMetrics(): LayoutMetrics & { width: number; fontScale: number; tile: { gap: number; padding: number } } {
  const { width, fontScale } = useWindowDimensions();
  const metrics = layoutMetrics(width);
  return { ...metrics, width, fontScale, tile: tileSpacing(metrics.sizeClass) };
}

// ガターと本文の最大幅をまとめて付ける。
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { gutter } = useLayoutMetrics();
  return (
    <View style={[{ paddingHorizontal: gutter }, style]}>
      <View style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' }}>{children}</View>
    </View>
  );
}

// マウント時に1回だけの入場（M3/M4/M5）。動きを減らす設定・未確定では最初から最終状態。
export function EnterView({ children, style, ...options }: EnterOptions & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const enter = useEnterAnimation(options);
  return <Animated.View style={[style, enter]}>{children}</Animated.View>;
}
