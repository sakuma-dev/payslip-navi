import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Payslip } from '../../domain';
import { comparePayslips, formatYen } from '../../domain';
import { isNativeOcrAvailable } from '../../services';
import { ComparisonCard, InsightCard } from '../ComparisonView';
import { Button, Card, DeltaChip, Divider, MonthBadge, Row, SectionTitle, SplitBar, StatTiles, YenText } from '../components';
import { changeWord, monthLabel, monthYear, shiftMonth, signedSpeech, signedYen, yenSpeech } from '../format';
import { Icon } from '../icons';
import { EnterView, Screen, useLayoutMetrics } from '../layout';
import { stagger } from '../motion';
import { Stage, STAGE_OVERLAP } from '../Stage';
import { TrendChart } from '../TrendChart';
import { colors, fontBase, radius, shadow, space, type } from '../theme';
import { deltaEmphasis, displayStep, splitBarModel } from '../visual';

export function HomeScreen({ records, onAdd, onOpen, demo }: {
  records: Payslip[];
  onAdd: () => void;
  onOpen: (id: string) => void;
  demo: boolean;
}) {
  const metrics = useLayoutMetrics();
  const latest = records[0] ?? null;
  const comparison = useMemo(() => (latest ? comparePayslips(latest, records) : null), [latest, records]);
  // 最近の明細の前月比も、暦の上でちょうど1か月前の明細とだけ比べる（一覧の隣の行とは比べない）。
  const recent = useMemo(
    () => records.slice(0, 3).map((r) => ({ record: r, diff: comparePayslips(r, records).monthDifference?.netPay ?? null })),
    [records],
  );

  const wide = metrics.sizeClass === 'wide';
  const wrap = (stage: React.ReactNode, rest: React.ReactNode) => (wide
    ? <Screen>{stage}{rest}</Screen>
    : <View>{stage}<Screen>{rest}</Screen></View>);

  if (!latest || !comparison) {
    return wrap(
      <Stage variant={wide ? 'card' : 'bleed'}>
        <StageTopRow />
        <View style={styles.emptyMark}>
          <Icon name="document" size={32} color={colors.onPrimary} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle} accessibilityRole="header">まだ明細がありません</Text>
        <Text style={styles.stageBody}>
          写真・テキスト・手入力から、1か月分の明細を登録できます。数字はあなたが確認してから保存します。
        </Text>
        <Button label="明細を追加する" variant="inverse" icon="plus" onPress={onAdd} style={{ marginTop: space.xl }} />
      </Stage>,
      <Card style={{ marginTop: space.xl }} title="追加できる方法">
        <MethodLine text={isNativeOcrAvailable ? '紙の明細を撮影、または保存した写真から読み取る' : '撮影・写真からの読み取り（開発ビルドで利用できます）'} />
        <MethodLine text="Web明細などからコピーしたテキストを貼り付ける" />
        <MethodLine text="支払月と金額を自分で入力する" />
        <Text style={[type.caption, { marginTop: space.sm }]}>どの方法でも、保存前に数字を一つずつ確認する画面へ進みます。</Text>
      </Card>,
    );
  }

  const year = monthYear(latest.month) ?? new Date().getFullYear();
  const prevMonth = shiftMonth(latest.month, -1);
  const prevYear = shiftMonth(latest.month, -12);
  const monthDiff = comparison.monthDifference;
  const yearDiff = comparison.yearDifference;

  const stageInner = wide ? metrics.contentWidth - 40 : metrics.contentWidth;
  const displaySize = displayStep(formatYen(latest.netPay), stageInner, metrics.fontScale);
  const sheetInset = wide ? space.md : 0;
  const sheetInner = metrics.contentWidth - sheetInset * 2 - metrics.sheetPadding * 2;
  const split = splitBarModel(latest);

  return wrap(
    <Stage variant={wide ? 'card' : 'bleed'} overlap>
      <StageTopRow onAdd={onAdd} />
      <View style={styles.monthRow}>
        <Text style={styles.stageLabel}>{monthLabel(latest.month)}の手取り</Text>
        {demo ? <Text style={styles.demoTag}>架空データ</Text> : null}
      </View>
      <YenText
        value={latest.netPay}
        size={displaySize}
        color={colors.onPrimary}
        maxScale={1.3}
        accessibilityLabel={`手取り ${yenSpeech(latest.netPay)}`}
      />
      <View style={styles.deltaRow}>
        {/* 比較先は見える文字として読ませる（チップ側では繰り返さない） */}
        {monthDiff ? (
          <>
            <DeltaChip value={monthDiff.netPay} emphasis={deltaEmphasis('netPay')} onStage />
            <Text style={styles.stageCaption}>前月{prevMonth ? `（${monthLabel(prevMonth)}）` : ''}比</Text>
          </>
        ) : (
          <View style={styles.noDataChip}>
            <Text style={[type.caption, { color: colors.neutralDelta, fontWeight: '600' }]}>
              前月{prevMonth ? `（${monthLabel(prevMonth)}）` : ''}のデータなし
            </Text>
          </View>
        )}
      </View>
      {/* 前年同月はデータがある時だけ。無い時は比較カードの「前年同月」で「データなし」と示す。 */}
      {yearDiff ? (
        <Text style={[styles.stageCaption, { marginTop: space.sm }]}>
          前年同月{prevYear ? `（${monthLabel(prevYear)}）` : ''}比 {signedYen(yearDiff.netPay)} {changeWord(yearDiff.netPay)}
        </Text>
      ) : null}
    </Stage>,
    <>
      {/* 内訳シート（主な情報なので入場の動きを付けない）。値は各1回: 総支給は見出し、手取り・控除合計は帯の凡例を兼ねるタイル。 */}
      <View style={[styles.sheet, shadow.sheet, { padding: metrics.sheetPadding, marginHorizontal: sheetInset }]}>
        <View style={styles.sheetHead}>
          <Text style={type.headline} accessibilityRole="header">内訳</Text>
          {split.visible ? (
            <Text style={[type.caption, styles.grossNote]}>
              総支給（帯の全体） <Text style={styles.grossValue}>{formatYen(latest.grossPay)}</Text>
            </Text>
          ) : null}
        </View>
        {split.visible
          ? <SplitBar model={split} />
          : <Text style={type.caption}>この明細の内訳は金額で確認できます。</Text>}
        <View style={{ marginTop: space.md }}>
          <StatTiles
            width={sheetInner}
            spacing={metrics.tile}
            items={split.visible
              ? [
                { label: '手取り', value: latest.netPay, color: colors.primary, marker: 'legend' },
                { label: '控除合計', value: latest.totalDeductions, color: colors.catDeduction, marker: 'legend' },
              ]
              : [
                { label: '総支給', value: latest.grossPay, color: colors.catEarning },
                { label: '控除合計', value: latest.totalDeductions, color: colors.catDeduction },
              ]}
          />
        </View>
        <View style={{ marginTop: space.xs }}>
          <Row label="この明細を詳しく見る" onPress={() => onOpen(latest.id)} accessibilityLabel="この明細を詳しく見る" />
        </View>
      </View>

      <EnterView translateY={12} delay={0}>
        <SectionTitle>手取りの推移</SectionTitle>
        <Card>
          <TrendChart key={year} records={records} initialYear={year} highlightMonth={latest.month} />
        </Card>
      </EnterView>

      <EnterView translateY={12} delay={stagger}>
        <SectionTitle note="明細の数字から計算した差（事実）">前と比べて</SectionTitle>
        <ComparisonCard record={latest} comparison={comparison} limit={3} onSeeAll={() => onOpen(latest.id)} />
      </EnterView>

      {comparison.insights.length > 0 ? (
        <EnterView translateY={12} delay={stagger * 2}>
          <SectionTitle note="一般的な可能性で、断定ではありません">確認ポイント</SectionTitle>
          {comparison.insights.slice(0, 2).map((insight, i) => <InsightCard key={`${insight.title}-${i}`} insight={insight} />)}
          {comparison.insights.length > 2 ? (
            <Text style={type.caption}>ほか{comparison.insights.length - 2}件は明細の詳細で確認できます。</Text>
          ) : null}
        </EnterView>
      ) : null}

      <EnterView translateY={12} delay={stagger * 3}>
        <SectionTitle>最近の明細</SectionTitle>
        <Card dense>
          {recent.map(({ record, diff }, i) => (
            <View key={record.id}>
              {i > 0 ? <Divider inset={56} /> : null}
              <Row
                label={monthLabel(record.month)}
                sub="手取り"
                leading={<MonthBadge month={record.month} />}
                onPress={() => onOpen(record.id)}
                accessibilityLabel={`${monthLabel(record.month)}、手取り${yenSpeech(record.netPay)}、${diff === null ? '前月データなし' : `前月比${signedSpeech(diff)}`}`}
              >
                <Text style={type.moneyM} maxFontSizeMultiplier={1.6}>{formatYen(record.netPay)}</Text>
                {diff === null
                  ? <Text style={type.caption}>前月データなし</Text>
                  : <DeltaChip value={diff} emphasis={deltaEmphasis('netPay')} />}
              </Row>
            </View>
          ))}
        </Card>
      </EnterView>
    </>,
  );
}

