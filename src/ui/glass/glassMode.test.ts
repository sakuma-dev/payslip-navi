import { describe, expect, it } from 'vitest';
import { Capability, INITIAL_PREFS, PrefAction, PrefKey, Prefs, prefsReducer, PrefValue, resolveGlass } from './glassMode';

const run = (...actions: PrefAction[]): Prefs => actions.reduce(prefsReducer, INITIAL_PREFS);

function prefs(values: Partial<Record<PrefKey, PrefValue>>): Prefs {
  const base: Prefs = {
    reduceTransparency: { value: 'off', fromEvent: false },
    increaseContrast: { value: 'off', fromEvent: false },
    forcedColors: { value: 'unsupported', fromEvent: false },
  };
  for (const [key, value] of Object.entries(values) as [PrefKey, PrefValue][]) base[key] = { value, fromEvent: false };
  return base;
}

describe('prefsReducer', () => {
  it('starts every preference as unknown', () => {
    expect(Object.values(INITIAL_PREFS).map((p) => p.value)).toEqual(['unknown', 'unknown', 'unknown']);
  });

  it('keeps the change event when it arrives before the initial query result', () => {
    const state = run(
      { type: 'event', key: 'reduceTransparency', on: true },
      { type: 'query', key: 'reduceTransparency', on: false },
    );
    expect(state.reduceTransparency.value).toBe('on');
  });

  it('lets a later event replace the query result (preference changed while shown)', () => {
    const state = run(
      { type: 'query', key: 'increaseContrast', on: false },
      { type: 'event', key: 'increaseContrast', on: true },
      { type: 'event', key: 'increaseContrast', on: false },
    );
    expect(state.increaseContrast).toEqual({ value: 'off', fromEvent: true });
  });

  it('falls back to the safe side when the query fails, but never over an event', () => {
    expect(run({ type: 'fail', key: 'reduceTransparency' }).reduceTransparency.value).toBe('on');
    const afterEvent = run({ type: 'event', key: 'reduceTransparency', on: false }, { type: 'fail', key: 'reduceTransparency' });
    expect(afterEvent.reduceTransparency.value).toBe('off');
  });

  it('records unsupported separately from an explicit off', () => {
    const state = run({ type: 'unsupported', key: 'forcedColors' });
    expect(state.forcedColors.value).toBe('unsupported');
  });

  it('returns the same object when nothing changes', () => {
    const state = run({ type: 'query', key: 'forcedColors', on: false });
    expect(prefsReducer(state, { type: 'query', key: 'forcedColors', on: false })).toBe(state);
  });
});

describe('resolveGlass', () => {
  const capabilities: Capability[] = ['unknown', 'native', 'blur', 'none'];

  it('uses the static solid fallback while anything is unknown', () => {
    for (const capability of capabilities) {
      expect(resolveGlass(capability, INITIAL_PREFS, true)).toEqual({ mode: 'solid', opaqueSurfaces: true, highContrast: false });
      expect(resolveGlass(capability, prefs({ increaseContrast: 'unknown' }), true).mode).toBe('solid');
    }
  });

  it('uses the platform material only when transparency and contrast allow it', () => {
    expect(resolveGlass('native', prefs({}), true)).toEqual({ mode: 'native', opaqueSurfaces: false, highContrast: false });
    expect(resolveGlass('blur', prefs({ reduceTransparency: 'unsupported' }), true).mode).toBe('blur');
    expect(resolveGlass('none', prefs({}), true).mode).toBe('solid');
    expect(resolveGlass('unknown', prefs({}), true).mode).toBe('solid');
  });

  it('switches to opaque surfaces for reduced transparency (query failure included)', () => {
    const failed = prefsReducer(prefs({}), { type: 'fail', key: 'reduceTransparency' });
    for (const state of [prefs({ reduceTransparency: 'on' }), failed]) {
      expect(resolveGlass('native', state, true)).toEqual({ mode: 'solid', opaqueSurfaces: true, highContrast: false });
    }
  });

  it('treats increased contrast and Web forced colors as high contrast', () => {
    for (const state of [prefs({ increaseContrast: 'on' }), prefs({ forcedColors: 'on' })]) {
      expect(resolveGlass('blur', state, true)).toEqual({ mode: 'solid', opaqueSurfaces: true, highContrast: true });
    }
  });

  it('waits for the Android blur target before using blur', () => {
    expect(resolveGlass('blur', prefs({}), false)).toEqual({ mode: 'solid', opaqueSurfaces: false, highContrast: false });
    expect(resolveGlass('blur', prefs({}), true).mode).toBe('blur');
  });
});
