import { type UserTier, TIER_FEATURES } from '@/lib/tiers';
import { isDevMode } from '@/lib/dev-mode';

export function shouldApplyWatermark(tier: UserTier): boolean {
  if (isDevMode()) return false;
  return TIER_FEATURES[tier].exportWatermark;
}

export function applyWatermarkToCanvas(
  canvas: HTMLCanvasElement,
  text: string = 'cymaticsportal.com'
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px system, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(text, canvas.width - 20, canvas.height - 20);
  ctx.restore();

  return canvas;
}
