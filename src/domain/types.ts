export type Category = 'earning' | 'deduction' | 'adjustment';
export type ItemCode = 'base' | 'overtime' | 'commute' | 'health' | 'care' | 'pension' | 'employment' | 'incomeTax' | 'residentTax' | 'other';
export interface PayslipItem { id: string; label: string; category: Category; amount: number; code: ItemCode; }
export interface DraftItem extends Omit<PayslipItem, 'amount'> { amount: string; }
export interface PayslipDraft { month: string; items: DraftItem[]; grossPay: string; totalDeductions: string; netPay: string; confirmed: boolean; }
export interface Payslip { id: string; month: string; items: PayslipItem[]; grossPay: number; totalDeductions: number; netPay: number; createdAt: string; updatedAt: string; }
export interface Issue { path: string; message: string; }
export type Result<T> = { ok: true; value: T; warnings: Issue[] } | { ok: false; errors: Issue[] };
export interface OcrLine { text: string; box: { x: number; y: number; w: number; h: number }; confidence?: number; }
export interface OcrResult { lines: OcrLine[]; imageSize: { width: number; height: number }; }
export interface ParsedDraft { draft: PayslipDraft; warnings: Issue[]; }
export interface Source { title: string; url: string; checkedAt: string; }
export interface GuideEntry { code: ItemCode; title: string; description: string; sources: Source[]; }
export interface Difference { grossPay: number; totalDeductions: number; netPay: number; items: { label: string; category: Category; amount: number; change: 'changed' | 'added' | 'removed' }[]; }
export interface Comparison { previousMonth: Payslip | null; previousYear: Payslip | null; monthDifference: Difference | null; yearDifference: Difference | null; insights: { title: string; body: string; sources: Source[] }[]; }
export interface Backup { schemaVersion: 1; exportedAt: string; payslips: Payslip[]; }
