import type { Category, ItemCode, OcrResult, ParsedDraft } from './types';
import { emptyDraft, parseYen, validMonth } from './validation';

const definitions: { labels: string[]; code: ItemCode; category: Category }[] = [
  { labels: ['基本給', '本給'], code: 'base', category: 'earning' },
  { labels: ['時間外手当', '残業手当', '残業代'], code: 'overtime', category: 'earning' },
  { labels: ['通勤手当', '交通費'], code: 'commute', category: 'earning' },
  { labels: ['健康保険料', '健康保険'], code: 'health', category: 'deduction' },
  { labels: ['介護保険料', '介護保険'], code: 'care', category: 'deduction' },
  { labels: ['厚生年金保険料', '厚生年金', '年金保険料'], code: 'pension', category: 'deduction' },
  { labels: ['雇用保険料', '雇用保険'], code: 'employment', category: 'deduction' },
  { labels: ['所得税', '源泉所得税'], code: 'incomeTax', category: 'deduction' },
  { labels: ['住民税', '市県民税'], code: 'residentTax', category: 'deduction' },
];
const totals = new Map<string, 'grossPay' | 'totalDeductions' | 'netPay'>([
  ['総支給額', 'grossPay'], ['総支給', 'grossPay'], ['支給合計', 'grossPay'], ['支給合計額', 'grossPay'],
  ['控除合計', 'totalDeductions'], ['控除合計額', 'totalDeductions'], ['総控除額', 'totalDeductions'],
  ['差引支給額', 'netPay'], ['差引支給', 'netPay'], ['差引給与額', 'netPay'], ['手取額', 'netPay'], ['手取り額', 'netPay'],
]);
const MAX_TEXT_LENGTH = 100_000;
const MAX_LINES = 1000;
const limitExceeded = (): ParsedDraft => ({ draft: emptyDraft(), warnings: [{ path: 'lines', message: '読取入力の上限（10万文字・1000行）を超えています。一部だけを採用せず、候補の生成を中止しました。明細1件分に絞るか手入力してください。' }] });
function dateMonth(text: string): string | null {
  const era = /(令和|平成|昭和)(元|\d+)年\s*(\d{1,2})月(?:\s*(\d{1,2})日)?/.exec(text);
  let year: number; let month: number; let day: number | undefined;
  if (era) {
    const eraYear = era[2] === '元' ? 1 : Number(era[2]);
    if (eraYear < 1) return null;
    year = ({ 令和: 2018, 平成: 1988, 昭和: 1925 }[era[1] as '令和' | '平成' | '昭和']) + eraYear;
    month = Number(era[3]); day = era[4] ? Number(era[4]) : undefined;
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day ?? 1).padStart(2, '0')}`;
    const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(day ?? 31).padStart(2, '0')}`;
    const bounds = { 令和: ['2019-05-01', '2199-12-31'], 平成: ['1989-01-08', '2019-04-30'], 昭和: ['1926-12-25', '1989-01-07'] }[era[1] as '令和' | '平成' | '昭和'];
    if (endOfMonth < bounds[0]! || date > bounds[1]!) return null;
  } else {
    const western = /\b((?:19|20|21)\d{2})\s*[年/.-]\s*(\d{1,2})(?:月|(?=[/.-])|\b)(?:\s*[/.-]?\s*(\d{1,2})日?)?/.exec(text);
    if (!western) return null;
    year = Number(western[1]); month = Number(western[2]); day = western[3] ? Number(western[3]) : undefined;
  }
  const result = `${year}-${String(month).padStart(2, '0')}`;
  if (!validMonth(result)) return null;
  if (day !== undefined && (day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate())) return null;
  return result;
}
function parseLines(lines: string[], ocr: boolean): ParsedDraft {
  if (lines.length > MAX_LINES || lines.reduce((length, line) => length + line.length, 0) > MAX_TEXT_LENGTH) return limitExceeded();
  const draft = emptyDraft();
  const warnings: ParsedDraft['warnings'] = [];
  const warn = (path: string, message: string) => warnings.push({ path, message });
  const months = new Set<string>();
  let ambiguousMonth = false;
  const seen = new Set<string>(); const duplicated = new Set<string>();
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!.normalize('NFKC').trim();
    const path = `lines.${index}`;
    if (!line) continue;
    if (/(支給日|支払日|支払年月|支給年月|支払月)/.test(line)) {
      const dateStarts = line.match(/(?:(?:19|20|21)\d{2}\s*[年/.-]|(?:令和|平成|昭和)(?:元|\d+)年)/g) ?? [];
      if (dateStarts.length > 1) { ambiguousMonth = true; warn('month', '同じ行に複数の年月があります。支払月を確認してください。'); continue; }
      const month = dateMonth(line);
      if (month) months.add(month); else warn('month', '支払年月を確定できません。原本から入力してください。');
      continue;
    }
    // The complete line must be a single label/value pair. Never zip table columns.
    const pair = /^([^0-9¥￥△▲−()]+?)\s*[:：]?\s*([△▲−-]?\s*[¥￥]?\s*\(?[^\s]+(?:\s*円)?\)?)$/.exec(line);
    if (!pair) { if (/\d/.test(line) && /(給|税|保険|年金|手当|控除|計)/.test(line)) warn(path, '項目と金額を一意に対応付けられない行があります。原本を確認してください。'); continue; }
    const label = pair[1]!.replace(/[\s:：]/g, '');
    const amountText = pair[2]!.trim();
    const total = totals.get(label);
    const definition = definitions.find(d => d.labels.includes(label));
    if (!total && !definition) {
      if (/(計|振込|課税|非課税|調整)/.test(label)) warn(path, '小計・振込額・調整額は自動採用しません。必要な項目を手動で確認してください。');
      else if (parseYen(amountText) !== null) warn(path, '未対応の項目と金額がある行です。原本を確認し、必要なら手動で追加してください。');
      continue;
    }
    const key = total ?? `${definition!.category}:${definition!.code}`;
    if (seen.has(key)) { duplicated.add(key); warn(path, '同じ項目の候補が複数あります。自動採用せず確認してください。'); }
    seen.add(key);
    const amount = parseYen(amountText);
    if (amount === null || (ocr && /[()]/.test(amountText))) { warn(path, '金額が不明確です。括弧・桁区切り・符号を原本で確認してください。'); continue; }
    if (total) draft[total] = String(amount);
    else draft.items.push({ id: `candidate-${index}`, label, code: definition!.code, category: definition!.category, amount: String(amount) });
  }
  for (const key of duplicated) {
    if (key === 'grossPay' || key === 'totalDeductions' || key === 'netPay') draft[key] = '';
    else draft.items = draft.items.filter(i => `${i.category}:${i.code}` !== key);
  }
  if (months.size === 1 && !ambiguousMonth) draft.month = [...months][0]!;
  else warn('month', months.size > 1 ? '支払年月に複数の候補があります。支払月を確認してください。' : '支払月は未確定です。給与が支払われた年月を入力してください。');
  warn('confirmed', '読み取り結果は候補です。原本と照合して訂正してください。');
  return { draft, warnings };
}
export function parsePayslipText(text: string): ParsedDraft { return text.length > MAX_TEXT_LENGTH ? limitExceeded() : parseLines(text.split(/\r?\n/), false); }
export function parseOcr(result: OcrResult): ParsedDraft {
  if (result.lines.length > MAX_LINES || result.lines.reduce((length, line) => length + line.text.length, 0) > MAX_TEXT_LENGTH) return limitExceeded();
  const valid = result.lines.filter(line => {
    const { x, y, w, h } = line.box;
    return [x, y, w, h].every(Number.isFinite) && x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1.001 && y + h <= 1.001;
  });
  // Native recognizers provide complete lines; coordinates only order them, never infer associations.
  const parsed = parseLines([...valid].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x).map(l => l.text), true);
  if (valid.length !== result.lines.length) parsed.warnings.push({ path: 'lines', message: '位置が不正な読取候補を除外しました。原本を確認してください。' });
  return parsed;
}
