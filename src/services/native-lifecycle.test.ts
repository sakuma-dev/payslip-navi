import { DatabaseSync } from 'node:sqlite';
import { afterEach, expect, it, vi } from 'vitest';
import type { SqlConnection, SqlDatabase } from './sqlite-repository';

// Replace system bridges only. Lifecycle tests use the real repository and a real SQLite engine.
const bridges = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('../../modules/payslip-ocr', () => ({ default: { prepareStorage: async () => 'file:///private/fictional-db/' } }));
vi.mock('expo-sqlite', () => ({ openDatabaseAsync: bridges.open }));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-image-manipulator', () => ({}));
vi.mock('expo-file-system/legacy', () => ({}));
vi.mock('expo-document-picker', () => ({}));
vi.mock('expo-sharing', () => ({}));
vi.mock('expo-crypto', () => ({}));
afterEach(() => { vi.resetModules(); vi.clearAllMocks(); });

function database(closeGate: Promise<void> = Promise.resolve()): SqlDatabase {
  const raw = new DatabaseSync(':memory:');
  const connection: SqlConnection = {
    async execAsync(sql) { raw.exec(sql); },
    async runAsync(sql, ...params) { return raw.prepare(sql).run(...params); },
    async getAllAsync<T>(sql: string, ...params: (string | number | null)[]) { return raw.prepare(sql).all(...params) as T[]; },
    async getFirstAsync<T>(sql: string, ...params: (string | number | null)[]) { return (raw.prepare(sql).get(...params) ?? null) as T | null; },
  };
  return { ...connection, async closeAsync() { await closeGate; raw.close(); }, async withExclusiveTransactionAsync(task) { raw.exec('BEGIN EXCLUSIVE'); try { await task(connection); raw.exec('COMMIT'); } catch (error) { raw.exec('ROLLBACK'); throw error; } } };
}

it('waits for the previous connection to close before serving a usable replacement', async () => {
  let finishClose!: () => void;
  const closeGate = new Promise<void>(resolve => { finishClose = resolve; });
  bridges.open.mockResolvedValueOnce(database(closeGate)).mockImplementation(() => database());
  const api = await import('./platform.native');
  const first = await api.getRepository();
  const closing = first.close();
  let replacementResolved = false;
  const replacing = api.getRepository().then(repo => { replacementResolved = true; return repo; });
  try {
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(replacementResolved).toBe(false);
    expect(bridges.open).toHaveBeenCalledTimes(1);
  } finally { finishClose(); await closing; }
  const second = await replacing;
  expect(second).not.toBe(first);
  expect(await second.list()).toEqual([]);
  await second.close();
});
