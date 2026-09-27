import { TextStyle } from 'react-native';

export const colors = {
  background: '#F5F3EE',
  surface: '#FFFFFF',
  surfaceMuted: '#EEEBE4',
  line: '#DDD8CE',
  ink: '#1E292D',
  inkMuted: '#5B676C',
  inkFaint: '#8A9498',
  primary: '#1F5F5B',
  primarySoft: '#E2EEEB',
  onPrimary: '#FFFFFF',
  up: '#1F6F62',
  down: '#B4533A',
  warning: '#7A5200',
  warningSoft: '#FFF3D6',
  danger: '#A23B2A',
  dangerSoft: '#FBE8E3',
  demo: '#5B4B8A',
  demoSoft: '#ECE8F6',
  earning: '#1F5F5B',
  deduction: '#6A5A48',
  adjustment: '#5B4B8A',
  bar: '#7FB2A9',
  barStrong: '#1F5F5B',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display: { fontSize: 36, fontWeight: '700', color: colors.ink, letterSpacing: 0.2, ...tabular } as TextStyle,
  title: { fontSize: 22, fontWeight: '700', color: colors.ink } as TextStyle,
  heading: { fontSize: 17, fontWeight: '700', color: colors.ink } as TextStyle,
  body: { fontSize: 15, lineHeight: 22, color: colors.ink } as TextStyle,
  bodyMuted: { fontSize: 14, lineHeight: 20, color: colors.inkMuted } as TextStyle,
  caption: { fontSize: 12, lineHeight: 17, color: colors.inkMuted } as TextStyle,
  label: { fontSize: 13, fontWeight: '600', color: colors.inkMuted } as TextStyle,
  money: { fontSize: 16, fontWeight: '600', color: colors.ink, ...tabular } as TextStyle,
  moneyLarge: { fontSize: 20, fontWeight: '700', color: colors.ink, ...tabular } as TextStyle,
} as const;

export const categoryColor = {
  earning: colors.earning,
  deduction: colors.deduction,
  adjustment: colors.adjustment,
} as const;
