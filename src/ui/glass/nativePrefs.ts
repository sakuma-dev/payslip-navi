import { AccessibilityChangeEventName, AccessibilityInfo } from 'react-native';
import type { PrefAction, PrefKey } from './glassMode';

export interface NativePrefSource {
  key: PrefKey;
  event: AccessibilityChangeEventName;
  query: () => Promise<boolean>;
}

// iOS / Android の設定購読。先に通知を登録してから問い合わせる（通知が先なら reducer が問い合わせ結果を捨てる）。
// cleanup 後は dispatch しない。対応しない設定は unsupported として記録する。
export function subscribeNativePrefs(
  dispatch: (action: PrefAction) => void,
  sources: NativePrefSource[],
  unsupported: PrefKey[],
): () => void {
  let active = true;
  for (const key of unsupported) dispatch({ type: 'unsupported', key });
  const subscriptions = sources.map((source) =>
    AccessibilityInfo.addEventListener(source.event, (on: boolean) => {
      if (active) dispatch({ type: 'event', key: source.key, on: !!on });
    }),
  );
  for (const source of sources) {
    let query: Promise<boolean>;
    try {
      query = source.query();
    } catch {
      dispatch({ type: 'fail', key: source.key });
      continue;
    }
    query
      .then((on) => {
        if (active) dispatch({ type: 'query', key: source.key, on: !!on });
      })
      .catch(() => {
        if (active) dispatch({ type: 'fail', key: source.key });
      });
  }
  return () => {
    active = false;
    for (const subscription of subscriptions) subscription.remove();
  };
}
