import { describe, expect, it } from 'vitest';
import { layoutBars } from './chartScale';

describe('layoutBars（架空の金額）', () => {
  it('正の値だけなら基準線は下端で、最大値が全高になる', () => {
    const { baseline, bars } = layoutBars([100, 50, null], 100);
    expect(baseline).toBe(100);
    expect(bars[0]).toEqual({ kind: 'positive', top: 0, height: 100 });
    expect(bars[1]).toEqual({ kind: 'positive', top: 50, height: 50 });
    expect(bars[2]?.kind).toBe('missing');
  });

  it('負の値は基準線より下に、絶対値に比例した高さで伸びる', () => {
    const { baseline, bars } = layoutBars([300, -100, -50], 120);
    expect(baseline).toBe(90);
    expect(bars[0]).toEqual({ kind: 'positive', top: 0, height: 90 });
    expect(bars[1]).toEqual({ kind: 'negative', top: 90, height: 30 });
    expect(bars[2]).toEqual({ kind: 'negative', top: 90, height: 15 });
  });

  it('負の値どうしでも大きさの違いが残る（すべて最小高にならない）', () => {
    const { baseline, bars } = layoutBars([-200, -100], 100);
    expect(baseline).toBe(0);
    expect(bars.map((b) => b.height)).toEqual([100, 50]);
  });

  it('0円と未登録を区別する', () => {
    const { bars } = layoutBars([0, null, 10], 100);
    expect(bars[0]?.kind).toBe('zero');
    expect(bars[1]?.kind).toBe('missing');
  });

  it('すべて未登録・0円でも例外にならない', () => {
    expect(layoutBars([null, 0], 100).baseline).toBe(100);
  });
});

// 符号の側と領域の不変条件: 正の棒は基準線より上、負の棒は基準線より下、すべて領域内。
function expectInvariants(values: (number | null)[], area: number) {
  const { baseline, bars } = layoutBars(values, area);
  expect(baseline).toBeGreaterThanOrEqual(0);
  expect(baseline).toBeLessThanOrEqual(area);
  bars.forEach((bar, i) => {
    const value = values[i];
    expect(bar.top).toBeGreaterThanOrEqual(0);
    expect(bar.height).toBeGreaterThanOrEqual(0);
    expect(bar.top + bar.height).toBeLessThanOrEqual(area);
    if (value !== null && value !== undefined && value > 0) {
      expect(bar.kind).toBe('positive');
      expect(bar.height).toBeGreaterThan(0);
      expect(bar.top + bar.height).toBeLessThanOrEqual(baseline);
    }
    if (value !== null && value !== undefined && value < 0) {
      expect(bar.kind).toBe('negative');
      expect(bar.height).toBeGreaterThan(0);
      expect(bar.top).toBeGreaterThanOrEqual(baseline);
    }
  });
}

describe('layoutBars の符号境界（架空の金額）', () => {
  it('巨大な正の値と微小な負の値: 負の棒が基準線の上に出ない', () => {
    expectInvariants([250000, -100], 132);
    const { baseline, bars } = layoutBars([250000, -100], 132);
    expect(bars[1]?.top).toBe(baseline);
  });

  it('微小な正の値と巨大な負の値: 正の棒が基準線の下に出ない', () => {
    expectInvariants([1, -1_000_000_000], 132);
    const { baseline, bars } = layoutBars([1, -1_000_000_000], 132);
    expect((bars[0]?.top ?? 0) + (bars[0]?.height ?? 0)).toBe(baseline);
  });

  it.each([
    [[300, -100, -50, 0, null], 120],
    [[-1, 1], 132],
    [[1_000_000_000, -1_000_000_000, 1, -1], 132],
    [[5, 4, 3, -2, -1], 10],
  ] as [(number | null)[], number][])('不変条件を満たす %j (area=%i)', (values, area) => {
    expectInvariants(values, area);
  });
});
