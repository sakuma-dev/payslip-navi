import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Category, Comparison, Difference, Payslip, Source } from '../domain';
import { Badge, Card, DeltaChip, Divider, Row, Segmented, SectionTitle } from './components';
import { CATEGORY_SHORT, monthLabel, shiftMonth } from './format';
import { Icon } from './icons';
import { EnterView } from './layout';
import { duration } from './motion';
import { categoryColor, colors, focusRing, radius, space, TOUCH, type } from './theme';
import { comparableItemChanges, deltaEmphasis, topItemChanges } from './visual';

type Mode = 'month' | 'year';

const MODES: { key: Mode; label: string }[] = [
  { key: 'month', label: '前月' },
  { key: 'year', label: '前年同月' },
];

function TotalsRows({ difference }: { difference: Difference }) {
  return (
    <View>
      <Row label="手取り"><DeltaChip value={difference.netPay} emphasis={deltaEmphasis('netPay')} /></Row>
      <Row label="総支給"><DeltaChip value={difference.grossPay} emphasis={deltaEmphasis('grossPay')} /></Row>
      <Row label="控除合計"><DeltaChip value={difference.totalDeductions} emphasis={deltaEmphasis('totalDeductions')} /></Row>
    </View>
  );
}

// 既存の呼出との互換。比較月のデータが無い時は「データなし」とだけ表示し、別の月へ差し替えない。
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
      {compact
        ? <Row label="手取り"><DeltaChip value={difference.netPay} emphasis={deltaEmphasis('netPay')} /></Row>
        : <TotalsRows difference={difference} />}
    </View>
  );
}

const UNREGISTERED_NOTE: Record<Category, string> = {
  earning: '支給の内訳が未登録の月があるため、支給の項目は比べていません。',
  deduction: '控除の内訳が未登録の月があるため、控除の項目は比べていません。',
  adjustment: '',
};

function ItemChanges({ difference, current, previous, limit }: {
  difference: Difference;
  current: Payslip;
  previous: Payslip | null;
  limit?: number;
}) {
  const { items, unregistered } = comparableItemChanges(difference.items, current, previous);
  const shown = topItemChanges(items, limit);
  return (
    <View>
      {shown.length === 0 && unregistered.length === 0 ? (
        <Text style={type.bodyMuted}>項目ごとの金額に変化はありません。</Text>
      ) : null}
      {shown.map((item, index) => (
        <View key={`${item.category}-${item.label}-${index}`}>
          {index > 0 ? <Divider inset={20} /> : null}
          <Row
            label={item.label}
            sub={CATEGORY_SHORT[item.category]}
            leading={<View style={[styles.dot, { backgroundColor: categoryColor[item.category] }]} />}
          >
            {/* amount は常に「当月 − 比較月」の符号付き差額（added/removed も同じ規約） */}
            {item.change === 'added' ? <Badge label="今月のみ" tone="primary" /> : null}
            {item.change === 'removed' ? <Badge label="比較月のみ" tone="neutral" /> : null}
            <DeltaChip value={item.amount} emphasis={deltaEmphasis(item.category)} />
          </Row>
        </View>
      ))}
      {unregistered.map((category) => (
        <View key={category} style={styles.note}>
          <Icon name="info" size={16} color={colors.inkMuted} />
          <Text style={[type.caption, { flex: 1 }]}>{UNREGISTERED_NOTE[category]}</Text>
        </View>
      ))}
    </View>
  );
}

// 前月／前年同月の比較。詳細では常に前月から開く（ホームの選択は引き継がない）。
export function ComparisonCard({ record, comparison, limit, onSeeAll }: {
  record: Payslip;
  comparison: Comparison;
  // 項目の変化を差の大きい順に何件まで出すか（省略で全件）
  limit?: number;
  onSeeAll?: () => void;
}) {
  const [mode, setMode] = useState<Mode>('month');
  const target = shiftMonth(record.month, mode === 'month' ? -1 : -12);
  const difference = mode === 'month' ? comparison.monthDifference : comparison.yearDifference;
  const previous = mode === 'month' ? comparison.previousMonth : comparison.previousYear;
  const comparable = difference ? comparableItemChanges(difference.items, record, previous).items : [];
  const hasMore = limit !== undefined && comparable.length > limit;

  return (
    <Card>
      <Segmented options={MODES} value={mode} onChange={setMode} accessibilityLabel="比べる月" />
      <EnterView key={mode} duration={duration.fast}>
        {!difference ? (
          <View style={styles.empty}>
            <Text style={type.bodyStrong}>{target ? `${monthLabel(target)}のデータなし` : 'データなし'}</Text>
            <Text style={[type.caption, { marginTop: space.xxs }]}>
              ちょうど{mode === 'month' ? '1か月前' : '1年前'}の明細がある場合だけ比べます。
            </Text>
          </View>
        ) : (
          <View>
            <Text style={[type.caption, styles.caption]}>
              {`${monthLabel(record.month)} − ${target ? monthLabel(target) : ''}（当月 − 比較月）`}
            </Text>
            <TotalsRows difference={difference} />
            <Divider />
            <Text style={[type.label, styles.itemsTitle]}>
              {limit !== undefined ? `変わった項目（差の大きい順に${limit}件まで）` : '変わった項目'}
            </Text>
            <ItemChanges difference={difference} current={record} previous={previous} limit={limit} />
            {hasMore && onSeeAll ? (
              <>
                <Divider />
                <Row label="すべての変化を見る" onPress={onSeeAll} accessibilityLabel="すべての変化を見る" />
              </>
            ) : null}
          </View>
        )}
      </EnterView>
    </Card>
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
          style={(state) => [styles.source, (state as { focused?: boolean }).focused && focusRing]}
        >
          <Icon name="externalLink" size={16} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sourceText}>出典: {s.title}</Text>
            <Text style={type.caption}>確認日 {s.checkedAt}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function InsightCard({ insight }: { insight: Comparison['insights'][number] }) {
  return (
    <Card tone="soft">
      <Badge label="可能性" tone="primary" icon="info" />
      <Text style={[type.headline, { fontSize: 15, marginTop: space.sm }]}>{insight.title}</Text>
      <Text style={[type.body, { marginTop: space.xs }]}>{insight.body}</Text>
      <SourceLinks sources={insight.sources} />
    </Card>
  );
}

export function ComparisonDetail({ record, comparison }: { record: Payslip; comparison: Comparison }) {
  return (
    <View>
      <SectionTitle note="保存した明細の数字から計算した差です。">比べてわかること（事実）</SectionTitle>
      <ComparisonCard record={record} comparison={comparison} />

      {comparison.insights.length > 0 ? (
        <>
          <SectionTitle note="一般的な可能性です。勤務先の控除時期や個人の条件で異なります。">
            考えられる理由（可能性）
          </SectionTitle>
          {comparison.insights.map((insight, i) => <InsightCard key={`${insight.title}-${i}`} insight={insight} />)}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingVertical: space.xs },
  caption: { marginTop: space.md, marginBottom: space.xxs },
  itemsTitle: { marginTop: space.md, marginBottom: space.xxs },
  empty: { paddingTop: space.lg, paddingBottom: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  note: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-start', marginTop: space.sm },
  source: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    minHeight: TOUCH,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
  },
  sourceText: { color: colors.primary, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
