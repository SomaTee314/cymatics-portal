/**
 * Shell controls: column (back above menu), vertically centred on the top marquee.
 * Horizontal `right` centres the stack in the gutter and adds **+3mm** so the cluster
 * sits slightly left (away from the scrollbar). See `.portal-main` in _portal_nifty.css.
 */
export const SHELL_CHROME_FRAME =
  'fixed z-[96] flex flex-col items-center gap-0.5 pointer-events-auto top-[calc(env(safe-area-inset-top,0px)+max(8px,1.5vw)+clamp(36px,4.2vw,54px)/2)] -translate-y-1/2 right-[max(calc(10px+3mm),min(calc((100vw-min(95vw,1400px))/4-10px+env(safe-area-inset-right,0px)+3mm),calc((100vw-min(95vw,1400px))/2-26px+3mm)))]';
