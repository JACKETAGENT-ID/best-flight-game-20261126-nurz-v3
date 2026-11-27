// Synthesised sound for DESERT THUNDER. One clear job: engine hum, wind, drop
// whoosh and alarms from the Web Audio API — no audio files, nothing fetched.
export function freshAudio() {
  return { ctx: null, engine: null, engineGain: null, wind: null, windGain: null, muted: false };
}

export function ensureAudio(a) {
  if (a.ctx || a.muted) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    a.ctx = new Ctx();
    const engine = a.ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 62;
    const engineGain = a.ctx.createGain();
    engineGain.gain.value = 0.0;
    const filter = a.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engine.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(a.ctx.destination);
    engine.start();
    a.engine = engine;
    a.engineGain = engineGain;
    const wind = a.ctx.createBufferSource();
    const len = a.ctx.sampleRate * 2;
    const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    wind.buffer = buf;
    wind.loop = true;
    const windFilter = a.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    const windGain = a.ctx.createGain();
    windGain.gain.value = 0.0;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(a.ctx.destination);
    wind.start();
    a.wind = wind;
    a.windGain = windGain;
  } catch {
    a.muted = true;
  }
}

export function updateAudio(a, speed, throttle, stalled) {
  if (!a.ctx || a.muted) return;
  if (a.ctx.state === 'suspended') a.ctx.resume();
  const t = a.ctx.currentTime;
  a.engine.frequency.setTargetAtTime(48 + throttle * 70 + (stalled ? -14 : 0), t, 0.1);
  a.engineGain.gain.setTargetAtTime(0.028 + throttle * 0.035, t, 0.1);
  a.windGain.gain.setTargetAtTime(Math.min(0.05, (speed / 235) * 0.05), t, 0.2);
}

export function beep(a, freq, seconds) {
  if (!a.ctx || a.muted) return;
  try {
    const o = a.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const g = a.ctx.createGain();
    g.gain.setValueAtTime(0.06, a.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.ctx.currentTime + seconds);
    o.connect(g);
    g.connect(a.ctx.destination);
    o.start();
    o.stop(a.ctx.currentTime + seconds);
  } catch {
    // Sound is garnish; a failed beep never breaks the game.
  }
}
