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
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { SessionTimer } from '@/components/subscription/SessionTimer';
import {
  hasFeature,
  isVisualModeAvailable,
  getAllowedPresetIndices,
  tierFeaturesToMessage,
  type UserTier,
} from '@/lib/tiers';
import { isDevMode } from '@/lib/dev-mode';
import { isSubscriptionPaused } from '@/lib/subscription-pause';

const SUB_MSG = 'cp-subscription';

type SubscriptionMessage = {
  type: typeof SUB_MSG;
  tier: UserTier;
  features: ReturnType<typeof tierFeaturesToMessage>;
  allowedPresetIndices: number[] | null;
  sessionMinutes: number | null;
  isDevMode: boolean;
  /** Iframe full unlock without dev-mode logging (see subscription bridge). */
  launchNoSubscription: boolean;
  allowFractalVisuals: boolean;
  allowMic: boolean;
  allowCustomHz: boolean;
  exportWatermark: boolean;
};

function buildSubscriptionMessage(
  effectiveTier: UserTier,
  ctxDev: boolean
): SubscriptionMessage {
  const dev = isDevMode() || ctxDev;
  const launchNoSubscription = isSubscriptionPaused();
  const unlock = dev || launchNoSubscription;
  const tierForMessage: UserTier = launchNoSubscription ? 'creator' : effectiveTier;
  const features = tierFeaturesToMessage(tierForMessage);
  const allowedPresetIndices = unlock
    ? null
    : getAllowedPresetIndices(effectiveTier);
  return {
    type: SUB_MSG,
    tier: tierForMessage,
    features,
    allowedPresetIndices,
    sessionMinutes: features.sessionMinutes,
    isDevMode: dev,
    launchNoSubscription,
    allowFractalVisuals:
      unlock || isVisualModeAvailable(effectiveTier, 'fractalMB'),
    allowMic: unlock || hasFeature(effectiveTier, 'micInput'),
    allowCustomHz: unlock || hasFeature(effectiveTier, 'customFrequencyInput'),
    exportWatermark: unlock ? false : features.exportWatermark,
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

function newIframeMountKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `if-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readPortalReachedFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('cp_reached_portal') === '1';
  } catch {
    return false;
  }
}

export function CymaticsShell() {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPostedJsonRef = useRef<string | null>(null);
  const [iframeMountKey] = useState(newIframeMountKey);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [reachedPortal, setReachedPortal] = useState(readPortalReachedFromStorage);
  const { effectiveTier, isDevMode: ctxDev, isLoading } = useUser();
  const subscriptionPaused = isSubscriptionPaused();

  const postSubscriptionToIframe = useCallback(
    (force?: boolean) => {
      const win = iframeRef.current?.contentWindow;
      if (!win || typeof window === 'undefined') return;
      const origin =
        window.location.origin && window.location.origin !== 'null'
          ? window.location.origin
          : '*';
      const msg = buildSubscriptionMessage(effectiveTier, ctxDev);
      const json = JSON.stringify(msg);
      if (!force && lastPostedJsonRef.current === json) return;
      lastPostedJsonRef.current = json;
      try {
        win.postMessage(msg, origin);
        if (!isDevMode() && !ctxDev && !subscriptionPaused) {
          console.info('[CymaticsShell] postMessage cp-subscription', {
            tier: msg.tier,
            sessionMinutes: msg.sessionMinutes,
          });
        }
      } catch (e) {
        console.error('[CymaticsShell] postMessage failed', e);
      }
    },
    [effectiveTier, ctxDev, subscriptionPaused]
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
      if (ev.source !== iframeRef.current?.contentWindow) return;
      if (ev.origin !== window.location.origin) return;
      const d = ev.data as { type?: string; action?: string } | null;
      if (!d || d.type !== 'cp-action') return;
      if (d.action === 'portal-reached') {
        try {
          window.localStorage.setItem('cp_reached_portal', '1');
        } catch {
          /* ignore */
        }
        setReachedPortal(true);
        return;
      }
      if (subscriptionPaused) return;
      if (d.action === 'upgrade-clicked' || d.action === 'session-expired') {
        router.push('/pricing');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [router, subscriptionPaused]);

  return (
    <div className="relative min-h-screen w-full bg-[#030508]">
      <TrialBanner reachedPortal={reachedPortal} />
      <SessionTimer />
      <AccountMenu showAnonymousSignup={reachedPortal} />
      <CymaticsFrame
        key={iframeMountKey}
        ref={iframeRef}
        onLoad={onIframeLoad}
      />
    </div>
  );
}
