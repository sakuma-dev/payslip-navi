import React, { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

// ホームの主役（docs/UI-GLASS-DESIGN.md §5）。面を持たず Scene の上に直接置く（右上の青い塊が背後に来る）。
// Scene の上に置ける文字は ink / inkMuted / primaryDeep だけ。差額チップは不透明の地を持つ。
export function Hero({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ paddingTop: 8, paddingBottom: 20 }, style]}>{children}</View>;
}
