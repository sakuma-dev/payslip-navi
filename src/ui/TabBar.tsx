import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from './icons';
import { useInsets } from './insets';
import { NAV_GAP, NAV_HEIGHT } from './layout';
import { useSlidingIndicator } from './motion';
import { colors, focusRingOnDark, fontBase, shadow } from './theme';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon: IconName;
}

const INSET = 4;

// 画面下に浮かぶ濃紺のピル型ナビ。ラベルは常に表示し、選択中は白いカプセルが移動する（M2）。
export function TabBar<K extends string>({ tabs, selected, onSelect, disabled }: {
  tabs: TabItem<K>[];
  selected: K;
  onSelect: (key: K) => void;
  disabled?: boolean;
}) {
  const insets = useInsets();
  const selectedIndex = Math.max(0, tabs.findIndex((t) => t.key === selected));
  const indicator = useSlidingIndicator(selectedIndex);

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom: insets.bottom + NAV_GAP }]}>
      <View style={[styles.bar, shadow.nav]} accessibilityRole="tablist">
        {indicator.ready ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.capsule, { width: indicator.width, transform: [{ translateX: indicator.translateX }] }]}
          />
        ) : null}
        {tabs.map((tab, index) => {
          const isSelected = index === selectedIndex;
          const fg = isSelected ? colors.primaryDeep : colors.navInactive;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onSelect(tab.key)}
              onLayout={indicator.onItemLayout(index)}
              disabled={disabled}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isSelected, disabled: !!disabled }}
              style={(state) => [
                styles.tab,
                // 位置を測る前だけ、選択中のタブ自身に白い地を付ける
                isSelected && !indicator.ready && styles.capsuleFallback,
                disabled && { opacity: 0.5 },
                (state as { focused?: boolean }).focused && focusRingOnDark,
              ]}
            >
              <Icon name={tab.icon} size={22} color={fg} />
              {/* 省略記号にしない。幅が足りない時（320px・文字拡大）は2行に折り返す */}
              <Text style={[styles.label, { color: fg }, isSelected && styles.labelSelected]} maxFontSizeMultiplier={1.2}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 440,
    minHeight: NAV_HEIGHT,
    padding: INSET,
    borderRadius: 32,
    backgroundColor: colors.navInk,
  },
  capsule: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: 0,
    borderRadius: 28,
    backgroundColor: colors.surface,
  },
  capsuleFallback: { backgroundColor: colors.surface },
  tab: {
    flex: 1,
    minHeight: NAV_HEIGHT - INSET * 2,
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
