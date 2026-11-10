// Bruitages synthétisés (Web Audio) : aucun fichier son à charger.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.last = {};
    this.noise = null;
  }

  // À appeler depuis un geste de l'utilisateur (clic, touche).
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.5;
      this.out.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch { this.ctx = null; }
  }

  tone(type, f0, f1, dur, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.02);
  }

  hiss(freq, q, dur, vol, type = 'bandpass', delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.out);
    s.start(t); s.stop(t + dur + 0.02);
  }

  play(name) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = GAP[name] ?? 0.05;
    if (now - (this.last[name] || -1) < gap) return;
    this.last[name] = now;
    const S = SOUNDS[name];
    if (S) S(this);
  }
}

const GAP = { phys: 0.07, eau: 0.1, glace: 0.1, foudre: 0.09, huile: 0.12, feu: 0.1, sable: 0.1, death: 0.06, ignite: 0.12, freeze: 0.08, shatter: 0.06 };

const SOUNDS = {
  phys: (s) => { s.hiss(2600, 1.2, 0.07, 0.1); s.tone('triangle', 520, 240, 0.06, 0.05); },
  eau: (s) => { s.tone('sine', 620, 240, 0.14, 0.09); s.hiss(900, 0.8, 0.12, 0.05); },
  glace: (s) => { s.tone('sine', 2200, 1500, 0.1, 0.05); s.tone('triangle', 1650, 1200, 0.12, 0.04); },
  foudre: (s) => { s.tone('sawtooth', 1500, 140, 0.11, 0.07); s.hiss(4200, 0.7, 0.09, 0.09, 'highpass'); },
  huile: (s) => { s.tone('sine', 190, 90, 0.16, 0.12); },
  feu: (s) => { s.hiss(520, 0.6, 0.2, 0.14, 'lowpass'); },
  sable: (s) => { s.hiss(1700, 0.5, 0.16, 0.09); },
  freeze: (s) => { s.tone('sine', 1800, 2600, 0.12, 0.06); s.tone('sine', 2700, 3300, 0.16, 0.04, 0.04); },
  shatter: (s) => { s.hiss(5200, 0.9, 0.22, 0.2, 'highpass'); s.tone('triangle', 2400, 600, 0.18, 0.09); s.tone('sine', 3400, 1800, 0.12, 0.06, 0.03); },
  ignite: (s) => { s.hiss(700, 0.5, 0.3, 0.16, 'lowpass'); s.tone('sawtooth', 160, 420, 0.2, 0.04); },
  death: (s) => { s.tone('square', 210, 70, 0.1, 0.04); },
  leak: (s) => { s.tone('sawtooth', 320, 90, 0.35, 0.14); s.tone('square', 160, 60, 0.4, 0.08); },
  build: (s) => { s.tone('triangle', 330, 330, 0.08, 0.1); s.tone('triangle', 495, 495, 0.12, 0.1, 0.07); s.hiss(300, 0.8, 0.1, 0.12, 'lowpass'); },
  upgrade: (s) => { [523, 659, 784, 1047].forEach((f, i) => s.tone('triangle', f, f, 0.14, 0.09, i * 0.06)); },
  sell: (s) => { s.tone('triangle', 880, 660, 0.08, 0.08); s.tone('triangle', 1320, 990, 0.1, 0.06, 0.05); },
  wave: (s) => { s.tone('sawtooth', 196, 196, 0.5, 0.07); s.tone('sawtooth', 294, 294, 0.5, 0.05, 0.02); s.tone('sawtooth', 392, 392, 0.45, 0.04, 0.2); },
  purge: (s) => { s.tone('sine', 300, 900, 0.4, 0.08); },
  click: (s) => { s.tone('triangle', 700, 520, 0.05, 0.06); },
  deny: (s) => { s.tone('square', 150, 110, 0.12, 0.06); },
  won: (s) => { [392, 523, 659, 784, 1047].forEach((f, i) => s.tone('triangle', f, f, 0.32, 0.11, i * 0.13)); },
  lost: (s) => { [392, 330, 262, 196].forEach((f, i) => s.tone('sawtooth', f, f * 0.97, 0.4, 0.07, i * 0.22)); },
  star: (s) => { s.tone('triangle', 1175, 1568, 0.2, 0.1); },
};
