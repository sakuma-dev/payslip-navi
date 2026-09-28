import { expect, test, type Locator, type Page } from '@playwright/test';

declare global {
  interface Window {
    __setGlassReducedTransparency?: (value: boolean) => void;
  }
}

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

function navigation(page: Page) {
  return page.getByRole('tablist').last();
}

async function materialStyles(locator: Locator) {
  return locator.evaluate((element) => {
    const styles: { background: string; blur: string; border: string; borderWidth: number }[] = [];
    for (let node: Element | null = element; node && styles.length < 8; node = node.parentElement) {
      const style = getComputedStyle(node);
      styles.push({
        background: style.backgroundColor,
        blur: style.backdropFilter || style.getPropertyValue('-webkit-backdrop-filter'),
        border: style.borderTopColor,
        borderWidth: parseFloat(style.borderTopWidth),
      });
    }
    return styles;
  });
}

async function expectSolidNavigation(page: Page, background: string) {
  await expect.poll(async () => (await materialStyles(navigation(page))).some((style) => style.background === background)).toBe(true);
  const styles = await materialStyles(navigation(page));
  expect(styles.some((style) => style.blur.includes('blur('))).toBe(false);
}

async function expectBlurNavigation(page: Page) {
  await expect.poll(async () => (await materialStyles(navigation(page))).some((style) => style.blur.includes('blur('))).toBe(true);
}

async function focusByTab(page: Page, target: Locator) {
  for (let i = 0; i < 80; i += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error('The target cannot be reached with Tab');
}

async function mockReducedTransparency(page: Page, initiallyReduced: boolean) {
  await page.addInitScript((initial) => {
    const query = '(prefers-reduced-transparency: reduce)';
    const nativeMatchMedia = window.matchMedia.bind(window);
    const events = new EventTarget();
    let reduced = initial;
    const list = {
      media: query,
      get matches() { return reduced; },
      onchange: null as ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
      addListener: (listener: EventListener) => events.addEventListener('change', listener),
      removeListener: (listener: EventListener) => events.removeEventListener('change', listener),
    } as unknown as MediaQueryList;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (media: string) => media === query ? list : nativeMatchMedia(media),
    });
    window.__setGlassReducedTransparency = (value) => {
      reduced = value;
      const event = new Event('change') as MediaQueryListEvent;
      Object.defineProperties(event, { media: { value: query }, matches: { value } });
      events.dispatchEvent(event);
      list.onchange?.call(list, event);
    };
  }, initiallyReduced);
}

test('unsupported Web backdrop filtering uses the opaque navigation material', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeSupports = CSS.supports.bind(CSS);
    Object.defineProperty(CSS, 'supports', {
      configurable: true,
      value: (property: string, value?: string) => {
        if (property === 'backdrop-filter' || property === '-webkit-backdrop-filter') return false;
        return value === undefined ? nativeSupports(property) : nativeSupports(property, value);
      },
    });
  });
  await openFictionalDemo(page);
  await expectSolidNavigation(page, 'rgb(245, 248, 253)');
  await expect(page.getByRole('tab', { name: 'ホーム' })).toBeVisible();
});

test('reduced transparency starts opaque and changes between solid and blur without losing content', async ({ page }) => {
  await mockReducedTransparency(page, true);
  await openFictionalDemo(page);
  await expectSolidNavigation(page, 'rgb(245, 248, 253)');
  await page.evaluate(() => {
    if (!window.__setGlassReducedTransparency) throw new Error('Reduced-transparency control was not installed');
    window.__setGlassReducedTransparency(false);
  });
  await expectBlurNavigation(page);
  await expect(page.getByRole('tab', { name: 'ホーム' })).toBeVisible();
  await page.evaluate(() => {
    if (!window.__setGlassReducedTransparency) throw new Error('Reduced-transparency control was not installed');
    window.__setGlassReducedTransparency(true);
  });
  await expectSolidNavigation(page, 'rgb(245, 248, 253)');
});

test('increased contrast starts opaque and remains readable after a live preference change', async ({ page }) => {
  await page.emulateMedia({ contrast: 'more' });
  await openFictionalDemo(page);
  await expectSolidNavigation(page, 'rgb(255, 255, 255)');
  await expect.poll(async () => (await materialStyles(navigation(page)))
    .some((style) => style.border === 'rgb(123, 133, 152)' && style.borderWidth >= 1)).toBe(true);
  await page.emulateMedia({ contrast: 'no-preference' });
  await expectBlurNavigation(page);
  await page.emulateMedia({ contrast: 'more' });
  await expectSolidNavigation(page, 'rgb(255, 255, 255)');
});

