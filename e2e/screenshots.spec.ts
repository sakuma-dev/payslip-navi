import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test.skip(process.env.CAPTURE_UI_SCREENSHOTS !== '1', 'Run on demand for fictional visual QA');

test('capture fictional Web preview at phone size', async ({ page }) => {
  mkdirSync('.local/screenshots', { recursive: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'サンプル（架空データ）で体験する' }).click();
  await expect(page.getByText('デモ（架空データ）表示中')).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/demo-home.png', fullPage: true });

  await page.getByRole('button', { name: 'デモを終了' }).click();
  await expect(page.getByText('まだ明細がありません')).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/empty-home.png', fullPage: true });

  await page.getByRole('button', { name: '明細を追加する' }).click();
  await page.getByRole('button', { name: '手入力する' }).click();
  await page.getByRole('textbox', { name: '支払月（年-月）' }).fill('2026-09');
  await page.getByRole('textbox', { name: '総支給額' }).fill('300000');
  await page.getByRole('textbox', { name: '控除合計' }).fill('50000');
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill('250000');
  await expect(page.getByText('一致しています')).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/confirm-edit.png', fullPage: true });
});
