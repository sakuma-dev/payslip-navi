import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Category, Payslip } from '../../domain';
import { comparePayslips, formatYen } from '../../domain';
import { ComparisonDetail } from '../ComparisonView';
import { Badge, Banner, Button, Card, Dialog, Divider, Money, Row, SectionTitle, StatTiles, YenText } from '../components';
import { CATEGORY_LABEL, CODE_LABEL, errorMessage, monthLabel, yenSpeech } from '../format';
import { useLayoutMetrics } from '../layout';
import { categoryColor, colors, fontBase, space, type } from '../theme';
import { displayStep } from '../visual';

const CATEGORIES: Category[] = ['earning', 'deduction', 'adjustment'];
// 詳細の手取りは 38 を上限に、実際の幅と文字の倍率で段階的に小さくする
const DETAIL_DISPLAY_MAX = 38;

// 項目が0件の時の説明。区分の合計が0なら項目が無いこと自体が事実なので「項目なし」、
// 合計があるのに項目が無いなら、合計だけを保存した明細と書く（「未登録」と断定しない）。
function emptyItemsText(total: number | null): string {
  return total === 0 ? '項目なし' : '項目の内訳は登録されていません（合計のみ保存）';
}

export function DetailScreen({ record, records, demo, onEdit, onDelete }: {
  record: Payslip;
  records: Payslip[];
  demo: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const metrics = useLayoutMetrics();
  const comparison = useMemo(() => comparePayslips(record, records), [record, records]);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (e) {
      setError(errorMessage(e, '削除できませんでした。'));
      setDeleting(false);
      setConfirming(false);
    }
  };

  const displaySize = Math.min(DETAIL_DISPLAY_MAX, displayStep(formatYen(record.netPay), metrics.contentWidth, metrics.fontScale));
  // カードの内幅（縁1pxを含めて差し引く）
  const cardInner = metrics.contentWidth - metrics.sheetPadding * 2 - 2;
  const categoryTotal: Record<Category, number | null> = {
    earning: record.grossPay,
    deduction: record.totalDeductions,
    // 調整は区分の合計を保存していない
    adjustment: null,
  };

  return (
    <View>
      {demo ? <Banner tone="demo" title="架空のデモ明細">実在の人物・勤務先とは関係ありません。</Banner> : null}

      {/* Scene の上のコンパクトなヒーロー（文字は ink / inkMuted だけ） */}
      <View style={styles.hero}>
        <Text style={styles.heroMonth}>{monthLabel(record.month)}（支払月）</Text>
        <Text style={styles.heroLabel}>差引支給額（手取り）</Text>
        <YenText
          value={record.netPay}
          size={displaySize}
          color={colors.ink}
          maxScale={1.3}
          accessibilityLabel={`手取り ${yenSpeech(record.netPay)}`}
        />
        <View style={{ marginTop: space.sm }}>
          <Badge label="算術チェック済み" tone="primary" icon="checkCircle" />
        </View>
      </View>

      <Card style={{ padding: metrics.sheetPadding }}>
        <StatTiles
          width={cardInner}
          spacing={metrics.tile}
          items={[
            { label: '総支給額', value: record.grossPay, color: colors.catEarning },
            { label: '控除合計', value: record.totalDeductions, color: colors.catDeduction },
          ]}
        />
        <Text style={[type.caption, { marginTop: space.md }]}>
          総支給・控除・調整の数字が互いに合うことを保存時に確認しています。税額や保険料が法令どおりかの判定ではありません。
        </Text>
      </Card>

      <SectionTitle>内訳</SectionTitle>
      {CATEGORIES.map((category) => {
        const items = record.items.filter((i) => i.category === category);
        if (category === 'adjustment' && items.length === 0) return null;
        const total = categoryTotal[category];
        return (
          <Card key={category}>
            <View style={styles.categoryHead}>
              <View style={[styles.dot, { backgroundColor: categoryColor[category] }]} />
              <Text style={[type.headline, styles.categoryTitle]} accessibilityRole="header">{CATEGORY_LABEL[category]}</Text>
              {total !== null ? (
                <View style={styles.categoryTotal}>
                  <Text style={type.caption}>合計</Text>
                  <Money value={total} />
                </View>
              ) : null}
            </View>
            {items.length === 0 ? (
              <Text style={type.bodyMuted}>{emptyItemsText(total)}</Text>
            ) : (
              items.map((item, i) => (
                <View key={item.id}>
                  {i > 0 ? <Divider /> : null}
                  <Row label={item.label} sub={item.code !== 'other' ? CODE_LABEL[item.code] : undefined}>
                    <Money value={item.amount} />
                  </Row>
                </View>
              ))
            )}
          </Card>
        );
      })}

      <ComparisonDetail record={record} comparison={comparison} />

      <View style={styles.actions}>
        {error ? <Banner tone="danger" title="削除でエラーが発生しました">{error}</Banner> : null}
        <Button label="この明細を編集" icon="pencil" variant="secondary" onPress={onEdit} />
        <Button label="この明細を削除" icon="trash" variant="danger" onPress={() => setConfirming(true)} />
      </View>

      <Dialog
        visible={confirming}
        title={`${monthLabel(record.month)}の明細を削除しますか`}
        onClose={() => !deleting && setConfirming(false)}
        actions={(
          <>
            <Button label={deleting ? '削除中…' : '削除する'} variant="danger" busy={deleting} onPress={remove} />
            <Button label="やめる" variant="ghost" disabled={deleting} onPress={() => setConfirming(false)} />
          </>
        )}
      >
        <Text style={type.body}>
          削除すると元に戻せません。{demo ? 'デモの架空データのみが対象です。' : '必要なら先に設定からバックアップを書き出してください。'}
        </Text>
        <Row label="対象の手取り"><Money value={record.netPay} /></Row>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: space.xs, paddingBottom: space.lg },
  heroMonth: { ...fontBase, color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  heroLabel: { ...fontBase, color: colors.inkMuted, fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: space.sm },
  categoryHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.sm, rowGap: space.xxs, marginBottom: space.xs },
  categoryTitle: { flexGrow: 1, flexShrink: 1 },
  categoryTotal: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginLeft: 'auto' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  actions: { gap: space.sm, marginTop: space.xxl },
});
