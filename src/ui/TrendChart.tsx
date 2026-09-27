import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Payslip } from '../domain';
import { buildTrend, formatYen } from '../domain';
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
  const max = Math.max(1, ...values.map((v) => Math.max(0, v)));
  const registered = values.length;
  const summary = registered === 0
    ? `${year}年の手取りは登録がありません。`
    : `${year}年の手取り推移。登録${registered}か月。` + trend
      .map((p) => `${Number(p.month.slice(5, 7))}月 ${p.netPay === null ? 'データなし' : yenSpeech(p.netPay)}`)
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
        {trend.map((point) => {
          const m = Number(point.month.slice(5, 7));
          const value = point.netPay;
          const h = value === null ? 0 : Math.max(3, Math.round((Math.max(0, value) / max) * BAR_AREA));
          return (
            <View key={point.month} style={styles.column}>
              <View style={styles.barArea}>
                {value === null ? (
                  <View style={styles.missing} />
                ) : (
                  <View style={[styles.bar, { height: h }, value < 0 && { backgroundColor: colors.down }]} />
                )}
              </View>
              <Text style={styles.monthText}>{m}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, { backgroundColor: colors.bar }]} /><Text style={type.caption}>手取り</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.missingSwatch]} /><Text style={type.caption}>データなし</Text></View>
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
                  ? <Text style={type.bodyMuted}>データなし</Text>
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
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: BAR_AREA + 22, gap: 4 },
  column: { flex: 1, alignItems: 'center' },
  barArea: { height: BAR_AREA, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '72%', backgroundColor: colors.bar, borderTopLeftRadius: radius.sm / 2, borderTopRightRadius: radius.sm / 2 },
  missing: { width: '72%', height: 3, borderRadius: 2, backgroundColor: colors.line },
  monthText: { fontSize: 11, color: colors.inkMuted, marginTop: 4, fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', gap: space.lg, marginTop: space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  missingSwatch: { backgroundColor: colors.line, height: 3 },
  toggle: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});
