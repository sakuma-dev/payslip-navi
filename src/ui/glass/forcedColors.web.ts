import type { ViewProps } from 'react-native';

// Web の強制色（forced-colors: active）。背景色は Canvas に置き換わるので、推移の棒・0円線・割合帯・凡例の見本は
// 塗りが消える。その要素だけ forced-color-adjust: none にしてシステム色で塗る（D-M3）。
// media の中だけで効くので通常色の表示は変わらない。形・大きさは変えない（最小の高さや幅を足さない）。
// RN Web の style はシステム色の名前を受け付けないため、data 属性と1つの style 要素で指定する。
type ForcedFill = 'ink' | 'accent' | 'accentEdge';

const RULES = `@media (forced-colors: active) {
  [data-forced-fill="ink"] { forced-color-adjust: none; background-color: CanvasText !important; border-color: CanvasText !important; }
  [data-forced-fill="accent"] { forced-color-adjust: none; background-color: Highlight !important; border-color: Highlight !important; }
  [data-forced-fill="accentEdge"] { forced-color-adjust: none; background-color: Canvas !important; border-color: Highlight !important; }
}`;

if (typeof document !== 'undefined' && !document.querySelector('style[data-forced-fill-rules]')) {
  const element = document.createElement('style');
  element.setAttribute('data-forced-fill-rules', '');
  element.textContent = RULES;
  document.head.appendChild(element);
}

export function forcedFill(role: ForcedFill): ViewProps {
  return { dataSet: { forcedFill: role } } as ViewProps;
}
