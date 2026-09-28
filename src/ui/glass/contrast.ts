// WCAG 2.x の相対輝度とコントラスト比（sRGB）。アルファ合成は丸めずに行う。
// 算出条件は docs/UI-GLASS-DESIGN.md §2.1。

export type Rgb = readonly [number, number, number];

export function parseColor(value: string): { rgb: Rgb; alpha: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = hex[1]!;
    return { rgb: [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as unknown as Rgb, alpha: 1 };
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value);
  if (rgba) {
    return { rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])], alpha: rgba[4] === undefined ? 1 : Number(rgba[4]) };
  }
  throw new Error(`unsupported color: ${value}`);
}

// top（alpha 付き）を不透明な base の上に重ねた色
export function over(top: string, base: Rgb, alpha?: number): Rgb {
  const parsed = parseColor(top);
  const a = alpha ?? parsed.alpha;
  return [0, 1, 2].map((i) => parsed.rgb[i]! * a + base[i]! * (1 - a)) as unknown as Rgb;
}

export function toRgb(color: string): Rgb {
  const parsed = parseColor(color);
  if (parsed.alpha !== 1) throw new Error(`not opaque: ${color}`);
  return parsed.rgb;
}

export function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as unknown as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: Rgb | string, b: Rgb | string): number {
  const la = luminance(typeof a === 'string' ? toRgb(a) : a);
  const lb = luminance(typeof b === 'string' ? toRgb(b) : b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function toHex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}
