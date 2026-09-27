// 手取り推移グラフの棒の配置を計算する（表示専用の純粋関数）。
// 0円の基準線を境に、正の値は上へ、負の値は下へ伸ばす。高さは絶対値に比例する。

export type BarKind = 'positive' | 'negative' | 'zero' | 'missing';

export interface BarGeometry {
  kind: BarKind;
  // グラフ領域の上端からの位置と高さ（px）
  top: number;
  height: number;
}

export interface BarLayout {
  // 0円の基準線の位置（上端からのpx）
  baseline: number;
  bars: BarGeometry[];
}

const MIN_BAR = 3;

export function layoutBars(values: (number | null)[], area: number): BarLayout {
  const present = values.filter((v): v is number => v !== null);
  const maxPositive = Math.max(0, ...present);
  const maxNegative = Math.max(0, ...present.map((v) => -v));
  const range = maxPositive + maxNegative;
  // 共通の比例スケールで基準線を置き、値がある側には最小高の余白を確保する。
  // 棒は自分の側の余白を超えないので、正の棒が線の下へ、負の棒が線の上へ出ることはない。
  const lowest = maxPositive > 0 ? Math.min(MIN_BAR, area) : 0;
  const highest = maxNegative > 0 ? Math.max(lowest, area - MIN_BAR) : area;
  const proportional = range === 0 ? area : Math.round((maxPositive / range) * area);
  const baseline = Math.min(Math.max(proportional, lowest), highest);

  const bars = values.map((value): BarGeometry => {
    if (value === null) return { kind: 'missing', top: baseline, height: 0 };
    if (value === 0) return { kind: 'zero', top: baseline, height: 0 };
    const raw = Math.round((Math.abs(value) / range) * area);
    if (value > 0) {
      const height = Math.min(Math.max(MIN_BAR, raw), baseline);
      return { kind: 'positive', top: baseline - height, height };
    }
    const height = Math.min(Math.max(MIN_BAR, raw), area - baseline);
    return { kind: 'negative', top: baseline, height };
  });

  return { baseline, bars };
}
