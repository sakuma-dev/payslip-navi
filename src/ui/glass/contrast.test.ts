import { describe, expect, it } from 'vitest';
import { contrast, luminance, over, Rgb, toHex, toRgb } from './contrast';
import { palette as c, sceneBlobs } from './palette';

// docs/UI-GLASS-DESIGN.md §2.1 の算出条件。
// Scene 最暗: 3つの塊が中心の不透明度のまま sceneBottom に重なる（保守側）。
const sceneWorst: Rgb = sceneBlobs.reduce<Rgb>((base, blob) => over(blob.color, base, blob.alpha), toRgb(c.sceneBottom));
const card = over(c.surfaceGlass, sceneWorst);
const raised = over(c.surfaceRaisedGlass, sceneWorst);
// ガラスの下限: 純黒の上に glassTint（ぼかし・saturate・BlurView の tint はこれより暗くしない）
const glassFloor = over(c.glassTint, [0, 0, 0]);
const backPill = over(c.backPill, glassFloor);
const capsule = over(c.capsule, glassFloor);
const glassButtonOnScene = over(c.glassButton, sceneWorst);

const TEXT = 4.5;
const NON_TEXT = 3;

describe('composited backgrounds', () => {
  it('matches the audited worst cases', () => {
    expect(toHex(sceneWorst)).toBe('#BCCFF1');
    expect(luminance(sceneWorst)).toBeCloseTo(0.6185, 3);
    expect(toHex(card)).toBe('#F8FAFE');
    expect(toHex(raised)).toBe('#FBFCFE');
    expect(toHex(glassFloor)).toBe('#B3B4B8');
    expect(luminance(glassFloor)).toBeCloseTo(0.4562, 3);
    expect(toHex(backPill)).toBe('#DDDDDF');
  });
});

describe('allowed pairs (§2.1)', () => {
  const cases: [string, string, Rgb, number][] = [
    ['ink on Scene', c.ink, sceneWorst, TEXT],
    ['inkMuted on Scene', c.inkMuted, sceneWorst, TEXT],
    ['primaryDeep on Scene', c.primaryDeep, sceneWorst, TEXT],
    ['ink on glass', c.ink, glassFloor, TEXT],
    ['primaryDeep on glass', c.primaryDeep, glassFloor, TEXT],
    ['primaryDeep on back pill', c.primaryDeep, backPill, TEXT],
    ['primaryDeep on selected capsule', c.primaryDeep, capsule, TEXT],
    ['primaryDeep on glass button', c.primaryDeep, glassButtonOnScene, TEXT],
    ['capsule edge against glass', c.primaryDeep, glassFloor, NON_TEXT],
    ['capsule edge against capsule', c.primaryDeep, capsule, NON_TEXT],
    ...(['ink', 'inkMuted', 'inkSubtle', 'primary', 'primaryDeep', 'up', 'down', 'danger', 'warning'] as const).flatMap(
      (name): [string, string, Rgb, number][] => [
        [`${name} on card`, c[name], card, TEXT],
        [`${name} on raised`, c[name], raised, TEXT],
      ],
    ),
    ['lineStrong on card', c.lineStrong, card, NON_TEXT],
    ['lineStrong on raised', c.lineStrong, raised, NON_TEXT],
    ['lineStrong on flat Scene (high contrast)', c.lineStrong, toRgb(c.sceneTop), NON_TEXT],
    ['lineStrong on solid glass (high contrast uses white)', c.lineStrong, toRgb(c.surface), NON_TEXT],
    ['catDeduction on card', c.catDeduction, card, NON_TEXT],
    ['primary Segmented edge on track', c.primary, toRgb(c.controlTrack), NON_TEXT],
  ];

  it.each(cases)('%s', (_name, fg, bg, minimum) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(minimum);
  });

  it('keeps the thin inkMuted margin on the Scene visible in the test output', () => {
    expect(contrast(c.inkMuted, sceneWorst)).toBeCloseTo(4.68, 2);
  });
});

describe('forbidden placements stay documented (§2.1)', () => {
  // これらが基準を満たさないことを固定し、規則（使用禁止）と数値の食い違いを検出する。
  const forbidden: [string, string, Rgb, number][] = [
    ['inkMuted on glass', c.inkMuted, glassFloor, TEXT],
    ['inkSubtle on Scene', c.inkSubtle, sceneWorst, TEXT],
    ['primary text on Scene', c.primary, sceneWorst, TEXT],
    ['primary text on glass', c.primary, glassFloor, TEXT],
    ['lineStrong on Scene', c.lineStrong, sceneWorst, NON_TEXT],
  ];
  it.each(forbidden)('%s is below its threshold', (_name, fg, bg, minimum) => {
    expect(contrast(fg, bg)).toBeLessThan(minimum);
  });
});
