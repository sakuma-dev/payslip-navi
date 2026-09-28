import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { Payslip } from '../../domain';
import { comparePayslips, formatYen } from '../../domain';
import { Button, Card, DeltaChip, Divider, EmptyState, MonthBadge, Row, SectionTitle } from '../components';
import { monthLabel, signedSpeech, yenSpeech } from '../format';
import { space, type } from '../theme';
import { deltaEmphasis } from '../visual';

// 年ごとに見出し行と1枚のカード。行は月バッジ／支払月／手取り／暦の上で1か月前との差（無ければ「前月データなし」）。
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

  // 比較は comparePayslips の暦上の前月だけ。欠月を直前に登録された別の月で代わりにしない。
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
      <Text style={type.bodyMuted}>
        {records.length}件の明細。前月差は、ちょうど1か月前の明細がある場合だけ表示します。
      </Text>
      {groups.map(([year, list]) => (
        <View key={year}>
          <SectionTitle right={<Text style={type.caption}>{list.length}件</Text>}>{year}年</SectionTitle>
          <Card dense style={{ paddingVertical: space.xs }}>
            {list.map((r, i) => {
              const diff = diffs.get(r.id) ?? null;
              return (
                <View key={r.id}>
                  {i > 0 ? <Divider inset={56} /> : null}
                  <Row
                    label={monthLabel(r.month)}
                    sub="手取り"
                    minHeight={64}
                    leading={<MonthBadge month={r.month} />}
                    onPress={() => onOpen(r.id)}
                    accessibilityLabel={`${monthLabel(r.month)}、手取り${yenSpeech(r.netPay)}、${diff === null ? '前月データなし' : `前月比${signedSpeech(diff)}`}`}
                  >
                    <Text style={type.moneyM} maxFontSizeMultiplier={1.6}>{formatYen(r.netPay)}</Text>
                    {diff === null
                      ? <Text style={type.caption}>前月データなし</Text>
                      : <DeltaChip value={diff} emphasis={deltaEmphasis('netPay')} />}
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
