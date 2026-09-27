import type { OcrResult } from '../domain';
import { MAX_BACKUP_BYTES, parseBackup, utf8Size } from '../domain/validation';
import { createMemoryRepository, type PayslipRepository } from './repository';
export const isWebPreview = true;
export const isNativeOcrAvailable = false;
let repository: PayslipRepository | undefined;
export async function getRepository(): Promise<PayslipRepository> {
  if (!repository) {
    const memory = createMemoryRepository();
    let closed = false;
    repository = { ...memory, close: async () => {
      if (closed) return;
      closed = true;
      repository = undefined;
      await memory.close();
    } };
  }
  return repository;
}
export async function pickAndRecognizeImage(_source: 'camera' | 'library'): Promise<{ status: 'success'; result: OcrResult } | { status: 'cancelled' } | { status: 'permissionDenied' } | { status: 'unavailable' }> { return { status: 'unavailable' }; }
export async function cleanTemporaryFiles(): Promise<void> { /* Web holds no app-owned image cache. */ }
export function pickBackupText(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.oncancel = () => resolve(null);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      if (file.size > MAX_BACKUP_BYTES) { reject(new Error('バックアップは2MB以内にしてください。')); return; }
      file.text().then(text => {
        if (utf8Size(text) > MAX_BACKUP_BYTES) throw new Error('バックアップは2MB以内にしてください。');
        resolve(text);
      }).catch(() => reject(new Error('バックアップを読み取れませんでした。')));
    };
    input.click();
  });
}
export async function shareBackup(text: string): Promise<void> {
  if (!parseBackup(text).ok) throw new Error('バックアップの内容を検証できません。');
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'payslip-backup.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
