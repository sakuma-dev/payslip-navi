import * as Crypto from 'expo-crypto';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Category, DraftItem, Issue, ItemCode, Payslip, PayslipDraft } from '../../domain';
import { buildPayslip } from '../../domain';
import { Badge, Banner, Button, Card, Checkbox, Chip, Dialog, Field, SectionTitle } from '../components';
import { CATEGORY_LABEL, CODE_LABEL, CODES_BY_CATEGORY, currentMonth, errorMessage, monthLabel, shiftMonth } from '../format';
import { categoryColor, colors, radius, space, type } from '../theme';
import type { DraftSource } from './AddMethodScreen';

export interface EditorSession {
  draft: PayslipDraft;
  warnings: Issue[];
  source: DraftSource | 'edit';
  lines?: string[];
  original?: Payslip;
}

// 保存前の表示用検証にだけ使う固定メタデータ。保存時は本物のIDと日時で buildPayslip をやり直す。
const PREVIEW_META = {
  id: '00000000-0000-4000-8000-000000000000',
  createdAt: '2000-01-01T00:00:00.000Z',
  updatedAt: '2000-01-01T00:00:00.000Z',
};

const TOTAL_PATHS = ['grossPay', 'totalDeductions', 'netPay'];
const CATEGORIES: Category[] = ['earning', 'deduction', 'adjustment'];
const AMOUNT_KEYBOARD = 'numbers-and-punctuation' as const;

function normalizePath(path: string): string {
  return path.replace(/\[(\d+)\]/g, '.$1');
}

export function prepareSession(session: EditorSession): EditorSession {
  if (session.source === 'edit') return session;
  // OCR/テキスト由来の仮IDはUUIDへ付け直し、本人確認は必ず未チェックから始める。
  return {
    ...session,
    draft: {
      ...session.draft,
      items: session.draft.items.map((item) => ({ ...item, id: Crypto.randomUUID() })),
      confirmed: false,
    },
  };
}

