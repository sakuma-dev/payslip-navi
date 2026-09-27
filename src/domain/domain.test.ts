import { describe, expect, it } from 'vitest';
import { buildPayslip, buildTrend, comparePayslips, draftFromPayslip, parseBackup, parseOcr, parsePayslipText, SAMPLE_PAYSLIPS, serializeBackup } from './index';
import { parseYen } from './validation';
const original = SAMPLE_PAYSLIPS[0]!;
describe('strict yen and saved records', () => {
  it.each([['１２３，４５６円', 123456], ['￥1,000', 1000], ['△1,200', -1200], ['▲５００', -500], ['−50', -50], ['－５０', -50], ['(500)', -500], ['0', 0], ['', null], ['1.234', null], ['1,23', null], ['1、234', null], ['1O0', null], ['I00', null], ['l00', null], ['ー500', null], ['Infinity', null], ['1000000001', null]])('parses %s strictly', (text, amount) => expect(parseYen(String(text))).toBe(amount));
  it('requires confirmation and reconciles categories plus explicit adjustments', () => {
    const draft = draftFromPayslip(original);
    expect(buildPayslip(draft, original).ok).toBe(false);
    draft.confirmed = true;
    expect(buildPayslip(draft, original).ok).toBe(true);
    draft.netPay = String(original.netPay + 200);
    expect(buildPayslip(draft, original).ok).toBe(false);
    draft.items.push({ id: '30000000-0000-4000-8000-000000000001', label: '明細の調整', category: 'adjustment', code: 'other', amount: '200' });
    expect(buildPayslip(draft, original).ok).toBe(true);
    draft.items[0]!.amount = '1';
    expect(buildPayslip(draft, original).ok).toBe(false);
  });
  it('keeps negative net and missing breakdown as warnings', () => {
    const draft = { ...draftFromPayslip(original), items: [], grossPay: '0', totalDeductions: '100', netPay: '-100', confirmed: true };
    const result = buildPayslip(draft, original);
    expect(result.ok && result.warnings.length).toBe(3);
  });
  it('rejects invalid labels, UUIDs, dates and month', () => {
    for (const mutation of [{ month: '2026-13' }, { items: [{ ...draftFromPayslip(original).items[0]!, label: 'a\u0000b' }] }, { items: [{ ...draftFromPayslip(original).items[0]!, id: 'fake' }] }]) expect(buildPayslip({ ...draftFromPayslip(original), confirmed: true, ...mutation }, original).ok).toBe(false);
    expect(buildPayslip({ ...draftFromPayslip(original), confirmed: true }, { ...original, updatedAt: '2026-02-30T00:00:00.000Z' }).ok).toBe(false);
  });
  it('rejects known code/category mismatches and reports discrepancy at its total field', () => {
    const draft = { ...draftFromPayslip(original), confirmed: true };
    draft.items[0]!.category = 'deduction'; expect(buildPayslip(draft, original).ok).toBe(false);
    draft.items[0]!.category = 'earning'; draft.grossPay = String(original.grossPay + 100);
    const result = buildPayslip(draft, original);
    expect(!result.ok && result.errors.some(e => e.path === 'grossPay' && e.message.includes('-100円'))).toBe(true);
    draft.items[0]!.label = '\n基本給'; expect(buildPayslip(draft, original).ok).toBe(false);
  });
  it('reports arithmetic mismatches together with an empty month and unchecked confirmation', () => {
    const draft = { ...draftFromPayslip(original), month: '', grossPay: String(original.grossPay + 100) };
    const result = buildPayslip(draft, original);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map(e => e.path)).toEqual(expect.arrayContaining(['month', 'confirmed', 'grossPay', 'netPay']));
    expect(result.errors.find(e => e.path === 'grossPay')?.message).toContain('-100円');
    expect(result.errors.find(e => e.path === 'netPay')?.message).toContain('100円');
  });
});
describe('candidate parser', () => {
  it('warns on unknown label/value rows without copying the label or inventing an item', () => {
    const parsed = parsePayslipText('住宅手当 20,000\n基本給 280,000\n総支給額 300,000');
    expect(parsed.draft.items.map(i => i.code)).toEqual(['base']);
    expect(parsed.warnings.some(w => w.path === 'lines.0' && w.message.includes('未対応'))).toBe(true);
    expect(parsed.warnings.every(w => !w.message.includes('住宅手当'))).toBe(true);
  });
  it('rejects oversized text and OCR inputs with an explicit warning rather than partial candidates', () => {
    const tooLong = parsePayslipText(`基本給 280000\n${'x'.repeat(100_000)}`);
    const tooManyLines = parsePayslipText(`基本給 280000\n${'x\n'.repeat(1000)}`);
    const ocr = parseOcr({ imageSize: { width: 100, height: 100 }, lines: Array.from({ length: 1001 }, () => ({ text: '基本給 280000', box: { x: 0, y: 0, w: 1, h: 0.1 } })) });
    for (const parsed of [tooLong, tooManyLines, ocr]) {
      expect(parsed.draft.items).toEqual([]);
      expect(parsed.warnings.some(w => w.message.includes('上限'))).toBe(true);
    }
  });
  it('recognizes totals and items but not subtotals or transfer', () => {
    const parsed = parsePayslipText('支給日 令和8年9月25日\n基本給 280,000\n健康保険 15,000\n総支給額 280,000円\n控除合計 15,000\n振込額 265,000\n課税計 280,000\n差引支給額 265,000');
    expect(parsed.draft.month).toBe('2026-09'); expect(parsed.draft.items).toHaveLength(2); expect(parsed.draft.netPay).toBe('265000');
  });
  it.each([['支払日 平成30年4月25日', '2018-04'], ['支給日 令和元年5月1日', '2019-05'], ['支給日 平成元年1月7日', ''], ['支給日 令和元年4月30日', ''], ['支給日 平成31年5月1日', ''], ['支払日 2026年2月30日', ''], ['9月分', ''], ['支払日 2026-09-25', '2026-09']])('handles payment date %s', (text, month) => expect(parsePayslipText(text).draft.month).toBe(month));
  it('leaves duplicate totals and multiple dates unresolved', () => {
    const p = parsePayslipText('支給日 2026年9月25日\n支給日 2026年8月25日\n総支給額 100\n総支給額 200\n基本給 100\n基本給 200');
    expect(p.draft.month).toBe(''); expect(p.draft.grossPay).toBe(''); expect(p.draft.items).toEqual([]);
    expect(parsePayslipText('支給日 2026年9月25日 対象 2026年8月').draft.month).toBe('');
  });
  it.each(['-1,000', '△1,000', '▲1,000', '−1,000', '－１，０００'])('retains negative refund %s', amount => {
    expect(parsePayslipText(`所得税 ${amount}`).draft.items[0]?.amount).toBe('-1000');
  });
  it('does not associate multiple columns or vertically separated numbers', () => {
    expect(parsePayslipText('基本給 280000 健康保険 15000\n基本給\n280000').draft.items).toEqual([]);
  });
  it('treats parentheses as negative for text and unresolved for OCR', () => {
    expect(parsePayslipText('所得税 (1000)').draft.items[0]?.amount).toBe('-1000');
    expect(parseOcr({ imageSize: { width: 100, height: 100 }, lines: [{ text: '所得税 (1000)', box: { x: 0, y: 0, w: 1, h: 0.1 } }] }).draft.items).toEqual([]);
  });
});
describe('backup and comparison', () => {
  it('round-trips fictional data and strips unknown fields', () => {
    const result = parseBackup(serializeBackup(SAMPLE_PAYSLIPS, '2026-09-28T00:00:00.000Z'));
    expect(result.ok && result.value.payslips).toEqual(SAMPLE_PAYSLIPS);
    const extra = parseBackup({ schemaVersion: 1, exportedAt: '2026-09-28T00:00:00.000Z', payslips: [{ ...original, privateName: 'fictional' }], secret: true });
    expect(extra.ok && 'privateName' in extra.value.payslips[0]!).toBe(false);
  });
  it('rejects corruption, duplicate month/id, wrong version, size and numeric coercion', () => {
    const backup = { schemaVersion: 1, exportedAt: '2026-09-28T00:00:00.000Z', payslips: [original] };
    for (const bad of ['{', ' '.repeat(2 * 1024 * 1024 + 1), { ...backup, schemaVersion: 2 }, { ...backup, payslips: [original, original] }, { ...backup, payslips: [{ ...original, netPay: String(original.netPay) }] }, { ...backup, payslips: [{ ...original, netPay: NaN }] }, { ...backup, payslips: [{ ...original, netPay: 1.5 }] }, { ...backup, payslips: Array(601).fill(original) }]) expect(parseBackup(bad).ok).toBe(false);
  });
  it('uses calendar predecessor and prior year, leaving missing months empty', () => {
    expect(comparePayslips(SAMPLE_PAYSLIPS[2]!, [original]).previousMonth).toBeNull();
    const jan = { ...original, month: '2027-01' }; const dec = { ...original, month: '2026-12' }; const priorJan = { ...original, month: '2026-01' };
    expect(comparePayslips(jan, [dec, priorJan]).previousMonth).toBe(dec);
    expect(comparePayslips(jan, [dec, priorJan]).previousYear).toBe(priorJan);
    expect(buildTrend([original], 2026)[0]!.netPay).toBeNull();
  });
  it('groups other labels with NFKC/space normalization and marks added/removed', () => {
    const item = { ...original.items[0]!, code: 'other' as const };
    const now = { ...original, month: '2026-05', items: [{ ...item, label: 'Ａ 手当', amount: 30 }, { ...item, label: 'A手当', amount: 20 }] };
    const before = { ...original, items: [{ ...item, label: 'A手当', amount: 40 }, { ...item, label: '旧手当', amount: 10 }] };
    expect(comparePayslips(now, [before]).monthDifference?.items.map(i => [i.amount, i.change])).toEqual([[10, 'changed'], [-10, 'removed']]);
  });
  it('keeps numerical facts in differences and sourced possibilities in insights', () => {
    const compared = comparePayslips(SAMPLE_PAYSLIPS[2]!, SAMPLE_PAYSLIPS);
    expect(compared.monthDifference).not.toBeNull();
    expect(compared.insights.length).toBeGreaterThan(0);
    expect(compared.insights.every(i => i.sources.length > 0 && i.body.includes('特定できません'))).toBe(true);
    expect(compared.insights.some(i => i.title === '明細から分かる差額')).toBe(false);
  });
});
