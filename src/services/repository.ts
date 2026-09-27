import type { Payslip } from '../domain';
import { SAMPLE_PAYSLIPS } from '../domain';
import { MAX_BACKUP_BYTES, parseBackup, utf8Size, validatePayslip } from '../domain/validation';

export interface PayslipRepository {
  list(): Promise<Payslip[]>;
  save(record: Payslip): Promise<void>;
  remove(id: string): Promise<void>;
  replaceAll(records: Payslip[]): Promise<void>;
  close(): Promise<void>;
}
export function validatedRecords(records: unknown): Payslip[] {
  const result = parseBackup({ schemaVersion: 1, exportedAt: '2026-01-01T00:00:00.000Z', payslips: records });
  if (!result.ok) throw new Error('明細データの検証に失敗しました。原本またはバックアップを確認してください。');
  // The complete history must remain exportable using the exact public backup representation.
  // exportedAt is a canonical ISO timestamp of fixed length, independent of the export date.
  if (utf8Size(JSON.stringify(result.value, null, 2)) > MAX_BACKUP_BYTES) throw new Error('全明細のバックアップが2MBを超えるため保存できません。既存データを書き出して保管し、不要な明細を整理してください。');
  return result.value.payslips;
}
export function validatedRecord(record: unknown): Payslip {
  const result = validatePayslip(record);
  if (!result.ok) throw new Error('明細データの検証に失敗しました。入力を確認してください。');
  return result.value;
}
export function createMemoryRepository(seed: Payslip[] = []): PayslipRepository {
  let records = validatedRecords(seed); let closed = false;
  const check = () => { if (closed) throw new Error('保存先は閉じています。画面を開き直してください。'); };
  return {
    async list() { check(); return validatedRecords(records).sort((a, b) => b.month.localeCompare(a.month)); },
    async save(input) {
      check(); const record = validatedRecord(input);
      const existing = records.find(p => p.id === record.id);
      if (existing && record.createdAt !== existing.createdAt) throw new Error('作成日時は変更できません。');
      if (records.some(p => p.month === record.month && p.id !== record.id)) throw new Error('同じ支払月の明細があります。既存の明細を編集してください。');
      records = validatedRecords([...records.filter(p => p.id !== record.id), record]);
    },
    async remove(id) { check(); records = records.filter(p => p.id !== id); },
    async replaceAll(next) { check(); records = validatedRecords(next); },
    async close() { closed = true; },
  };
}
export function createDemoRepository(): PayslipRepository { return createMemoryRepository(SAMPLE_PAYSLIPS); }
