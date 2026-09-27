import type { Comparison, Difference, Payslip } from './types';
import { GUIDE_ENTRIES } from './guides';
function difference(current: Payslip, previous: Payslip): Difference {
  const group = (p: Payslip) => {
    const map = new Map<string, { label: string; category: Payslip['items'][number]['category']; amount: number }>();
    for (const item of p.items) {
      const key = `${item.category}:${item.code === 'other' ? item.label.normalize('NFKC').replace(/\s/g, '') : item.code}`;
      const existing = map.get(key);
      map.set(key, { label: item.label, category: item.category, amount: (existing?.amount ?? 0) + item.amount });
    }
    return map;
  };
  const now = group(current); const before = group(previous);
  const items: Difference['items'] = [];
  for (const key of new Set([...now.keys(), ...before.keys()])) {
    const a = now.get(key); const b = before.get(key);
    const amount = (a?.amount ?? 0) - (b?.amount ?? 0);
    if (amount !== 0 || !a || !b) items.push({ label: (a ?? b)!.label, category: (a ?? b)!.category, amount, change: !b ? 'added' : !a ? 'removed' : 'changed' });
  }
  return { grossPay: current.grossPay - previous.grossPay, totalDeductions: current.totalDeductions - previous.totalDeductions, netPay: current.netPay - previous.netPay, items };
}
export function comparePayslips(current: Payslip, history: Payslip[]): Comparison {
  const year = Number(current.month.slice(0, 4)); const month = Number(current.month.slice(5));
  const prior = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  const previousMonth = history.find(p => p.month === prior) ?? null;
  const previousYear = history.find(p => p.month === `${year - 1}-${String(month).padStart(2, '0')}`) ?? null;
  const monthDifference = previousMonth ? difference(current, previousMonth) : null;
  const insights: Comparison['insights'] = [];
  if (monthDifference) {
    for (const code of ['residentTax', 'pension', 'health'] as const) {
      const total = (p: Payslip) => p.items.filter(i => i.code === code && i.category === 'deduction').reduce((s, i) => s + i.amount, 0);
      if (total(current) !== total(previousMonth!)) {
        const guide = GUIDE_ENTRIES.find(g => g.code === code)!;
        insights.push({ title: `${guide.title}が変わった場合の確認候補`, body: `${guide.description} この差額だけで変更理由は特定できません。`, sources: guide.sources });
      }
    }
  }
  return { previousMonth, previousYear, monthDifference, yearDifference: previousYear ? difference(current, previousYear) : null, insights };
}
export function buildTrend(history: Payslip[], year: number): { month: string; netPay: number | null }[] {
  return Array.from({ length: 12 }, (_, i) => { const month = `${year}-${String(i + 1).padStart(2, '0')}`; return { month, netPay: history.find(p => p.month === month)?.netPay ?? null }; });
}