test('forced colors keeps selected navigation and a visible keyboard outline at startup and after toggling', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await openFictionalDemo(page);
  const home = page.getByRole('tab', { name: 'ホーム', exact: true });
  await expect(home).toHaveAttribute('aria-selected', 'true');
  await expect.poll(async () => (await materialStyles(navigation(page))).every((style) => !style.blur.includes('blur('))).toBe(true);
  await expect.poll(async () => navigation(page).evaluate((element) => Array.from(element.children).some((child) => {
    const style = getComputedStyle(child);
    return style.borderTopStyle !== 'none' && parseFloat(style.borderTopWidth) >= 1;
  }))).toBe(true);
  await focusByTab(page, home);
  await expect.poll(async () => home.evaluate((element) => {
    const style = getComputedStyle(element);
    return style.outlineStyle === 'solid' && parseFloat(style.outlineWidth) >= 2;
  })).toBe(true);
  await page.emulateMedia({ forcedColors: 'none' });
  await expectBlurNavigation(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(home).toBeFocused();
  await expect.poll(async () => home.evaluate((element) => getComputedStyle(element).outlineStyle === 'solid')).toBe(true);
});

test('reduced motion at launch and during use never hides the navigation or amount', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFictionalDemo(page);
  const amount = page.getByText('248,550円').first();
  await expect(amount).toBeVisible();
  await expect(navigation(page)).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('tab', { name: '履歴' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(navigation(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible();
  expect(await navigation(page).evaluate((element) => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    return opacity;
  })).toBe(1);
});

test('Web tab, segmented, checkbox, and choice states are exposed to assistive technology', async ({ page }) => {
  await openFictionalDemo(page);
  await expect(page.getByRole('tab', { name: 'ホーム', selected: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: '前月', selected: true })).toBeVisible();
  await page.getByRole('button', { name: 'この明細を詳しく見る' }).click();
  await page.getByRole('button', { name: 'この明細を編集' }).click();
  const confirmed = page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' });
  await expect(confirmed).toHaveAttribute('aria-checked', 'false');
  await confirmed.click();
  await expect(confirmed).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: '基本給', checked: true }).first()).toBeVisible();
});

test('detail header receives the first Tab and content starts below its control', async ({ page }) => {
  await openFictionalDemo(page);
  await page.getByRole('button', { name: 'この明細を詳しく見る' }).click();
  const back = page.getByRole('button', { name: '戻る' });
  await expect(back).toBeVisible();
  // The clicked row is removed on navigation. Reset Chromium's remembered
  // sequential-navigation starting point to the document before checking order.
  await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); });
  await page.keyboard.press('Tab');
  await expect(back).toBeFocused();
  const backBox = await back.boundingBox();
  const contentBox = await page.getByText('架空のデモ明細').boundingBox();
  expect(backBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(contentBox!.y).toBeGreaterThanOrEqual(backBox!.y + backBox!.height);
});

for (const viewport of viewports) {
  test(`Glass layout has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openFictionalDemo(page);
    const homeOverflow = await page.evaluate(() => (document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth);
    expect(homeOverflow).toBeLessThanOrEqual(0);
    await page.getByRole('button', { name: 'この明細を詳しく見る' }).click();
    const detailOverflow = await page.evaluate(() => (document.scrollingElement ?? document.documentElement).scrollWidth - innerWidth);
    expect(detailOverflow).toBeLessThanOrEqual(0);
  });
}

test('a one-yen deduction does not gain a visible minimum width in the ratio bar', async ({ page }) => {
  const gross = 1_000_000_000;
  const deductions = 1;
  const net = gross - deductions;
  const layoutRoundingTolerance = 1 / 64;

  for (const viewport of viewports.slice(0, 2)) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: '自分の明細を追加する' }).click();
    await page.getByRole('button', { name: '手入力する' }).click();
    await page.getByRole('textbox', { name: '支払月（年-月）' }).fill('2026-09');
    await page.getByRole('textbox', { name: '総支給額' }).fill(String(gross));
    await page.getByRole('textbox', { name: '控除合計' }).fill(String(deductions));
    await page.getByRole('textbox', { name: '差引支給額（手取り）' }).fill(String(net));
    await page.getByRole('checkbox', { name: '明細の数字と見比べて、支払月と金額を確認しました' }).click();
    await page.getByRole('button', { name: '保存する' }).click();
    await expect(page.getByText('算術チェック済み')).toBeVisible();
    await page.getByRole('button', { name: '戻る' }).click();

    const bar = page.getByRole('img', { name: /総支給.*のうち、手取り.*控除合計1円/ });
    await expect(bar).toBeVisible();
    const measured = await bar.evaluate((element) => ({
      trackWidth: element.getBoundingClientRect().width,
      gap: Number.parseFloat(getComputedStyle(element).columnGap) || 0,
      segmentCount: element.children.length,
      deductionWidth: element.lastElementChild?.getBoundingClientRect().width ?? NaN,
    }));
    const expectedWidth = (measured.trackWidth - measured.gap) * deductions / gross;
    await test.info().attach(`ratio-bar-${viewport.width}px`, {
      body: JSON.stringify({ viewport, gross, net, deductions, expectedWidth, ...measured }, null, 2),
      contentType: 'application/json',
    });
    expect.soft(measured.segmentCount, `${viewport.width}px: net and deduction segments`).toBe(2);
    expect.soft(
      Math.abs(measured.deductionWidth - expectedWidth),
      `${viewport.width}px: one-yen deduction must retain its ${deductions}/${gross} width ratio`,
    ).toBeLessThanOrEqual(layoutRoundingTolerance);
  }
});
