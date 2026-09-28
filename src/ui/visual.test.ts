import { describe, expect, it } from 'vitest';
import { formatYen } from '../domain';
import {
  comparableItemChanges,
  deltaEmphasis,
  DISPLAY_MAX_SCALE,
  displayStep,
  estimateTextWidth,
  layoutMetrics,
  splitBarModel,
  splitYen,
  TILE_MAX_SCALE,
  tileColumns,
  tileSpacing,
  topItemChanges,
} from './visual';

// すべて架空の金額。
const AMOUNTS = [300_000, 1_234_567, -1_000_000_000];
const SCALES = [1, 1.3, 1.6];

describe('layoutMetrics', () => {
  it('幅360未満はガター16、それ以上は20。本文は最大640', () => {
    expect(layoutMetrics(320)).toEqual({ sizeClass: 'compact', gutter: 16, contentWidth: 288, sheetPadding: 16 });
    expect(layoutMetrics(390)).toEqual({ sizeClass: 'regular', gutter: 20, contentWidth: 350, sheetPadding: 20 });
    expect(layoutMetrics(1280)).toMatchObject({ sizeClass: 'wide', contentWidth: 640 });
  });
});

describe('displayStep（ステージの手取り）', () => {
  it('通常の金額は最大の44', () => {
    expect(displayStep('250,000円', 288)).toBe(44);
    expect(displayStep('1,234,567円', 288)).toBe(44);
  });

  it('巨大な負の金額は幅と文字倍率で段階的に小さくする', () => {
    expect(displayStep('-1,000,000,000円', 288, 1)).toBe(32);
    expect(displayStep('-1,000,000,000円', 288, 1.3)).toBe(24);
    // 文字倍率はステージでは1.3までに制限する
    expect(displayStep('-1,000,000,000円', 288, 1.6)).toBe(displayStep('-1,000,000,000円', 288, 1.3));
  });

  it('数字＋円が収まらない時は、数字だけが収まる段を選ぶ（円だけ次行）', () => {
    expect(displayStep('-1,000,000,000円', 245, 1.3)).toBe(24);
  });

  it('320/390 × 金額 × 文字倍率で、符号付き数字のまとまりが幅を超えない', () => {
    for (const width of [320, 390]) {
      const available = layoutMetrics(width).contentWidth;
      for (const amount of AMOUNTS) {
        for (const scale of SCALES) {
          const text = formatYen(amount);
          const size = displayStep(text, available, scale);
          const applied = size * Math.min(scale, DISPLAY_MAX_SCALE);
          expect(estimateTextWidth(splitYen(text).number, applied)).toBeLessThanOrEqual(available);
        }
      }
    }
  });
});

describe('tileColumns（数値タイル）', () => {
  const inner = (width: number) => {
    const m = layoutMetrics(width);
    return m.contentWidth - m.sheetPadding * 2;
  };

  it('320幅の通常額は2列、7桁以上は1列', () => {
    const spacing = tileSpacing('compact');
    expect(tileColumns(inner(320), 1, ['300,000円', '50,000円'], spacing).columns).toBe(2);
    expect(tileColumns(inner(320), 1, ['1,234,567円', '50,000円'], spacing).columns).toBe(1);
    expect(tileColumns(inner(320), 1.3, ['300,000円', '50,000円'], spacing).columns).toBe(1);
  });

  it('390幅は7桁まで2列、巨大な負額は1列', () => {
    const spacing = tileSpacing('regular');
    expect(tileColumns(inner(390), 1, ['1,234,567円', '50,000円'], spacing).columns).toBe(2);
    expect(tileColumns(inner(390), 1, ['-1,000,000,000円', '50,000円'], spacing).columns).toBe(1);
  });

  it('320/390 × 金額 × 文字倍率で、選んだ列と文字サイズで数字が収まる', () => {
    for (const width of [320, 390]) {
      const container = inner(width);
      const spacing = tileSpacing(layoutMetrics(width).sizeClass);
      for (const amount of AMOUNTS) {
        for (const scale of SCALES) {
          const texts = [formatYen(amount), formatYen(50_000)];
          const layout = tileColumns(container, scale, texts, spacing);
          const tileInner = layout.columns === 2
            ? (container - layout.gap) / 2 - layout.padding * 2
            : container - layout.padding * 2;
          const applied = layout.fontSize * Math.min(scale, TILE_MAX_SCALE);
          for (const text of texts) {
            expect(estimateTextWidth(splitYen(text).number, applied)).toBeLessThanOrEqual(tileInner);
          }
          if (layout.columns === 2) {
            expect(layout.fontSize).toBe(20);
          }
        }
      }
    }
  });
});

