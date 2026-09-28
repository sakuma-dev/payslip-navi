import React from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { a11yState } from './a11y';
import { GlassSurface, useGlass } from './glass';
import { Icon, IconName } from './icons';
import { useInsets } from './insets';
import { NAV_GAP, NAV_HEIGHT } from './layout';
import { useEnterAnimation, useSlidingIndicator } from './motion';
import { colors, focusRingInset, fontBase, radius, shadow } from './theme';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon: IconName;
}

const INSET = 4;

// 画面下に浮かぶ明るいガラスのナビ（docs/UI-GLASS-DESIGN.md §5）。ラベルは常に表示し、選択中は白いカプセルが移動する。
// ガラスの上の文字は ink（非選択）と primaryDeep（選択）だけ。無効時も ink のまま、状態と細い線で示す（D-M1）。
export function TabBar<K extends string>({ tabs, selected, onSelect, disabled, onHeight }: {
  tabs: TabItem<K>[];
  selected: K;
  onSelect: (key: K) => void;
  disabled?: boolean;
  // ナビの実測の高さ（ラベルが2行になると伸びる）。本文末尾の余白に使う。
  onHeight?: (height: number) => void;
}) {
  const insets = useInsets();
  const glass = useGlass();
  const selectedIndex = Math.max(0, tabs.findIndex((t) => t.key === selected));
  const indicator = useSlidingIndicator(selectedIndex);
  // 出現は位置だけ（opacity は常に1。ガラスの祖先を透明にしない）。動きを減らす・未確定では最終位置。
  const enter = useEnterAnimation({ opacity: 1, translateY: 16 });
  const capsuleFill = glass.opaqueSurfaces ? colors.surface : colors.capsule;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.dock, { bottom: insets.bottom + NAV_GAP }, enter]}
      onLayout={(event: LayoutChangeEvent) => onHeight?.(event.nativeEvent.layout.height)}
    >
      <GlassSurface radius={radius.nav} style={styles.bar}>
        <View style={styles.row} accessibilityRole="tablist">
          {indicator.ready ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.capsule,
                { backgroundColor: capsuleFill, width: indicator.width, transform: [{ translateX: indicator.translateX }] },
                !glass.highContrast && shadow.capsule,
              ]}
            />
          ) : null}
          {tabs.map((tab, index) => {
            const isSelected = index === selectedIndex;
            const fg = isSelected ? colors.primaryDeep : colors.ink;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onSelect(tab.key)}
                onLayout={indicator.onItemLayout(index)}
                disabled={disabled}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                {...a11yState({ selected: isSelected, disabled: !!disabled })}
                style={(state) => [
                  styles.tab,
                  // 位置を測る前だけ、選択中のタブ自身にカプセルの地と縁を付ける
                  isSelected && !indicator.ready && [styles.capsuleFallback, { backgroundColor: capsuleFill }],
                  (state as { focused?: boolean }).focused && focusRingInset,
                ]}
              >
                <Icon name={tab.icon} size={22} color={fg} strokeWidth={disabled ? 1.25 : 1.75} />
                {/* 省略記号にしない。幅が足りない時（320px・文字拡大）は2行に折り返す */}
                <Text style={[styles.label, { color: fg }, isSelected && styles.labelSelected]} maxFontSizeMultiplier={1.2}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 2 },
  bar: { width: '100%', maxWidth: 440 },
  row: { flexDirection: 'row', minHeight: NAV_HEIGHT - 2, padding: INSET },
  capsule: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: 0,
    borderRadius: 28,
    // 選択の縁は全モードで不透明（ガラスの下限と白の両方に3:1以上。D-M2）
    borderWidth: 1.5,
    borderColor: colors.primaryDeep,
  },
  capsuleFallback: { borderWidth: 1.5, borderColor: colors.primaryDeep },
  tab: {
    flex: 1,
    minHeight: NAV_HEIGHT - 2 - INSET * 2,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 28,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  label: { ...fontBase, fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  labelSelected: { fontWeight: '800' },
});
