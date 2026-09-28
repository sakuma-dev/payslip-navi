import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Capability, GlassState, INITIAL_PREFS, prefsReducer, resolveGlass } from './glassMode';
import { BlurTargetView, detectCapability, needsTarget, subscribePreferences } from './platform';

// 素材の状態を1か所で持つ（購読も1回だけ）。docs/UI-GLASS-DESIGN.md §3 / §6。
// capability と設定が確定するまでは solid＋不透明な面で表示する。

interface GlassContextValue extends GlassState {
  targetRef: RefObject<View | null>;
  onTargetLayout: () => void;
}

const fallbackRef: RefObject<View | null> = { current: null };

const GlassContext = createContext<GlassContextValue>({
  ...resolveGlass('unknown', INITIAL_PREFS, false),
  targetRef: fallbackRef,
  onTargetLayout: () => {},
});

function detectSafely(): Capability {
  try {
    return detectCapability();
  } catch {
    return 'none';
  }
}

export function GlassProvider({ children }: { children: ReactNode }) {
  // 対応状況の検出は同期で1回だけ。設定（prefs）が unknown の間は、どの capability でも solid で表示される。
  const [capability] = useState<Capability>(detectSafely);
  const [prefs, dispatch] = useReducer(prefsReducer, INITIAL_PREFS);
  const targetRef = useRef<View>(null);
  const [targetReady, setTargetReady] = useState(!needsTarget);

  useEffect(() => subscribePreferences(dispatch), []);

  const onTargetLayout = useCallback(() => setTargetReady(true), []);

  const value = useMemo<GlassContextValue>(
    () => ({ ...resolveGlass(capability, prefs, targetReady), targetRef, onTargetLayout }),
    [capability, prefs, targetReady, onTargetLayout],
  );
  return <GlassContext.Provider value={value}>{children}</GlassContext.Provider>;
}

export function useGlass(): GlassContextValue {
  return useContext(GlassContext);
}

// 実素材が写す範囲（Android では BlurTargetView）。GlassSurface をこの子孫に入れない。
export function BlurTarget({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { targetRef, onTargetLayout } = useGlass();
  return (
    <BlurTargetView ref={targetRef} style={style} onLayout={onTargetLayout} collapsable={false}>
      {children}
    </BlurTargetView>
  );
}
