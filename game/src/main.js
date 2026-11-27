// DESERT THUNDER — Canyon Firefighting Airtanker. Entry point: game loop, screens,
// mission flow and the deterministic screenshot mode (?shot=cover|scoop|drop|night).
import { VIEW, MISSIONS, WORLD } from './config.js';
import { freshPlane, stepPlane, dropRetardant, scoopWater } from './physics.js';
import { freshCampaign, startMission, stepMission, nextMission, currentMission } from './missions.js';
import { freshParticles, spawnSmoke, spawnRetardant, spawnFlare, spawnSpray, spawnDust, stepParticles } from './particles.js';
import { freshInput, attachInput, readControls, consumeActions } from './input.js';
import { freshAudio, ensureAudio, updateAudio, beep } from './audio.js';
import { drawWorld } from './render.js';
import { drawHud } from './hud.js';
import { stageShot } from './shots.js';
import { overLakeForScoop } from './terrain.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const state = {
  p: freshPlane(),
  campaign: freshCampaign(),
  ps: freshParticles(),
  input: freshInput(),
  audio: freshAudio(),
  screen: 'title',
  time: 0,
  smokeTimer: 0,
  shotMode: null,
};

function resizeCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}

function resetSortie(missionIndex) {
  state.p = freshPlane();
  state.campaign = freshCampaign();
  state.campaign.index = missionIndex;
  state.ps = freshParticles();
  state.screen = 'brief';
}

function beginMission() {
  startMission(state.campaign);
  state.screen = 'play';
  state.p.z = missionStartZ(state.campaign.index);
  state.p.altitude = missionStartAlt(state.campaign.index);
  state.p.x = 0;
  state.p.speed = 150;
  state.p.water = state.campaign.index === 0 ? 0 : 100;
  ensureAudio(state.audio);
}

function missionStartZ(index) {
  return [3800, 14200, 9800, 15000][index] ?? 3800;
}

function missionStartAlt(index) {
  return [700, 600, 500, 650][index] ?? 600;
}

function update(dt) {
  state.time += dt;
  const actions = consumeActions(state.input);
  if (state.screen === 'title') {
    if (actions.confirm || actions.click) {
      const idx = pickMissionFromClick(state.input.mouseX, state.input.mouseY);
      resetSortie(idx);
    }
    idleCruise(dt);
    return;
  }
  if (state.screen === 'brief') {
    if (actions.confirm || actions.click) beginMission();
    idleCruise(dt);
    return;
  }
  if (state.screen === 'pause') {
    if (actions.pause || actions.confirm) state.screen = 'play';
    return;
  }
  if (state.screen === 'debrief') {
    if (actions.confirm || actions.click) {
      if (state.campaign.state === 'complete') {
        if (nextMission(state.campaign)) resetSortie(state.campaign.index);
        else state.screen = 'campaignDone';
      } else {
        resetSortie(state.campaign.index);
      }
    }
    return;
  }
  if (state.screen === 'campaignDone') {
    if (actions.confirm || actions.click) {
      state.campaign = freshCampaign();
      state.p = freshPlane();
      state.screen = 'title';
    }
    return;
  }
  if (state.screen !== 'play') return;

  if (actions.pause) {
    state.screen = 'pause';
    return;
  }
  if (actions.gear) {
    state.p.gearDown = !state.p.gearDown;
    beep(state.audio, state.p.gearDown ? 520 : 380, 0.12);
  }

  const ctl = readControls(state.input);
  const events = stepPlane(state.p, ctl, dt, state.campaign);
  if (events.stalled) beep(state.audio, 220, 0.2);
  if (events.terrainHit) beep(state.audio, 140, 0.4);

  // Scooping: skimming the lake fills the tank and throws spray.
  if (overLakeForScoop(state.p.x, state.p.z, state.p.altitude) && state.campaign.index === 0) {
    scoopWater(state.p, dt);
    spawnSpray(state.ps, state.p.x, state.p.z - 30, 10, 2);
  }
  // Dust when low over the desert floor.
  if (state.p.altitude < 180 && !state.p.onGround) spawnDust(state.ps, state.p.x, state.p.z - 20, 12, 1);

  // Fire smoke drifts in whenever the fire line is near.
  state.smokeTimer -= dt;
  if (state.smokeTimer <= 0 && state.p.z > WORLD.fireStart - 4000 && state.p.z < WORLD.fireEnd + 1000) {
    spawnSmoke(state.ps, state.p.x + (Math.sin(state.time) * 200), state.p.z + 1200, 260, 2);
    state.smokeTimer = 0.4;
  }

  if (actions.drop && state.p.water > 0) {
    const result = dropRetardant(state.p, state.campaign.rings);
    spawnRetardant(state.ps, state.p.x, state.p.z + 100, state.p.altitude - 30);
    beep(state.audio, 660, 0.15);
    if (result.ring) {
      state.campaign.message = `RING HIT — COVERAGE +${result.coverage}%`;
      state.campaign.messageTime = 2.5;
    }
  }
  if (actions.flare) {
    spawnFlare(state.ps, state.p.x, state.p.z + 150, state.p.altitude - 50);
    beep(state.audio, 880, 0.2);
  }

  stepParticles(state.ps, dt);
  const outcome = stepMission(state.campaign, state.p, dt, { flare: actions.flare });
  if (outcome) {
    state.screen = 'debrief';
    beep(state.audio, outcome === 'complete' ? 740 : 180, 0.5);
  }
  updateAudio(state.audio, state.p.speed, state.p.throttle, state.p.stalled);
  statusEl.textContent = `${currentMission(state.campaign).name}. Altitude ${Math.round(state.p.altitude)} feet, speed ${Math.round(state.p.speed)} knots.`;
}

