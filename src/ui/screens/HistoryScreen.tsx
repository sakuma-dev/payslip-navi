import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { Payslip } from '../../domain';
import { comparePayslips } from '../../domain';
import { Button, Card, Delta, Divider, EmptyState, Money, Row, SectionTitle } from '../components';
import { monthLabel } from '../format';
import { space, type } from '../theme';

export function HistoryScreen({ records, onOpen, onAdd }: {
  records: Payslip[];
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Payslip[]>();
    for (const r of records) {
      const y = r.month.slice(0, 4);
      map.set(y, [...(map.get(y) ?? []), r]);
    }
    return [...map.entries()];
  }, [records]);

  const diffs = useMemo(() => {
    const out = new Map<string, number | null>();
    for (const r of records) out.set(r.id, comparePayslips(r, records).monthDifference?.netPay ?? null);
    return out;
  }, [records]);

  if (records.length === 0) {
    return (
      <EmptyState
        title="履歴はまだありません"
        body="登録した明細が支払月ごとに並びます。"
        action={<Button label="明細を追加する" onPress={onAdd} />}
      />
    );
  }

  return (
    <View>
      <Text style={[type.bodyMuted, { marginBottom: space.sm }]}>
        {records.length}件の明細。前月差は、ちょうど1か月前の明細がある場合だけ表示します。
      </Text>
      {groups.map(([year, list]) => (
        <View key={year}>
          <SectionTitle>{year}年</SectionTitle>
          <Card>
            {list.map((r, i) => {
              const diff = diffs.get(r.id) ?? null;
              return (
                <View key={r.id}>
                  {i > 0 ? <Divider /> : null}
                  <Row label={monthLabel(r.month)} sub="手取り" onPress={() => onOpen(r.id)}>
                    <Money value={r.netPay} />
                    {diff === null
                      ? <Text style={type.caption}>前月データなし</Text>
                      : <Delta value={diff} suffix="、前月比" />}
                  </Row>
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </View>
  );
}
