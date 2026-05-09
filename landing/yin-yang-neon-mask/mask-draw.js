/**
 * Offline raster for neon yin-yang particle mask (340×400 default).
 * Classical interlocking lobes: ice disk + fire teardrop; black pupil voids in each bulb.
 * Om is drawn above the iframe (overlay SVG), so the mask stays solid here — no centre punch-out.
 * Used by index.html and by scripts/export-neon-mask-png.mjs.
 */
function drawNeonMaskRaster(ctx, w, h) {
  var cx = w * 0.5;
  var cy = h * 0.5;
  var R = Math.min(w, h) * 0.38;
  var ice = '#6328d4';
  var fire = '#ff6600';

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = ice;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  /*
   * Yang (fire) teardrop: outer semicircle on the RIGHT, inner S via the two R/2 arcs.
   * moveTo north; big arc cw east; small bottom ccw; small top cw; closePath.
   */
  ctx.fillStyle = fire;
  ctx.beginPath();
  ctx.moveTo(cx, cy - R);
  ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, false);
  ctx.arc(cx, cy + R / 2, R / 2, Math.PI / 2, 3 * Math.PI / 2, true);
  ctx.arc(cx, cy - R / 2, R / 2, Math.PI / 2, -Math.PI / 2, false);
  ctx.closePath();
  ctx.fill();

  /*
   * Pupil voids: centred on the two classical R/2 auxiliary circles (core of each teardrop bulb).
   * Radius was rEye×0.5 (min 3); +100% → rEye (min 6), capped so holes stay inside each bulb disk.
   */
  var rHalf = R * 0.5;
  var eyeCx = cx;
  var upperBulbCy = cy - rHalf;
  var lowerBulbCy = cy + rHalf;
  var rEye = Math.max(5, Math.min(w, h) * 0.048);
  var rPupil = Math.max(6, rEye);
  var rPupilMax = rHalf * 0.48;
  if (rPupil > rPupilMax) rPupil = rPupilMax;

  ctx.fillStyle = '#050508';
  ctx.beginPath();
  ctx.arc(eyeCx, upperBulbCy, rPupil, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(eyeCx, lowerBulbCy, rPupil, 0, Math.PI * 2);
  ctx.fill();
}

if (typeof window !== 'undefined') {
  window.drawNeonMaskRaster = drawNeonMaskRaster;
}
