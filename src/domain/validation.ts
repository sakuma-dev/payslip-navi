import type { Backup, Category, Issue, ItemCode, Payslip, PayslipDraft, PayslipItem, Result } from './types';

export const MAX_AMOUNT = 1_000_000_000;
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const codes: ItemCode[] = ['base', 'overtime', 'commute', 'health', 'care', 'pension', 'employment', 'incomeTax', 'residentTax', 'other'];
const categories: Category[] = ['earning', 'deduction', 'adjustment'];
export const validMonth = (s: string): boolean => /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(s);
const validDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString() === s;
const fail = <T>(message: string, path = ''): Result<T> => ({ ok: false, errors: [{ path, message }] });

/** Strict integer yen: punctuation/OCR lookalikes never turn into guessed digits. */
export function parseYen(value: string): number | null {
  let s = value.normalize('NFKC').trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1).trim(); }
  if (/^[△▲−-]/.test(s)) { if (negative) return null; negative = true; s = s.slice(1).trim(); }
  s = s.replace(/^[¥￥]\s*/, '').replace(/\s*円$/, '');
  if (!/^(?:\d+|[1-9]\d{0,2}(?:,\d{3})+)$/.test(s)) return null;
  const n = Number(s.replace(/,/g, '')) * (negative ? -1 : 1);
  return Number.isSafeInteger(n) && Math.abs(n) <= MAX_AMOUNT ? (n === 0 ? 0 : n) : null;
}
export function emptyDraft(month = ''): PayslipDraft { return { month, items: [], grossPay: '', totalDeductions: '', netPay: '', confirmed: false }; }
export function draftFromPayslip(p: Payslip): PayslipDraft { return { month: p.month, items: p.items.map(i => ({ ...i, amount: String(i.amount) })), grossPay: String(p.grossPay), totalDeductions: String(p.totalDeductions), netPay: String(p.netPay), confirmed: false }; }
export function buildPayslip(draft: PayslipDraft, meta: { id: string; createdAt: string; updatedAt: string }): Result<Payslip> {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const error = (path: string, message: string) => errors.push({ path, message });
  if (!uuid.test(meta.id)) error('id', '明細IDが不正です。');
  if (!validDate(meta.createdAt) || !validDate(meta.updatedAt) || meta.updatedAt < meta.createdAt) error('updatedAt', '作成・更新日時が不正です。');
  const month = draft.month.normalize('NFKC').trim();
  if (!validMonth(month)) error('month', '支払月をYYYY-MM形式で入力してください（1900〜2199年）。');
  if (draft.confirmed !== true) error('confirmed', '明細原本と数字を照合して確認チェックを入れてください。');
  const amounts = { grossPay: parseYen(draft.grossPay), totalDeductions: parseYen(draft.totalDeductions), netPay: parseYen(draft.netPay) };
  for (const [key, value] of Object.entries(amounts)) if (value === null) error(key, '金額は必須です。10億円以内の整数円で入力してください。');
  if (draft.items.length > 100) error('items', '項目は100件以内にしてください。');
  const seen = new Set<string>();
  const items: PayslipItem[] = draft.items.slice(0, 100).map((item, index) => {
    const path = `items.${index}`;
    if (!uuid.test(item.id) || seen.has(item.id)) error(`${path}.id`, '項目IDが不正または重複しています。');
    seen.add(item.id);
    const normalizedLabel = item.label.normalize('NFKC');
    const label = normalizedLabel.trim();
    if (!label || [...label].length > 40 || /[\u0000-\u001f\u007f-\u009f]/u.test(normalizedLabel)) error(`${path}.label`, '項目名は制御文字を含まない1〜40文字にしてください。');
    if (!categories.includes(item.category)) error(`${path}.category`, '項目の区分が不正です。');
    if (!codes.includes(item.code)) error(`${path}.code`, '項目の種類が不正です。');
    if (item.code !== 'other' && codes.includes(item.code)) {
      const expected: Category = ['base', 'overtime', 'commute'].includes(item.code) ? 'earning' : 'deduction';
      if (item.category !== expected) error(`${path}.category`, '項目の種類と支給・控除の区分が一致しません。調整は「その他」を選んでください。');
    }
    const amount = parseYen(item.amount);
    if (amount === null) error(`${path}.amount`, '項目の金額を10億円以内の整数円で入力してください。');
    return { id: item.id, label, category: item.category, code: item.code, amount: amount ?? 0 };
  });
  // Metadata/confirmation errors should not conceal arithmetic corrections the user can make now.
  const amountsAreValid = Object.values(amounts).every(amount => amount !== null);
  const itemsAreValid = !errors.some(issue => issue.path === 'items' || issue.path.startsWith('items.'));
  if (amountsAreValid && itemsAreValid) {
    for (const [category, total] of [['earning', amounts.grossPay], ['deduction', amounts.totalDeductions]] as const) {
      const group = items.filter(i => i.category === category);
      if (!group.length) warnings.push({ path: 'items', message: `${category === 'earning' ? '支給' : '控除'}の内訳未登録です。` });
      else {
        const delta = group.reduce((a, i) => a + i.amount, 0) - total!;
        if (delta !== 0) error(category === 'earning' ? 'grossPay' : 'totalDeductions', `${category === 'earning' ? '支給' : '控除'}項目合計 − 入力した合計額の差は${formatYen(delta)}です。原本の金額を確認してください。`);
      }
    }
    const adjustment = items.filter(i => i.category === 'adjustment').reduce((a, i) => a + i.amount, 0);
    const netDelta = amounts.grossPay! - amounts.totalDeductions! + adjustment - amounts.netPay!;
    if (netDelta !== 0) error('netPay', `総支給 − 控除合計 ＋ 調整額と入力した差引支給額の差は${formatYen(netDelta)}です。原本の値を見直すか、原本にある調整項目を追加してください。`);
    if (amounts.netPay! < 0) warnings.push({ path: 'netPay', message: '差引支給額が負数です。原本と照合してください。' });
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: { id: meta.id, createdAt: meta.createdAt, updatedAt: meta.updatedAt, month, items, grossPay: amounts.grossPay!, totalDeductions: amounts.totalDeductions!, netPay: amounts.netPay! }, warnings };
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function validatePayslip(value: unknown): Result<Payslip> {
  if (!object(value) || !['id', 'month', 'createdAt', 'updatedAt'].every(k => typeof value[k] === 'string') || !Array.isArray(value.items) || value.items.length > 100) return fail('明細の形式が不正です。');
  for (const k of ['grossPay', 'totalDeductions', 'netPay']) if (typeof value[k] !== 'number' || !Number.isSafeInteger(value[k]) || Math.abs(value[k] as number) > MAX_AMOUNT) return fail('合計金額が不正です。', k);
  const items: PayslipDraft['items'] = [];
  for (const i of value.items) {
    if (!object(i) || !['id', 'label', 'category', 'code'].every(k => typeof i[k] === 'string') || typeof i.amount !== 'number' || !Number.isSafeInteger(i.amount) || Math.abs(i.amount) > MAX_AMOUNT) return fail('項目の形式が不正です。', 'items');
    items.push({ id: i.id as string, label: i.label as string, category: i.category as Category, code: i.code as ItemCode, amount: String(i.amount) });
  }
  return buildPayslip({ month: value.month as string, items, grossPay: String(value.grossPay), totalDeductions: String(value.totalDeductions), netPay: String(value.netPay), confirmed: true }, { id: value.id as string, createdAt: value.createdAt as string, updatedAt: value.updatedAt as string });
}
export function utf8Size(text: string): number { let size = 0; for (const c of text) { const p = c.codePointAt(0)!; size += p < 0x80 ? 1 : p < 0x800 ? 2 : p < 0x10000 ? 3 : 4; } return size; }
export function parseBackup(input: unknown): Result<Backup> {
  let value = input;
  if (typeof input === 'string') {
    if (utf8Size(input) > MAX_BACKUP_BYTES) return fail('バックアップは2MB以内にしてください。');
    try { value = JSON.parse(input) as unknown; } catch { return fail('JSONを読み取れません。バックアップを確認してください。'); }
  }
  if (!object(value) || value.schemaVersion !== 1) return fail('このバックアップ形式には対応していません。');
  if (!validDate(value.exportedAt) || !Array.isArray(value.payslips) || value.payslips.length > 600) return fail('バックアップの日時・件数が不正です（最大600件）。');
  const payslips: Payslip[] = [];
  const ids = new Set<string>(); const months = new Set<string>();
  for (const record of value.payslips) {
    const result = validatePayslip(record);
    if (!result.ok) return result;
    if (ids.has(result.value.id) || months.has(result.value.month)) return fail('明細IDまたは支払月が重複しています。');
    ids.add(result.value.id); months.add(result.value.month); payslips.push(result.value);
  }
  return { ok: true, value: { schemaVersion: 1, exportedAt: value.exportedAt, payslips }, warnings: [] };
}
export function serializeBackup(records: Payslip[], now: string): string {
  const result = parseBackup({ schemaVersion: 1, exportedAt: now, payslips: records });
  if (!result.ok) throw new Error('明細の検証に失敗したためバックアップを作成できません。');
  const text = JSON.stringify(result.value, null, 2);
  if (utf8Size(text) > MAX_BACKUP_BYTES) throw new Error('バックアップのサイズが2MBを超えています。');
  return text;
}
export function formatYen(value: number): string { return `${new Intl.NumberFormat('ja-JP').format(value)}円`; }
