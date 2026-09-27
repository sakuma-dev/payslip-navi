import type { Payslip } from './types';
/** Entirely fictional monthly payslips; no employer or person's data. */
export const SAMPLE_PAYSLIPS: Payslip[] = [4, 5, 6, 7, 8, 9].map((month, index) => {
  const overtime = [12000, 18000, 9000, 21000, 15000, 24000][index]!;
  const resident = month < 6 ? 13000 : 14500;
  const values = [280000, overtime, 10000, 15500, 27450, 1800, 6200, resident];
  const labels = ['基本給', '時間外手当', '通勤手当', '健康保険', '厚生年金', '雇用保険', '所得税', '住民税'];
  const codes = ['base', 'overtime', 'commute', 'health', 'pension', 'employment', 'incomeTax', 'residentTax'] as const;
  const grossPay = values.slice(0, 3).reduce((a, b) => a + b, 0);
  const totalDeductions = values.slice(3).reduce((a, b) => a + b, 0);
  return { id: `10000000-0000-4000-8000-${String(month).padStart(12, '0')}`, month: `2026-${String(month).padStart(2, '0')}`, items: values.map((amount, i) => ({ id: `20000000-0000-4000-8000-${String(month * 100 + i).padStart(12, '0')}`, label: labels[i]!, category: i < 3 ? 'earning' : 'deduction', code: codes[i]!, amount })), grossPay, totalDeductions, netPay: grossPay - totalDeductions, createdAt: `2026-${String(month).padStart(2, '0')}-25T00:00:00.000Z`, updatedAt: `2026-${String(month).padStart(2, '0')}-25T00:00:00.000Z` };
});
