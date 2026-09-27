import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SAMPLE_PAYSLIPS } from '../domain';
import type { Payslip } from '../domain';
import { createDemoRepository, createMemoryRepository } from './repository';
import { createSqliteRepository, type SqlConnection, type SqlDatabase } from './sqlite-repository';

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
function adapter(path: string): { db: SqlDatabase; raw: DatabaseSync; failInsert: (n: number) => void } {
  const raw = new DatabaseSync(path); let countdown = -1;
  const connection: SqlConnection = {
    async execAsync(sql) { raw.exec(sql); },
    async runAsync(sql, ...params) { if (sql.startsWith('INSERT') && --countdown === 0) throw new Error('injected sensitive SQL failure'); return raw.prepare(sql).run(...params); },
    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) { return raw.prepare(sql).all(...params) as T[]; },
    async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]) { return (raw.prepare(sql).get(...params) ?? null) as T | null; },
  };
  const db: SqlDatabase = { ...connection, async closeAsync() { raw.close(); }, async withExclusiveTransactionAsync(task) { raw.exec('BEGIN EXCLUSIVE'); try { await task(connection); raw.exec('COMMIT'); } catch (error) { raw.exec('ROLLBACK'); throw error; } } };
  return { db, raw, failInsert(n) { countdown = n; } };
}
function file() { const directory = mkdtempSync(join(tmpdir(), 'payslip-fictional-')); directories.push(directory); return join(directory, 'test.sqlite'); }
describe('actual SQLite repository', () => {
  it('persists CRUD through close and reopening a new connection', async () => {
    const path = file(); const first = await createSqliteRepository(adapter(path).db);
    await first.save(SAMPLE_PAYSLIPS[0]!); await first.save(SAMPLE_PAYSLIPS[1]!);
    const edited = { ...SAMPLE_PAYSLIPS[0]!, updatedAt: '2026-09-28T00:00:00.000Z' };
    await first.save(edited); await first.close();
    const second = await createSqliteRepository(adapter(path).db);
    expect(await second.list()).toEqual([SAMPLE_PAYSLIPS[1]!, edited]);
    await second.remove(edited.id); expect(await second.list()).toEqual([SAMPLE_PAYSLIPS[1]!]);
    await second.replaceAll([]); expect(await second.list()).toEqual([]); await second.close();
  });
  it('rolls back restore and item replacement after a mid-insert failure', async () => {
    const backing = adapter(file()); const repo = await createSqliteRepository(backing.db);
    await repo.save(SAMPLE_PAYSLIPS[0]!); const old = await repo.list();
    backing.failInsert(4); await expect(repo.replaceAll(SAMPLE_PAYSLIPS.slice(1, 3))).rejects.toThrow('保存処理に失敗');
    expect(await repo.list()).toEqual(old);
    backing.failInsert(3); await expect(repo.save({ ...SAMPLE_PAYSLIPS[0]!, updatedAt: '2026-09-28T00:00:00.000Z' })).rejects.toThrow('保存処理に失敗');
    expect(await repo.list()).toEqual(old); await repo.close();
  });
  it('serializes concurrent writes, rejects duplicates/invalid writes, surfaces corrupt reads', async () => {
    const backing = adapter(file()); const repo = await createSqliteRepository(backing.db);
    await Promise.all(SAMPLE_PAYSLIPS.map(p => repo.save(p)));
    expect(await repo.list()).toHaveLength(6);
    await expect(repo.save({ ...SAMPLE_PAYSLIPS[0]!, id: '30000000-0000-4000-8000-000000000001' })).rejects.toThrow('同じ支払月');
    await expect(repo.replaceAll([{ ...SAMPLE_PAYSLIPS[0]!, netPay: 1 }])).rejects.toThrow('検証');
    backing.raw.exec('UPDATE payslips SET netPay = 1');
    await expect(repo.list()).rejects.toThrow('読み取れません'); await repo.close();
  });
  it('keeps demo writes completely separate from the real database', async () => {
    const real = await createSqliteRepository(adapter(file()).db); await real.save(SAMPLE_PAYSLIPS[0]!);
    const before = await real.list(); const demo = createDemoRepository(); await demo.replaceAll([]); await demo.close();
    expect(await real.list()).toEqual(before); await real.close();
  });
});
it('memory repository snapshots data and validates before replacing', async () => {
  const repo = createMemoryRepository([SAMPLE_PAYSLIPS[0]!]); const records = await repo.list(); records[0]!.items[0]!.amount = 1;
  expect((await repo.list())[0]).toEqual(SAMPLE_PAYSLIPS[0]!);
  await expect(repo.replaceAll([SAMPLE_PAYSLIPS[0]!, SAMPLE_PAYSLIPS[0]!])).rejects.toThrow('検証');
  expect(await repo.list()).toHaveLength(1);
});
it('refuses writes that would make the complete saved history exceed the 2MB export limit', async () => {
  const history: Payslip[] = Array.from({ length: 80 }, (_, index) => ({
    id: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    month: `${2020 + Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`,
    grossPay: 0, totalDeductions: 0, netPay: 0,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    items: Array.from({ length: 100 }, (_, item) => ({ id: `20000000-0000-4000-8000-${String(item).padStart(12, '0')}`, label: '架'.repeat(40), category: 'earning', code: 'other', amount: 0 })),
  }));
  // This independently measures the actual interchange format, including UTF-8 labels.
  const byteSize = (records: Payslip[]) => Buffer.byteLength(JSON.stringify({ schemaVersion: 1, exportedAt: '2026-01-01T00:00:00.000Z', payslips: records }, null, 2), 'utf8');
  const firstOversized = history.findIndex((_, i) => byteSize(history.slice(0, i + 1)) > 2 * 1024 * 1024);
  expect(firstOversized).toBeGreaterThan(0);
  const within = history.slice(0, firstOversized);
  for (const factory of [async () => createMemoryRepository(), async () => createSqliteRepository(adapter(file()).db)]) {
    const repo = await factory();
    try {
      await repo.replaceAll(within);
      const before = await repo.list();
      await expect(repo.save(history[firstOversized]!)).rejects.toThrow('2MB');
      expect(await repo.list()).toEqual(before);
      await expect(repo.replaceAll(history)).rejects.toThrow('2MB');
      expect(await repo.list()).toEqual(before);
    } finally { await repo.close(); }
  }
});
