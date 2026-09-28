import type { Category, Difference, Payslip } from '../domain';

// 表示専用の純粋関数。金額の解釈・比較はdomainの結果を使い、ここでは並べ方と寸法だけを決める。

export type SizeClass = 'compact' | 'regular' | 'wide';

export const CONTENT_MAX_WIDTH = 640;

export interface LayoutMetrics {
  sizeClass: SizeClass;
  // 画面左右の余白
  gutter: number;
  // 本文列の幅（ガターを除き、最大幅で制限した値）
  contentWidth: number;
  // ステージに重なる白いシートの内側padding
  sheetPadding: number;
}

export function layoutMetrics(width: number): LayoutMetrics {
  const sizeClass: SizeClass = width < 360 ? 'compact' : width < 600 ? 'regular' : 'wide';
  const gutter = sizeClass === 'compact' ? 16 : 20;
  return {
    sizeClass,
    gutter,
    contentWidth: Math.max(0, Math.min(width - gutter * 2, CONTENT_MAX_WIDTH)),
    sheetPadding: sizeClass === 'compact' ? 16 : 20,
  };
}

// 保守的な文字幅（em）。数字は等幅数字を前提に実際のシステムフォントより広めに見積もる。
const DIGIT_EM = 0.6;
const SEPARATOR_EM = 0.3;
const SIGN_EM = 0.6;
const WIDE_EM = 1;
const OTHER_EM = 0.6;

function charEm(char: string): number {
  if (/[0-9]/.test(char)) return DIGIT_EM;
  if (char === ',' || char === '.' || char === ' ') return SEPARATOR_EM;
  if (char === '-' || char === '+' || char === '±' || char === '−') return SIGN_EM;
  // 全角（円・漢字・かな）
  if (char.charCodeAt(0) > 0x2e7f) return WIDE_EM;
  return OTHER_EM;
}

export function estimateTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const char of text) em += charEm(char);
  // 浮動小数の誤差で境界が揺れないよう、0.01px単位に丸める。
  return Math.round(em * fontSize * 100) / 100;
}

// 「1,234,567円」を符号付き数字と単位に分ける（表示文字列は formatYen の結果のまま）。
export function splitYen(text: string): { number: string; unit: string } {
  return text.endsWith('円') ? { number: text.slice(0, -1), unit: '円' } : { number: text, unit: '' };
}

export const DISPLAY_STEPS = [44, 38, 32, 28, 24] as const;
const DISPLAY_MIN = 24;
export const DISPLAY_MAX_SCALE = 1.3;
export const DISPLAY_UNIT_RATIO = 0.6;

// ステージの手取りの文字サイズ。まず「数字＋円」が1行に収まる最大の段を選び、
// どれも収まらなければ数字だけが収まる段を選ぶ（その場合「円」だけが次の行へ回る）。
export function displayStep(text: string, availableWidth: number, fontScale = 1): number {
  const scale = Math.min(Math.max(fontScale, 1), DISPLAY_MAX_SCALE);
  const { number, unit } = splitYen(text);
  const widthAt = (size: number) => ({
    number: estimateTextWidth(number, size * scale),
    whole: estimateTextWidth(number, size * scale) + estimateTextWidth(unit, size * DISPLAY_UNIT_RATIO * scale),
  });
  for (const size of DISPLAY_STEPS) {
    if (widthAt(size).whole <= availableWidth) return size;
  }
  for (const size of DISPLAY_STEPS) {
    if (widthAt(size).number <= availableWidth) return size;
  }
  return DISPLAY_MIN;
}

export const TILE_MONEY_STEPS = [20, 18, 16, 14] as const;
const TILE_MONEY_MIN = 14;
export const TILE_MAX_SCALE = 1.6;

export interface TileLayout {
  columns: 1 | 2;
  gap: number;
  padding: number;
  // タイル内の金額の文字サイズ（OS文字サイズの倍率を掛ける前）
  fontSize: number;
}

export function tileSpacing(sizeClass: SizeClass): { gap: number; padding: number } {
  return sizeClass === 'compact' ? { gap: 8, padding: 12 } : { gap: 12, padding: 12 };
}

