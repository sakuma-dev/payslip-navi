import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Comparison, Difference, Payslip, Source } from '../domain';
import { Badge, Card, Delta, Divider, Row, SectionTitle } from './components';
import { CATEGORY_SHORT, monthLabel, shiftMonth } from './format';
import { colors, space, type } from './theme';

export function DifferenceSummary({ title, targetMonth, difference, compact }: {
  title: string;
  targetMonth: string | null;
  difference: Difference | null;
  compact?: boolean;
}) {
  if (!difference) {
    return (
      <View style={styles.block}>
        <Text style={type.label}>{title}</Text>
        <Text style={[type.bodyMuted, { marginTop: 2 }]}>
          {targetMonth ? `${monthLabel(targetMonth)}のデータなし` : 'データなし'}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.block}>
      <Text style={type.label}>{title}{targetMonth ? `（${monthLabel(targetMonth)}）` : ''}</Text>
      <Row label="手取り"><Delta value={difference.netPay} /></Row>
      {!compact ? (
        <>
          <Row label="総支給"><Delta value={difference.grossPay} /></Row>
          <Row label="控除合計"><Delta value={difference.totalDeductions} /></Row>
        </>
      ) : null}
    </View>
  );
}

function ItemChanges({ difference }: { difference: Difference }) {
  const items = difference.items;
  if (items.length === 0) {
    return <Text style={type.bodyMuted}>項目ごとの金額に変化はありません。</Text>;
  }
  return (
    <View>
      {items.map((item, index) => (
        <View key={`${item.category}-${item.label}-${index}`}>
          {index > 0 ? <Divider /> : null}
          <Row label={item.label} sub={CATEGORY_SHORT[item.category]}>
            {/* amount は常に「当月 − 比較月」の符号付き差額（added/removed も同じ規約） */}
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              {item.change === 'added' ? <Badge label="今月のみ" tone="primary" /> : null}
              {item.change === 'removed' ? <Badge label="比較月のみ" tone="neutral" /> : null}
              <Delta value={item.amount} />
            </View>
          </Row>
        </View>
      ))}
    </View>
  );
}

export function SourceLinks({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <View style={{ marginTop: space.sm, gap: space.xs }}>
      {sources.map((s) => (
        <Pressable
          key={s.url}
          onPress={() => Linking.openURL(s.url).catch(() => undefined)}
          accessibilityRole="link"
          accessibilityLabel={`出典 ${s.title}、確認日 ${s.checkedAt}、ブラウザで開く`}
          hitSlop={6}
        >
          <Text style={styles.source}>出典: {s.title}</Text>
          <Text style={type.caption}>確認日 {s.checkedAt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ComparisonDetail({ record, comparison }: { record: Payslip; comparison: Comparison }) {
  const prevMonth = shiftMonth(record.month, -1);
  const prevYear = shiftMonth(record.month, -12);
  return (
    <View>
      <SectionTitle note="保存した明細の数字から計算した差です。">比べてわかること（事実）</SectionTitle>
      <Card>
        <DifferenceSummary title="前月との差" targetMonth={prevMonth} difference={comparison.monthDifference} />
        <Divider />
        <DifferenceSummary title="前年同月との差" targetMonth={prevYear} difference={comparison.yearDifference} />
      </Card>
      {comparison.monthDifference ? (
        <Card>
          <Text style={[type.label, { marginBottom: space.xs }]}>前月から変わった項目</Text>
          <ItemChanges difference={comparison.monthDifference} />
        </Card>
      ) : null}

      {comparison.insights.length > 0 ? (
        <>
          <SectionTitle note="一般的な可能性です。勤務先の控除時期や個人の条件で異なります。">
            考えられる理由（可能性）
          </SectionTitle>
          {comparison.insights.map((insight, i) => (
            <Card key={`${insight.title}-${i}`} tone="soft">
              <Text style={[type.heading, { fontSize: 15 }]}>{insight.title}</Text>
              <Text style={[type.body, { marginTop: space.xs }]}>{insight.body}</Text>
              <SourceLinks sources={insight.sources} />
            </Card>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingVertical: space.xs },
  source: { color: colors.primary, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