describe('splitBarModel（総支給の構成の帯）', () => {
  it('総支給＝手取り＋控除なら、比率どおりの2区画と隙間', () => {
    const model = splitBarModel({ grossPay: 300_000, totalDeductions: 50_000, netPay: 250_000 });
    expect(model).toMatchObject({ visible: true, gap: true });
    if (!model.visible) throw new Error('visible expected');
    expect(model.segments.map((s) => s.kind)).toEqual(['net', 'deductions']);
    expect(model.segments[0]?.weight).toBeCloseTo(250 / 300);
    expect(model.segments[1]?.weight).toBeCloseTo(50 / 300);
  });

  it('微小な区画にも最小幅を足さない', () => {
    const model = splitBarModel({ grossPay: 1_000_000, totalDeductions: 1, netPay: 999_999 });
    if (!model.visible) throw new Error('visible expected');
    expect(model.segments[1]?.weight).toBe(1 / 1_000_000);
    expect(model.segments.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1);
  });

  it('手取り0円は控除だけ、控除0円は手取りだけで、隙間を出さない', () => {
    const noNet = splitBarModel({ grossPay: 100_000, totalDeductions: 100_000, netPay: 0 });
    if (!noNet.visible) throw new Error('visible expected');
    expect(noNet.segments).toEqual([{ kind: 'deductions', amount: 100_000, weight: 1 }]);
    expect(noNet.gap).toBe(false);
    const noDeduction = splitBarModel({ grossPay: 100_000, totalDeductions: 0, netPay: 100_000 });
    if (!noDeduction.visible) throw new Error('visible expected');
    expect(noDeduction.segments).toEqual([{ kind: 'net', amount: 100_000, weight: 1 }]);
    expect(noDeduction.gap).toBe(false);
  });

  it('すべて0円・総支給0円は描かない', () => {
    expect(splitBarModel({ grossPay: 0, totalDeductions: 0, netPay: 0 })).toEqual({ visible: false, reason: 'noGross' });
    expect(splitBarModel({ grossPay: 0, totalDeductions: 100, netPay: -100 })).toEqual({ visible: false, reason: 'noGross' });
  });

  it('還付（控除が負）・手取りが負は描かない', () => {
    expect(splitBarModel({ grossPay: 300_000, totalDeductions: -5_000, netPay: 305_000 })).toEqual({ visible: false, reason: 'negative' });
    expect(splitBarModel({ grossPay: 10_000, totalDeductions: 20_000, netPay: -10_000 })).toEqual({ visible: false, reason: 'negative' });
  });

  it('調整で等式が崩れる明細は描かない。調整の合計が0なら描く', () => {
    expect(splitBarModel({ grossPay: 300_000, totalDeductions: 50_000, netPay: 245_000 })).toEqual({ visible: false, reason: 'adjusted' });
    // 調整 +3,000円 と -3,000円 で合計0（等式が成り立つ）
    expect(splitBarModel({ grossPay: 300_000, totalDeductions: 50_000, netPay: 250_000 }).visible).toBe(true);
  });
});

describe('deltaEmphasis', () => {
  it('手取り・総支給・支給は方向色、控除・調整は中立', () => {
    expect(deltaEmphasis('netPay')).toBe('direction');
    expect(deltaEmphasis('grossPay')).toBe('direction');
    expect(deltaEmphasis('earning')).toBe('direction');
    expect(deltaEmphasis('totalDeductions')).toBe('neutral');
    expect(deltaEmphasis('deduction')).toBe('neutral');
    expect(deltaEmphasis('adjustment')).toBe('neutral');
  });
});

describe('topItemChanges', () => {
  const items = [
    { label: '基本給', category: 'earning' as const, amount: 1_000, change: 'changed' as const },
    { label: '住民税', category: 'deduction' as const, amount: -3_000, change: 'changed' as const },
    { label: '通勤手当', category: 'earning' as const, amount: 3_000, change: 'added' as const },
    { label: '雇用保険', category: 'deduction' as const, amount: 10, change: 'changed' as const },
  ];

  it('差の絶対値の大きい順、同じ大きさは元の順。limitで件数を絞る', () => {
    expect(topItemChanges(items, 3).map((i) => i.label)).toEqual(['住民税', '通勤手当', '基本給']);
    expect(topItemChanges(items).map((i) => i.label)).toEqual(['住民税', '通勤手当', '基本給', '雇用保険']);
    expect(items[0]?.label).toBe('基本給');
  });
});

describe('comparableItemChanges', () => {
  const item = (category: 'earning' | 'deduction' | 'adjustment') => ({ id: category, label: category, category, amount: 1, code: 'other' as const });
  const diffItems = [
    { label: '基本給', category: 'earning' as const, amount: 1_000, change: 'added' as const },
    { label: '住民税', category: 'deduction' as const, amount: 500, change: 'changed' as const },
  ];

  it('比較月に支給の項目が無ければ、支給の項目差を「今月のみ」と見せずに比較から外す', () => {
    const result = comparableItemChanges(diffItems, { items: [item('earning'), item('deduction')] }, { items: [item('deduction')] });
    expect(result.notCompared).toEqual(['earning']);
    expect(result.items.map((i) => i.label)).toEqual(['住民税']);
    expect(result.unchanged).toEqual([]);
  });

  it('控除合計0円で控除の項目が無い月は、控除を比べず、支給の「変化なし」を明示できる', () => {
    // 当月: 控除合計0円・控除項目なし（未登録ではない可能性がある）。前月: 控除項目あり。支給の項目は同額。
    const removedDeduction = [{ label: '住民税', category: 'deduction' as const, amount: -12_000, change: 'removed' as const }];
    const result = comparableItemChanges(removedDeduction, { items: [item('earning')] }, { items: [item('earning'), item('deduction')] });
    expect(result.notCompared).toEqual(['deduction']);
    expect(result.items).toEqual([]);
    expect(result.unchanged).toEqual(['earning']);
  });

  it('両月とも項目があれば全件、比較月がなければ空', () => {
    const both = { items: [item('earning'), item('deduction')] };
    expect(comparableItemChanges(diffItems, both, both)).toEqual({ items: diffItems, notCompared: [], unchanged: [] });
    expect(comparableItemChanges(diffItems, both, null)).toEqual({ items: [], notCompared: [], unchanged: [] });
    expect(comparableItemChanges([], both, both).unchanged).toEqual(['earning', 'deduction']);
  });

  it('調整の有無は比較から外す理由にしない', () => {
    const current = { items: [item('earning'), item('deduction'), item('adjustment')] };
    const previous = { items: [item('earning'), item('deduction')] };
    expect(comparableItemChanges([], current, previous).notCompared).toEqual([]);
  });
});
