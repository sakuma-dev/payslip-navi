import { expect, test, type Locator, type Page } from '@playwright/test';

const viewports = [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1280, height: 900 },
];

async function openFictionalDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'サンプル（架空データ）で体験する' }).click();
  await expect(page.getByText('デモ（架空データ）表示中')).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const excess = await page.evaluate(() =>
    (document.scrollingElement ?? document.documentElement).scrollWidth - window.innerWidth);
  expect(excess).toBeLessThanOrEqual(0);
}

async function expectAtLeast44(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

async function opacityThroughAncestors(locator: Locator) {
  return locator.evaluate((element) => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity);
    }
    return opacity;
  });
}

async function focusByTab(page: Page, target: Locator) {
  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error('The action cannot be reached with Tab');
}

async function addFictionalRecord(page: Page, month: string, gross: string, deductions: string, net: string, first = false) {
  await page.getByRole('button', { name: first ? '自分の明細を追加する' : '明細を追加する' }).click();
  await page.getByRole('button', { name: '手入力する' }).click();
  await page.getByRole('textbox', { name: '支払月（年-月）' }).fill(month);
  await page.getByRole('textbox', { name: '総支給額' }).fill(gross);
  await page.getByRole('textbox', { name: '控除合計' }).fill(deductions);
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill(net);
  await page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' }).click();
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByText('算術チェック済み')).toBeVisible();
  await page.getByRole('button', { name: '戻る' }).click();
}

for (const viewport of viewports) {
  test(`demo controls stay reachable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openFictionalDemo(page);
    await expectNoHorizontalOverflow(page);

    for (const name of ['ホーム', '履歴', '項目ガイド', '設定']) {
      await expectAtLeast44(page.getByRole('tab', { name, exact: true }));
    }
    for (const name of ['前月', '前年同月']) {
      await expectAtLeast44(page.getByRole('tab', { name, exact: true }));
    }
    for (const name of ['明細を追加する', 'デモを終了', '前の年', '次の年']) {
      await expectAtLeast44(page.getByRole('button', { name, exact: true }));
    }

    await page.getByRole('tab', { name: '履歴', exact: true }).click();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('tab', { name: 'ホーム', exact: true }).click();
    await page.getByRole('button', { name: 'この明細を詳しく見る' }).click();
    await expectNoHorizontalOverflow(page);
    await expectAtLeast44(page.getByRole('button', { name: '戻る' }));
  });
}

test('the last home row remains above the floating navigation at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFictionalDemo(page);
  const lastMonth = page.getByText('2026年7月').last();
  await lastMonth.scrollIntoViewIfNeeded();
  const row = await lastMonth.boundingBox();
  const nav = await page.getByRole('tablist').last().boundingBox();
  expect(row).not.toBeNull();
  expect(nav).not.toBeNull();
  expect(row!.y + row!.height).toBeLessThanOrEqual(nav!.y);
});

test('half of the trend bars appear above the floating navigation on a 390px Web demo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFictionalDemo(page);
  const plot = await page.getByRole('img', { name: /手取り推移/ }).boundingBox();
  const nav = await page.getByRole('tablist').last().boundingBox();
  expect(plot).not.toBeNull();
  expect(nav).not.toBeNull();
  expect(plot!.y + 72).toBeLessThanOrEqual(nav!.y);
});

test('reduced motion never hides content, including after changing the preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const heading = page.getByRole('heading', { name: '給与明細ナビ' }).first();
  await expect(heading).toBeVisible();
  expect(await opacityThroughAncestors(heading)).toBe(1);
  await page.getByRole('button', { name: 'サンプル（架空データ）で体験する' }).click();
  await expect(page.getByText('デモ（架空データ）表示中')).toBeVisible();
  await page.getByRole('tab', { name: '履歴', exact: true }).click();
  const history = page.getByRole('heading', { name: '履歴', exact: true });
  await expect(history).toBeVisible();
  expect(await opacityThroughAncestors(history)).toBe(1);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(history).toBeVisible();
  expect(await opacityThroughAncestors(history)).toBe(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('tab', { name: '設定', exact: true }).click();
  const settings = page.getByRole('heading', { name: '設定', exact: true });
  await expect(settings).toBeVisible();
  expect(await opacityThroughAncestors(settings)).toBe(1);
});

test('large, negative, zero, and missing amounts stay distinct at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await addFictionalRecord(page, '2026-08', '1234567', '0', '1234567', true);
  const large = page.getByText('1,234,567円', { exact: true }).first();
  await expect(large).toBeVisible();
  const largeBox = await large.boundingBox();
  expect(largeBox).not.toBeNull();
  expect(largeBox!.x + largeBox!.width).toBeLessThanOrEqual(320);
  await expectNoHorizontalOverflow(page);

  await addFictionalRecord(page, '2026-09', '0', '1000000000', '-1000000000');
  await expect(page.getByText('-1,000,000,000円', { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await addFictionalRecord(page, '2026-10', '0', '0', '0');
  const summary = await page.getByRole('img', { name: /手取り推移/ }).getAttribute('aria-label');
  expect(summary).toContain('10月 0円');
  expect(summary).toContain('11月 未登録');
  await page.getByRole('button', { name: '数値一覧で見る' }).click();
  await expect(page.getByText('-1,000,000,000円').last()).toBeVisible();
  await expect(page.getByText('0円').last()).toBeVisible();
});

test('keyboard opening of delete confirmation cannot delete on the next Enter and restores focus', async ({ page }) => {
  await openFictionalDemo(page);
  await page.getByRole('button', { name: 'この明細を詳しく見る' }).click();
  const trigger = page.getByRole('button', { name: 'この明細を削除' });
  await focusByTab(page, trigger);
  await page.keyboard.press('Enter');
  const title = page.getByText('2026年9月の明細を削除しますか');
  await expect(title).toBeVisible();
  await page.keyboard.press('Enter');
  if (await title.isVisible()) await page.getByRole('button', { name: 'やめる', exact: true }).click();
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.getByText('248,550円').first()).toBeVisible();
});

test('keyboard opening of same-month replacement cannot replace on the next Enter and restores focus', async ({ page }) => {
  await page.goto('/');
  await addFictionalRecord(page, '2026-09', '300000', '50000', '250000', true);
  await page.getByRole('button', { name: '明細を追加する' }).click();
  await page.getByRole('button', { name: '手入力する' }).click();
  await page.getByRole('textbox', { name: '支払月（年-月）' }).fill('2026-09');
  await page.getByRole('textbox', { name: '総支給額' }).fill('310000');
  await page.getByRole('textbox', { name: '控除合計' }).fill('50000');
  await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill('260000');
  await page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' }).click();
  const trigger = page.getByRole('button', { name: '保存する' });
  await focusByTab(page, trigger);
  await page.keyboard.press('Enter');
  const title = page.getByText('2026年9月は登録済みです');
  await expect(title).toBeVisible();
  await page.keyboard.press('Enter');
  if (await title.isVisible()) await page.getByRole('button', { name: 'やめて見直す' }).click();
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'やめる', exact: true }).click();
  await page.getByRole('button', { name: '入力内容を破棄する' }).click();
  await expect(page.getByText('250,000円').first()).toBeVisible();
});