// 数値タイルを2列にできるかを、コンテナ内幅・タイルのgap/padding・最長の金額・文字倍率から決める。
export function tileColumns(
  containerWidth: number,
  fontScale: number,
  texts: string[],
  spacing: { gap: number; padding: number } = { gap: 12, padding: 12 },
): TileLayout {
  const scale = Math.min(Math.max(fontScale, 1), TILE_MAX_SCALE);
  const widest = (size: number) => Math.max(0, ...texts.map((t) => estimateTextWidth(t, size * scale)));
  const twoColumnInner = (containerWidth - spacing.gap) / 2 - spacing.padding * 2;
  if (texts.length > 1 && widest(TILE_MONEY_STEPS[0]) <= twoColumnInner) {
    return { columns: 2, ...spacing, fontSize: TILE_MONEY_STEPS[0] };
  }
  const oneColumnInner = containerWidth - spacing.padding * 2;
  const numberWidest = (size: number) => Math.max(0, ...texts.map((t) => estimateTextWidth(splitYen(t).number, size * scale)));
  const fontSize = TILE_MONEY_STEPS.find((size) => widest(size) <= oneColumnInner)
    ?? TILE_MONEY_STEPS.find((size) => numberWidest(size) <= oneColumnInner)
    ?? TILE_MONEY_MIN;
  return { columns: 1, ...spacing, fontSize };
}

export type SplitBarModel =
  | {
    visible: true;
    grossPay: number;
    netPay: number;
    totalDeductions: number;
    // 描く区画（0円の区画は含めない）。weight は総支給に対する比率で、最小幅は足さない。
    segments: { kind: 'net' | 'deductions'; amount: number; weight: number }[];
    gap: boolean;
  }
  | { visible: false; reason: 'noGross' | 'negative' | 'adjusted' };

// 「総支給 = 手取り + 控除合計」がそのまま成り立つ明細だけ、構成の帯を描く。
export function splitBarModel(record: Pick<Payslip, 'grossPay' | 'totalDeductions' | 'netPay'>): SplitBarModel {
  const { grossPay, totalDeductions, netPay } = record;
  if (!(grossPay > 0)) return { visible: false, reason: 'noGross' };
  if (totalDeductions < 0 || netPay < 0) return { visible: false, reason: 'negative' };
  if (grossPay - totalDeductions !== netPay) return { visible: false, reason: 'adjusted' };
  const segments: { kind: 'net' | 'deductions'; amount: number; weight: number }[] = [];
  if (netPay > 0) segments.push({ kind: 'net', amount: netPay, weight: netPay / grossPay });
  if (totalDeductions > 0) segments.push({ kind: 'deductions', amount: totalDeductions, weight: totalDeductions / grossPay });
  return { visible: true, grossPay, netPay, totalDeductions, segments, gap: segments.length === 2 };
}

export type DeltaSubject = 'netPay' | 'grossPay' | 'totalDeductions' | Category;
export type DeltaEmphasis = 'direction' | 'neutral';

// 手取り・総支給・支給項目は増減の方向色、控除・調整は良し悪しを示さない中立色。
export function deltaEmphasis(subject: DeltaSubject): DeltaEmphasis {
  return subject === 'netPay' || subject === 'grossPay' || subject === 'earning' ? 'direction' : 'neutral';
}

type ItemChange = Difference['items'][number];

// 差の絶対値が大きい順（同じ大きさは元の順）に並べる。limit を省略すると全件。
export function topItemChanges(items: ItemChange[], limit?: number): ItemChange[] {
  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Math.abs(b.item.amount) - Math.abs(a.item.amount) || a.index - b.index)
    .map((entry) => entry.item);
  return limit === undefined ? sorted : sorted.slice(0, limit);
}

const BREAKDOWN_CATEGORIES: Category[] = ['earning', 'deduction'];

export interface ComparableItemChanges {
  // 比べた区分の項目差
  items: ItemChange[];
  // どちらかの月にその区分の項目が1件もないため、項目を比べなかった区分。
  // 「未登録」か「本当に0件（控除0円など）」かは区別できないので、事実だけを示す。
  notCompared: Category[];
  // 比べた支給・控除のうち、項目の差が1件もなかった区分
  unchanged: Category[];
}

// 支給・控除のどちらかの月に項目が1件もなければ、その区分の差を「追加/なくなった」と見せずに比較から外す。
// 調整は無い月が普通にあるため、この判定の対象にしない。
export function comparableItemChanges(
  items: ItemChange[],
  current: Pick<Payslip, 'items'>,
  previous: Pick<Payslip, 'items'> | null,
): ComparableItemChanges {
  if (!previous) return { items: [], notCompared: [], unchanged: [] };
  const has = (p: Pick<Payslip, 'items'>, category: Category) => p.items.some((i) => i.category === category);
  const notCompared = BREAKDOWN_CATEGORIES.filter((c) => !has(current, c) || !has(previous, c));
  const compared = items.filter((i) => !notCompared.includes(i.category));
  const unchanged = BREAKDOWN_CATEGORIES.filter((c) => !notCompared.includes(c) && !compared.some((i) => i.category === c));
  return { items: compared, notCompared, unchanged };
}
