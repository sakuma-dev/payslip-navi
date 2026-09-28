import React, { useId } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useGlass } from './GlassProvider';
import { palette, sceneBlobs } from './palette';

// L0 の背景（固定・静止の装飾。読み上げない）。乳白→淡い青の縦グラデーションに、ぼけた色の塊を3つ。
// 高コントラストでは塊を消して一色にする。位置と大きさは docs/UI-GLASS-DESIGN.md §2。
export function Scene() {
  const { highContrast } = useGlass();
  const { width, height } = useWindowDimensions();
  const id = `scene${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const blobs = [
    { cx: width * 0.92, cy: 120, r: 0.75 * Math.min(width, 520) },
    { cx: width * 0.05, cy: height * 0.48, r: 0.6 * Math.min(width, 480) },
    { cx: width * 0.85, cy: height * 0.88, r: 0.55 * Math.min(width, 480) },
  ];
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: palette.sceneTop }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      {highContrast ? null : (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`${id}base`} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={palette.sceneTop} />
              <Stop offset="1" stopColor={palette.sceneBottom} />
            </LinearGradient>
            {blobs.map((blob, i) => (
              <RadialGradient key={i} id={`${id}b${i}`} cx={blob.cx} cy={blob.cy} r={blob.r} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor={sceneBlobs[i]!.color} stopOpacity={sceneBlobs[i]!.alpha} />
                <Stop offset="1" stopColor={sceneBlobs[i]!.color} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill={`url(#${id}base)`} />
          {blobs.map((blob, i) => (
            <Circle key={i} cx={blob.cx} cy={blob.cy} r={blob.r} fill={`url(#${id}b${i})`} />
          ))}
        </Svg>
      )}
    </View>
  );
}
