'use client';

import {
  forwardRef,
  memo,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { AccountMenu } from '@/components/shell/AccountMenu';
import {
  SHELL_AUTH_ROW,
  SHELL_AUTH_ROW_PORTAL,
  SHELL_CHROME_FRAME,
  SHELL_CHROME_PORTAL_INFLOW,
} from '@/components/shell/shellChrome';
import { SessionTimer } from '@/components/subscription/SessionTimer';
import {
  FREE_VISUAL_MODES,
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
  allowUploadTrack: boolean;
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
  const baseFeatures = tierFeaturesToMessage(tier);
  const features = lockAnonymous
    ? { ...baseFeatures, visualModes: [...FREE_VISUAL_MODES] }
    : baseFeatures;
  const allowedPresetIndices = dev ? null : getAllowedPresetIndices(tier);
  const allowedAggressionValues = lockAnonymous
    ? [...FREE_VISUAL_MODES]
    : getAllowedAggressionValuesForMessage(tier, dev);
  return {
    type: SUB_MSG,
    tier,
    features,
    allowedPresetIndices,
    allowedAggressionValues,
    /** Signed-in users: no session cap (anonymous / iframe preview still uses tier limit). */
    sessionMinutes: isAuthenticated ? null : features.sessionMinutes,
    isDevMode: dev,
    allowFractalVisuals:
      dev ||
      isVisualModeAvailable(tier, 'fractalMB') ||
      isVisualModeAvailable(tier, 'fractalJulia') ||
      isVisualModeAvailable(tier, 'juliaWormhole'),
    allowMic: dev || hasFeature(tier, 'micInput'),
    allowUploadTrack: !lockAnonymous,
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

type CymaticsFrameProps = {
  onLoad: () => void;
  /** Default: full-viewport fixed under shell chrome. Portal uses `absolute` inside a flex-1 host. */
  iframePositionClassName?: string;
};

/** Isolated from overlay re-renders — same props skip React reconciliation of the iframe subtree. */
const CymaticsFrame = memo(
  forwardRef<HTMLIFrameElement, CymaticsFrameProps>(
    function CymaticsFrame({ onLoad, iframePositionClassName }, ref) {
      return (
        <iframe
          ref={ref}
          title="Cymatics Portal"
          src={cymaticsIframeSrc()}
          className={
            iframePositionClassName ??
            'fixed inset-0 z-0 h-full w-full border-0'
          }
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
  const [landingLoaderDismissed, setLandingLoaderDismissed] = useState(false);

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
    let attempts = 0;
    const maxAttempts = 35;
    let intervalId: number | undefined;
    const tick = () => {
      attempts += 1;
      const el = iframeRef.current;
      if (!el) return;
      try {
        if (el.contentDocument?.readyState === 'complete') {
          setIframeLoaded(true);
          if (intervalId !== undefined) window.clearInterval(intervalId);
        }
      } catch {
        /* cross-origin — ignore */
      }
      if (attempts >= maxAttempts && intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
    tick();
    intervalId = window.setInterval(tick, 250);
    return () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [iframeLoaded]);

  useEffect(() => {
    if (!iframeLoaded || isLoading) return;
    postSubscriptionToIframe(false);
  }, [iframeLoaded, isLoading, postSubscriptionToIframe]);

  useLayoutEffect(() => {
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
      if (d.action === 'landing-loader-dismissed') {
        startTransition(() => setLandingLoaderDismissed(true));
        return;
      }
      if (d.action === 'guide-opened') {
        startTransition(() => {
          setLandingLoaderDismissed(true);
          setShellPhase('guide');
          setReachedPortal(false);
        });
        try {
          window.localStorage.removeItem('cp_reached_portal');
        } catch {
          /* ignore */
        }
        return;
      }
      if (d.action === 'guide-closed') {
        startTransition(() => {
          setLandingLoaderDismissed(true);
          setShellPhase('hero');
        });
        return;
      }
      if (d.action === 'portal-reached') {
        try {
          window.localStorage.setItem('cp_reached_portal', '1');
        } catch {
          /* ignore */
        }
        startTransition(() => {
          setLandingLoaderDismissed(true);
          setReachedPortal(true);
          setShellPhase('portal');
        });
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
    const tryPost = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win || typeof window === 'undefined') return false;
      try {
        win.postMessage(
          { type: 'cp-shell', action: 'nav-back' },
          window.location.origin
        );
        return true;
      } catch {
        return false;
      }
    };
    if (tryPost()) return;
    window.requestAnimationFrame(() => {
      if (tryPost()) return;
      window.setTimeout(() => {
        tryPost();
      }, 0);
    });
  }, []);

  const isPortalPage = shellPhase === 'portal';
  const shellChromeHostClass = isPortalPage
    ? SHELL_CHROME_PORTAL_INFLOW
    : SHELL_CHROME_FRAME;
  const shellAuthRowClass =
    shellPhase === 'portal' ? SHELL_AUTH_ROW_PORTAL : SHELL_AUTH_ROW;

  const shellChromeInner = (
    <div className={shellAuthRowClass}>
      {landingLoaderDismissed ? (
        <>
          {!isLoading && !isAuthenticated ? (
            <Link
              href="/login"
              prefetch={false}
              className="inline-flex max-w-[min(12rem,calc(100vw-2rem))] items-center justify-end whitespace-nowrap bg-transparent px-0 pt-[2px] pb-[2px] text-right font-['Courier_New',Courier,monospace] text-[clamp(11.25px,1.525vw,13.75px)] font-bold uppercase leading-[1.18] tracking-[0.14em] text-[rgba(255,255,255,0.95)] shadow-none [text-shadow:0_1px_6px_rgba(0,0,0,0.55),0_2px_20px_rgba(0,0,0,0.35)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400/50"
              aria-label="Sign in"
            >
              Sign in
            </Link>
          ) : null}
          <AccountMenu
            showAnonymousSignup={reachedPortal}
            chromeInline
          />
        </>
      ) : null}
      {(shellPhase === 'guide' || shellPhase === 'portal') && (
        <button
          type="button"
          onClick={postShellNavBack}
          className="inline-flex h-[calc(1.18*clamp(11.25px,1.525vw,13.75px))] shrink-0 items-center justify-center border-0 bg-transparent p-0 text-white shadow-none transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400/50"
          aria-label="Back"
        >
          <svg
            className="shrink-0 text-white [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.55))]"
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
    </div>
  );

  const iframeStageClass = isPortalPage
    ? 'relative min-h-0 w-full flex-1'
    : 'pointer-events-none fixed inset-0 z-0';

  return (
    <div
      className={
        isPortalPage
          ? 'flex h-dvh max-h-dvh min-h-0 w-full flex-col overflow-x-hidden overscroll-none bg-[#030508]'
          : 'relative h-dvh max-h-dvh min-h-0 w-full overflow-x-hidden overscroll-none bg-[#030508]'
      }
    >
      <SessionTimer />
      <div className={shellChromeHostClass}>{shellChromeInner}</div>
      <SignUpPromptModal
        open={signUpModalOpen}
        onClose={() => setSignUpModalOpen(false)}
      />
      <div className={iframeStageClass}>
        <CymaticsFrame
          key={CYMATICS_IFRAME_KEY}
          ref={iframeRef}
          onLoad={onIframeLoad}
          iframePositionClassName="pointer-events-auto absolute inset-0 z-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}
