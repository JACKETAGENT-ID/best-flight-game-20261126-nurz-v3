// Mission logic for DESERT THUNDER. One clear job: the four-sortie campaign —
// objectives, progress, scoring and the debrief — plus free-fly mode.
import { MISSIONS, SCORES, WORLD } from './config.js';
import { dropRings, flareMarkers, overLakeForScoop, onStripForLanding } from './terrain.js';

export function freshCampaign() {
  return {
    mode: 'campaign',
    index: 0,
    state: 'brief',
    time: 0,
    scoopHold: 0,
    rings: dropRings(),
    flares: flareMarkers(),
    flaresDropped: 0,
    landedOnce: false,
    tookOff: false,
    coverage: 0,
    score: 0,
    message: '',
    messageTime: 0,
    debrief: null,
  };
}

export function currentMission(c) {
  return MISSIONS[c.index];
}

export function startMission(c) {
  c.state = 'flying';
  c.time = 0;
  c.scoopHold = 0;
  c.rings = dropRings();
  c.flares = flareMarkers();
  c.flaresDropped = 0;
  c.landedOnce = false;
  c.tookOff = false;
  c.coverage = 0;
  c.message = currentMission(c).brief;
  c.messageTime = 5;
}

/** Advance mission logic one step; returns 'complete' | 'failed' | null. */
export function stepMission(c, p, dt, actions) {
  if (c.state !== 'flying') return null;
  c.time += dt;
  if (c.messageTime > 0) c.messageTime -= dt;
  const m = currentMission(c);

  if (m.id === 'scoop') {
    if (overLakeForScoop(p.x, p.z, p.altitude)) {
      c.scoopHold += dt;
      if (c.scoopHold >= SCORES.scoopHoldSeconds && p.water >= 95) return finishMission(c, p, true);
    } else {
      c.scoopHold = Math.max(0, c.scoopHold - dt * 2);
    }
  }

  if (m.id === 'drop') {
    let total = 0;
    for (const r of c.rings) total += r.covered;
    c.coverage = Math.round(total / c.rings.length);
    if (c.coverage >= SCORES.coverageNeeded) return finishMission(c, p, true);
    if (p.water <= 0 && c.coverage < SCORES.coverageNeeded && p.z > WORLD.fireEnd) {
      return finishMission(c, p, false);
    }
  }

  if (m.id === 'pickup') {
    if (p.landed && !c.landedOnce) {
      c.landedOnce = true;
      c.message = 'CREW ABOARD — full throttle and take off!';
      c.messageTime = 4;
    }
    if (c.landedOnce && p.onGround && p.throttle > 0.8) {
      p.onGround = false;
      p.landed = false;
      p.altitude = 30;
      p.speed = 120;
      c.tookOff = true;
    }
    if (c.tookOff && p.altitude > 400) return finishMission(c, p, true);
  }

  if (m.id === 'night') {
    if (actions.flare) {
      let best = null;
      let bestD = Infinity;
      for (const f of c.flares) {
        if (f.lit) continue;
        const d = Math.hypot(p.x - f.x, (p.z - f.z) * 0.45);
        if (d < bestD) {
          bestD = d;
          best = f;
        }
      }
      if (best && bestD < 260) {
        best.lit = true;
        c.flaresDropped += 1;
        c.message = `FLARE ${c.flaresDropped} OF ${SCORES.flareTargets} ON TARGET`;
        c.messageTime = 3;
      }
    }
    if (c.flaresDropped >= SCORES.flareTargets) return finishMission(c, p, true);
  }

  if (p.crashed) return finishMission(c, p, false);
  if (p.fuel <= 0 && p.altitude <= 5) return finishMission(c, p, false);
  if (p.z > WORLD.corridorLength) return finishMission(c, p, c.coverage >= SCORES.coverageNeeded || m.id === 'scoop');
  return null;
}

function finishMission(c, p, won) {
  const m = currentMission(c);
  const timeBonus = Math.max(0, Math.round((m.parTime - c.time) * 4));
  const fuelBonus = Math.round(p.fuel * 3);
  const damagePenalty = Math.round(p.damage * 5);
  let base = 0;
  if (m.id === 'scoop') base = 400 + Math.round(p.water * 4);
  if (m.id === 'drop') base = c.coverage * 10;
  if (m.id === 'pickup') base = c.landedOnce ? 900 : 0;
  if (m.id === 'night') base = c.flaresDropped * 250;
  const gained = won ? Math.max(100, base + timeBonus + fuelBonus - damagePenalty) : Math.round(base / 4);
  c.score += gained;
  c.state = won ? 'complete' : 'failed';
  c.debrief = {
    won,
    mission: m.name,
    score: c.score,
    gained,
    time: Math.round(c.time),
    coverage: c.coverage,
    fuel: Math.round(p.fuel),
    damage: Math.round(p.damage),
    water: Math.round(p.water),
  };
  return c.state;
}

export function nextMission(c) {
  if (c.index + 1 >= MISSIONS.length) return false;
  c.index += 1;
  c.state = 'brief';
  c.debrief = null;
  return true;
}

export function missionProgressText(c, p) {
  const m = currentMission(c);
  if (m.id === 'scoop') return `TANK ${Math.round(p.water)}% — HOLD LOW OVER THE LAKE ${Math.max(0, SCORES.scoopHoldSeconds - c.scoopHold).toFixed(1)}s`;
  if (m.id === 'drop') return `COVERAGE ${c.coverage}% / ${SCORES.coverageNeeded}% — WATER ${Math.round(p.water)}%`;
  if (m.id === 'pickup') return c.landedOnce ? 'CREW ABOARD — TAKE OFF!' : 'LAND ON CANYON STRIP — GEAR DOWN, SLOW BELOW 118 KT';
  if (m.id === 'night') return `FLARES ${c.flaresDropped} / ${SCORES.flareTargets} ON TARGET`;
  return '';
}
