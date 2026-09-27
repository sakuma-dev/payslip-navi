import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function enterFictionalPayslip(page: Page, grossPay: string, netPay: string) {
  await page.getByRole('button', { name: '明細を追加する' }).click();
  await page.getByRole('button', { name: '手入力する' }).click();
  await page.getByRole('textbox', { name: '支払月（年-月）' }).fill('2026-09');
  await page.getByRole('textbox', { name: '総支給額' }).fill(grossPay);
  await page.getByRole('textbox', { name: '控除合計' }).fill('50000');
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill(netPay);
  await page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' }).click();
  await page.getByRole('button', { name: '保存する' }).click();
}

test('a downloaded fictional JSON backup restores the same month, amounts, and count after deletion', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: '自分の明細を追加する' }).click();
  await page.getByRole('button', { name: '手入力する' }).click();
  await page.getByRole('textbox', { name: '支払月（年-月）' }).fill('2026-09');
  await page.getByRole('textbox', { name: '総支給額' }).fill('300000');
  await page.getByRole('textbox', { name: '控除合計' }).fill('50000');
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill('250000');
  await page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' }).click();
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByText('算術チェック済み')).toBeVisible();
  await page.getByRole('button', { name: '戻る' }).click();
  await page.getByRole('tab', { name: '設定' }).click();

  await page.getByRole('button', { name: 'バックアップを書き出す' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '書き出して共有先を選ぶ' }).click();
  const download = await downloadPromise;
  const backupPath = testInfo.outputPath('fictional-backup.json');
  await download.saveAs(backupPath);
  expect(await download.failure()).toBeNull();
  await expect(page.getByText('書き出しの操作を終えました')).toBeVisible();
  await expect(page.getByText('取り消した場合や保存先によっては保存されていません。', { exact: false })).toBeVisible();
  const backup = JSON.parse(await readFile(backupPath, 'utf8')) as {
    schemaVersion: number;
    payslips: { month: string; grossPay: number; totalDeductions: number; netPay: number }[];
  };
  expect(backup.schemaVersion).toBe(1);
  expect(backup.payslips).toHaveLength(1);
  expect(backup.payslips[0]).toMatchObject({
    month: '2026-09', grossPay: 300000, totalDeductions: 50000, netPay: 250000,
  });

  await page.getByRole('button', { name: 'すべてのデータを削除' }).click();
  await page.getByRole('textbox', { name: '確認のため削除と入力' }).fill('削除');
  await page.getByRole('button', { name: 'すべて削除する' }).click();
  await expect(page.getByText('登録済みの0件をすべて削除します。')).toBeVisible();

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'バックアップから復元する' }).click();
  await (await chooserPromise).setFiles(backupPath);
  await expect(page.getByText('現在のデータを置き換えますか')).toBeVisible();
  await page.getByRole('button', { name: '置き換える' }).click();
  await expect(page.getByText('登録済みの1件をすべて削除します。')).toBeVisible();
  await page.getByRole('tab', { name: 'ホーム' }).click();
  await expect(page.getByText('2026年9月の手取り')).toBeVisible();
  await expect(page.getByText('250,000円').first()).toBeVisible();

  await page.getByRole('tab', { name: '設定' }).click();
  await page.getByRole('button', { name: 'バックアップを書き出す' }).click();
  const restoredDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '書き出して共有先を選ぶ' }).click();
  const restoredDownload = await restoredDownloadPromise;
  const restoredPath = testInfo.outputPath('restored-fictional-backup.json');
  await restoredDownload.saveAs(restoredPath);
  const restored = JSON.parse(await readFile(restoredPath, 'utf8')) as typeof backup;
  expect(restored.payslips).toEqual(backup.payslips);
});

test('same-month replacement requires consent and cancellation preserves the old fictional record', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '自分の明細を追加する' }).click();
  await page.getByRole('button', { name: '手入力する' }).click();
  await page.getByRole('textbox', { name: '支払月（年-月）' }).fill('2026-09');
  await page.getByRole('textbox', { name: '総支給額' }).fill('300000');
  await page.getByRole('textbox', { name: '控除合計' }).fill('50000');
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill('250000');
  await page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' }).click();
  await page.getByRole('button', { name: '保存する' }).click();
  await page.getByRole('button', { name: '戻る' }).click();

  await enterFictionalPayslip(page, '310000', '260000');
  await expect(page.getByText('2026年9月は登録済みです')).toBeVisible();
  await page.getByRole('button', { name: 'やめて見直す' }).click();
  await page.getByRole('button', { name: 'やめる', exact: true }).click();
  await page.getByRole('button', { name: '入力内容を破棄する' }).click();
  await expect(page.getByText('250,000円').first()).toBeVisible();

  await enterFictionalPayslip(page, '310000', '260000');
  await expect(page.getByText('2026年9月は登録済みです')).toBeVisible();
  await page.getByRole('button', { name: '今の内容で置き換える' }).click();
  await expect(page.getByText('260,000円').first()).toBeVisible();
  await page.getByRole('button', { name: '戻る' }).click();
  await page.getByRole('tab', { name: '設定' }).click();
  await expect(page.getByText('登録済みの1件をすべて削除します。')).toBeVisible();
});
