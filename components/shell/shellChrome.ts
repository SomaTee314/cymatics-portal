/**
 * Shell controls: right column — sign-in (when anonymous), hamburger, then back.
 * `position: fixed` over the full-viewport iframe so the landing layout stays edge-to-edge.
 * `lg:` `top` / `right` match `#landing-root .logo.cp-logo-compact` in _portal_nifty.css.
 * Below `lg`, insets use safe-area + clamps so phones clear the bezel without the desktop `0.75cm` fudge.
 */
export const SHELL_CHROME_FRAME =
  'fixed z-[96] flex flex-col items-end gap-1 pointer-events-auto left-auto bottom-auto max-w-[100vw] ' +
  'top-[max(calc(env(safe-area-inset-top,0px)+8px),12px,2vmin)] ' +
  'right-[max(calc(env(safe-area-inset-right,0px)+10px),clamp(10px,3.75vw,20px))] ' +
  'lg:top-[max(calc(env(safe-area-inset-top,0px)+10px),14px,2.5vmin)] ' +
  'lg:right-[max(10px,calc(max(28px,5vw)-0.75cm))]';

/**
 * Step 3 (portal) only: shell row is **in document flow** above the iframe so the cluster
 * sits in the page layout and scrolls with the host column (not `position:fixed` on the viewport).
 * Hero + guide keep {@link SHELL_CHROME_FRAME}.
 */
export const SHELL_CHROME_PORTAL_INFLOW =
  'flex shrink-0 flex-col items-end gap-1 pointer-events-auto z-[96] ' +
  'pt-[max(calc(env(safe-area-inset-top,0px)+8px),8px,1.45vmin)] ' +
  'pr-[max(calc(env(safe-area-inset-right,0px)+8px),clamp(10px,3.75vw,20px))] ' +
  'lg:pt-[max(calc(env(safe-area-inset-top,0px)+6px),10px,1.8vmin)] ' +
  'lg:pr-[max(10px,calc(max(28px,5vw)-0.75cm))]';

/**
 * Sign in + account menu row: slight upward nudge so baselines match the iframe wordmark
 * (parent stacking / font rasterisation vs same `top` on #landing-root .logo.cp-logo-compact).
 */
export const SHELL_AUTH_ROW =
  '-translate-y-[3px] flex flex-row items-center gap-2 max-lg:gap-1.5';

/** Portal page: no iframe wordmark nudge — title-area handles alignment. */
export const SHELL_AUTH_ROW_PORTAL = 'flex flex-row items-center gap-2 max-lg:gap-1.5';
