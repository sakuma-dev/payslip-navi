import type { Category, ItemCode } from '../domain';
import { formatYen } from '../domain';

// 表示専用の整形。金額の解釈・検証はdomainが担う。

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export function monthLabel(month: string): string {
  const match = MONTH_PATTERN.exec(month);
  if (!match) return month || '支払月未確定';
  return `${match[1]}年${Number(match[2])}月`;
}

export function shiftMonth(month: string, delta: number): string | null {
  const match = MONTH_PATTERN.exec(month);
  if (!match) return null;
  const index = Number(match[1]) * 12 + (Number(match[2]) - 1) + delta;
  const year = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${year}-${String(m).padStart(2, '0')}`;
}

export function monthYear(month: string): number | null {
  const match = MONTH_PATTERN.exec(month);
  return match ? Number(match[1]) : null;
}

export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function signedYen(value: number): string {
  if (value > 0) return `+${formatYen(value)}`;
  if (value === 0) return `±${formatYen(0)}`;
  return formatYen(value);
}

export function changeWord(value: number): string {
  if (value > 0) return '増';
  if (value < 0) return '減';
  return '変化なし';
}

// 読み上げ用: 123456 → 「12万3456円」、負値は「マイナス」。
export function yenSpeech(value: number): string {
  const sign = value < 0 ? 'マイナス' : '';
  let rest = Math.abs(Math.trunc(value));
  const oku = Math.floor(rest / 100_000_000);
  rest %= 100_000_000;
  const man = Math.floor(rest / 10_000);
  const ichi = rest % 10_000;
  let text = '';
  if (oku) text += `${oku}億`;
  if (man) text += `${man}万`;
  if (ichi || !text) text += `${ichi}`;
  return `${sign}${text}円`;
}

export function signedSpeech(value: number): string {
  if (value === 0) return '変化なし';
  return `${value > 0 ? 'プラス' : 'マイナス'}${yenSpeech(Math.abs(value))}`;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  earning: '支給',
  deduction: '控除',
  adjustment: '調整（差引後の加減算）',
};

export const CATEGORY_SHORT: Record<Category, string> = {
  earning: '支給',
  deduction: '控除',
  adjustment: '調整',
};

export const CODE_LABEL: Record<ItemCode, string> = {
  base: '基本給',
  overtime: '時間外手当',
  commute: '通勤手当',
  health: '健康保険',
  care: '介護保険',
  pension: '厚生年金',
  employment: '雇用保険',
  incomeTax: '所得税',
  residentTax: '住民税',
  other: 'その他',
};

export const CODES_BY_CATEGORY: Record<Category, ItemCode[]> = {
  earning: ['base', 'overtime', 'commute', 'other'],
  deduction: ['health', 'care', 'pension', 'employment', 'incomeTax', 'residentTax', 'other'],
  adjustment: ['other'],
};

export function errorMessage(error: unknown, fallback = '処理できませんでした。もう一度お試しください。'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
