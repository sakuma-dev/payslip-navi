import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as Picker from 'expo-image-picker';
import * as Manipulator from 'expo-image-manipulator';
import * as Files from 'expo-file-system/legacy';
import * as Documents from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { randomUUID } from 'expo-crypto';
import NativeOcr from '../../modules/payslip-ocr';
import type { OcrResult } from '../domain';
import { MAX_BACKUP_BYTES, parseBackup, utf8Size } from '../domain/validation';
import type { PayslipRepository } from './repository';
import { createSqliteRepository } from './sqlite-repository';

export const isWebPreview = false;
export const isNativeOcrAvailable = NativeOcr !== null;
let repository: Promise<PayslipRepository> | undefined;
let closing: Promise<void> | undefined;
export function getRepository(): Promise<PayslipRepository> {
  if (!repository) repository = (async () => {
    if (!NativeOcr) throw new Error('端末保存の保護機能がありません。開発ビルドを利用するか、サンプルで体験してください。');
    try {
      // Expo may cache the underlying connection, so a new open must wait for its close.
      await closing;
      const directory = await NativeOcr.prepareStorage();
      if (!directory) throw new Error('directory');
      const db = await SQLite.openDatabaseAsync('payslips.sqlite', {}, directory);
      const repo = await createSqliteRepository(db);
      let closePromise: Promise<void> | undefined;
      return { ...repo, close: () => {
        if (!closePromise) {
          repository = undefined;
          const operation = repo.close();
          closing = operation;
          closePromise = operation.then(() => {
            if (closing === operation) closing = undefined;
          }, error => {
            // Keep the failed barrier: do not reopen an uncertain connection. Caller may retry close.
            closePromise = undefined;
            throw error;
          });
        }
        return closePromise;
      } };
    } catch { throw new Error('端末保存の保護設定または保存先の準備に失敗しました。保存を開始していません。'); }
  })().catch(error => { repository = undefined; throw error; });
  return repository;
}
function ownedCache(uri: string): boolean {
  if (!Files.cacheDirectory) return false;
  try { return new URL(uri).href.startsWith(new URL(Files.cacheDirectory).href) && !uri.includes('..'); } catch { return false; }
}
async function removeOwned(uris: Iterable<string>): Promise<void> {
  for (const uri of new Set(uris)) if (ownedCache(uri)) await Files.deleteAsync(uri, { idempotent: true });
}
function cacheDirectory(): string {
  if (!Files.cacheDirectory) throw new Error('一時ファイルの保存先を準備できません。');
  return `${Files.cacheDirectory}payslip-navi/`;
}
export async function cleanTemporaryFiles(): Promise<void> {
  try { await Files.deleteAsync(cacheDirectory(), { idempotent: true }); }
  catch { throw new Error('一時ファイルを削除できませんでした。アプリを再起動してください。'); }
}
export async function pickAndRecognizeImage(source: 'camera' | 'library'): Promise<{ status: 'success'; result: OcrResult } | { status: 'cancelled' } | { status: 'permissionDenied' } | { status: 'unavailable' }> {
  if (!NativeOcr) return { status: 'unavailable' };
  const owned: string[] = [];
  try {
    if (source === 'camera') {
      const permission = await Picker.requestCameraPermissionsAsync();
      if (!permission.granted) return { status: 'permissionDenied' };
    }
    const options: Picker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false, exif: false, base64: false };
    const picked = source === 'camera' ? await Picker.launchCameraAsync(options) : await Picker.launchImageLibraryAsync(options);
    if (picked.canceled) return { status: 'cancelled' };
    const asset = picked.assets[0]; if (!asset) return { status: 'cancelled' }; owned.push(asset.uri);
    if (!asset.width || !asset.height) throw new Error('dimensions');
    const resize = Math.max(asset.width, asset.height) > 2400 ? [{ resize: asset.width > asset.height ? { width: 2400 } : { height: 2400 } }] : [];
    const converted = await Manipulator.manipulateAsync(asset.uri, resize, { compress: 0.95, format: Manipulator.SaveFormat.JPEG });
    owned.push(converted.uri);
    const result = await NativeOcr.recognize(converted.uri);
    return { status: 'success', result };
  } catch { throw new Error('画像を読み取れませんでした。撮り直すか手入力してください。'); }
  finally { try { await removeOwned(owned); } catch { throw new Error('読取用の一時画像を削除できませんでした。アプリを再起動してください。'); } }
}
export async function pickBackupText(): Promise<string | null> {
  const owned: string[] = [];
  try {
    const result = await Documents.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return null;
    const asset = result.assets[0]; if (!asset) return null; owned.push(asset.uri);
    const info = await Files.getInfoAsync(asset.uri);
    if (!info.exists || info.isDirectory || info.size > MAX_BACKUP_BYTES || (asset.size !== undefined && asset.size > MAX_BACKUP_BYTES)) throw new Error('size');
    const text = await Files.readAsStringAsync(asset.uri);
    if (utf8Size(text) > MAX_BACKUP_BYTES) throw new Error('size');
    return text;
  } catch { throw new Error('バックアップを読み取れません。2MB以内のJSONファイルを選んでください。'); }
  finally { try { await removeOwned(owned); } catch { throw new Error('復元用の一時ファイルを削除できませんでした。'); } }
}
export async function shareBackup(text: string): Promise<void> {
  if (!parseBackup(text).ok) throw new Error('バックアップの内容を検証できません。');
  let uri: string | undefined;
  try {
    if (!await Sharing.isAvailableAsync()) throw new Error('unavailable');
    const directory = cacheDirectory(); await Files.makeDirectoryAsync(directory, { intermediates: true });
    uri = `${directory}payslip-backup-${randomUUID()}.json`;
    await Files.writeAsStringAsync(uri, text);
    await Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: '給与明細バックアップを保存' });
  } catch { throw new Error('バックアップを共有できませんでした。保存先を確認してください。'); }
  finally {
    // Android receiving applications may read after shareAsync resolves.
    if (uri && Platform.OS !== 'android') try { await removeOwned([uri]); } catch { throw new Error('共有用の一時ファイルを削除できませんでした。'); }
  }
}
