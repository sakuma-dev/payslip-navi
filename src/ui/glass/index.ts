import { ViewStyle } from 'react-native';
import { colors, shadow } from '../theme';
import type { GlassState } from './glassMode';
import { useGlass } from './GlassProvider';

export { BlurTarget, GlassProvider, useGlass } from './GlassProvider';
export { GlassSurface } from './GlassSurface';
export { Scene } from './Scene';

const cardShadowWithHighlight: ViewStyle = {
  boxShadow: '0 10px 28px rgba(31,53,99,0.08), 0 1px 2px rgba(31,53,99,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
};

// 情報面（カード・内訳シート）。ぼかしは使わない。不透明・高コントラストでは白と意味のある境界にする。
export function surfaceStyle(kind: 'card' | 'raised', glass: Pick<GlassState, 'opaqueSurfaces' | 'highContrast'>): ViewStyle[] {
  if (glass.highContrast) return [{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong }, shadow.card];
  if (glass.opaqueSurfaces) return [{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }, shadow.card];
  return [
    { backgroundColor: kind === 'raised' ? colors.surfaceRaisedGlass : colors.surfaceGlass, borderWidth: 1, borderColor: colors.glassEdge },
    cardShadowWithHighlight,
  ];
}

export function useSurfaceStyle(kind: 'card' | 'raised'): ViewStyle[] {
  return surfaceStyle(kind, useGlass());
}
