import React from 'react';
import { Platform, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from './theme';

const IS_WEB = Platform.OS === 'web';

// アプリ独自の線アイコン（24グリッド・線幅1.75・丸い端）。装飾扱いで読み上げない。
// 名前は操作側の accessibilityLabel で持たせる。

type Shape =
  | { d: string }
  | { cx: number; cy: number; r: number; fill?: boolean }
  | { x: number; y: number; w: number; h: number; rx: number };

const ICONS = {
  home: [{ d: 'M4 10.6 12 4l8 6.6V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z' }],
  history: [
    { cx: 5, cy: 7, r: 1.1, fill: true }, { cx: 5, cy: 12, r: 1.1, fill: true }, { cx: 5, cy: 17, r: 1.1, fill: true },
    { d: 'M9 7h11M9 12h11M9 17h8' },
  ],
  book: [
    { d: 'M12 6.5C10.4 5.2 8 4.5 4.5 4.5v13c3.5 0 5.9.7 7.5 2 1.6-1.3 4-2 7.5-2v-13c-3.5 0-5.9.7-7.5 2z' },
    { d: 'M12 6.5v13' },
  ],
  sliders: [
    { d: 'M4 6h8M16 6h4M4 12h2M10 12h10M4 18h11M19 18h1' },
    { cx: 14, cy: 6, r: 2 }, { cx: 8, cy: 12, r: 2 }, { cx: 17, cy: 18, r: 2 },
  ],
  plus: [{ d: 'M12 5v14M5 12h14' }],
  camera: [
    { d: 'M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z' },
    { cx: 12, cy: 13, r: 3.5 },
  ],
  image: [
    { x: 4, y: 5, w: 16, h: 14, rx: 2 },
    { cx: 9, cy: 10, r: 1.5 },
    { d: 'M20 15.5 15.5 11 7 19' },
  ],
  clipboard: [
    { x: 5.5, y: 5, w: 13, h: 15.5, rx: 2 },
    { x: 9, y: 3.5, w: 6, h: 3.5, rx: 1 },
    { d: 'M9 11.5h6M9 15.5h4' },
  ],
  pencil: [{ d: 'M5 19l1-4.2 9.3-9.3a2.1 2.1 0 0 1 3 3L9 17.8z' }, { d: 'M13.8 7l3.2 3.2' }],
  chevronLeft: [{ d: 'M14.5 5.5 8 12l6.5 6.5' }],
  chevronRight: [{ d: 'M9.5 5.5 16 12l-6.5 6.5' }],
  chevronDown: [{ d: 'M5.5 9.5 12 16l6.5-6.5' }],
  arrowUpRight: [{ d: 'M7 17 17 7M9 7h8v8' }],
  arrowDownRight: [{ d: 'M7 7l10 10M17 9v8H9' }],
  minus: [{ d: 'M5 12h14' }],
  check: [{ d: 'M5 12.5 9.5 17 19 7.5' }],
  checkCircle: [{ cx: 12, cy: 12, r: 8.5 }, { d: 'M8.2 12.4l2.6 2.6 5-5' }],
  alert: [{ d: 'M12 4.5 3.5 19h17z' }, { d: 'M12 10v4.2' }, { cx: 12, cy: 16.6, r: 0.9, fill: true }],
  info: [{ cx: 12, cy: 12, r: 8.5 }, { d: 'M12 11v5' }, { cx: 12, cy: 8, r: 0.9, fill: true }],
  trash: [{ d: 'M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7M10.5 11v5M13.5 11v5' }],
  upload: [{ d: 'M12 15V4.5M7.5 9 12 4.5 16.5 9M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14' }],
  download: [{ d: 'M12 4.5V15M7.5 10.5 12 15l4.5-4.5M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14' }],
  externalLink: [{ d: 'M14 4h6v6M20 4l-8.5 8.5M18 13.5v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6h5' }],
  close: [{ d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' }],
  // 保存場所の説明用の中立な端末アイコン（保護・暗号化を示唆しない）
  device: [{ x: 7, y: 3, w: 10, h: 18, rx: 2.2 }, { d: 'M10.5 17.5h3' }],
  layers: [{ d: 'M12 4 3.5 8.5 12 13l8.5-4.5z' }, { d: 'M3.5 12.8 12 17.3l8.5-4.5' }],
  document: [{ x: 5.5, y: 3.5, w: 13, h: 17, rx: 2 }, { d: 'M9 8.5h6M9 12h6M9 15.5h3.5' }],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, color = colors.ink, strokeWidth = 1.75 }: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const shapes: Shape[] = ICONS[name];
  // Web は線と塗りを currentColor にし、色は包む要素の color で渡す。強制色では color がシステム色に置き換わるので、
  // SVG の stroke/fill が元の色のまま背景に沈まず、文字と同じ色で見える。native は従来どおり色を直接渡す。
  const paint = IS_WEB ? 'currentColor' : color;
  return (
    <View
      style={[{ width: size, height: size }, IS_WEB && ({ color } as ViewStyle)]}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {shapes.map((shape, i) => {
          if ('d' in shape) {
            return (
              <Path key={i} d={shape.d} stroke={paint} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            );
          }
          if ('cx' in shape) {
            return shape.fill
              ? <Circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={paint} />
              : <Circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} stroke={paint} strokeWidth={strokeWidth} fill="none" />;
          }
          return (
            <Rect key={i} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} stroke={paint} strokeWidth={strokeWidth} strokeLinejoin="round" fill="none" />
          );
        })}
      </Svg>
    </View>
  );
}
