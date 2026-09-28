import React, { ReactNode, useId } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, shadow } from '../theme';
import { useGlass } from './GlassProvider';
import { BlurBackdrop, blurContainerStyle, NativeGlass } from './platform';

// 機能層（ナビ・ヘッダー）の面。docs/UI-GLASS-DESIGN.md §3 / §5。
// 外側の層は影と半径だけ（overflow visible）、内側の層でクリップする。外形は全モードで同じ（縁1px）。
// この面と祖先に opacity<1 / filter / will-change を掛けない（native の親 opacity 問題、Web の backdrop root）。
export function GlassSurface({ radius, style, contentStyle, children, onLayout }: {
  radius: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const glass = useGlass();
  const inner: ViewStyle = { borderRadius: radius, borderWidth: 1, overflow: 'hidden' };

  if (glass.mode === 'native') {
    return (
      <View style={[{ borderRadius: radius }, style]} onLayout={onLayout}>
        <NativeGlass style={[{ borderRadius: radius, borderWidth: 1, borderColor: 'transparent' }, contentStyle]}>{children}</NativeGlass>
      </View>
    );
  }

  const high = glass.highContrast;
  return (
    <View style={[{ borderRadius: radius }, shadow.glass, style]} onLayout={onLayout}>
      <View
        style={[
          inner,
          glass.mode === 'blur'
            ? [{ borderColor: colors.glassEdge }, blurContainerStyle]
            : { backgroundColor: high ? colors.surface : colors.glassSolid, borderColor: high ? colors.lineStrong : colors.glassEdge },
          !high && shadow.highlight,
          contentStyle,
        ]}
      >
        {glass.mode === 'blur' ? (
          <>
            <BlurBackdrop targetRef={glass.targetRef} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassTint }]} pointerEvents="none" />
          </>
        ) : null}
        {high ? null : <Sheen />}
        {children}
      </View>
    </View>
  );
}

// 上半分の白い光沢（装飾）
function Sheen() {
  const id = `sheen${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={styles.sheen} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
      <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="1" height="1" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  sheen: { position: 'absolute', left: 0, right: 0, top: 0, height: '50%' },
});
