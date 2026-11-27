// World renderer for DESERT THUNDER. One clear job: paint the dusk canyon — sky,
// mesas, canyon walls, river, lake, airstrip, fire line, smoke and particles —
// in a chase view behind the tanker, with a simple perspective projection.
import { VIEW, WORLD, COLORS } from './config.js';
import { noise1, hash1 } from './random.js';
import {
  floorHeightAt,
  wallHeightAt,
  riverOffsetAt,
  stripCentreX,
} from './terrain.js';
import { drawAirtanker } from './aircraft.js';

const FOCAL = 760;

/** Project a world point into screen space; null when behind the camera. */
export function projectPoint(p, wx, wy, wz) {
  const camX = p.x * 0.85;
  const camY = p.altitude + 26;
  const camZ = p.z - 95;
  const sinH = Math.sin(p.heading);
  const cosH = Math.cos(p.heading);
  const dx = wx - camX;
  const dz = wz - camZ;
  const along = dx * sinH + dz * cosH;
  if (along < 24) return null;
  const across = dx * cosH - dz * sinH;
  const horizon = horizonY(p);
  const s = FOCAL / along;
  return {
    x: VIEW.width / 2 + across * s,
    y: horizon + (camY - wy) * s,
    s,
    along,
  };
}

export function horizonY(p) {
  return 318 - p.pitch * 130 - p.verticalSpeed * 1.6;
}

export function nightFactor(missionIndex) {
  return missionIndex === 3 ? 0.65 : 0.25;
}

