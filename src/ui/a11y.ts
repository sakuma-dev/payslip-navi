import { AccessibilityState, Platform } from 'react-native';

type WebAria = {
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-busy'?: boolean;
  'aria-expanded'?: boolean;
};

const IS_WEB = Platform.OS === 'web';

// RN Web 0.21 は accessibilityState を DOM へ出さない。Web だけ同じ状態を aria-* でも渡す。
// native には aria-* を渡さない（accessibilityState に合成され、読み上げが変わり得るため）。
// disabled は Pressable の disabled が Web でも aria-disabled を出すので、ここでは扱わない。
// web: Web で出す状態が native と異なる時だけ指定する（radio の選択は Web では aria-checked）。
export function a11yState(state: AccessibilityState, web: AccessibilityState = state): { accessibilityState: AccessibilityState } & WebAria {
  if (!IS_WEB) return { accessibilityState: state };
  const aria: WebAria = {};
  if (web.selected !== undefined) aria['aria-selected'] = web.selected;
  if (web.checked !== undefined) aria['aria-checked'] = web.checked;
  if (web.busy !== undefined) aria['aria-busy'] = web.busy;
  if (web.expanded !== undefined) aria['aria-expanded'] = web.expanded;
  return { accessibilityState: state, ...aria };
}
