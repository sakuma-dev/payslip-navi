import { expect, test } from '@playwright/test';

test('fictional manual entry validates totals and stays in memory on Web', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Webプレビュー：保存されず、再読込で消えます')).toBeVisible();
  await page.getByRole('button', { name: '自分の明細を追加する' }).click();
  await page.getByRole('button', { name: '手入力する' }).click();

  await page.getByRole('textbox', { name: '支払月（年-月）' }).fill('2026-09');
  await page.getByRole('textbox', { name: '総支給額' }).fill('300000');
  await page.getByRole('textbox', { name: '控除合計' }).fill('50000');
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill('240000');

  await expect(page.getByText('差額は自動で埋めません。', { exact: false })).toBeVisible();
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill('250000');
  await expect(page.getByText('一致しています')).toBeVisible();

  await page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' }).click();
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByText('算術チェック済み')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: '自分の明細を追加する' })).toBeVisible();
});
