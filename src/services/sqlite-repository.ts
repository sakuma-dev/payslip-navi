import type { Payslip, PayslipItem } from '../domain';
import type { PayslipRepository } from './repository';
import { validatedRecord, validatedRecords } from './repository';

export interface SqlConnection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
  getAllAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
}
export interface SqlDatabase extends SqlConnection {
  withExclusiveTransactionAsync(task: (transaction: SqlConnection) => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
}
const schema = `
CREATE TABLE payslips (
 id TEXT PRIMARY KEY NOT NULL, month TEXT UNIQUE NOT NULL,
 grossPay INTEGER NOT NULL, totalDeductions INTEGER NOT NULL, netPay INTEGER NOT NULL,
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE items (
 id TEXT NOT NULL, payslipId TEXT NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
 position INTEGER NOT NULL, label TEXT NOT NULL, category TEXT NOT NULL, code TEXT NOT NULL, amount INTEGER NOT NULL,
 PRIMARY KEY (payslipId, id)
);
PRAGMA user_version = 1;`;
type ItemRow = PayslipItem & { payslipId: string; position: number };
type PayslipRow = Omit<Payslip, 'items'>;
async function read(connection: SqlConnection): Promise<Payslip[]> {
  const rows = await connection.getAllAsync<PayslipRow>('SELECT * FROM payslips ORDER BY month DESC');
  const items = await connection.getAllAsync<ItemRow>('SELECT * FROM items ORDER BY position ASC');
  const ids = new Set(rows.map(p => p.id));
  if (items.some(i => !ids.has(i.payslipId))) throw new Error('保存データの関連付けが破損しています。');
  return validatedRecords(rows.map(row => ({ ...row, items: items.filter(i => i.payslipId === row.id).map(i => ({ id: i.id, label: i.label, category: i.category, code: i.code, amount: i.amount })) })));
}
async function insert(connection: SqlConnection, p: Payslip): Promise<void> {
  await connection.runAsync('INSERT INTO payslips (id,month,grossPay,totalDeductions,netPay,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)', p.id, p.month, p.grossPay, p.totalDeductions, p.netPay, p.createdAt, p.updatedAt);
  for (let i = 0; i < p.items.length; i++) {
    const item = p.items[i]!;
    await connection.runAsync('INSERT INTO items (id,payslipId,position,label,category,code,amount) VALUES (?,?,?,?,?,?,?)', item.id, p.id, i, item.label, item.category, item.code, item.amount);
  }
}
export async function createSqliteRepository(db: SqlDatabase): Promise<PayslipRepository> {
  try {
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (!version || ![0, 1].includes(version.user_version)) throw new Error('schema');
    if (version.user_version === 0) await db.withExclusiveTransactionAsync(async tx => { await tx.execAsync(schema); });
    await read(db);
  } catch { await db.closeAsync().catch(() => undefined); throw new Error('保存データを開けません。対応するアプリ版とバックアップを確認してください。'); }
  let tail: Promise<unknown> = Promise.resolve(); let closed = false;
  // Reads also join the queue so a list cannot observe parent/child writes halfway through.
  function queue<T>(operation: () => Promise<T>): Promise<T> {
    const next = tail.then(async () => { if (closed) throw new Error('保存先は閉じています。画面を開き直してください。'); return operation(); });
    tail = next.catch(() => undefined); return next;
  }
  async function mutate(task: (tx: SqlConnection) => Promise<void>): Promise<void> {
    try { await db.withExclusiveTransactionAsync(task); await read(db); }
    catch { throw new Error('保存処理に失敗しました。保存状態を再読込して確認してください。'); }
  }
  return {
    list: () => queue(async () => { try { return await read(db); } catch { throw new Error('保存データを読み取れません。バックアップを確認してください。'); } }),
    save: input => {
      // Snapshot before enqueue so caller mutation cannot change a queued write.
      let record: Payslip; try { record = validatedRecord(input); } catch (error) { return Promise.reject(error); }
      return queue(async () => {
        const records = await read(db);
        const existing = records.find(p => p.id === record.id);
        if (existing && existing.createdAt !== record.createdAt) throw new Error('作成日時は変更できません。');
        if (records.some(p => p.month === record.month && p.id !== record.id)) throw new Error('同じ支払月の明細があります。既存の明細を編集してください。');
        validatedRecords([...records.filter(p => p.id !== record.id), record]);
        await mutate(async tx => {
          // Expo's exclusive transaction uses a separate connection. Explicit child deletion
          // keeps integrity even when that connection does not inherit foreign_keys PRAGMA.
          await tx.runAsync('DELETE FROM items WHERE payslipId = ?', record.id);
          await tx.runAsync('DELETE FROM payslips WHERE id = ?', record.id);
          await insert(tx, record);
          await read(tx);
        });
      });
    },
    remove: id => queue(() => mutate(async tx => { await tx.runAsync('DELETE FROM items WHERE payslipId = ?', id); await tx.runAsync('DELETE FROM payslips WHERE id = ?', id); })),
    replaceAll: input => {
      let records: Payslip[]; try { records = validatedRecords(input); } catch (error) { return Promise.reject(error); }
      return queue(() => mutate(async tx => {
        await tx.execAsync('DELETE FROM items; DELETE FROM payslips;');
        for (const record of records) await insert(tx, record);
        const count = await tx.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM payslips');
        if (count?.count !== records.length) throw new Error('count');
        await read(tx);
      }));
    },
    close: () => queue(async () => { try { await db.closeAsync(); closed = true; } catch { throw new Error('保存先を閉じられませんでした。'); } }),
  };
}