function idleCruise(dt) {
  // The title and brief screens fly the canyon on autopilot behind the panel.
  const p = state.p;
  p.throttle = 0.6;
  stepPlane(p, { pitch: p.altitude < 520 ? 0.4 : -0.4, roll: 0, throttle: 0 }, dt, state.campaign);
  if (p.z > WORLD.corridorLength - 2000) {
    p.z = 600;
    p.x = 0;
  }
  stepParticles(state.ps, dt);
}

function pickMissionFromClick(x, y) {
  for (let i = 0; i < MISSIONS.length; i += 1) {
    const by = 330 + i * 56;
    if (x > 340 && x < 940 && y > by && y < by + 48) return i;
  }
  return 0;
}

function render() {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  if (state.screen === 'title') {
    drawWorld(ctx, state, state.time);
    drawTitle(ctx);
    return;
  }
  if (state.screen === 'brief') {
    drawWorld(ctx, state, state.time);
    drawBrief(ctx);
    return;
  }
  drawWorld(ctx, state, state.time);
  if (state.screen === 'play' || state.screen === 'pause') drawHud(ctx, state, state.time);
  if (state.screen === 'pause') drawPause(ctx);
  if (state.screen === 'debrief') drawDebrief(ctx);
  if (state.screen === 'campaignDone') drawCampaignDone(ctx);
}

function drawTitle(ctx) {
  shade(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('DESERT THUNDER', 640, 130);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('CANYON FIREFIGHTING AIRTANKER', 640, 170);
  ctx.fillStyle = '#e8ecf2';
  ctx.font = '16px sans-serif';
  ctx.fillText('Four sorties. One canyon on fire. Fly low, scoop fast, drop true.', 640, 205);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('CLICK A MISSION TO FLY', 640, 300);
  MISSIONS.forEach((m, i) => {
    const y = 330 + i * 56;
    const hover = state.input.mouseX > 340 && state.input.mouseX < 940 && state.input.mouseY > y && state.input.mouseY < y + 48;
    ctx.fillStyle = hover ? 'rgba(255, 179, 71, 0.25)' : 'rgba(10, 14, 24, 0.72)';
    ctx.fillRect(340, y, 600, 48);
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.6)';
    ctx.strokeRect(340, y, 600, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(m.name, 360, y + 30);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9aa5b8';
  ctx.font = '14px sans-serif';
  ctx.fillText('W/S pitch · A/D bank · SHIFT throttle · SPACE drop retardant · F flare · G gear · P pause', 640, 580);
  ctx.fillText('An original game. No network, no accounts, no downloads — just flying.', 640, 606);
}

function drawBrief(ctx) {
  shade(ctx);
  const m = currentMission(state.campaign);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(m.name, 640, 220);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  wrapText(ctx, m.brief, 640, 280, 760, 30);
  ctx.fillStyle = '#9aa5b8';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Target: ${m.target} · Par time ${m.parTime}s`, 640, 360);
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO TAKE OFF', 640, 440);
}

function drawPause(ctx) {
  shade(ctx);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', 640, 340);
  ctx.font = '18px sans-serif';
  ctx.fillText('Press P or Enter to keep flying', 640, 384);
}

function drawDebrief(ctx) {
  shade(ctx);
  const d = state.campaign.debrief;
  ctx.textAlign = 'center';
  ctx.fillStyle = d.won ? '#7dff9a' : '#ff5a4a';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(d.won ? 'MISSION COMPLETE' : 'MISSION FAILED', 640, 200);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText(d.mission, 640, 244);
  const rows = [
    `Score gained  +${d.gained}   ·   Total score  ${d.score}`,
    `Time  ${d.time}s   ·   Fuel left  ${d.fuel}%   ·   Damage  ${d.damage}%`,
    `Water  ${d.water}%   ·   Fire coverage  ${d.coverage}%`,
  ];
  rows.forEach((r, i) => {
    ctx.fillStyle = '#e8ecf2';
    ctx.font = '18px sans-serif';
    ctx.fillText(r, 640, 300 + i * 34);
  });
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(
    d.won ? (state.campaign.index + 1 < MISSIONS.length ? 'PRESS ENTER — NEXT MISSION' : 'PRESS ENTER — CAMPAIGN COMPLETE') : 'PRESS ENTER — FLY IT AGAIN',
    640,
    440,
  );
}

function drawCampaignDone(ctx) {
  shade(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('CANYON SAVED', 640, 260);
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px sans-serif';
  ctx.fillText(`Campaign complete — total score ${state.campaign.score}`, 640, 310);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('PRESS ENTER TO FLY AGAIN', 640, 380);
}

function shade(ctx) {
  ctx.fillStyle = 'rgba(8, 10, 20, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = w;
      cy += lineHeight;
    } else line = test;
  }
  ctx.fillText(line, x, cy);
}

let last = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  update(dt);
  render();
  if (!state.shotMode) requestAnimationFrame(loop);
}

function start() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  attachInput(state.input, canvas);
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    state.shotMode = shot;
    state.screen = stageShot(shot, state);
    state.time = 12;
    render();
    document.title = `DESERT THUNDER — shot ${shot}`;
    window.__shotReady = true;
    return;
  }
  requestAnimationFrame(loop);
}

start();
