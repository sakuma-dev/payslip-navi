import React, { ReactNode, useId } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useLayoutMetrics } from './layout';
import { colors, radius } from './theme';
import { CONTENT_MAX_WIDTH } from './visual';

// 青い主役面（ステージ）。上 primaryDeep → 下 primary の縦グラデーションに、右上だけ淡い光の楕円を重ねる。
// 背景は装飾なので読み上げない。主文字は白、補足は不透明の onPrimaryMuted（楕円上でも4.5:1以上）。

export const STAGE_OVERLAP = 28;

export function Stage({ children, variant, overlap = false, style }: {
  children: ReactNode;
  // bleed: 画面幅いっぱい（下角だけ丸い）/ card: 本文列の中の角丸カード
  variant: 'bleed' | 'card';
  // 下に白いシートを重ねる分の余白を取る
  overlap?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { gutter } = useLayoutMetrics();
  const bottom = 28 + (overlap ? STAGE_OVERLAP : 0);
  return (
    <View
      style={[
        styles.stage,
        variant === 'bleed'
          ? { paddingHorizontal: gutter, paddingTop: 8, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl }
          : { paddingHorizontal: 20, paddingTop: 16, borderRadius: radius.xl, marginTop: 16 },
        { paddingBottom: bottom },
        style,
      ]}
    >
      <StageBackground />
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

function StageBackground() {
  const id = `stage${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primaryDeep} />
            <Stop offset="1" stopColor={colors.primary} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill={`url(#${id})`} />
      </Svg>
      {/* 光の楕円は右上だけ。左側の文字には掛けない。 */}
      <Svg width={280} height={220} viewBox="0 0 280 220" style={styles.glow}>
        <Ellipse cx="170" cy="70" rx="150" ry="120" fill={colors.stageGlow} opacity={0.28} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { backgroundColor: colors.primary, overflow: 'hidden' },
  inner: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  glow: { position: 'absolute', top: -90, right: -110 },
});
