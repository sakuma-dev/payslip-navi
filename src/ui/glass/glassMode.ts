// 素材の決定（純関数）。docs/UI-GLASS-DESIGN.md §3 / §6。
// - 取得できていない値（unknown）は安全な静的表示（solid＋不透明な面）にする。
// - 変更通知が問い合わせ結果より先に届いた場合は、通知を新しい状態として優先する。
// - 問い合わせに失敗した設定は安全側（on）に倒す。
// - unsupported は off と同じ扱い（可読性はトークンの下限で保証する）で、許可された証拠とは区別する。

export type Capability = 'unknown' | 'native' | 'blur' | 'none';
export type GlassMode = 'native' | 'blur' | 'solid';
export type PrefValue = 'unknown' | 'on' | 'off' | 'unsupported';
export type PrefKey = 'reduceTransparency' | 'increaseContrast' | 'forcedColors';

export interface PrefEntry {
  value: PrefValue;
  // 変更通知で決まった値か（問い合わせ結果で上書きしない）
  fromEvent: boolean;
}

export type Prefs = Record<PrefKey, PrefEntry>;

export type PrefAction =
  | { type: 'event' | 'query'; key: PrefKey; on: boolean }
  | { type: 'fail' | 'unsupported'; key: PrefKey };

export const PREF_KEYS: readonly PrefKey[] = ['reduceTransparency', 'increaseContrast', 'forcedColors'];

export const INITIAL_PREFS: Prefs = {
  reduceTransparency: { value: 'unknown', fromEvent: false },
  increaseContrast: { value: 'unknown', fromEvent: false },
  forcedColors: { value: 'unknown', fromEvent: false },
};

export function prefsReducer(state: Prefs, action: PrefAction): Prefs {
  const current = state[action.key];
  let next: PrefEntry;
  switch (action.type) {
    case 'event':
      next = { value: action.on ? 'on' : 'off', fromEvent: true };
      break;
    case 'query':
      if (current.fromEvent) return state;
      next = { value: action.on ? 'on' : 'off', fromEvent: false };
      break;
    case 'fail':
      if (current.fromEvent) return state;
      next = { value: 'on', fromEvent: false };
      break;
    case 'unsupported':
      if (current.fromEvent) return state;
      next = { value: 'unsupported', fromEvent: false };
      break;
  }
  if (current.value === next.value && current.fromEvent === next.fromEvent) return state;
  return { ...state, [action.key]: next };
}

export interface GlassState {
  mode: GlassMode;
  // カード等を不透明な白にする（透明度低減・高コントラスト・未確定）
  opaqueSurfaces: boolean;
  // 境界を lineStrong にし、Scene の塊と光沢を消す
  highContrast: boolean;
}

const allowed = (value: PrefValue) => value === 'off' || value === 'unsupported';

export function resolveGlass(capability: Capability, prefs: Prefs, targetReady: boolean): GlassState {
  const transparencyAllowed = allowed(prefs.reduceTransparency.value);
  const contrastKnown = prefs.increaseContrast.value !== 'unknown' && prefs.forcedColors.value !== 'unknown';
  const highContrast = prefs.increaseContrast.value === 'on' || prefs.forcedColors.value === 'on';
  const opaqueSurfaces = !transparencyAllowed || !contrastKnown || highContrast;
  const materialAllowed = !opaqueSurfaces && targetReady;
  const mode: GlassMode = materialAllowed && (capability === 'native' || capability === 'blur') ? capability : 'solid';
  return { mode, opaqueSurfaces, highContrast };
}
