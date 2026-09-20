/* ============================================================
   GOLD TOWER DEFENCE M — AUDIO (procedural WebAudio)
   ============================================================ */
'use strict';
window.GTD = window.GTD || {};

/* BGM theme params per region index (0-9) + lobby */
const BGM_THEMES = [
  { root: 220.0, scale: [0, 2, 4, 7, 9],  tempo: 100, kind: 'march' },   // R1 garden
  { root: 174.6, scale: [0, 3, 5, 7, 10], tempo: 84,  kind: 'march' },   // R2 swamp
  { root: 196.0, scale: [0, 1, 4, 5, 7],  tempo: 96,  kind: 'march' },   // R3 desert (hijaz-ish)
  { root: 233.1, scale: [0, 2, 4, 7, 9],  tempo: 112, kind: 'arp' },     // R4 ice
  { root: 146.8, scale: [0, 1, 3, 7, 8],  tempo: 122, kind: 'drum' },    // R5 lava
  { root: 130.8, scale: [0, 2, 3, 7, 8],  tempo: 90,  kind: 'drum' },    // R6 underworld
  { root: 261.6, scale: [0, 4, 7, 11, 12], tempo: 76, kind: 'organ' },   // R7 cathedral
  { root: 246.9, scale: [0, 2, 4, 7, 9],  tempo: 104, kind: 'arp' },     // R8 ice temple
  { root: 293.7, scale: [0, 2, 5, 7, 9],  tempo: 118, kind: 'arp' },     // R9 cloud
  { root: 329.6, scale: [0, 2, 4, 7, 9],  tempo: 128, kind: 'drum' }     // R10 El Dorado
];
const LOBBY_THEME = { root: 196.0, scale: [0, 4, 7, 11, 12, 16], tempo: 88, kind: 'organ' };

