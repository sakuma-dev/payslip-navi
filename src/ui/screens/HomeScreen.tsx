import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Payslip } from '../../domain';
import { comparePayslips, formatYen } from '../../domain';
import { SourceLinks, DifferenceSummary } from '../ComparisonView';
import { Button, Card, Divider, EmptyState, Money, Row, SectionTitle } from '../components';
import { monthLabel, monthYear, shiftMonth, yenSpeech } from '../format';
import { TrendChart } from '../TrendChart';
import { colors, space, type } from '../theme';

export function HomeScreen({ records, onAdd, onOpen, demo }: {
  records: Payslip[];
  onAdd: () => void;
  onOpen: (id: string) => void;
  demo: boolean;
}) {
  const latest = records[0] ?? null;
  const comparison = useMemo(() => (latest ? comparePayslips(latest, records) : null), [latest, records]);

  if (!latest || !comparison) {
    return (
      <EmptyState
        title="まだ明細がありません"
        body="写真・テキスト・手入力から、1か月分の明細を登録できます。数字はあなたが確認してから保存します。"
        action={<Button label="明細を追加する" onPress={onAdd} />}
      />
    );
  }

  const year = monthYear(latest.month) ?? new Date().getFullYear();

  return (
    <View>
      <Card style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroMonth}>{monthLabel(latest.month)}の手取り</Text>
          {demo ? <Text style={styles.demoTag}>架空データ</Text> : null}
        </View>
        <Text style={[type.display, { color: colors.onPrimary }]} accessibilityLabel={`手取り ${yenSpeech(latest.netPay)}`}>
          {formatYen(latest.netPay)}
        </Text>
        <View style={styles.heroTotals}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>総支給</Text>
            <Money value={latest.grossPay} style={styles.heroValue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>控除合計</Text>
            <Money value={latest.totalDeductions} style={styles.heroValue} />
          </View>
        </View>
        <Button label="この明細を詳しく見る" variant="secondary" compact onPress={() => onOpen(latest.id)} style={{ marginTop: space.md }} />
      </Card>

      <SectionTitle note="明細の数字から計算した差（事実）">前と比べて</SectionTitle>
      <Card>
        <DifferenceSummary title="前月との差" targetMonth={shiftMonth(latest.month, -1)} difference={comparison.monthDifference} />
        <Divider />
        <DifferenceSummary title="前年同月との差" targetMonth={shiftMonth(latest.month, -12)} difference={comparison.yearDifference} compact />
      </Card>

      {comparison.insights.length > 0 ? (
        <>
          <SectionTitle note="一般的な可能性で、断定ではありません">確認ポイント</SectionTitle>
          {comparison.insights.slice(0, 3).map((insight, i) => (
            <Card key={`${insight.title}-${i}`} tone="soft">
              <Text style={[type.heading, { fontSize: 15 }]}>{insight.title}</Text>
              <Text style={[type.body, { marginTop: space.xs }]}>{insight.body}</Text>
              <SourceLinks sources={insight.sources} />
            </Card>
          ))}
        </>
      ) : null}

      <SectionTitle note="棒が無い月は未登録です">手取りの推移</SectionTitle>
      <Card>
        <TrendChart key={year} records={records} initialYear={year} />
      </Card>

      <SectionTitle>最近の明細</SectionTitle>
      <Card>
        {records.slice(0, 3).map((r, i) => (
          <View key={r.id}>
            {i > 0 ? <Divider /> : null}
            <Row label={monthLabel(r.month)} sub="手取り" onPress={() => onOpen(r.id)}>
              <Money value={r.netPay} />
            </Row>
          </View>
        ))}
      </Card>

      <Button label="明細を追加する" onPress={onAdd} style={{ marginTop: space.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, borderColor: colors.primary, padding: space.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  heroMonth: { color: '#D5E8E4', fontSize: 15, fontWeight: '600' },
  demoTag: { color: colors.onPrimary, fontSize: 12, fontWeight: '700', borderWidth: 1, borderColor: '#D5E8E4', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  heroTotals: { flexDirection: 'row', marginTop: space.lg, gap: space.lg },
  heroLabel: { color: '#BFDAD5', fontSize: 13, fontWeight: '600' },
  heroValue: { color: colors.onPrimary, fontSize: 18 },
});
