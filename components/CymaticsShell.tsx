'use client';

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { AccountMenu } from '@/components/shell/AccountMenu';
import { SHELL_CHROME_FRAME } from '@/components/shell/shellChrome';
import { SessionTimer } from '@/components/subscription/SessionTimer';
import {
  hasFeature,
  isVisualModeAvailable,
  getAllowedPresetIndices,
  getAllowedAggressionValuesForMessage,
  tierFeaturesToMessage,
  type UserTier,
} from '@/lib/tiers';
import { isDevMode } from '@/lib/dev-mode';
import { isSubscriptionPaused } from '@/lib/subscription-pause';
import { SignUpPromptModal } from '@/components/shell/SignUpPromptModal';

const SUB_MSG = 'cp-subscription';

const LOOPBACK_ALIASES = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
  '::1',
]);

/**
 * Parent may be opened as http://localhost:3000 while the iframe resolves to http://127.0.0.1:3000
 * (or [::1]): those are distinct postMessage origins but the same tab — accept when scheme/port match loopback.
 */
function samePortalOrigin(senderOrigin: string, topOrigin: string): boolean {
  if (senderOrigin === topOrigin) return true;
  try {
    const a = new URL(senderOrigin);
    const b = new URL(topOrigin);
    if (a.protocol !== b.protocol) return false;
    const pa =
      a.port ||
      (a.protocol === 'https:' ? '443' : a.protocol === 'http:' ? '80' : '');
    const pb =
      b.port ||
      (b.protocol === 'https:' ? '443' : b.protocol === 'http:' ? '80' : '');
    if (pa !== pb) return false;
    const ha = a.hostname.toLowerCase();
    const hb = b.hostname.toLowerCase();
    if (LOOPBACK_ALIASES.has(ha) && LOOPBACK_ALIASES.has(hb)) return true;
    return ha === hb;
  } catch {
    return false;
  }
}

/** Allow perf ingest relay when dev or browse host is loopback (matches /api/debug-ingest loopback write policy). */
function shouldRelayLandingPerfDebug(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const loopback =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]';
  return process.env.NODE_ENV === 'development' || loopback;
}

type SubscriptionMessage = {
  type: typeof SUB_MSG;
  tier: UserTier;
  features: ReturnType<typeof tierFeaturesToMessage>;
  allowedPresetIndices: number[] | null;
  allowedAggressionValues: string[] | null;
  sessionMinutes: number | null;
  isDevMode: boolean;
  allowFractalVisuals: boolean;
  allowMic: boolean;
  allowCustomHz: boolean;
  exportWatermark: boolean;
};

/**
 * In production, visitors who are not logged in must always get strict free-tier gating
 * in the iframe (ignores accidental NEXT_PUBLIC_DEV_MODE on the server).
 * Logged-in users get their real effective tier (trial / pro / etc.).
 */
function buildSubscriptionMessage(
  effectiveTier: UserTier,
  ctxDev: boolean,
  isAuthenticated: boolean
): SubscriptionMessage {
  const isProd = process.env.NODE_ENV === 'production';
  const lockAnonymous = isProd && !isAuthenticated;
  const tier: UserTier = lockAnonymous ? 'free' : effectiveTier;
  const dev = lockAnonymous
    ? false
    : isDevMode() || ctxDev;
  const features = tierFeaturesToMessage(tier);
  const allowedPresetIndices = dev ? null : getAllowedPresetIndices(tier);
  const allowedAggressionValues = getAllowedAggressionValuesForMessage(
    tier,
    dev
  );
  return {
    type: SUB_MSG,
    tier,
    features,
    allowedPresetIndices,
    allowedAggressionValues,
    sessionMinutes: features.sessionMinutes,
    isDevMode: dev,
    allowFractalVisuals:
      dev ||
      isVisualModeAvailable(tier, 'fractalMB') ||
      isVisualModeAvailable(tier, 'fractalJulia'),
    allowMic: dev || hasFeature(tier, 'micInput'),
    allowCustomHz: dev || hasFeature(tier, 'customFrequencyInput'),
    exportWatermark: dev ? false : features.exportWatermark,
  };
}

/** Full portal experience: particle attract landing + instruction guide before the cymatics UI (`?skip=1` hides them). */
function cymaticsIframeSrc() {
  const b = (process.env.NEXT_PUBLIC_ASSET_BUST || '').trim();
  return b
    ? `/cymatics.html?d=${encodeURIComponent(b)}`
    : '/cymatics.html';
}

/** Isolated from overlay re-renders — same props skip React reconciliation of the iframe subtree. */
const CymaticsFrame = memo(
  forwardRef<HTMLIFrameElement, { onLoad: () => void }>(
    function CymaticsFrame({ onLoad }, ref) {
      return (
        <iframe
          ref={ref}
          title="Cymatics Portal"
          src={cymaticsIframeSrc()}
          className="fixed inset-0 z-0 h-full w-full border-0"
          onLoad={onLoad}
          referrerPolicy="same-origin"
        />
      );
    }
  )
);
CymaticsFrame.displayName = 'CymaticsFrame';

/** Stable across SSR and client (random keys cause React #418 hydration errors on the iframe). */
const CYMATICS_IFRAME_KEY = 'cymatics-frame';

type ShellLandingPhase = 'hero' | 'guide' | 'portal';

