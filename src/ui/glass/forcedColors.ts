import type { ViewProps } from 'react-native';

// 強制色（Windows のハイコントラスト等）で、塗りだけで意味を持つ図形を残すための印。
// 強制色があるのは Web だけなので、既定（native・vitest・tsc）では何も付けない。実装は forcedColors.web.ts。
// ink: 文字色で塗る / accent: 選択色で塗る / accentEdge: 地は Canvas、縁を選択色にする
export type ForcedFill = 'ink' | 'accent' | 'accentEdge';

export function forcedFill(_role: ForcedFill): ViewProps {
  return {};
}