export function drawWorld(ctx, state, time) {
  const { p, campaign: c, ps } = state;
  const night = nightFactor(c.index);
  const horizon = horizonY(p);
  ctx.save();
  // The whole world banks gently with the tanker.
  ctx.translate(VIEW.width / 2, VIEW.height / 2);
  ctx.rotate(p.roll * 0.06);
  ctx.translate(-VIEW.width / 2, -VIEW.height / 2);

  drawSky(ctx, horizon, night, time, p.z);
  drawDistantMesas(ctx, horizon, night, p.z);
  drawCanyonWalls(ctx, p, horizon, night);
  drawGround(ctx, p, horizon, night, time, c);
  drawSmokeColumns(ctx, p, time, night);
  drawParticles(ctx, p, ps);
  ctx.restore();

  if (night > 0.5) {
    ctx.fillStyle = `rgba(8, 10, 34, ${0.12})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  drawAirtanker(ctx, p, time);
  // Dusk vignette.
  const vg = ctx.createRadialGradient(640, 360, 320, 640, 360, 780);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,8,4,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawSky(ctx, horizon, night, time, z) {
  const top = mixColor(COLORS.skyTopDay, COLORS.skyTopNight, night);
  const mid = mixColor(COLORS.skyMidDay, COLORS.skyMidNight, night);
  const low = mixColor(COLORS.skyLowDay, COLORS.skyLowNight, night);
  const g = ctx.createLinearGradient(0, 0, 0, horizon + 40);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, low);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, horizon + 42);

  // Low dusk sun, sinking toward the canyon rim.
  const sunX = 940 - (z % 4000) * 0.01;
  const sunY = horizon - 66;
  const sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
  sg.addColorStop(0, 'rgba(255, 225, 140, 0.95)');
  sg.addColorStop(0.35, 'rgba(255, 170, 80, 0.55)');
  sg.addColorStop(1, 'rgba(255, 140, 60, 0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
  ctx.fill();

  // Stars come out as night falls.
  if (night > 0.5) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i += 1) {
      const sx = hash1(i * 3 + 1) * VIEW.width;
      const sy = hash1(i * 3 + 2) * horizon * 0.8;
      ctx.globalAlpha = 0.3 + hash1(i) * 0.6;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // Slow dusk clouds, thin and high so they never read as objects.
  ctx.fillStyle = `rgba(255, 200, 160, ${0.16 - night * 0.08})`;
  for (let i = 0; i < 6; i += 1) {
    const cx = ((hash1(i * 7 + 5) * 1400 + time * (6 + i * 2)) % 1500) - 110;
    const cy = 60 + hash1(i * 11 + 3) * 150;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 90 + hash1(i) * 60, 8 + hash1(i * 5) * 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDistantMesas(ctx, horizon, night, z) {
  // The far ridge, filled well below the horizon: from a high cockpit the
  // canyon rim drops below the horizon line, and the band under it is the
  // plateau beyond the rim — without it the sky meets the walls over a gap.
  ctx.fillStyle = mixColor(COLORS.mesaFar, '#241a2e', night);
  ctx.beginPath();
  ctx.moveTo(0, horizon + 260);
  for (let x = 0; x <= VIEW.width; x += 32) {
    const h = 34 + noise1(x * 0.004 + Math.floor(z / 900) * 1.7) * 74;
    ctx.lineTo(x, horizon + 2 - h);
  }
  ctx.lineTo(VIEW.width, horizon + 260);
  ctx.closePath();
  ctx.fill();
}

function drawCanyonWalls(ctx, p, horizon, night) {
  // Projected points are clamped to a margin around the screen: a crest point
  // a few feet from the camera divides into coordinates thousands of pixels
  // out, and a polygon built from those will not fill (see the ground fix).
  const clampPoint = (q) => ({
    x: Math.max(-200, Math.min(VIEW.width + 200, q.x)),
    y: Math.max(-200, Math.min(VIEW.height + 200, q.y)),
    s: q.s,
    along: q.along,
  });
  for (const side of [-1, 1]) {
    const pts = [];
    for (let d = 120; d <= 9000; d += 300) {
      const wz = p.z - 95 + d;
      const crest = wallHeightAt(wz, side);
      const wx = side * (WORLD.canyonHalfWidth + 260);
      const pr = projectPoint(p, wx, crest, wz);
      if (pr) pts.push(clampPoint(pr));
    }
    if (pts.length < 2) continue;
    const near = side === -1 ? COLORS.mesaNear : '#b05f36';
    const far = mixColor(COLORS.mesaMid, '#4a2a3a', night);
    const g = ctx.createLinearGradient(0, horizon - 260, 0, VIEW.height);
    g.addColorStop(0, far);
    g.addColorStop(1, mixColor(near, '#4a2a3a', night));
    ctx.fillStyle = g;
    ctx.beginPath();
    const edgeX = side === -1 ? -40 : VIEW.width + 40;
    ctx.moveTo(edgeX, VIEW.height);
    ctx.lineTo(edgeX, horizon - 40);
    for (const q of pts) ctx.lineTo(q.x, q.y);
    ctx.lineTo(edgeX, VIEW.height);
    ctx.closePath();
    ctx.fill();
    // Strata bands on the wall face.
    ctx.strokeStyle = 'rgba(60, 20, 10, 0.35)';
    ctx.lineWidth = 3;
    for (let band = 0; band < 3; band += 1) {
      ctx.beginPath();
      let started = false;
      for (let d = 120; d <= 9000; d += 300) {
        const wz = p.z - 95 + d;
        const crest = wallHeightAt(wz, side) * (0.55 + band * 0.14);
        const wx = side * (WORLD.canyonHalfWidth + 260);
        const raw = projectPoint(p, wx, crest, wz);
        if (!raw) continue;
        const pr = clampPoint(raw);
        if (!started) {
          ctx.moveTo(pr.x, pr.y);
          started = true;
        } else ctx.lineTo(pr.x, pr.y);
      }
      ctx.stroke();
    }
  }
}

function drawGround(ctx, p, horizon, night, time, c) {
  // Canyon floor polygon. The near edge sits 60 ft ahead of the camera: any
  // closer and the perspective divide explodes (a few degrees of heading turn
  // the near corners into coordinates the canvas cannot fill). Corners are
  // clamped to a margin around the screen for the same reason.
  const clampCorner = (q) => q && {
    x: Math.max(-400, Math.min(VIEW.width + 400, q.x)),
    y: Math.max(-400, Math.min(VIEW.height + 400, q.y)),
  };
  const nearL = clampCorner(projectPoint(p, -1400, 0, p.z + 60));
  const nearR = clampCorner(projectPoint(p, 1400, 0, p.z + 60));
  const farL = clampCorner(projectPoint(p, -1400, 0, p.z + 9000));
  const farR = clampCorner(projectPoint(p, 1400, 0, p.z + 9000));
  if (nearL && nearR && farL && farR) {
    const g = ctx.createLinearGradient(0, horizon, 0, VIEW.height);
    g.addColorStop(0, mixColor('#a86a38', '#2c1e33', night));
    g.addColorStop(1, mixColor(COLORS.groundSand, '#4a2c22', night));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(farL.x, farL.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.lineTo(nearR.x, nearR.y);
    ctx.lineTo(nearL.x, nearL.y);
    ctx.closePath();
    ctx.fill();
  }

  drawRiverAndLake(ctx, p, night);
  drawScrub(ctx, p, night);
  drawFireLine(ctx, p, time, night, c);
  drawDropRings(ctx, p, time, c);
  drawRunway(ctx, p, time, night);
  drawFlareMarkers(ctx, p, time, night, c);
}

function drawRiverAndLake(ctx, p, night) {
  const camZ = p.z - 95;
  // River: ribbon of projected quads, widening into Ember Lake.
  ctx.fillStyle = mixColor(COLORS.lake, '#14283e', night);
  ctx.beginPath();
  let started = false;
  for (let d = 60; d <= 8200; d += 160) {
    const wz = camZ + d;
    const cx = riverOffsetAt(wz);
    const inLake = wz > WORLD.lakeStart && wz < WORLD.lakeEnd;
    const half = inLake ? 300 : 46;
    const pr = projectPoint(p, cx - half, floorHeightAt(wz), wz);
    if (!pr) continue;
    if (!started) {
      ctx.moveTo(pr.x, pr.y);
      started = true;
    } else ctx.lineTo(pr.x, pr.y);
  }
  for (let d = 8200; d >= 60; d -= 160) {
    const wz = camZ + d;
    const cx = riverOffsetAt(wz);
    const inLake = wz > WORLD.lakeStart && wz < WORLD.lakeEnd;
    const half = inLake ? 300 : 46;
    const pr = projectPoint(p, cx + half, floorHeightAt(wz), wz);
    if (pr) ctx.lineTo(pr.x, pr.y);
  }
  ctx.closePath();
  ctx.fill();
  // Lake shine.
  if (camZ < WORLD.lakeEnd && camZ + 8200 > WORLD.lakeStart) {
    const lc = projectPoint(p, riverOffsetAt((WORLD.lakeStart + WORLD.lakeEnd) / 2), 40, (WORLD.lakeStart + WORLD.lakeEnd) / 2);
    if (lc && lc.s > 0.02) {
      ctx.fillStyle = `rgba(159, 216, 232, ${0.35 - night * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(lc.x, lc.y, 260 * lc.s, 60 * lc.s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eaf7ff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMBER LAKE', lc.x, lc.y - 14);
    }
  }
}

function drawScrub(ctx, p, night) {
  const camZ = p.z - 95;
  ctx.fillStyle = mixColor(COLORS.scrub, '#1d2b1a', night);
  for (let i = 0; i < 130; i += 1) {
    const wz = Math.floor(camZ / 180) * 180 + i * 67;
    const wx = (hash1(i * 13 + 2) - 0.5) * 2400;
    const pr = projectPoint(p, wx, floorHeightAt(wz), wz);
    if (!pr || pr.along < 60 || pr.along > 7000) continue;
    const r = Math.max(1.5, 8 * pr.s);
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Boulders near the walls.
  ctx.fillStyle = mixColor(COLORS.groundRock, '#33202a', night);
  for (let i = 0; i < 40; i += 1) {
    const wz = Math.floor(camZ / 260) * 260 + i * 211;
    const wx = (hash1(i * 29 + 7) > 0.5 ? 1 : -1) * (700 + hash1(i * 3) * 500);
    const pr = projectPoint(p, wx, floorHeightAt(wz), wz);
    if (!pr || pr.along < 80 || pr.along > 6500) continue;
    const r = Math.max(2, 12 * pr.s);
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFireLine(ctx, p, time, night, c) {
  const camZ = p.z - 95;
  if (camZ + 8200 < WORLD.fireStart || camZ > WORLD.fireEnd) return;
  for (let i = 0; i < 9; i += 1) {
    const wz = WORLD.fireStart + i * 420 + hash1(i * 17) * 200;
    const wx = (hash1(i * 31 + 4) - 0.5) * 900;
    const pr = projectPoint(p, wx, floorHeightAt(wz) + 10, wz);
    if (!pr || pr.along < 60) continue;
    const glow = 90 * pr.s + 14;
    const fg = ctx.createRadialGradient(pr.x, pr.y, 2, pr.x, pr.y, glow);
    fg.addColorStop(0, 'rgba(255, 207, 61, 0.85)');
    fg.addColorStop(0.4, 'rgba(255, 122, 26, 0.55)');
    fg.addColorStop(1, 'rgba(217, 43, 14, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, glow, 0, Math.PI * 2);
    ctx.fill();
    // Flame tongues.
    ctx.fillStyle = COLORS.fireMid;
    const flick = Math.sin(time * 9 + i * 2.4) * 4;
    ctx.beginPath();
    ctx.moveTo(pr.x - 14 * pr.s, pr.y);
    ctx.quadraticCurveTo(pr.x - 6 * pr.s, pr.y - (26 + flick) * pr.s, pr.x, pr.y - (40 + flick * 2) * pr.s);
    ctx.quadraticCurveTo(pr.x + 6 * pr.s, pr.y - (26 + flick) * pr.s, pr.x + 14 * pr.s, pr.y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDropRings(ctx, p, time, c) {
  if (c.index !== 1) return;
  for (const ring of c.rings) {
    const pr = projectPoint(p, ring.x, floorHeightAt(ring.z) + 6, ring.z);
    if (!pr || pr.along < 40 || pr.along > 9000) continue;
    const rx = Math.max(4, ring.radius * pr.s * 1.4);
    const ry = Math.max(2, rx * 0.32);
    const pulse = 0.6 + Math.sin(time * 3) * 0.4;
    ctx.strokeStyle = ring.covered >= 100 ? 'rgba(125, 255, 154, 0.95)' : `rgba(255, 90, 74, ${0.55 + pulse * 0.4})`;
    ctx.lineWidth = Math.max(2, 5 * pr.s * 8);
    ctx.beginPath();
    ctx.ellipse(pr.x, pr.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Label only the nearest ring: at distance the labels would pile up.
    if (pr.along < 3500) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        ring.covered >= 100 ? `RING DONE ${ring.covered}%` : `DROP ZONE ${ring.covered}%`,
        pr.x,
        pr.y - ry - 10,
      );
    }
  }
}

function drawRunway(ctx, p, time, night, c) {
  const camZ = p.z - 95;
  if (camZ + 9000 < WORLD.stripStart || camZ > WORLD.stripEnd + 400) return;
  const cx = stripCentreX();
  const corners = [
    projectPoint(p, cx - 55, floorHeightAt(WORLD.stripStart), WORLD.stripStart),
    projectPoint(p, cx + 55, floorHeightAt(WORLD.stripStart), WORLD.stripStart),
    projectPoint(p, cx + 55, floorHeightAt(WORLD.stripEnd), WORLD.stripEnd),
    projectPoint(p, cx - 55, floorHeightAt(WORLD.stripEnd), WORLD.stripEnd),
  ];
  if (corners.some((q) => !q)) return;
  ctx.fillStyle = night > 0.5 ? '#2e2e38' : '#54545e';
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i += 1) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
  ctx.fill();
  // Centreline dashes.
  ctx.strokeStyle = COLORS.runwayMark;
  ctx.lineWidth = 2;
  for (let z = WORLD.stripStart + 100; z < WORLD.stripEnd; z += 260) {
    const a = projectPoint(p, cx, floorHeightAt(z), z);
    const b = projectPoint(p, cx, floorHeightAt(z + 130), z + 130);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Threshold bars.
  ctx.fillStyle = COLORS.runwayMark;
  const th = projectPoint(p, cx, floorHeightAt(WORLD.stripStart + 40), WORLD.stripStart + 40);
  if (th) ctx.fillRect(th.x - 26, th.y - 4, 52, 8);
  // Edge lights at night, windsock and hangar.
  const near = projectPoint(p, cx + 90, floorHeightAt(WORLD.stripStart + 300), WORLD.stripStart + 300);
  if (near) {
    ctx.fillStyle = '#c22a1e';
    ctx.fillRect(near.x, near.y - 34, 4, 34);
    ctx.beginPath();
    ctx.moveTo(near.x + 4, near.y - 34);
    ctx.lineTo(near.x + 26, near.y - 28);
    ctx.lineTo(near.x + 4, near.y - 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(near.x + 40, near.y - 22, 44, 22);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  // Label at the far threshold, offset to the side so the tanker never covers it.
  const label = projectPoint(p, cx + 220, floorHeightAt(WORLD.stripEnd) + 4, WORLD.stripEnd);
  if (label) ctx.fillText('CANYON STRIP · RWY 22', label.x, label.y - 12);
}

function drawFlareMarkers(ctx, p, time, night, c) {
  if (c.index !== 3) return;
  for (const f of c.flares) {
    const pr = projectPoint(p, f.x, floorHeightAt(f.z) + 6, f.z);
    if (!pr || pr.along < 40 || pr.along > 9000) continue;
    if (f.lit) {
      const fg = ctx.createRadialGradient(pr.x, pr.y, 2, pr.x, pr.y, 46);
      fg.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
      fg.addColorStop(1, 'rgba(255, 120, 40, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 46, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const pulse = 0.5 + Math.sin(time * 4 + f.z) * 0.5;
      ctx.fillStyle = `rgba(255, 200, 90, ${0.4 + pulse * 0.5})`;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.lit ? 'FLARE ✓' : 'FLARE TARGET', pr.x, pr.y - 16);
  }
}

function drawSmokeColumns(ctx, p, time, night) {
  const camZ = p.z - 95;
  if (camZ + 8200 < WORLD.fireStart || camZ > WORLD.fireEnd) return;
  for (let i = 0; i < 3; i += 1) {
    const wz = WORLD.fireStart + 600 + i * 1400;
    const wx = (hash1(i * 41 + 9) - 0.5) * 700;
    for (let j = 0; j < 5; j += 1) {
      const wy = 120 + j * 150 + Math.sin(time * 0.7 + i + j) * 12;
      const pr = projectPoint(p, wx + j * 18, wy, wz - j * 30);
      if (!pr || pr.along < 60) continue;
      const r = (60 + j * 70) * pr.s;
      ctx.fillStyle = `rgba(74, 64, 56, ${0.5 - j * 0.07})`;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, Math.max(3, r), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawParticles(ctx, p, ps) {
  for (const q of ps.list) {
    const pr = projectPoint(p, q.x, q.y, q.z);
    if (!pr || pr.along < 20) continue;
    const r = Math.min(110, Math.max(1.5, q.size * pr.s * 1.2));
    if (q.kind === 'smoke') ctx.fillStyle = `rgba(70, 60, 52, ${0.55 * q.life})`;
    else if (q.kind === 'retardant') ctx.fillStyle = `rgba(232, 62, 46, ${0.85 * q.life})`;
    else if (q.kind === 'spray') ctx.fillStyle = `rgba(159, 216, 232, ${0.8 * q.life})`;
    else if (q.kind === 'flare') ctx.fillStyle = `rgba(255, 214, 120, ${0.95 * q.life})`;
    else ctx.fillStyle = `rgba(200, 170, 120, ${0.6 * q.life})`;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function mixColor(a, b, t) {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function parseHex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
