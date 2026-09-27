import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import type { Category, Payslip } from '../../domain';
import { comparePayslips } from '../../domain';
import { ComparisonDetail } from '../ComparisonView';
import { Badge, Banner, Button, Card, Dialog, Divider, Money, Row, SectionTitle } from '../components';
import { CATEGORY_LABEL, CODE_LABEL, errorMessage, monthLabel } from '../format';
import { categoryColor, space, type } from '../theme';

const CATEGORIES: Category[] = ['earning', 'deduction', 'adjustment'];

export function DetailScreen({ record, records, demo, onEdit, onDelete }: {
  record: Payslip;
  records: Payslip[];
  demo: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
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

  return (
    <View>
      {demo ? <Banner tone="demo" title="架空のデモ明細">実在の人物・勤務先とは関係ありません。</Banner> : null}
      <Card>
        <Text style={type.label}>{monthLabel(record.month)}（支払月）</Text>
        <Row label="総支給額"><Money value={record.grossPay} /></Row>
        <Row label="控除合計"><Money value={record.totalDeductions} /></Row>
        <Divider />
        <Row label="差引支給額（手取り）"><Money value={record.netPay} large /></Row>
        <View style={{ marginTop: space.sm, gap: space.xs }}>
          <Badge label="算術チェック済み" tone="primary" />
          <Text style={type.caption}>
            総支給・控除・調整の数字が互いに合うことを保存時に確認しています。税額や保険料が法令どおりかの判定ではありません。
          </Text>
        </View>
      </Card>

      <SectionTitle>内訳</SectionTitle>
      {CATEGORIES.map((category) => {
        const items = record.items.filter((i) => i.category === category);
        if (category === 'adjustment' && items.length === 0) return null;
        return (
          <Card key={category}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs }}>
              <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: categoryColor[category] }} />
              <Text style={type.heading}>{CATEGORY_LABEL[category]}</Text>
            </View>
            {items.length === 0 ? (
              <Text style={type.bodyMuted}>内訳未登録（合計のみ保存）</Text>
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

      {error ? <Banner tone="danger" title="削除できませんでした">{error}</Banner> : null}
      <View style={{ gap: space.sm, marginTop: space.lg }}>
        <Button label="この明細を編集" variant="secondary" onPress={onEdit} />
        <Button label="この明細を削除" variant="danger" onPress={() => setConfirming(true)} />
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
