import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 実測のsafe area（App.tsx の SafeAreaProvider 配下で使う）。
export function useInsets(): { top: number; bottom: number } {
  const { top, bottom } = useSafeAreaInsets();
  return { top, bottom };
}
