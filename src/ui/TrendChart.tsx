import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Payslip } from '../domain';
import { buildTrend, formatYen } from '../domain';
import { layoutBars } from './chartScale';
import { Divider, Row } from './components';
import { monthLabel, yenSpeech } from './format';
import { colors, radius, space, type } from './theme';

const BAR_AREA = 132;

export function TrendChart({ records, initialYear }: { records: Payslip[]; initialYear: number }) {
  const years = useMemo(() => {
    const set = new Set(records.map((r) => Number(r.month.slice(0, 4))).filter((y) => Number.isFinite(y)));
    set.add(initialYear);
    return [...set].sort((a, b) => a - b);
  }, [records, initialYear]);
  const [year, setYear] = useState(initialYear);
  const [showTable, setShowTable] = useState(false);
  const trend = useMemo(() => buildTrend(records, year), [records, year]);

  const values = trend.map((p) => p.netPay).filter((v): v is number => v !== null);
  const layout = layoutBars(trend.map((p) => p.netPay), BAR_AREA);
  const hasNegative = values.some((v) => v < 0);
  const registered = values.length;
  const summary = registered === 0
    ? `${year}年の手取りは登録がありません。`
    : `${year}年の手取り推移。登録${registered}か月。` + trend
      .map((p) => `${Number(p.month.slice(5, 7))}月 ${p.netPay === null ? '未登録' : yenSpeech(p.netPay)}`)
      .join('、');

  const index = years.indexOf(year);

  return (
    <View>
      <View style={styles.yearRow}>
        <Pressable
          disabled={index <= 0}
          onPress={() => setYear(years[index - 1] ?? year)}
          accessibilityRole="button"
          accessibilityLabel="前の年"
          hitSlop={10}
          style={[styles.yearButton, index <= 0 && { opacity: 0.3 }]}
        >
          <Text style={styles.yearArrow}>‹</Text>
        </Pressable>
        <Text style={type.heading}>{year}年</Text>
        <Pressable
          disabled={index >= years.length - 1}
          onPress={() => setYear(years[index + 1] ?? year)}
          accessibilityRole="button"
          accessibilityLabel="次の年"
          hitSlop={10}
          style={[styles.yearButton, index >= years.length - 1 && { opacity: 0.3 }]}
        >
          <Text style={styles.yearArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.chart} accessible accessibilityRole="image" accessibilityLabel={summary}>
        {/* 0円の基準線。負の値がある年は途中に、無い年は下端に来る。 */}
        <View style={[styles.baseline, { top: layout.baseline }]} />
        {trend.map((point, i) => {
          const m = Number(point.month.slice(5, 7));
          const bar = layout.bars[i];
          return (
            <View key={point.month} style={styles.column}>
              <View style={styles.barArea}>
                {bar?.kind === 'positive' ? (
                  <View style={[styles.bar, styles.barPositive, { top: bar.top, height: bar.height }]} />
                ) : null}
                {bar?.kind === 'negative' ? (
                  <View style={[styles.bar, styles.barNegative, { top: bar.top, height: bar.height }]} />
                ) : null}
                {bar?.kind === 'zero' ? (
                  <View style={[styles.zeroMark, { top: Math.min(Math.max(layout.baseline - 4, 0), BAR_AREA - 8) }]} />
                ) : null}
                {bar?.kind === 'missing' ? (
                  <Text style={[styles.missingMark, { top: Math.min(Math.max(layout.baseline - 18, 0), BAR_AREA - 16) }]}>–</Text>
                ) : null}
              </View>
              <Text style={styles.monthText}>{m}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.barPositive]} /><Text style={type.caption}>手取り（塗り）</Text></View>
        {hasNegative ? (
          <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.barNegative]} /><Text style={type.caption}>マイナス（枠のみ・線より下）</Text></View>
        ) : null}
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.zeroSwatch]} /><Text style={type.caption}>0円（線上の印）</Text></View>
        <View style={styles.legendItem}><Text style={styles.legendDash}>–</Text><Text style={type.caption}>未登録</Text></View>
      </View>

      <Pressable
        onPress={() => setShowTable((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showTable }}
        style={{ paddingVertical: space.sm }}
      >
        <Text style={styles.toggle}>{showTable ? '数値一覧を閉じる' : '数値一覧で見る'}</Text>
      </Pressable>
      {showTable ? (
        <View>
          {trend.map((p, i) => (
            <View key={p.month}>
              {i > 0 ? <Divider /> : null}
              <Row label={monthLabel(p.month)}>
                {p.netPay === null
                  ? <Text style={type.bodyMuted}>未登録</Text>
                  : <Text style={type.money} accessibilityLabel={yenSpeech(p.netPay)}>{formatYen(p.netPay)}</Text>}
              </Row>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  yearButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  yearArrow: { fontSize: 26, color: colors.primary, fontWeight: '600' },
  chart: { flexDirection: 'row', alignItems: 'flex-start', height: BAR_AREA + 22, gap: 4 },
  baseline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.inkFaint },
  column: { flex: 1, alignItems: 'center' },
  barArea: { height: BAR_AREA, width: '100%' },
  bar: { position: 'absolute', left: '14%', width: '72%', borderRadius: radius.sm / 2 },
  barPositive: { backgroundColor: colors.bar },
  // 負の値は色に加えて「枠だけ」の形でも区別する。
  barNegative: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.down, borderStyle: 'dashed' },
  zeroMark: {
    position: 'absolute',
    left: '30%',
    width: '40%',
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  missingMark: { position: 'absolute', width: '100%', textAlign: 'center', fontSize: 13, color: colors.inkFaint },
  monthText: { fontSize: 11, color: colors.inkMuted, marginTop: 4, fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs, marginTop: space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  zeroSwatch: { height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.surface },
  legendDash: { fontSize: 13, color: colors.inkFaint, width: 12, textAlign: 'center' },
  toggle: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});