GTD.Audio = {
  ctx: null, master: null, bgmGain: null, sfxGain: null, noiseBuf: null,
  ready: false,
  bgmOn: true, sfxOn: true, volume: 0.8,
  current: null, // theme index: -1 lobby, 0-9 region
  boss: false,
  step: 0, nextNoteTime: 0, schedTimer: null, melodySeed: 0,

  init: function () {
    if (this.ready) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmOn ? 0.34 : 0;
      this.bgmGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxOn ? 0.5 : 0;
      this.sfxGain.connect(this.master);
      /* noise buffer */
      const len = this.ctx.sampleRate * 1.2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.ready = true;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(function () { });
      this.startScheduler();
    } catch (e) { this.ready = false; }
  },

  setBgmOn: function (on) {
    this.bgmOn = on;
    if (this.ready) this.bgmGain.gain.setTargetAtTime(on ? 0.34 : 0, this.ctx.currentTime, 0.1);
  },
  setSfxOn: function (on) {
    this.sfxOn = on;
    if (this.ready) this.sfxGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.05);
  },
  setVolume: function (v) {
    this.volume = v;
    if (this.ready) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  },

  freq: function (theme, deg, oct) {
    return theme.root * Math.pow(2, (theme.scale[((deg % theme.scale.length) + theme.scale.length) % theme.scale.length] + (oct || 0) * 12) / 12);
  },

  setTheme: function (idx, boss) {
    const key = idx + (boss ? ':b' : '');
    if (this.current === key) return;
    this.current = key;
    this.boss = !!boss;
    this.step = 0;
    this.melodySeed = Math.floor(Math.random() * 999);
    if (this.ready) this.nextNoteTime = this.ctx.currentTime + 0.08;
  },

  startScheduler: function () {
    if (this.schedTimer) return;
    const loop = () => { this.schedule(); };
    this.schedTimer = setInterval(loop, 90);
  },

  schedule: function () {
    if (!this.ready) return;
    const theme = this.current == null ? null : (this.current === '-1' ? LOBBY_THEME : BGM_THEMES[parseInt(this.current.replace(':b', ''), 10)]);
    if (!theme || !this.bgmOn) return;
    const tempo = theme.tempo * (this.boss ? 1.25 : 1);
    const stepDur = 60 / tempo / 2; // 8th notes
    while (this.nextNoteTime < this.ctx.currentTime + 0.18) {
      const s = this.step % 16;
      const t = this.nextNoteTime;
      /* bass */
      if (s % 4 === 0) {
        const deg = this.boss && s >= 8 ? 4 : [0, 0, 5, 7][s / 4];
        this.tone(this.freq(theme, deg, -1), t, stepDur * 3.2, 'triangle', 0.5, this.bgmGain);
      }
      /* melody: deterministic pattern w/ seed jitter */
      const melDeg = [0, 2, 4, 7, 4, 2, 9, 7, 4, 2, 0, 4, 7, 9, 12, 9];
      const useDeg = melDeg[s] + (this.melodySeed % 3 === 0 && s % 2 === 1 ? 2 : 0);
      if (theme.kind === 'organ' ? (s % 2 === 0) : (s % 1 !== 1 || s % 8 !== 6)) {
        if (s % 2 === 0 || this.boss) this.tone(this.freq(theme, useDeg, 1), t, stepDur * 1.6, theme.kind === 'drum' ? 'sawtooth' : 'square', 0.16, this.bgmGain);
      }
      /* percussion */
      if (s % 2 === 0) this.noise(t, 0.03, 0.08, 5000, 'highpass', this.boss ? 0.25 : 0.1, this.bgmGain);
      if (this.boss && s % 4 === 0) this.noise(t, 0.12, 0.5, 150, 'lowpass', 0.5, this.bgmGain);
      if (theme.kind === 'drum' && s % 8 === 4) this.tone(70, t, 0.18, 'sine', 0.6, this.bgmGain);
      this.nextNoteTime += stepDur;
      this.step++;
    }
  },

  tone: function (freq, when, dur, type, vol, dest) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(when); o.stop(when + dur + 0.05);
  },

  toneSlide: function (f0, f1, when, dur, type, vol) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, when);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(when); o.stop(when + dur + 0.05);
  },

  noise: function (when, dur, vol, freq, filterType, fvol, dest) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType || 'lowpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(fvol != null ? fvol : vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    src.start(when); src.stop(when + dur + 0.05);
  },

  /* ---------------- SFX ----------------
     recipe-driven, all procedural */
  sfx: function (name) {
    if (!this.ready || !this.sfxOn) return;
    const t = this.ctx.currentTime;
    const S = this;
    const R = {
      uiHover: function () { S.tone(880, t, 0.04, 'sine', 0.06); },
      click: function () { S.tone(520, t, 0.05, 'square', 0.12); S.tone(780, t + 0.03, 0.04, 'square', 0.08); },
      build: function () { S.tone(150, t, 0.12, 'triangle', 0.4); S.noise(t, 0.1, 0.2, 400, 'lowpass', 0.25); },
      sword: function () { S.noise(t, 0.08, 0.25, 3500, 'highpass', 0.3); S.toneSlide(1400, 500, t, 0.08, 'sawtooth', 0.1); },
      bow: function () { S.toneSlide(900, 220, t, 0.07, 'sawtooth', 0.16); },
      fireball: function () { S.noise(t, 0.22, 0.3, 700, 'lowpass', 0.35); S.toneSlide(220, 60, t, 0.22, 'sine', 0.3); },
      hammer: function () { S.tone(120, t, 0.1, 'square', 0.4); S.noise(t, 0.08, 0.3, 300, 'lowpass', 0.3); },
      dragon: function () { S.toneSlide(320, 90, t, 0.4, 'sawtooth', 0.3); S.noise(t, 0.35, 0.2, 900, 'bandpass', 0.2); },
      shuriken: function () { S.toneSlide(1300, 700, t, 0.05, 'triangle', 0.14); },
      chime: function () { S.tone(1568, t, 0.18, 'sine', 0.2); S.tone(2093, t + 0.06, 0.16, 'sine', 0.12); },
      howl: function () { S.toneSlide(380, 760, t, 0.3, 'sawtooth', 0.2); S.toneSlide(760, 300, t + 0.3, 0.3, 'sawtooth', 0.18); },
      hiss: function () { S.noise(t, 0.3, 0.2, 4000, 'highpass', 0.2); },
      punch: function () { S.tone(95, t, 0.09, 'square', 0.4); S.noise(t, 0.06, 0.25, 500, 'lowpass', 0.3); },
      thunder: function () { S.noise(t, 0.5, 0.5, 250, 'lowpass', 0.5); S.toneSlide(90, 40, t, 0.45, 'sine', 0.4); },
      iceArrow: function () { S.toneSlide(2100, 900, t, 0.08, 'sine', 0.12); },
      spikes: function () { S.tone(300, t, 0.1, 'triangle', 0.3); S.noise(t, 0.08, 0.2, 800, 'bandpass', 0.2); },
      cannon: function () { S.noise(t, 0.3, 0.5, 500, 'lowpass', 0.5); S.tone(60, t, 0.25, 'sine', 0.5); },
      squeak: function () { S.toneSlide(1800, 2400, t, 0.06, 'square', 0.08); },
      deploy: function () { S.toneSlide(400, 900, t, 0.15, 'triangle', 0.2); },
      pop: function () { S.tone(620, t, 0.05, 'sine', 0.2); },
      hurt: function () { S.toneSlide(220, 120, t, 0.1, 'sawtooth', 0.2); },
      coin: function () { S.tone(1320, t, 0.06, 'square', 0.14); S.tone(1760, t + 0.06, 0.1, 'square', 0.14); },
      gacha: function () { [0, 1, 2].forEach(i => S.tone([660, 880, 1320][i], t + i * 0.07, 0.1, 'triangle', 0.18)); },
      win: function () { [523, 659, 784, 1047].forEach((f, i) => S.tone(f, t + i * 0.12, 0.25, 'triangle', 0.22)); },
      levelup: function () { S.toneSlide(400, 1200, t, 0.3, 'triangle', 0.2); },
      lose: function () { [392, 330, 262, 196].forEach((f, i) => S.tone(f, t + i * 0.16, 0.3, 'sawtooth', 0.15)); },
      zap: function () { S.toneSlide(3000, 300, t, 0.06, 'square', 0.14); S.noise(t, 0.05, 0.15, 5000, 'highpass', 0.15); },
      heal: function () { S.tone(1000, t, 0.15, 'sine', 0.12); S.tone(1500, t + 0.08, 0.15, 'sine', 0.1); },
      roar: function () { S.toneSlide(90, 45, t, 0.6, 'sawtooth', 0.4); S.noise(t, 0.5, 0.25, 300, 'lowpass', 0.3); },
      squeal: function () { S.toneSlide(2500, 1400, t, 0.14, 'sawtooth', 0.1); },
      boom: function () { S.noise(t, 0.45, 0.55, 350, 'lowpass', 0.55); S.tone(50, t, 0.4, 'sine', 0.5); },
      plum: function () { S.tone(1500, t, 0.1, 'triangle', 0.16); S.tone(1900, t + 0.08, 0.12, 'triangle', 0.12); S.noise(t, 0.15, 0.08, 3000, 'highpass', 0.08); }
    };
    if (R[name]) { try { R[name](); } catch (e) { } }
  },

  /* visibility: suspend audio when hidden */
  onVisibility: function () {
    if (!this.ready) return;
    if (document.hidden) { this.ctx.suspend().catch(function () { }); }
    else { this.ctx.resume().catch(function () { }); }
  }
};