function StageTopRow({ onAdd }: { onAdd?: () => void }) {
  return (
    <View style={styles.topRow}>
      <Text style={styles.appName} accessibilityRole="header">給与明細ナビ</Text>
      {onAdd ? (
        <Button
          label="追加"
          accessibilityLabel="明細を追加する"
          icon="plus"
          variant="inverse"
          compact
          onPress={onAdd}
        />
      ) : null}
    </View>
  );
}

function MethodLine({ text }: { text: string }) {
  return (
    <View style={styles.methodLine}>
      <View style={styles.methodDot} />
      <Text style={[type.body, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: space.sm },
  appName: { ...fontBase, color: colors.onPrimaryMuted, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  monthRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginBottom: space.xs },
  stageLabel: { ...fontBase, color: colors.onPrimaryMuted, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  demoTag: {
    ...fontBase,
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.onPrimaryMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deltaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.md },
  stageCaption: { ...fontBase, color: colors.onPrimaryMuted, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  noDataChip: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  stageBody: { ...fontBase, color: colors.onPrimaryMuted, fontSize: 15, lineHeight: 23, marginTop: space.sm },
  emptyMark: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.md,
    marginBottom: space.lg,
  },
  emptyTitle: { ...fontBase, color: colors.onPrimary, fontSize: 22, lineHeight: 28, fontWeight: '800' },
  sheet: {
    marginTop: -STAGE_OVERLAP,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  sheetHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: space.sm, rowGap: space.xxs, marginBottom: space.md },
  grossNote: { marginLeft: 'auto', textAlign: 'right' },
  grossValue: { ...fontBase, color: colors.ink, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  methodLine: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.xs },
  methodDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 9 },
});
