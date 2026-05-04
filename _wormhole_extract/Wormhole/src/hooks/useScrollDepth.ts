'use client';

import { useEffect, useRef } from 'react';

import {
  getState,
  setState,
  subscribe,
  type TunnelState,
} from '@/tunnel/tunnelStore';

const TOUCH_MULTIPLIER = 2.5;
const KEY_DELTA = 5;
const SCROLL_COAST_TAU_SEC = 60;
const LOCKED_VEL_MAX = 140;
const FREE_VEL_MAX = 45;

export function normalizeWheel(e: WheelEvent): number {
  if (e.ctrlKey) return 0;
  let dy = e.deltaY;
  switch (e.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      dy *= 16;
      break;
    case WheelEvent.DOM_DELTA_PAGE:
      dy *= typeof window !== 'undefined' ? window.innerHeight : 600;
      break;
    case WheelEvent.DOM_DELTA_PIXEL:
    default:
      break;
  }
  return Math.max(-100, Math.min(100, dy));
}

function composedPathHitsNoWheel(e: Event): boolean {
  const path = e.composedPath();
  for (let i = 0; i < path.length; i++) {
    const n = path[i];
    if (!(n instanceof Element)) continue;
    if (n.closest('[data-no-wheel]')) return true;
  }
  return false;
}

function hasNoWheelAncestor(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest('[data-no-wheel]') !== null;
}

function isClientOverNoWheel(clientX: number, clientY: number): boolean {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
  const els = document.querySelectorAll('[data-no-wheel]');
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (!(el instanceof Element)) continue;
    const r = el.getBoundingClientRect();
    if (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom
    ) {
      return true;
    }
  }
  return false;
}

function elementsFromPointHitNoWheel(clientX: number, clientY: number): boolean {
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return false;
  const stack = document.elementsFromPoint(clientX, clientY);
  for (let i = 0; i < stack.length; i++) {
    const el = stack[i];
    if (el instanceof Element && el.closest('[data-no-wheel]')) return true;
  }
  return false;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function useScrollDepth(enabled: boolean): void {
  const wheelAccumRef = useRef(0);
  const lastTouchYRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef(0);
  const currentDepthRef = useRef(0);
  const currentVelocityRef = useRef(0);
  /** Idle cruise only after real scroll input; avoids cold-start drift at v=0. */
  const scrollPrimedRef = useRef(false);
  /** WheelEvent.clientX/Y can be (0,0) with synthetic wheel; use last pointer. */
  const lastPointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const syncFromStore = (s: TunnelState) => {
      currentDepthRef.current = s.depth;
      currentVelocityRef.current = s.velocity;
      const html = document.documentElement;
      if (s.mode === 'locked') {
        html.classList.add('scroll-locked');
      } else {
        html.classList.remove('scroll-locked');
      }
    };

    const unsub = subscribe(() => {
      syncFromStore(getState());
    });

    syncFromStore(getState());

    const onPointerMove = (e: MouseEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    const onWheel = (e: WheelEvent) => {
      const ptr = lastPointerRef.current;
      const over =
        composedPathHitsNoWheel(e) ||
        isClientOverNoWheel(ptr.x, ptr.y) ||
        isClientOverNoWheel(e.clientX, e.clientY) ||
        elementsFromPointHitNoWheel(ptr.x, ptr.y) ||
        elementsFromPointHitNoWheel(e.clientX, e.clientY);
      if (over) {
        return;
      }
      e.preventDefault();
      const n = normalizeWheel(e);
      if (n !== 0) scrollPrimedRef.current = true;
      wheelAccumRef.current += n;
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (
        hasNoWheelAncestor(e.target) ||
        isClientOverNoWheel(t.clientX, t.clientY)
      ) {
        return;
      }
      lastTouchYRef.current = t.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (
        hasNoWheelAncestor(e.target) ||
        isClientOverNoWheel(t.clientX, t.clientY)
      ) {
        return;
      }
      e.preventDefault();
      if (lastTouchYRef.current === null) return;
      const dy = lastTouchYRef.current - t.clientY;
      lastTouchYRef.current = t.clientY;
      wheelAccumRef.current += dy * TOUCH_MULTIPLIER;
      scrollPrimedRef.current = true;
    };

    const onTouchEnd = () => {
      lastTouchYRef.current = null;
    };

    const isTypingTarget = (): boolean => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget()) return;

      const s = getState();

      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setState({
          mode: s.mode === 'locked' ? 'free' : 'locked',
        });
        return;
      }

      const pageKeys =
        e.key === 'ArrowDown' ||
        e.key === 'PageDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'PageUp';

      if (pageKeys) {
        e.preventDefault();
      }

      const down = e.key === 'ArrowDown' || e.key === 'PageDown';
      const up = e.key === 'ArrowUp' || e.key === 'PageUp';

      if (down || up) {
        scrollPrimedRef.current = true;
        const sign = down ? 1 : -1;
        if (s.mode === 'free') {
          wheelAccumRef.current += sign * KEY_DELTA;
        } else {
          let v = currentVelocityRef.current + sign * KEY_DELTA;
          v = clamp(v, -LOCKED_VEL_MAX, LOCKED_VEL_MAX);
          currentVelocityRef.current = v;
          setState({ velocity: v });
        }
      }

      if (e.key === 'Home') {
        e.preventDefault();
        scrollPrimedRef.current = false;
        currentDepthRef.current = 0;
        currentVelocityRef.current = 0;
        setState({ depth: 0, velocity: 0 });
      }

      if (e.key === 'End') {
        e.preventDefault();
        scrollPrimedRef.current = false;
        const md = s.maxDepth;
        const endDepth = md > 0 ? md - 1e-6 : 0;
        currentDepthRef.current = endDepth;
        currentVelocityRef.current = 0;
        setState({ depth: endDepth, velocity: 0 });
      }
    };

    const tick = (t: number) => {
      rafRef.current = requestAnimationFrame(tick);

      const dt = clamp((t - lastTRef.current) / 1000, 1 / 240, 0.05);
      lastTRef.current = t;

      const st = getState();
      const coast = Math.exp(-dt / SCROLL_COAST_TAU_SEC);

      let d = currentDepthRef.current;
      let v = currentVelocityRef.current;
      const wheelAccum = wheelAccumRef.current;
      wheelAccumRef.current = 0;

      const { sensitivity, friction, idleForward, mode } = st;

      if (mode === 'free') {
        const impulse = wheelAccum * sensitivity;
        v += impulse;
        v = clamp(v, -FREE_VEL_MAX, FREE_VEL_MAX);
        d += v * dt;
        v *= coast * Math.pow(friction, dt * 8);
      } else {
        const impulse = wheelAccum * sensitivity * 0.35;
        v += impulse;
        v = clamp(v, -LOCKED_VEL_MAX, LOCKED_VEL_MAX);
        if (
          scrollPrimedRef.current &&
          idleForward > 0 &&
          Math.abs(v) < 0.08
        ) {
          v = idleForward;
        }
        d += v * dt;
        v *= coast;
      }

      currentDepthRef.current = d;
      currentVelocityRef.current = v;
      setState({ depth: d, velocity: v });
    };

    const startRaf = () => {
      lastTRef.current = performance.now();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      } else {
        startRaf();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    document.addEventListener('wheel', onWheel, {
      passive: false,
      capture: true,
    });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibilityChange);

    startRaf();

    return () => {
      unsub();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      document.documentElement.classList.remove('scroll-locked');
    };
  }, [enabled]);
}