export function EditorScreen({ session, records, demo, onSave, onSaved, onCancel, setBackGuard }: {
  session: EditorSession;
  records: Payslip[];
  demo: boolean;
  onSave: (record: Payslip) => Promise<unknown>;
  onSaved: (id: string) => void;
  onCancel: () => void;
  setBackGuard: (guard: (() => boolean) | null) => void;
}) {
  const [initialJson] = useState(() => JSON.stringify(session.draft));
  // 新規保存のIDは画面を開いた時点で1つだけ作り、再試行でも変えない。
  const [newId] = useState(() => Crypto.randomUUID());
  const grossRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState<PayslipDraft>(session.draft);
  // 読み取った行はこの画面のルート状態にだけあり、画面を閉じると参照が消える。
  const lines = session.lines;
  const [showLines, setShowLines] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Payslip | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const original = session.original;
  const dirty = JSON.stringify(draft) !== initialJson;

  useEffect(() => {
    setBackGuard(() => {
      if (saving) return true;
      if (dirty) {
        setDiscardOpen(true);
        return true;
      }
      return false;
    });
    return () => setBackGuard(null);
  }, [dirty, saving, setBackGuard]);

  const preview = useMemo(() => buildPayslip({ ...draft, confirmed: true }, PREVIEW_META), [draft]);
  const issues: Issue[] = preview.ok ? [] : preview.errors;
  const previewWarnings: Issue[] = preview.ok ? preview.warnings : [];
  const totalsEmpty = draft.grossPay.trim() === '' && draft.totalDeductions.trim() === '' && draft.netPay.trim() === '';

  const issueFor = (path: string) => {
    if (!attempted) return undefined;
    return issues.find((i) => normalizePath(i.path) === path)?.message;
  };
  const totalsIssues = issues.filter((i) => TOTAL_PATHS.includes(normalizePath(i.path).split('.')[0] ?? ''));

  const update = (patch: Partial<PayslipDraft>) => {
    setSaveError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setSaveError(null);
    setDraft((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  };
  const addItem = (category: Category) => {
    setDraft((d) => ({
      ...d,
      items: [...d.items, { id: Crypto.randomUUID(), label: '', category, amount: '', code: 'other' }],
    }));
  };
  const removeItem = (id: string) => setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const stepMonth = (delta: number) => {
    const base = shiftMonth(draft.month.trim(), 0) ?? currentMonth();
    update({ month: shiftMonth(base, delta) ?? base });
  };

  const persist = async (target: Payslip | null) => {
    const now = new Date().toISOString();
    const meta = original
      ? { id: original.id, createdAt: original.createdAt, updatedAt: now }
      : target
        ? { id: target.id, createdAt: target.createdAt, updatedAt: now }
        : { id: newId, createdAt: now, updatedAt: now };
    const built = buildPayslip(draft, meta);
    if (!built.ok) {
      setSaveError(built.errors[0]?.message ?? '入力内容を確認してください。');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(built.value);
      onSaved(built.value.id);
    } catch (e) {
      setSaving(false);
      setSaveError(errorMessage(e, '保存できませんでした。入力内容は残っています。'));
    }
  };

  const save = async () => {
    setAttempted(true);
    if (saving || !draft.confirmed) return;
    const checked = buildPayslip(draft, PREVIEW_META);
    if (!checked.ok) {
      setSaveError('赤字の項目を確認してください。');
      return;
    }
    const month = checked.value.month;
    const other = records.find((r) => r.month === month && r.id !== original?.id) ?? null;
    if (other && original) {
      setSaveError(`${monthLabel(month)}は別の明細で登録済みです。支払月を見直すか、先にそちらを編集・削除してください。`);
      return;
    }
    if (other) {
      setDuplicate(other);
      return;
    }
    await persist(null);
  };

  const title = original ? '明細を編集' : '内容を確認';

  return (
    <View>
      <Text style={[type.bodyMuted, { marginBottom: space.md }]}>
        {original
          ? '修正したい値を直して、もう一度確認してから保存します。'
          : '明細と見比べながら、支払月と金額を確認・修正してください。読み取り結果は候補です。'}
      </Text>
      {demo ? <Banner tone="demo" title="デモ中">ここで保存した内容は架空データとしてのみ扱われ、デモ終了で消えます。</Banner> : null}

      {session.warnings.length > 0 ? (
        <Banner tone="warning" title="確認が必要な箇所があります">
          <View style={{ gap: 2 }}>
            {session.warnings.map((w, i) => <Text key={`${w.path}-${i}`} style={type.bodyMuted}>・{w.message}</Text>)}
          </View>
        </Banner>
      ) : null}

      {lines && lines.length > 0 ? (
        <Card>
          <Pressable
            onPress={() => setShowLines((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showLines }}
            style={styles.linesHead}
          >
            <Text style={[type.heading, { flex: 1 }]}>読み取った行（{lines.length}行）</Text>
            <Text style={styles.toggle}>{showLines ? '閉じる' : '見る'}</Text>
          </Pressable>
          <Text style={type.caption}>見比べ用です。この画面を閉じると破棄し、保存しません。</Text>
          {showLines ? (
            <View style={styles.lines}>
              {lines.map((line, i) => <Text key={i} style={styles.lineText} selectable>{line}</Text>)}
            </View>
          ) : null}
        </Card>
      ) : null}

      <SectionTitle note="明細の「支給日」の月です。「○月分」の表記とは異なる場合があります。">支払月</SectionTitle>
      <Card>
        <View style={styles.monthRow}>
          <Pressable onPress={() => stepMonth(-1)} accessibilityRole="button" accessibilityLabel="前の月" style={styles.monthStep}>
            <Text style={styles.monthArrow}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Field
              value={draft.month}
              onChangeText={(month) => update({ month })}
              placeholder="YYYY-MM"
              keyboardType={AMOUNT_KEYBOARD}
              accessibilityLabel="支払月（年-月）"
              error={issueFor('month')}
              hint={draft.month.trim() === '' ? '未確定です。明細の支給日から入力してください。' : monthLabel(draft.month.trim())}
              style={{ marginBottom: 0 }}
            />
          </View>
          <Pressable onPress={() => stepMonth(1)} accessibilityRole="button" accessibilityLabel="次の月" style={styles.monthStep}>
            <Text style={styles.monthArrow}>›</Text>
          </Pressable>
        </View>
      </Card>

      <SectionTitle note="3つとも必須です。空欄は「未入力」で、0円とは区別します。">合計</SectionTitle>
      <Card>
        <Field label="総支給額" value={draft.grossPay} onChangeText={(grossPay) => update({ grossPay })}
          placeholder="未入力" keyboardType={AMOUNT_KEYBOARD} suffix="円" error={issueFor('grossPay')} inputRef={grossRef} />
        <Field label="控除合計" value={draft.totalDeductions} onChangeText={(totalDeductions) => update({ totalDeductions })}
          placeholder="未入力" keyboardType={AMOUNT_KEYBOARD} suffix="円" error={issueFor('totalDeductions')} />
        <Field label="差引支給額（手取り）" value={draft.netPay} onChangeText={(netPay) => update({ netPay })}
          placeholder="未入力" keyboardType={AMOUNT_KEYBOARD} suffix="円" error={issueFor('netPay')}
          hint="振込額ではなく、明細の「差引支給額」を入力します。" />
      </Card>

      {CATEGORIES.map((category) => {
        const items = draft.items.filter((i) => i.category === category);
        return (
          <View key={category}>
            <SectionTitle
              note={category === 'adjustment'
                ? '現物給与の差し引きや精算など、差引支給額を出すときに明細上で加減されている項目だけ。マイナスは「-」「△」で入力します。'
                : items.length === 0 ? '内訳未登録（合計だけで保存できます）' : `${items.length}項目。項目の合計が上の合計と一致する必要があります。`}
            >
              {CATEGORY_LABEL[category]}
            </SectionTitle>
            {items.map((item) => {
              const index = draft.items.findIndex((i) => i.id === item.id);
              return (
                <Card key={item.id} style={[styles.itemCard, { borderLeftColor: categoryColor[category] }]}>
                  {category !== 'adjustment' ? (
                    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="項目の種類">
                      {CODES_BY_CATEGORY[category].map((code: ItemCode) => (
                        <Chip
                          key={code}
                          label={CODE_LABEL[code]}
                          selected={item.code === code}
                          onPress={() => updateItem(item.id, {
                            code,
                            label: item.label.trim() === '' && code !== 'other' ? CODE_LABEL[code] : item.label,
                          })}
                        />
                      ))}
                    </View>
                  ) : null}
                  <View style={styles.itemFields}>
                    <Field label="項目名" value={item.label} onChangeText={(label) => updateItem(item.id, { label })}
                      placeholder="明細の表記どおり" error={issueFor(`items.${index}.label`)} style={{ flex: 1.3 }} />
                    <Field label="金額" value={item.amount} onChangeText={(amount) => updateItem(item.id, { amount })}
                      placeholder="未入力" keyboardType={AMOUNT_KEYBOARD} suffix="円"
                      error={issueFor(`items.${index}.amount`)} style={{ flex: 1 }}
                      accessibilityLabel={`${item.label || '項目'}の金額`} />
                  </View>
                  <Pressable onPress={() => removeItem(item.id)} accessibilityRole="button"
                    accessibilityLabel={`${item.label || 'この項目'}を削除`} hitSlop={8} style={styles.removeItem}>
                    <Text style={styles.removeText}>この項目を削除</Text>
                  </Pressable>
                </Card>
              );
            })}
            <Button
              label={category === 'adjustment' ? '＋ 調整項目を追加' : `＋ ${CATEGORY_LABEL[category]}項目を追加`}
              variant="ghost"
              compact
              onPress={() => addItem(category)}
              style={{ alignSelf: 'flex-start' }}
            />
          </View>
        );
      })}

      <SectionTitle note="数字同士が合っているかの確認です。税額や保険料が正しいかの判定ではありません。">算術チェック</SectionTitle>
      <Card>
        {totalsEmpty ? (
          <Text style={type.bodyMuted}>3つの合計を入力すると確認します。</Text>
        ) : preview.ok ? (
          <View style={{ gap: space.xs }}>
            <Badge label="一致しています" tone="primary" />
            <Text style={type.bodyMuted}>総支給額 − 控除合計 ＋ 調整 ＝ 差引支給額</Text>
            {previewWarnings.map((w, i) => <Text key={i} style={[type.bodyMuted, { color: colors.warning }]}>・{w.message}</Text>)}
          </View>
        ) : (
          <View style={{ gap: space.xs }}>
            <Badge label="確認が必要です" tone="danger" />
            {issues.slice(0, 6).map((issue, i) => (
              <Text key={`${issue.path}-${i}`} style={type.body}>・{issue.message}</Text>
            ))}
            {issues.length > 6 ? <Text style={type.caption}>ほか{issues.length - 6}件</Text> : null}
            {totalsIssues.length > 0 ? (
              <>
                <Text style={[type.caption, { marginTop: space.xs }]}>
                  差額は自動で埋めません。明細に記載がある調整だけを追加するか、入力した値を見直してください。
                </Text>
                <View style={styles.fixActions}>
                  <Button label="調整項目を追加" variant="secondary" compact onPress={() => addItem('adjustment')} />
                  <Button label="合計を見直す" variant="ghost" compact onPress={() => grossRef.current?.focus()} />
                </View>
              </>
            ) : null}
          </View>
        )}
      </Card>

      <Card tone="soft">
        <Checkbox
          checked={draft.confirmed}
          onChange={(confirmed) => update({ confirmed })}
          label="明細の数字と見比べて、支払月と金額を確認しました"
        />
        {!draft.confirmed ? (
          <Text style={[type.caption, { color: attempted ? colors.danger : colors.inkMuted }]}>
            保存するには確認のチェックが必要です。
          </Text>
        ) : null}
      </Card>

      {saveError ? <Banner tone="danger" title="保存できませんでした">{saveError}</Banner> : null}

      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <Button
          label={saving ? '保存中…' : saveError && attempted ? 'もう一度保存する' : '保存する'}
          busy={saving}
          disabled={!draft.confirmed}
          hint={!draft.confirmed ? '確認のチェックを入れると保存できます' : undefined}
          onPress={save}
        />
        <Button label="やめる" variant="ghost" disabled={saving} onPress={() => (dirty ? setDiscardOpen(true) : onCancel())} />
      </View>

      <Dialog
        visible={duplicate !== null}
        title={`${duplicate ? monthLabel(duplicate.month) : ''}は登録済みです`}
        onClose={() => setDuplicate(null)}
        actions={(
          <>
            <Button label="今の内容で置き換える" variant="danger" onPress={() => { const target = duplicate; setDuplicate(null); persist(target); }} />
            <Button label="やめて見直す" variant="ghost" onPress={() => setDuplicate(null)} />
          </>
        )}
      >
        <Text style={type.body}>
          同じ支払月の明細は1件だけ保存できます。置き換えると、登録済みの内容が今の入力内容に変わります（登録日は引き継ぎます）。
        </Text>
      </Dialog>

      <Dialog
        visible={discardOpen}
        title={`${title}を中止しますか`}
        onClose={() => setDiscardOpen(false)}
        actions={(
          <>
            <Button label="入力内容を破棄する" variant="danger" onPress={() => { setDiscardOpen(false); onCancel(); }} />
            <Button label="編集を続ける" variant="ghost" onPress={() => setDiscardOpen(false)} />
          </>
        )}
      >
        入力した内容は保存されていません。破棄すると、読み取った行も消えます。
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  linesHead: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  toggle: { color: colors.primary, fontWeight: '600' },
  lines: { marginTop: space.sm, backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: space.md, gap: 2 },
  lineText: { fontSize: 13, color: colors.ink, fontVariant: ['tabular-nums'] },
  monthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  monthStep: { width: 44, height: 46, alignItems: 'center', justifyContent: 'center' },
  monthArrow: { fontSize: 28, color: colors.primary },
  itemCard: { borderLeftWidth: 4, paddingBottom: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.md },
  itemFields: { flexDirection: 'row', gap: space.sm },
  removeItem: { alignSelf: 'flex-end', paddingVertical: space.xs, minHeight: 32, justifyContent: 'center' },
  removeText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  fixActions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.xs },
});
