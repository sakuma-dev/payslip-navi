import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  native: { prepareStorage: vi.fn(), recognize: vi.fn() },
  open: vi.fn(), create: vi.fn(), deleteFile: vi.fn(), picker: vi.fn(), cameraPermission: vi.fn(), manipulator: vi.fn(), document: vi.fn(), info: vi.fn(), read: vi.fn(), share: vi.fn(), write: vi.fn(),
  platform: { OS: 'android' },
}));
vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('../../modules/payslip-ocr', () => ({ default: mocks.native }));
vi.mock('expo-sqlite', () => ({ openDatabaseAsync: mocks.open }));
vi.mock('./sqlite-repository', () => ({ createSqliteRepository: mocks.create }));
vi.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: mocks.cameraPermission, launchCameraAsync: mocks.picker, launchImageLibraryAsync: mocks.picker }));
vi.mock('expo-image-manipulator', () => ({ manipulateAsync: mocks.manipulator, SaveFormat: { JPEG: 'jpeg' } }));
vi.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///app/cache/', deleteAsync: mocks.deleteFile, getInfoAsync: mocks.info, readAsStringAsync: mocks.read, makeDirectoryAsync: vi.fn(), writeAsStringAsync: mocks.write }));
vi.mock('expo-document-picker', () => ({ getDocumentAsync: mocks.document }));
vi.mock('expo-sharing', () => ({ isAvailableAsync: vi.fn(async () => true), shareAsync: mocks.share }));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'fictional-id' }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); mocks.platform.OS = 'android'; mocks.deleteFile.mockResolvedValue(undefined); });
describe('native lifecycle and privacy boundaries', () => {
  it('fails closed before SQLite open when backup exclusion fails, and permits retry', async () => {
    const api = await import('./platform.native');
    mocks.native.prepareStorage.mockRejectedValueOnce(new Error('/private/secret/path')).mockResolvedValueOnce('file:///safe/db/');
    mocks.create.mockResolvedValue({ close: vi.fn(async () => undefined) });
    await expect(api.getRepository()).rejects.toThrow('保護設定'); expect(mocks.open).not.toHaveBeenCalled();
    const repo = await api.getRepository(); expect(mocks.open).toHaveBeenCalledWith('payslips.sqlite', {}, 'file:///safe/db/'); await repo.close();
  });
  it('shares one open promise and discards the cached repository after close', async () => {
    const api = await import('./platform.native'); mocks.native.prepareStorage.mockResolvedValue('file:///safe/db/');
    const close = vi.fn(async () => undefined); mocks.create.mockResolvedValue({ close });
    const [a, b] = await Promise.all([api.getRepository(), api.getRepository()]); expect(a).toBe(b); expect(mocks.open).toHaveBeenCalledTimes(1);
    await a.close(); const c = await api.getRepository(); expect(c).not.toBe(a); expect(mocks.open).toHaveBeenCalledTimes(2); await c.close();
  });
  it('returns permission denial before picking, and never requests photo library permissions', async () => {
    const api = await import('./platform.native'); mocks.cameraPermission.mockResolvedValue({ granted: false });
    expect(await api.pickAndRecognizeImage('camera')).toEqual({ status: 'permissionDenied' }); expect(mocks.picker).not.toHaveBeenCalled();
    mocks.picker.mockResolvedValue({ canceled: true }); expect(await api.pickAndRecognizeImage('library')).toEqual({ status: 'cancelled' });
  });
  it('cleans picker and resized cache URIs after failed OCR, without deleting original library images', async () => {
    const api = await import('./platform.native');
    mocks.picker.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///app/cache/picker.jpg', width: 4000, height: 3000 }] });
    mocks.manipulator.mockResolvedValue({ uri: 'file:///app/cache/manipulator.jpg' }); mocks.native.recognize.mockRejectedValue(new Error('secret text'));
    await expect(api.pickAndRecognizeImage('library')).rejects.toThrow('画像を読み取れません');
    expect(mocks.manipulator).toHaveBeenCalledWith('file:///app/cache/picker.jpg', [{ resize: { width: 2400 } }], { compress: 0.95, format: 'jpeg' });
    expect(mocks.deleteFile.mock.calls.map(c => c[0])).toEqual(['file:///app/cache/picker.jpg', 'file:///app/cache/manipulator.jpg']);
    mocks.deleteFile.mockClear(); mocks.picker.mockResolvedValue({ canceled: false, assets: [{ uri: 'ph://original', width: 100, height: 100 }] });
    await expect(api.pickAndRecognizeImage('library')).rejects.toThrow(); expect(mocks.deleteFile).not.toHaveBeenCalledWith('ph://original', expect.anything());
  });
  it('rejects an oversized backup before reading, and cleans its cache copy', async () => {
    const api = await import('./platform.native'); mocks.document.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///app/cache/backup.json' }] });
    mocks.info.mockResolvedValue({ exists: true, isDirectory: false, size: 3 * 1024 * 1024 });
    await expect(api.pickBackupText()).rejects.toThrow('2MB'); expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.deleteFile).toHaveBeenCalledWith('file:///app/cache/backup.json', { idempotent: true });
  });
  it('retains Android share file until startup cleanup, and cleans iOS after sharing', async () => {
    const api = await import('./platform.native'); const text = '{"schemaVersion":1,"exportedAt":"2026-09-28T00:00:00.000Z","payslips":[]}';
    await api.shareBackup(text); expect(mocks.deleteFile).not.toHaveBeenCalled();
    await api.cleanTemporaryFiles(); expect(mocks.deleteFile).toHaveBeenCalledWith('file:///app/cache/payslip-navi/', { idempotent: true });
    mocks.deleteFile.mockClear(); mocks.platform.OS = 'ios'; await api.shareBackup(text);
    expect(mocks.deleteFile).toHaveBeenCalledWith('file:///app/cache/payslip-navi/payslip-backup-fictional-id.json', { idempotent: true });
  });
});
