import { expect, test } from '@playwright/test';

test('fictional demo stays separate and manual record survives invalid restore, edit, then delete', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'サンプル（架空データ）で体験する' }).click();
  await expect(page.getByText('デモ（架空データ）表示中')).toBeVisible();
  await page.getByRole('tab', { name: '設定' }).click();
  await expect(page.getByRole('button', { name: 'バックアップを書き出す' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'バックアップから復元する' })).toBeDisabled();
  await page.getByRole('button', { name: 'デモを終了', exact: true }).click();
  await expect(page.getByText('まだ明細がありません')).toBeVisible();

  await page.getByRole('button', { name: '明細を追加する' }).click();
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
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'バックアップから復元する' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{invalid') });
  await expect(page.getByText('読み込めませんでした')).toBeVisible();
  await page.getByRole('tab', { name: 'ホーム' }).click();
  await expect(page.getByText('250,000円').first()).toBeVisible();

  await page.getByRole('button', { name: 'この明細を詳しく見る' }).click();
  await page.getByRole('button', { name: 'この明細を編集' }).click();
  await page.getByRole('textbox', { name: '総支給額' }).fill('310000');
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill('260000');
  await page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' }).click();
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByText('260,000円').first()).toBeVisible();

  await page.getByRole('button', { name: 'この明細を削除' }).click();
  await page.getByRole('button', { name: '削除する' }).click();
  await expect(page.getByText('まだ明細がありません')).toBeVisible();
});
