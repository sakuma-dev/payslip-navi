import React, { useState } from 'react';
import { Pressable, PressableStateCallbackType, StyleSheet, Text, View } from 'react-native';
import type { GuideEntry, ItemCode } from '../../domain';
import { GUIDE_ENTRIES } from '../../domain';
import { a11yState } from '../a11y';
import { SourceLinks } from '../ComparisonView';
import { Banner, Card, Divider, SectionTitle, ToggleChevron } from '../components';
import { CODES_BY_CATEGORY } from '../format';
import { EnterView } from '../layout';
import { duration } from '../motion';
import { categoryColor, colors, focusRing, radius, space, TOUCH, type } from '../theme';

// 区分ごとのカードに、項目のアコーディオンを並べる。区分は CODES_BY_CATEGORY から決め、どちらにも無い項目は「その他」（中立の点）。
const EARNING_CODES: ItemCode[] = CODES_BY_CATEGORY.earning.filter((c) => c !== 'other');
const DEDUCTION_CODES: ItemCode[] = CODES_BY_CATEGORY.deduction.filter((c) => c !== 'other');
const SECTIONS: { key: string; title: string; color: string; match: (code: ItemCode) => boolean }[] = [
  { key: 'earning', title: '支給の項目', color: categoryColor.earning, match: (c) => EARNING_CODES.includes(c) },
  { key: 'deduction', title: '控除の項目', color: categoryColor.deduction, match: (c) => DEDUCTION_CODES.includes(c) },
  { key: 'other', title: 'その他', color: colors.inkMuted, match: (c) => !EARNING_CODES.includes(c) && !DEDUCTION_CODES.includes(c) },
];

const entryKey = (entry: GuideEntry) => `${entry.code}-${entry.title}`;

export function GuideScreen() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View>
      <Text style={[type.bodyMuted, { marginBottom: space.md }]}>明細によく出る項目の一般的な説明です。</Text>
      <Banner tone="info">
        金額や時期は勤務先・加入先・自治体・個人の条件で異なります。出典の確認日も合わせてご覧ください。
      </Banner>
      {SECTIONS.map((section) => {
        const entries = GUIDE_ENTRIES.filter((entry) => section.match(entry.code));
        if (entries.length === 0) return null;
        return (
          <View key={section.key}>
            <SectionTitle>{section.title}</SectionTitle>
            <Card dense style={{ paddingVertical: space.xs }}>
              {entries.map((entry, i) => {
                const key = entryKey(entry);
                return (
                  <View key={key}>
                    {i > 0 ? <Divider inset={44} /> : null}
                    <GuideItem
                      entry={entry}
                      color={section.color}
                      expanded={open === key}
                      onToggle={() => setOpen(open === key ? null : key)}
                    />
                  </View>
                );
              })}
            </Card>
          </View>
        );
      })}
    </View>
  );
}

function GuideItem({ entry, color, expanded, onToggle }: {
  entry: GuideEntry;
  color: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        {...a11yState({ expanded })}
        accessibilityLabel={`${entry.title}の説明を${expanded ? '閉じる' : '開く'}`}
        style={(state) => [styles.head, (state as PressableStateCallbackType & { focused?: boolean }).focused && focusRing]}
      >
        <View style={styles.mark}>
          <View style={[styles.dot, { backgroundColor: color }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.headline}>{entry.title}</Text>
          <Text style={type.caption}>{entry.sources.length > 0 ? `出典 ${entry.sources.length}件` : '一般的な説明'}</Text>
        </View>
        <ToggleChevron open={expanded} />
      </Pressable>
      {expanded ? (
        <EnterView translateY={-4} duration={duration.fast} style={styles.body}>
          <Text style={type.body}>{entry.description}</Text>
          {entry.sources.length === 0
            ? <Text style={[type.caption, { marginTop: space.sm }]}>出典を準備中のため、一般的な説明のみです。</Text>
            : <SourceLinks sources={entry.sources} />}
        </EnterView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: TOUCH + 12, paddingVertical: space.sm, borderRadius: radius.md },
  mark: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  body: { paddingLeft: 44, paddingBottom: space.md },
});
