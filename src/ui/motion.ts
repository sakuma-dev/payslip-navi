import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, LayoutChangeEvent, Platform } from 'react-native';

// 動きの方針は docs/UI-REFRESH-DESIGN.md §6 / §14 M3。
// - 動かすのは opacity と transform だけ。金額の値・棒の高さ/位置は動かさない。
// - 「動きを減らす」の状態は MotionProvider の1か所だけで購読する。
// - 入場の動きはマウント時に状態が確定して「動きあり」の時だけ。unknown で表示した内容を後から隠さない。
// - 押下・開閉・選択は設定の変化に追従する。すべての animation はクリーンアップで止める。

export const duration = { press: 90, release: 140, fast: 160, base: 200, slow: 220, emphasis: 240 } as const;
export const stagger = 40;
export const maxStaggerItems = 4;
export const useNativeDriver = Platform.OS !== 'web';

const easeOut = Easing.out(Easing.cubic);
const easeInOut = Easing.inOut(Easing.quad);

export type MotionStatus = 'unknown' | 'reduce' | 'full';

const MotionContext = createContext<MotionStatus>('unknown');

export function MotionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MotionStatus>('unknown');
  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced: boolean) => {
      changed = true;
      if (active) setStatus(reduced ? 'reduce' : 'full');
    });
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        // 変更通知が先に届いた場合は、そちらを新しい状態として優先する。
        if (active && !changed) setStatus(reduced ? 'reduce' : 'full');
      })
      .catch(() => {
        if (active && !changed) setStatus('reduce');
      });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return createElement(MotionContext.Provider, { value: status }, children);
}

export function useMotion(): { status: MotionStatus; reduced: boolean } {
  const status = useContext(MotionContext);
  return { status, reduced: status !== 'full' };
}

export interface EnterOptions {
  opacity?: number;
  translateX?: number;
  translateY?: number;
  scale?: number;
  delay?: number;
  duration?: number;
}

// マウント時に1回だけの入場。マウント時点で「動きあり」と確定していなければ最終状態で表示し、後から再生しない。
// 入場の途中で「動きを減らす」になった時は、その場で止めて最終状態にする（再生し直さない）。
export function useEnterAnimation(options: EnterOptions = {}) {
  const { status } = useMotion();
  const [animate] = useState(() => status === 'full');
  const [progress] = useState(() => new Animated.Value(animate ? 0 : 1));
  const [config] = useState(() => ({
    opacity: options.opacity ?? 0,
    translateX: options.translateX ?? 0,
    translateY: options.translateY ?? 0,
    scale: options.scale ?? 1,
    delay: options.delay ?? 0,
    duration: options.duration ?? duration.base,
  }));

  useEffect(() => {
    if (!animate) return undefined;
    if (status !== 'full') {
      // 直前の effect の cleanup で止まっている。表示済みの内容なので最終状態へそろえる（隠さない）。
      progress.stopAnimation();
      progress.setValue(1);
      return undefined;
    }
    const timing = Animated.timing(progress, { toValue: 1, duration: config.duration, easing: easeOut, useNativeDriver });
    const anim = config.delay > 0 ? Animated.sequence([Animated.delay(config.delay), timing]) : timing;
    anim.start();
    return () => anim.stop();
  }, [animate, config, progress, status]);

  const [style] = useState(() => {
    const between = (from: number, to: number) => progress.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
    return {
      opacity: between(config.opacity, 1),
      transform: [
        { translateX: between(config.translateX, 0) },
        { translateY: between(config.translateY, 0) },
        { scale: between(config.scale, 1) },
      ],
    };
  });
  return style;
}

// 押下時の縮小（M1）。動きを減らす設定では縮小せず、呼び出し側で地色の変化だけにする。
export function usePressScale(to = 0.97) {
  const { reduced } = useMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const running = useRef<Animated.CompositeAnimation | null>(null);

  const run = useCallback((toValue: number, ms: number) => {
    running.current?.stop();
    if (reduced) {
      scale.setValue(1);
      running.current = null;
      return;
    }
    const anim = Animated.timing(scale, { toValue, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver });
    running.current = anim;
    anim.start();
  }, [reduced, running, scale]);

  useEffect(() => {
    if (reduced) {
      running.current?.stop();
      scale.setValue(1);
    }
  }, [reduced, running, scale]);
  useEffect(() => () => running.current?.stop(), [running]);

  const onPressIn = useCallback(() => run(to, duration.press), [run, to]);
  const onPressOut = useCallback(() => run(1, duration.release), [run]);
  return { onPressIn, onPressOut, style: { transform: [{ scale }] }, reduced };
}

// 開閉（M6）の 0↔1。初期表示は動かさず、切替時だけ動く。reduced なら即時。
export function useToggleProgress(open: boolean) {
  const { reduced } = useMotion();
  const [progress] = useState(() => new Animated.Value(open ? 1 : 0));
  useEffect(() => {
    if (reduced) {
      progress.stopAnimation();
      progress.setValue(open ? 1 : 0);
      return undefined;
    }
    const anim = Animated.timing(progress, { toValue: open ? 1 : 0, duration: duration.fast, easing: easeInOut, useNativeDriver });
    anim.start();
    return () => anim.stop();
  }, [open, progress, reduced]);
  return progress;
}

// 選択カプセル（M2/M8）。各項目の実際の配置を測り、選択の変更時だけ動かす。
// 幅の変化・RTL・初回は測った位置へ即座に置くので、旧位置に残らない。
export function useSlidingIndicator(selectedIndex: number, ms: number = duration.base) {
  const { reduced } = useMotion();
  const [layouts, setLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const [x] = useState(() => new Animated.Value(0));
  const state = useRef({ placed: false, index: selectedIndex });
  const target = layouts[selectedIndex];
  const targetX = target?.x;

  useEffect(() => {
    if (targetX === undefined) return undefined;
    const indexChanged = state.current.index !== selectedIndex;
    state.current.index = selectedIndex;
    if (!state.current.placed || reduced || !indexChanged) {
      x.stopAnimation();
      x.setValue(targetX);
      state.current.placed = true;
      return undefined;
    }
    const anim = Animated.timing(x, { toValue: targetX, duration: ms, easing: easeOut, useNativeDriver });
    anim.start();
    return () => {
      anim.stop();
      // 中断された場合も、次の描画で正しい位置に置けるよう最終位置へそろえる。
      x.setValue(targetX);
    };
  }, [ms, reduced, selectedIndex, state, targetX, x]);

  const onItemLayout = useCallback((index: number) => (event: LayoutChangeEvent) => {
    const { x: itemX, width } = event.nativeEvent.layout;
    setLayouts((prev) => {
      const old = prev[index];
      if (old && old.x === itemX && old.width === width) return prev;
      return { ...prev, [index]: { x: itemX, width } };
    });
  }, []);

  return { ready: target !== undefined, width: target?.width ?? 0, translateX: x, onItemLayout };
}
