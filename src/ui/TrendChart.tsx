import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Payslip } from '../domain';
import { buildTrend, formatYen } from '../domain';
import { layoutBars } from './chartScale';
import { Divider, IconButton, Row, ToggleChevron } from './components';
import { monthLabel, yenSpeech } from './format';
import { EnterView } from './layout';
import { duration } from './motion';
import { colors, focusRing, fontBase, radius, space, TOUCH, type } from './theme';

const BAR_AREA = 144;

export function TrendChart({ records, initialYear, highlightMonth }: {
  records: Payslip[];
  initialYear: number;
  // 濃い色で示す月（ホームでは最新の明細の月）
  highlightMonth?: string;
}) {
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

  const highlighted = trend.find((p) => p.month === highlightMonth && p.netPay !== null) ?? null;
  const index = years.indexOf(year);

  return (
    <View>
      <View style={styles.header}>
        <IconButton
          icon="chevronLeft"
          size={36}
          accessibilityLabel="前の年"
          disabled={index <= 0}
          onPress={() => setYear(years[index - 1] ?? year)}
        />
        <Text style={[type.headline, styles.year]}>{year}年</Text>
        <IconButton
          icon="chevronRight"
          size={36}
          accessibilityLabel="次の年"
          disabled={index >= years.length - 1}
          onPress={() => setYear(years[index + 1] ?? year)}
        />
        <Text style={[type.caption, styles.count]}>登録{registered}か月</Text>
      </View>

      {/* 年の切替では新しい年の内容だけをフェードする。棒の高さ・位置は動かさない（M7）。 */}
      {/* 表示中の月は濃い棒と太字の月で示す。金額はステージと数値一覧にあるので、ここでは繰り返さない。 */}
      <EnterView key={year} opacity={0.4} duration={duration.release}>
        <View style={styles.chart} accessible accessibilityRole="image" accessibilityLabel={summary}>
          {/* 0円の基準線。負の値がある年は途中に、無い年は下端に来る。 */}
          <View style={[styles.baseline, { top: layout.baseline }]} />
          {trend.map((point, i) => {
            const m = Number(point.month.slice(5, 7));
            const bar = layout.bars[i];
            const strong = point.month === highlighted?.month;
            return (
              <View key={point.month} style={styles.column}>
                <View style={styles.barArea}>
                  {bar?.kind === 'positive' ? (
                    <View style={[styles.bar, styles.barPositive, strong && styles.barStrong, { top: bar.top, height: bar.height }]} />
                  ) : null}
                  {bar?.kind === 'negative' ? (
                    <View style={[styles.bar, styles.barNegative, strong && { borderColor: colors.barStrong }, { top: bar.top, height: bar.height }]} />
                  ) : null}
                  {bar?.kind === 'zero' ? (
                    <View style={[styles.zeroMark, { top: Math.min(Math.max(layout.baseline - 4, 0), BAR_AREA - 8) }]} />
                  ) : null}
                  {bar?.kind === 'missing' ? (
                    <Text style={[styles.missingMark, { top: Math.min(Math.max(layout.baseline - 18, 0), BAR_AREA - 16) }]}>–</Text>
                  ) : null}
                </View>
                <Text style={[styles.monthText, strong && styles.monthTextStrong]}>{m}</Text>
              </View>
            );
          })}
        </View>
      </EnterView>

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.swatch, styles.barPositive]} /><Text style={type.caption}>手取り（塗り）</Text></View>
        {highlighted ? (
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.barStrong]} />
            <Text style={type.caption}>表示中の月（濃い塗り・{Number(highlighted.month.slice(5, 7))}月）</Text>
          </View>
        ) : null}
        {hasNegative ? (
          <View style={styles.legendItem}><View style={[styles.swatch, styles.barNegative]} /><Text style={type.caption}>マイナス（枠のみ・線より下）</Text></View>
        ) : null}
        <View style={styles.legendItem}><View style={[styles.swatch, styles.zeroSwatch]} /><Text style={type.caption}>0円（線上の印）</Text></View>
        <View style={styles.legendItem}><Text style={styles.legendDash}>–</Text><Text style={type.caption}>未登録</Text></View>
      </View>

      <Pressable
        onPress={() => setShowTable((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showTable }}
        style={(state) => [styles.toggle, (state as { focused?: boolean }).focused && focusRing]}
      >
        <Text style={styles.toggleText}>{showTable ? '数値一覧を閉じる' : '数値一覧で見る'}</Text>
        <ToggleChevron open={showTable} size={18} />
      </Pressable>
      {showTable ? (
        <EnterView translateY={-4} duration={duration.fast}>
          {trend.map((p, i) => (
            <View key={p.month}>
              {i > 0 ? <Divider /> : null}
              <Row label={monthLabel(p.month)}>
                {p.netPay === null
                  ? <Text style={type.bodyMuted}>未登録</Text>
                  : <Text style={type.moneyM} accessibilityLabel={yenSpeech(p.netPay)}>{formatYen(p.netPay)}</Text>}
              </Row>
            </View>
          ))}
        </EnterView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xxs, marginLeft: -space.xs, marginBottom: space.sm },
  year: { minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] },
  count: { marginLeft: 'auto' },
  chart: { flexDirection: 'row', alignItems: 'flex-start', height: BAR_AREA + 22, gap: 4 },
  // 0円の基準線は意味を持つ図形なので3:1以上の色
  baseline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.inkMuted },
  column: { flex: 1, alignItems: 'center' },
  barArea: { height: BAR_AREA, width: '100%' },
  bar: { position: 'absolute', left: '18%', width: '64%' },
  barPositive: { backgroundColor: colors.barMuted, borderTopLeftRadius: radius.xs, borderTopRightRadius: radius.xs },
  barStrong: { backgroundColor: colors.barStrong },
  // 負の値は色に加えて「枠だけ」の形でも区別する。
  barNegative: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.down,
    borderStyle: 'dashed',
    borderBottomLeftRadius: radius.xs,
    borderBottomRightRadius: radius.xs,
  },
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
  missingMark: { ...fontBase, position: 'absolute', width: '100%', textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.inkMuted },
  monthText: { ...fontBase, fontSize: 11, lineHeight: 14, color: colors.inkSubtle, marginTop: 4, fontVariant: ['tabular-nums'] },
  monthTextStrong: { color: colors.ink, fontWeight: '800' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs, marginTop: space.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  zeroSwatch: { height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.surface },
  legendDash: { ...fontBase, fontSize: 13, fontWeight: '700', color: colors.inkMuted, width: 12, textAlign: 'center' },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    minHeight: TOUCH,
    marginTop: space.xs,
    borderRadius: radius.sm,
  },
  toggleText: { ...fontBase, color: colors.primary, fontWeight: '700', fontSize: 14 },
});
