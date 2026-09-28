import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GUIDE_ENTRIES } from '../../domain';
import { a11yState } from '../a11y';
import { SourceLinks } from '../ComparisonView';
import { Banner, Card } from '../components';
import { colors, space, type } from '../theme';

export function GuideScreen() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <View>
      <Banner tone="info" title="項目ガイドについて">
        明細によく出る項目の一般的な説明です。金額や時期は勤務先・加入先・自治体・個人の条件で異なります。出典の確認日も合わせてご覧ください。
      </Banner>
      {GUIDE_ENTRIES.map((entry) => {
        const key = `${entry.code}-${entry.title}`;
        const expanded = open === key;
        return (
          <Card key={key} style={{ paddingVertical: space.sm }}>
            <Pressable
              onPress={() => setOpen(expanded ? null : key)}
              accessibilityRole="button"
              {...a11yState({ expanded })}
              accessibilityLabel={`${entry.title}の説明を${expanded ? '閉じる' : '開く'}`}
              style={styles.head}
            >
              <Text style={[type.heading, { flex: 1 }]}>{entry.title}</Text>
              <Text style={styles.chevron}>{expanded ? '−' : '+'}</Text>
            </Pressable>
            {expanded ? (
              <View style={{ paddingBottom: space.sm }}>
                <Text style={type.body}>{entry.description}</Text>
                {entry.sources.length === 0
                  ? <Text style={[type.caption, { marginTop: space.sm }]}>出典を準備中のため、一般的な説明のみです。</Text>
                  : <SourceLinks sources={entry.sources} />}
              </View>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  chevron: { fontSize: 22, color: colors.primary, width: 28, textAlign: 'center' },
});
