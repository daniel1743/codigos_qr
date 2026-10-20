// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useTemplateRotation, INTERVAL_MS } from '../useTemplateRotation';
import { initialTemplateIds, templates } from '../../data/templates';
import type { TemplateId } from '../../types/cripqer';

// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderHook<T>(hook: () => T) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const result = { current: undefined as unknown as T };

  function TestComponent() {
    result.current = hook();
    return null;
  }

  act(() => {
    root.render(React.createElement(TestComponent));
  });

  return {
    result,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
}

describe('useTemplateRotation hook temporal contract (3200ms)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default: reduced motion false
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('1) exposes INTERVAL_MS calibrated to exactly 3200 ms', () => {
    expect(INTERVAL_MS).toBe(3200);
  });

  it('2) initializes with 4 distinct visible templates and 0 duplicates', () => {
    const { result, unmount } = renderHook(() => useTemplateRotation(true));
    expect(result.current.slots.length).toBe(4);
    expect(result.current.slots).toEqual(initialTemplateIds);
    const unique = new Set(result.current.slots);
    expect(unique.size).toBe(4);
    unmount();
  });

  it('3) advances 1 slot per 3200ms tick following SLOT_ORDER [1, 3, 0, 2]', () => {
    const { result, unmount } = renderHook(() => useTemplateRotation(true));
    const initial = [...result.current.slots];

    // Tick 1: 3200ms -> slot 1 rotates
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(result.current.slots[1]).not.toBe(initial[1]);
    expect(result.current.slots[0]).toBe(initial[0]);
    expect(result.current.slots[2]).toBe(initial[2]);
    expect(result.current.slots[3]).toBe(initial[3]);
    expect(new Set(result.current.slots).size).toBe(4);

    const afterTick1 = [...result.current.slots];

    // Tick 2: 3200ms -> slot 3 rotates
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(result.current.slots[3]).not.toBe(afterTick1[3]);
    expect(result.current.slots[0]).toBe(afterTick1[0]);
    expect(result.current.slots[1]).toBe(afterTick1[1]);
    expect(result.current.slots[2]).toBe(afterTick1[2]);
    expect(new Set(result.current.slots).size).toBe(4);

    const afterTick2 = [...result.current.slots];

    // Tick 3: 3200ms -> slot 0 rotates
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(result.current.slots[0]).not.toBe(afterTick2[0]);
    expect(result.current.slots[1]).toBe(afterTick2[1]);
    expect(result.current.slots[2]).toBe(afterTick2[2]);
    expect(result.current.slots[3]).toBe(afterTick2[3]);
    expect(new Set(result.current.slots).size).toBe(4);

    const afterTick3 = [...result.current.slots];

    // Tick 4: 3200ms -> slot 2 rotates
    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(result.current.slots[2]).not.toBe(afterTick3[2]);
    expect(result.current.slots[0]).toBe(afterTick3[0]);
    expect(result.current.slots[1]).toBe(afterTick3[1]);
    expect(result.current.slots[3]).toBe(afterTick3[3]);
    expect(new Set(result.current.slots).size).toBe(4);

    // Full 4-slot cycle elapsed time: 4 * 3200 = 12800 ms (12.8s)
    unmount();
  });

  it('4) freezes rotation completely when paused=true (hover/preview)', () => {
    const { result, unmount } = renderHook(() => useTemplateRotation(true));
    const initial = [...result.current.slots];

    act(() => {
      result.current.setPaused(true);
    });

    // Advance 15 seconds while paused
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(result.current.slots).toEqual(initial);

    // Resume
    act(() => {
      result.current.setPaused(false);
    });

    act(() => {
      vi.advanceTimersByTime(3200);
    });
    expect(result.current.slots).not.toEqual(initial);
    unmount();
  });

  it('5) respects prefers-reduced-motion: reduce by staying static', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }));

    const { result, unmount } = renderHook(() => useTemplateRotation(true));
    const initial = [...result.current.slots];

    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(result.current.slots).toEqual(initial);
    unmount();
  });

  it('6) 100 consecutive 3200ms rotations maintain exactly 4 visible cards and 0 duplicates', () => {
    const { result, unmount } = renderHook(() => useTemplateRotation(true));
    for (let i = 0; i < 100; i++) {
      act(() => {
        vi.advanceTimersByTime(3200);
      });
      expect(result.current.slots.length).toBe(4);
      expect(new Set(result.current.slots).size).toBe(4);
    }
    unmount();
  });
});
