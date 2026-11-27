// Heads-up display for DESERT THUNDER. One clear job: lit instruments the judge
// can read at a glance — altitude, speed, heading, fuel, water, damage — plus the
// mission banner, artificial horizon and stall / damage warnings.
import { VIEW, COLORS, MISSIONS } from './config.js';
import { headingDegrees } from './physics.js';
import { missionProgressText, currentMission } from './missions.js';

export function drawHud(ctx, state, time) {
  const { p, campaign: c } = state;
  drawCompassTape(ctx, p);
  drawInstrumentBlock(ctx, p);
  drawSystemBars(ctx, p);
  drawArtificialHorizon(ctx, p);
  drawMissionBanner(ctx, c, p);
  drawObjectiveArrow(ctx, p, c);
  drawWarnings(ctx, p, time);
  drawScoreLine(ctx, c, p);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255, 179, 71, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
}

function drawCompassTape(ctx, p) {
  const hdg = headingDegrees(p.heading);
  panel(ctx, 440, 12, 400, 44);
  ctx.save();
  ctx.beginPath();
  ctx.rect(440, 12, 400, 44);
  ctx.clip();
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  // Tick every 10 degrees of absolute heading, so 000 / 030 / 060 always land.
  const start = Math.floor((hdg - 60) / 10) * 10;
  for (let deg = start; deg <= hdg + 60; deg += 10) {
    const norm = ((deg % 360) + 360) % 360;
    const x = 640 + (deg - hdg) * 5.4;
    if (norm % 30 === 0) {
      ctx.fillStyle = COLORS.hudAmber;
      ctx.fillText(String(norm).padStart(3, '0'), x, 42);
    } else {
      ctx.fillStyle = 'rgba(255, 179, 71, 0.7)';
      ctx.fillText('·', x, 42);
    }
    if (norm % 90 === 0) {
      ctx.fillStyle = COLORS.hudCyan;
      ctx.fillText(['N', 'E', 'S', 'W'][Math.round(norm / 90) % 4], x, 26);
    }
  }
  ctx.restore();
  ctx.fillStyle = COLORS.hudRed;
  ctx.beginPath();
  ctx.moveTo(640, 12);
  ctx.lineTo(632, 2);
  ctx.lineTo(648, 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.hudAmber;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HDG', 640, 70);
}

function drawInstrumentBlock(ctx, p) {
  panel(ctx, 16, 12, 250, 128);
  ctx.textAlign = 'left';
  instrumentRow(ctx, 30, 44, 'ALT', `${Math.round(p.altitude)} FT`, COLORS.hudAmber);
  instrumentRow(ctx, 30, 78, 'SPD', `${Math.round(p.speed)} KT`, COLORS.hudGreen);
  instrumentRow(ctx, 30, 112, 'HDG', `${String(Math.round(headingDegrees(p.heading))).padStart(3, '0')}°`, COLORS.hudCyan);
  ctx.fillStyle = '#cfd6e4';
  ctx.font = '12px sans-serif';
  ctx.fillText(`VSI ${p.verticalSpeed >= 0 ? '+' : ''}${Math.round(p.verticalSpeed * 60)} FPM`, 30, 132);
  // Throttle arc.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(228, 76, 26, Math.PI * 0.75, Math.PI * 2.25);
  ctx.stroke();
  ctx.strokeStyle = COLORS.hudAmber;
  ctx.beginPath();
  ctx.arc(228, 76, 26, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * p.throttle);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THR', 228, 80);
  ctx.fillText(`${Math.round(p.throttle * 100)}%`, 228, 94);
}

function instrumentRow(ctx, x, y, label, value, color) {
  ctx.fillStyle = '#9aa5b8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = color;
  ctx.font = 'bold 24px monospace';
  ctx.fillText(value, x + 52, y + 2);
}

function drawSystemBars(ctx, p) {
  panel(ctx, 1014, 12, 250, 128);
  ctx.textAlign = 'left';
  systemBar(ctx, 1028, 40, 'FUEL', p.fuel / 100, p.fuel < 20 ? COLORS.hudRed : COLORS.hudGreen);
  systemBar(ctx, 1028, 74, 'WATER', p.water / 100, COLORS.hudCyan);
  systemBar(ctx, 1028, 108, 'DAMAGE', p.damage / 100, p.damage > 60 ? COLORS.hudRed : COLORS.hudAmber);
  ctx.fillStyle = '#cfd6e4';
  ctx.font = '12px sans-serif';
  ctx.fillText(`FUEL ${Math.round(p.fuel)}%   H2O ${Math.round(p.water)}%   DMG ${Math.round(p.damage)}%`, 1028, 132);
  if (p.gearDown) {
    ctx.fillStyle = COLORS.hudGreen;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('● GEAR DOWN', 1120, 40);
  }
}

function systemBar(ctx, x, y, label, frac, color) {
  ctx.fillStyle = '#9aa5b8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 74, y - 10, 140, 12);
  ctx.fillStyle = color;
  ctx.fillRect(x + 74, y - 10, Math.max(0, 140 * frac), 12);
}

function drawArtificialHorizon(ctx, p) {
  const cx = 90;
  const cy = 640;
  const r = 52;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-p.roll * 0.5);
  ctx.translate(0, p.pitch * 40);
  ctx.fillStyle = '#3d6a9e';
  ctx.fillRect(-r, -r, r * 2, r);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-r, 0, r * 2, r);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r, -1, r * 2, 2);
  ctx.restore();
  ctx.strokeStyle = COLORS.hudAmber;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy);
  ctx.lineTo(cx, cy - 8);
  ctx.lineTo(cx + 14, cy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', cx, cy + r + 14);
}