export function CymaticsShell() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPostedJsonRef = useRef<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [reachedPortal, setReachedPortal] = useState(false);
  const {
    effectiveTier,
    isDevMode: ctxDev,
    isLoading,
    isAuthenticated,
  } = useUser();
  const subscriptionPaused = isSubscriptionPaused();
  const [signUpModalOpen, setSignUpModalOpen] = useState(false);
  const [shellPhase, setShellPhase] = useState<ShellLandingPhase>('hero');

  const postSubscriptionToIframe = useCallback(
    (force?: boolean) => {
      const win = iframeRef.current?.contentWindow;
      if (!win || typeof window === 'undefined') return;
      const origin =
        window.location.origin && window.location.origin !== 'null'
          ? window.location.origin
          : '*';
      const msg = buildSubscriptionMessage(
        effectiveTier,
        ctxDev,
        isAuthenticated
      );
      const json = JSON.stringify(msg);
      if (!force && lastPostedJsonRef.current === json) return;
      lastPostedJsonRef.current = json;
      try {
        win.postMessage(msg, origin);
        if (!isDevMode() && !ctxDev) {
          console.info('[CymaticsShell] postMessage cp-subscription', {
            tier: msg.tier,
            sessionMinutes: msg.sessionMinutes,
          });
        }
      } catch (e) {
        console.error('[CymaticsShell] postMessage failed', e);
      }
    },
    [effectiveTier, ctxDev, isAuthenticated]
  );

  const onIframeLoad = useCallback(() => {
    setIframeLoaded(true);
  }, []);

  /* `message` listener in the iframe may attach after `load`; resend subscription a few times. */
  useEffect(() => {
    if (!iframeLoaded) return;
    lastPostedJsonRef.current = null;
    const delays = [0, 80, 250, 800, 2000];
    const ids = delays.map((ms) =>
      window.setTimeout(() => postSubscriptionToIframe(true), ms),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [iframeLoaded, postSubscriptionToIframe]);

  /* Same-origin: if `onLoad` doesn’t fire, still mark ready for postMessage. */
  useEffect(() => {
    if (iframeLoaded) return;
    const tick = () => {
      const el = iframeRef.current;
      if (!el) return;
      try {
        if (el.contentDocument?.readyState === 'complete') {
          setIframeLoaded(true);
        }
      } catch {
        /* cross-origin — ignore */
      }
    };
    tick();
    const intervalId = window.setInterval(tick, 200);
    return () => window.clearInterval(intervalId);
  }, [iframeLoaded]);

  useEffect(() => {
    if (!iframeLoaded || isLoading) return;
    postSubscriptionToIframe(false);
  }, [iframeLoaded, isLoading, postSubscriptionToIframe]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      /* Same-origin cymatics iframe only — check before source identity (sources can mismatch ref edge cases). */
      if (!samePortalOrigin(ev.origin, window.location.origin)) return;
      /* Landing perf probes: relay to /api/debug-ingest (writes debug-7e891a.log in dev). */
      const perf = ev.data as {
        type?: string;
        sessionId?: string;
        envelope?: Record<string, unknown>;
      } | null;
      if (
        perf &&
        perf.type === 'cp-landing-perf' &&
        perf.sessionId === '7e891a' &&
        perf.envelope &&
        typeof perf.envelope === 'object'
      ) {
        if (shouldRelayLandingPerfDebug()) {
          const body = JSON.stringify(perf.envelope);
          void fetch('/api/debug-ingest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': '7e891a',
            },
            credentials: 'same-origin',
            keepalive: true,
            body,
          })
            .then(async function (res) {
              if (res.ok) return;
              var t = '';
              try {
                t = await res.text();
              } catch (_) {}
              console.warn('[DEBUG-7e891a-relay-http]', res.status, t);
            })
            .catch(function (e) {
              console.warn('[DEBUG-7e891a-relay-fail]', e && String(e.message));
            });
        }
        return;
      }

      if (ev.source !== iframeRef.current?.contentWindow) return;
      const d = ev.data as { type?: string; action?: string } | null;
      if (!d || d.type !== 'cp-action') return;
      if (d.action === 'guide-opened') {
        setShellPhase('guide');
        setReachedPortal(false);
        try {
          window.localStorage.removeItem('cp_reached_portal');
        } catch {
          /* ignore */
        }
        return;
      }
      if (d.action === 'guide-closed') {
        setShellPhase('hero');
        return;
      }
      if (d.action === 'portal-reached') {
        try {
          window.localStorage.setItem('cp_reached_portal', '1');
        } catch {
          /* ignore */
        }
        setReachedPortal(true);
        setShellPhase('portal');
        return;
      }
      if (d.action === 'signup-prompt' || d.action === 'upgrade-clicked') {
        if (!isAuthenticated && !ctxDev) {
          setSignUpModalOpen(true);
          return;
        }
        if (d.action === 'upgrade-clicked' && isAuthenticated) {
          if (!subscriptionPaused) {
            void router.push('/pricing');
          }
        }
        return;
      }
      if (d.action === 'session-expired') {
        if (!isAuthenticated) {
          setSignUpModalOpen(true);
          return;
        }
        if (!subscriptionPaused) {
          void router.push('/pricing');
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router, subscriptionPaused, isAuthenticated, ctxDev]);

  const postShellNavBack = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        { type: 'cp-shell', action: 'nav-back' },
        window.location.origin
      );
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#030508]">
      <SessionTimer />
      <div className={SHELL_CHROME_FRAME}>
        {(shellPhase === 'guide' || shellPhase === 'portal') && (
          <button
            type="button"
            onClick={postShellNavBack}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/80 text-white shadow-lg transition-colors hover:bg-black/90"
            aria-label="Back"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <AccountMenu
          showAnonymousSignup={reachedPortal}
          chromeInline
        />
      </div>
      <SignUpPromptModal
        open={signUpModalOpen}
        onClose={() => setSignUpModalOpen(false)}
      />
      <CymaticsFrame
        key={CYMATICS_IFRAME_KEY}
        ref={iframeRef}
        onLoad={onIframeLoad}
      />
    </div>
  );
}
