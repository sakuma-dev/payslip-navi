import { Platform, TextStyle, ViewStyle } from 'react-native';
import { palette } from './glass/palette';

// 色の正本は glass/palette.ts（意味とコントラストは docs/UI-GLASS-DESIGN.md §2）。
export const colors = palette;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

export const radius = { xs: 4, sm: 10, md: 14, lg: 20, card: 24, xl: 28, header: 26, nav: 32, pill: 999 } as const;

export const shadow = {
  card: { boxShadow: '0 10px 28px rgba(31,53,99,0.08), 0 1px 2px rgba(31,53,99,0.05)' } as ViewStyle,
  // 浮遊する機能層（native Liquid Glass では付けない。システムの影を使う）
  glass: { boxShadow: '0 12px 32px rgba(31,53,99,0.16), 0 2px 6px rgba(31,53,99,0.08)' } as ViewStyle,
  // 上端の光。クリップする内側の層にだけ付ける
  highlight: { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)' } as ViewStyle,
  capsule: { boxShadow: '0 2px 8px rgba(31,53,99,0.14)' } as ViewStyle,
  buttonPrimary: { boxShadow: '0 6px 16px rgba(36,88,208,0.28), inset 0 1px 0 rgba(255,255,255,0.28)' } as ViewStyle,
  dialog: { boxShadow: '0 12px 32px rgba(22,33,58,0.18)' } as ViewStyle,
} as const;

// Webでは端末にある日本語フォントを優先する（リモート読込なし）。nativeはシステムフォント。
export const fontBase: TextStyle = Platform.select<TextStyle>({
  web: { fontFamily: 'system-ui, -apple-system, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Noto Sans JP", sans-serif' },
  default: {},
});

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

const t = (style: TextStyle): TextStyle => ({ ...fontBase, color: colors.ink, ...style });

export const type = {
  display: t({ fontSize: 44, lineHeight: 50, fontWeight: '800', ...tabular }),
  largeTitle: t({ fontSize: 28, lineHeight: 34, fontWeight: '800' }),
  title: t({ fontSize: 22, lineHeight: 28, fontWeight: '700' }),
  headline: t({ fontSize: 17, lineHeight: 24, fontWeight: '700' }),
  heading: t({ fontSize: 17, lineHeight: 24, fontWeight: '700' }),
  body: t({ fontSize: 15, lineHeight: 23 }),
  bodyStrong: t({ fontSize: 15, lineHeight: 23, fontWeight: '600' }),
  bodyMuted: t({ fontSize: 14, lineHeight: 21, color: colors.inkMuted }),
  label: t({ fontSize: 13, lineHeight: 18, fontWeight: '600', color: colors.inkMuted }),
  caption: t({ fontSize: 12, lineHeight: 17, color: colors.inkMuted }),
  micro: t({ fontSize: 11, lineHeight: 14, fontWeight: '600', color: colors.inkMuted }),
  moneyXL: t({ fontSize: 26, lineHeight: 32, fontWeight: '800', ...tabular }),
  moneyL: t({ fontSize: 20, lineHeight: 26, fontWeight: '700', ...tabular }),
  moneyM: t({ fontSize: 16, lineHeight: 22, fontWeight: '700', ...tabular }),
  moneyS: t({ fontSize: 13, lineHeight: 18, fontWeight: '700', ...tabular }),
  // 既存名
  money: t({ fontSize: 16, lineHeight: 22, fontWeight: '700', ...tabular }),
  moneyLarge: t({ fontSize: 20, lineHeight: 26, fontWeight: '700', ...tabular }),
} as const;

export const categoryColor = {
  earning: colors.catEarning,
  deduction: colors.catDeduction,
  adjustment: colors.catAdjustment,
} as const;

// 押下領域の実寸（Webでも hitSlop に頼らない）
export const TOUCH = 44;

// キーボードフォーカス表示。outline を主にするので、forced-colors で影が消えても残る（D-M3）。
// 外側に primaryDeep の線、内側に白い縁（暗い面・明るい面のどちらでも見える）。
export const focusRing: ViewStyle = {
  outlineWidth: 2,
  outlineStyle: 'solid',
  outlineColor: palette.primaryDeep,
  outlineOffset: 2,
  boxShadow: '0 0 0 2px #FFFFFF',
};
// クリップされる層（ナビ・ヘッダー）の内側で使う。
export const focusRingInset: ViewStyle = {
  outlineWidth: 2,
  outlineStyle: 'solid',
  outlineColor: palette.primaryDeep,
  outlineOffset: -2,
  boxShadow: 'inset 0 0 0 4px #FFFFFF',
};
// デモ帯（濃い紫）の上だけ
export const focusRingOnDark: ViewStyle = { outlineWidth: 2, outlineStyle: 'solid', outlineColor: '#FFFFFF', outlineOffset: 2 };
