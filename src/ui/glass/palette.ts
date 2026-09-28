// 色の正本（React Native に依存しないので、コントラストの単体テストから直接読める）。
// 意味とコントラストの条件は docs/UI-GLASS-DESIGN.md §2 / §2.1。文字色に opacity を足してコントラストを下げない。
export const palette = {
  // L0 Scene（装飾。Scene の上に置ける文字は ink / inkMuted / primaryDeep だけ）
  sceneTop: '#F7F9FD',
  sceneBottom: '#E8EEF8',
  blobBlue: '#9DBBF5',
  blobAqua: '#A6DCE8',
  blobLilac: '#C6C0F2',

  // L1 情報面
  canvas: '#F7F9FD',
  surface: '#FFFFFF',
  surfaceSunken: '#F3F6FB',
  surfaceGlass: 'rgba(255,255,255,0.90)',
  surfaceRaisedGlass: 'rgba(255,255,255,0.94)',
  // 装飾の罫線だけ。意味を持つ境界は lineStrong（カード上で3:1以上。Scene上では使わない）。
  line: '#E1E7F0',
  lineStrong: '#7B8598',
  ink: '#16213A',
  inkMuted: '#4A5670',
  // カードの上だけで使う補足文字（Scene・ガラスの上では4.5:1に届かない）
  inkSubtle: '#56627A',
  // 装飾だけ（文字・意味のある図形には使わない）
  inkFaint: '#A3ADC0',
  primary: '#2458D0',
  primaryDeep: '#15398F',
  primarySoft: '#E6EDFC',
  onPrimary: '#FFFFFF',
  up: '#0F7A5C',
  upSoft: '#E3F4EE',
  down: '#B0441A',
  downSoft: '#FCEEE7',
  neutralDelta: '#3E4A63',
  neutralDeltaSoft: '#EDF0F5',
  warning: '#835300',
  warningSoft: '#FFF3D1',
  danger: '#B42332',
  dangerSoft: '#FCE8EA',
  demo: '#6B4FBB',
  demoSoft: '#EFEBFA',
  catEarning: '#2458D0',
  catDeduction: '#7A8AA6',
  catAdjustment: '#1D8391',
  barMuted: '#6690E6',
  barStrong: '#15398F',
  scrim: 'rgba(22,33,58,0.40)',

  // L2 機能層（ナビ・ヘッダー）。ガラスの上の文字は ink と primaryDeep だけ。
  glassTint: 'rgba(248,250,255,0.72)',
  glassSolid: '#F5F8FD',
  // 縁の光（装飾。境界としては数えない）
  glassEdge: 'rgba(255,255,255,0.85)',
  capsule: 'rgba(255,255,255,0.94)',
  glassButton: 'rgba(255,255,255,0.72)',
  backPill: 'rgba(255,255,255,0.55)',
  backPillPressed: 'rgba(21,57,143,0.10)',
  controlTrack: '#E9EEF7',

  // 既存画面が参照している名前（新しい値へ対応付け）
  background: '#F7F9FD',
  surfaceMuted: '#F3F6FB',
  earning: '#2458D0',
  deduction: '#7A8AA6',
  adjustment: '#1D8391',
  bar: '#6690E6',
} as const;

// Scene の色の塊（中心の不透明度。外周は0）。contrast.test は3つが中心のまま重なる最悪値で検査する。
export const sceneBlobs = [
  { color: palette.blobBlue, alpha: 0.5 },
  { color: palette.blobAqua, alpha: 0.4 },
  { color: palette.blobLilac, alpha: 0.35 },
] as const;
