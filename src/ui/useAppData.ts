import { useCallback, useEffect, useRef, useState } from 'react';
import type { Payslip } from '../domain';
import type { PayslipRepository } from '../services';
import { cleanTemporaryFiles, createDemoRepository, getRepository } from '../services';
import { errorMessage } from './format';

export type DataMode = 'real' | 'demo';
export type DataPhase =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'ready' };

export interface AppData {
  mode: DataMode;
  phase: DataPhase;
  records: Payslip[];
  // 保存・削除・置換の実行中。モード切替とナビゲーションを止めるために使う。
  busy: boolean;
  retry: () => Promise<void>;
  startDemo: () => Promise<void>;
  stopDemo: () => Promise<void>;
  save: (record: Payslip) => Promise<Payslip[]>;
  remove: (id: string) => Promise<Payslip[]>;
  replaceAll: (records: Payslip[]) => Promise<Payslip[]>;
}

const STALE_MESSAGE = '表示するデータが切り替わったため、結果を反映できませんでした。一覧を確認してください。';

// 実データとデモの切替を一か所に閉じ込める。
// - デモ中は realRepo に一切アクセスしない。準備失敗時に別方式の保存へ切り替えない。
// - generation を切替ごとに進め、古い非同期結果を新しいモードへ反映しない。
// - 書込操作は開始時の repository を捕捉し、完了後の再読込も同じ repository で行う。
export function useAppData(): AppData {
  const realRepo = useRef<PayslipRepository | null>(null);
  const demoRepo = useRef<PayslipRepository | null>(null);
  const modeRef = useRef<DataMode>('real');
  const generation = useRef(0);
  const pending = useRef(0);
  const [mode, setMode] = useState<DataMode>('real');
  const [phase, setPhase] = useState<DataPhase>({ status: 'loading' });
  const [records, setRecords] = useState<Payslip[]>([]);
  const [busy, setBusy] = useState(false);

  const openReal = useCallback(async () => {
    const gen = ++generation.current;
    setPhase({ status: 'loading' });
    try {
      const repo = realRepo.current ?? await getRepository();
      if (gen !== generation.current || modeRef.current !== 'real') return;
      realRepo.current = repo;
      const list = await repo.list();
      if (gen !== generation.current) return;
      setRecords(list);
      setPhase({ status: 'ready' });
    } catch (error) {
      if (gen !== generation.current) return;
      setPhase({ status: 'failed', message: errorMessage(error, '端末内のデータを準備できませんでした。') });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await cleanTemporaryFiles();
      } catch {
        // 一時ファイル掃除の失敗は起動を止めない（内容はログに出さない）。
      }
      if (!cancelled) await openReal();
    })();
    return () => {
      cancelled = true;
      generation.current += 1;
      const real = realRepo.current;
      const demo = demoRepo.current;
      realRepo.current = null;
      demoRepo.current = null;
      real?.close().catch(() => undefined);
      demo?.close().catch(() => undefined);
    };
  }, [openReal]);

  const startDemo = useCallback(async () => {
    if (pending.current > 0 || modeRef.current === 'demo') return;
    const gen = ++generation.current;
    modeRef.current = 'demo';
    setMode('demo');
    setRecords([]);
    setPhase({ status: 'loading' });
    try {
      const repo = createDemoRepository();
      demoRepo.current = repo;
      const list = await repo.list();
      if (gen !== generation.current) return;
      setRecords(list);
      setPhase({ status: 'ready' });
    } catch (error) {
      if (gen !== generation.current) return;
      setPhase({ status: 'failed', message: errorMessage(error, 'デモを開始できませんでした。') });
    }
  }, []);

  const stopDemo = useCallback(async () => {
    if (pending.current > 0 || modeRef.current !== 'demo') return;
    const repo = demoRepo.current;
    demoRepo.current = null;
    modeRef.current = 'real';
    setMode('real');
    setRecords([]);
    try {
      await repo?.close();
    } catch {
      // デモはメモリのみのため破棄に失敗しても実データへ影響しない。
    }
    await openReal();
  }, [openReal]);

  const retry = useCallback(async () => {
    if (modeRef.current === 'demo') {
      modeRef.current = 'real';
      demoRepo.current = null;
      await startDemo();
    } else {
      await openReal();
    }
  }, [openReal, startDemo]);

  const run = useCallback(async (
    operation: (repo: PayslipRepository) => Promise<void>,
    options: { realOnly?: boolean } = {},
  ): Promise<Payslip[]> => {
    const gen = generation.current;
    const currentMode = modeRef.current;
    if (options.realOnly && currentMode === 'demo') throw new Error('デモ中は復元・全削除を利用できません。');
    const repo = currentMode === 'demo' ? demoRepo.current : realRepo.current;
    if (!repo) throw new Error('データの準備ができていません。画面を開き直してください。');
    pending.current += 1;
    setBusy(true);
    try {
      await operation(repo);
      const list = await repo.list();
      if (gen !== generation.current) throw new Error(STALE_MESSAGE);
      setRecords(list);
      return list;
    } finally {
      pending.current -= 1;
      if (pending.current === 0) setBusy(false);
    }
  }, []);

  const save = useCallback((record: Payslip) => run((repo) => repo.save(record)), [run]);
  const remove = useCallback((id: string) => run((repo) => repo.remove(id)), [run]);
  const replaceAll = useCallback(
    (next: Payslip[]) => run((repo) => repo.replaceAll(next), { realOnly: true }),
    [run],
  );

  return { mode, phase, records, busy, retry, startDemo, stopDemo, save, remove, replaceAll };
}
