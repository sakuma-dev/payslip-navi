import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('fictional positive and negative net pay stay on opposite sides of zero in the trend', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '自分の明細を追加する' }).click();
  await page.getByRole('button', { name: '手入力する' }).click();
  await page.getByRole('textbox', { name: '支払月（年-月）' }).fill('2026-08');
  await page.getByRole('textbox', { name: '総支給額' }).fill('300000');
  await page.getByRole('textbox', { name: '控除合計' }).fill('50000');
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill('250000');
  await page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' }).click();
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByText('算術チェック済み')).toBeVisible();
  await page.getByRole('button', { name: '戻る' }).click();

  await page.getByRole('button', { name: '明細を追加する' }).click();
  await page.getByRole('button', { name: '手入力する' }).click();
  await page.getByRole('textbox', { name: '支払月（年-月）' }).fill('2026-09');
  await page.getByRole('textbox', { name: '総支給額' }).fill('0');
  await page.getByRole('textbox', { name: '控除合計' }).fill('100');
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill('-100');
  await expect(page.getByText('一致しています')).toBeVisible();
  await page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' }).click();
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByText('算術チェック済み')).toBeVisible();
  await page.getByRole('button', { name: '戻る' }).click();

  const negativeLegend = page.getByText('マイナス（枠のみ・線より下）');
  await expect(negativeLegend).toBeVisible();
  await page.getByRole('button', { name: '数値一覧で見る' }).click();
  const listedAmount = page.getByText('-100円').last();
  await expect(listedAmount).toBeVisible();
  await expect(page.getByText('250,000円').last()).toBeVisible();

  mkdirSync('.local/screenshots', { recursive: true });
  await negativeLegend.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local/screenshots/negative-trend.png' });
  await listedAmount.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.local/screenshots/negative-trend-values.png' });
});