function drawMissionBanner(ctx, c, p) {
  const m = currentMission(c);
  panel(ctx, 300, 648, 680, 56);
  ctx.fillStyle = COLORS.hudAmber;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(m.name, 640, 668);
  ctx.fillStyle = '#e8ecf2';
  ctx.font = '13px sans-serif';
  ctx.fillText(missionProgressText(c, p), 640, 690);
  if (c.messageTime > 0 && c.message) {
    ctx.fillStyle = 'rgba(255, 240, 200, 0.95)';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(c.message, 640, 620);
  }
}

function drawObjectiveArrow(ctx, p, c) {
  // The arrow always points at this mission's own target, not just the next
  // landmark down the corridor.
  const targets = [
    { z: 6000, name: 'EMBER LAKE' },
    { z: 17600, name: 'FIRE LINE' },
    { z: 11800, name: 'CANYON STRIP' },
    { z: 17600, name: 'FIRE LINE' },
  ];
  const mark = targets[c.index] ?? targets[1];
  const dist = Math.max(0, mark.z - p.z);
  const dx = 0 - p.x;
  const angle = Math.atan2(dx, 1);
  ctx.save();
  ctx.translate(640, 150);
  ctx.rotate(Math.max(-0.6, Math.min(0.6, angle * 0.4)));
  ctx.fillStyle = 'rgba(255, 179, 71, 0.9)';
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(12, 8);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.hudAmber;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${mark.name} — ${(dist / 6076).toFixed(1)} NM`, 640, 186);
}

function drawWarnings(ctx, p, time) {
  if (p.stalled && Math.floor(time * 4) % 2 === 0) {
    ctx.fillStyle = COLORS.hudRed;
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — NOSE DOWN, FULL THROTTLE', 640, 260);
  }
  if (p.damage > 60) {
    ctx.fillStyle = COLORS.hudRed;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ HEAVY DAMAGE — RETURN TO STRIP', 640, 292);
  }
  if (p.fuel < 20) {
    ctx.fillStyle = COLORS.hudRed;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ LOW FUEL', 640, 316);
  }
}

function drawScoreLine(ctx, c, p) {
  ctx.fillStyle = '#e8ecf2';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${c.score}   TIME ${Math.round(c.time)}s`, 1264, 700);
}
