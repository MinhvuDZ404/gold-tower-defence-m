/* ============================================================
   GOLD TOWER DEFENCE M — BATTLE ENGINE
   ============================================================ */
'use strict';
window.GTD = window.GTD || {};

/* ---------------- PATH ---------------- */
GTD.Path = class {
  constructor(wps) {
    this.wps = wps;
    this.segs = [];
    this.total = 0;
    for (let i = 0; i < wps.length - 1; i++) {
      const [x1, y1] = wps[i], [x2, y2] = wps[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      this.segs.push({ x1, y1, x2, y2, len, start: this.total, ang: Math.atan2(y2 - y1, x2 - x1) });
      this.total += len;
    }
  }
  posAt(d) {
    d = Math.max(0, Math.min(this.total, d));
    for (let i = 0; i < this.segs.length; i++) {
      const s = this.segs[i];
      if (d <= s.start + s.len || i === this.segs.length - 1) {
        const t = s.len === 0 ? 0 : (d - s.start) / s.len;
        return { x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t, ang: s.ang };
      }
    }
    const s = this.segs[this.segs.length - 1];
    return { x: s.x2, y: s.y2, ang: s.ang };
  }
  nearestDist(x, y) {
    let best = 0, bestD = Infinity;
    for (let d = 0; d <= this.total; d += 12) {
      const p = this.posAt(d);
      const dd = GTD.U.dist2(p.x, p.y, x, y);
      if (dd < bestD) { bestD = dd; best = d; }
    }
    return best;
  }
};

/* ---------------- GRID (spatial hash, 64px cells) ---------------- */
GTD.Grid = class {
  constructor(cell) { this.cell = cell || 64; this.map = new Map(); }
  key(cx, cy) { return cx * 10000 + cy; }
  clear() { this.map.clear(); }
  insert(o) {
    const cx = Math.floor(o.x / this.cell), cy = Math.floor(o.y / this.cell);
    const k = this.key(cx, cy);
    let a = this.map.get(k);
    if (!a) { a = []; this.map.set(k, a); }
    a.push(o);
  }
  query(x, y, r, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.map.get(this.key(cx, cy));
      if (a) for (let i = 0; i < a.length; i++) out.push(a[i]);
    }
    return out;
  }
};

/* ---------------- POOLS ---------------- */
GTD.ParticlePool = class {
  constructor(n) {
    this.list = [];
    for (let i = 0; i < n; i++) this.list.push({ on: false });
    this.cursor = 0;
  }
  get() {
    for (let i = 0; i < this.list.length; i++) {
      this.cursor = (this.cursor + 1) % this.list.length;
      const p = this.list[this.cursor];
      if (!p.on) { p.on = true; return p; }
    }
    return null;
  }
}
GTD.FloatPool = GTD.ParticlePool;

/* color helpers */
function hsl(h, s, l) { return 'hsl(' + h + ',' + s + '%,' + l + '%)'; }

/* ============================================================
   BATTLE
   ============================================================ */
GTD.Battle = class Battle {
  constructor(cfg, root) {
    this.cfg = cfg; // {mode:'stage'|'top'|'daily', stage, floor}
    this.save = GTD_SAVE;
    this.root = root;
    this.W = GTD.BATTLE.W; this.H = GTD.BATTLE.H;
    this.regionIndex = cfg.mode === 'stage' || cfg.mode === 'daily' ? GTD.regionOfStage(cfg.stage) : GTD.regionOfStage(Math.min(200, cfg.floor * 20 - 19));
    // Tower of Proof: floor f uses stage (f*20-19) region scaling => region grows with floor
    if (cfg.mode === 'top') { this.stageForTop = Math.min(200, 1 + (cfg.floor) * 13); this.regionIndex = GTD.regionOfStage(this.stageForTop); }
    else this.stageForTop = cfg.stage;
    this.stageIdx = cfg.mode === 'top' ? 9 : GTD.stageIndexInRegion(cfg.stage);
    this.region = GTD.REGIONS[this.regionIndex];
    this.scale = GTD.playerScale(this.regionIndex);
    this.topMult = cfg.mode === 'top' ? 1 + cfg.floor * 0.12 : 1;
    this.pool = GTD.buildRegionPool(this.regionIndex);
    this.path = new GTD.Path(GTD.pathForRegion(this.regionIndex).wps);
    this.slots = GTD.pathForRegion(this.regionIndex).slots.map(s => ({ x: s[0], y: s[1], tower: null, dist: 0 }));
    this.slots.forEach(s => { s.dist = this.path.nearestDist(s.x, s.y); });

    this.hearts = cfg.mode === 'top' ? GTD.BATTLE.topLives : GTD.BATTLE.lives;
    this.maxHearts = GTD.BATTLE.maxHearts;
    this.mine = cfg.mode === 'top' ? GTD.BATTLE.topMineral : GTD.BATTLE.mineral;
    this.lastWave = cfg.mode === 'top' ? GTD.BATTLE.topWaves : GTD.BATTLE.waves;
    this.speed = Math.max(1, Math.min(3, this.save.settings.speed || 1));
    this.state = 'playing';
    this.time = 0;
    this.acc = 0; this.lastT = 0;
    this.phase = 'countdown'; this.countdown = GTD.BATTLE.initialTimer;
    this.wave = 0; this.waveT = 0; this.spawnQueue = [];
    this.monsters = []; this.towers = []; this.heroes = []; this.units = []; this.projectiles = []; this.spirits = [];
    this.bolts = []; this.boss = null;
    this.abilityCd = {};
    this.selTowerKey = null; this.selSlot = -1; this.selHero = -1;
    this.castMode = null; // 'meteor' | 'bomb'
    this.freezeUntil = -1;
    this.kills = 0; this.bossKills = 0;
    this.shake = 0;
    this.grid = new GTD.Grid(GTD.BATTLE.gridCell);
    this.particles = new GTD.ParticlePool(this.save.settings.quality === 'low' ? 260 : 520);
    this.floats = new GTD.FloatPool(120);
    this.weather = [];
    this.hover = null;
    this.result = null;
    this.tut = (cfg.mode === 'stage' && cfg.stage === 1 && !this.save.tutorialCompleted) ? { step: 1 } : null;
    this._hudCache = {};
    this._destroyed = false;
    this._q = [];
    this._heroXpAll = [];

    this.frozenInTeam = this.save.team.includes('frozenHeart');
    this.tripleHero = (function (team) {
      const have = { scissors: false, rock: false, paper: false };
      team.forEach(k => { const h = GTD.HERO_BY_KEY[k]; if (h) have[h.attr] = true; });
      return have.scissors && have.rock && have.paper;
    })(this.save.team);
    this.iceArrowBoost = this.save.team.includes('robinAwk');

    this.initHeroes();
    this.initWeather();
    this.buildDOM();
    this.buildGround();
    this.bindInput();
    GTD.Audio.setTheme(this.regionIndex, false);
    if (this.tripleHero) this.toast(GTD.t('all3_toast'));
    this.raf = requestAnimationFrame(this.frame.bind(this));
  }

  /* ---------- init ---------- */
  initHeroes() {
    const FRACTIONS = [0.10, 0.30, 0.50, 0.70, 0.90];
    this.save.team.forEach((key, i) => {
      const def = GTD.HERO_BY_KEY[key];
      if (!def) return;
      const hs = this.save.heroes[key];
      const lvl = Math.max(1, Math.min(60, hs.level || 1));
      const f = FRACTIONS[i % 5];
      const p = this.path.posAt(f * this.path.total);
      const n1 = { x: p.x + Math.cos(p.ang + Math.PI / 2) * 70, y: p.y + Math.sin(p.ang + Math.PI / 2) * 70 };
      const n2 = { x: p.x - Math.cos(p.ang + Math.PI / 2) * 70, y: p.y - Math.sin(p.ang + Math.PI / 2) * 70 };
      let pos = n1;
      if (n1.x < 20 || n1.x > this.W - 20 || n1.y < 20 || n1.y > this.H - 20) pos = n2;
      if (pos.x < 20 || pos.x > this.W - 20 || pos.y < 20 || pos.y > this.H - 20) pos = p;
      this.heroes.push({
        def, key, level: lvl, xp: hs.xp || 0,
        atk: GTD.heroAtk(def, lvl), hp: GTD.heroHp(def, lvl), maxHp: GTD.heroHp(def, lvl),
        x: pos.x, y: pos.y, baseX: pos.x, baseY: pos.y,
        cd: 0, target: null, state: 'idle', dead: false, respawnAt: 0,
        hitCount: 0, commandX: null, commandY: null, compCd: 0
      });
    });
  }

  initWeather() {
    const n = this.save.settings.quality === 'low' ? 26 : 55;
    const kind = this.region.weather;
    for (let i = 0; i < n; i++) {
      this.weather.push(this.newWeather(true));
    }
  }
  newWeather(anywhere) {
    const kind = this.region.weather;
    const w = { kind, x: Math.random() * this.W, y: anywhere ? Math.random() * this.H : -10, s: Math.random() };
    const P = {
      leaf: function (w) { w.vy = 14 + w.s * 12; w.vx = 10 + w.s * 10; w.r = 3 + w.s * 3; w.c = hsl(80 + w.s * 40, 60, 50); },
      bubble: function (w) { w.vy = -20 - w.s * 15; w.vx = (w.s - 0.5) * 12; w.r = 2 + w.s * 3; w.c = 'rgba(180,220,255,.5)'; },
      sand: function (w) { w.vy = 8 + w.s * 8; w.vx = 40 + w.s * 30; w.r = 1 + w.s * 1.6; w.c = 'rgba(220,190,130,.6)'; },
      snow: function (w) { w.vy = 22 + w.s * 18; w.vx = (w.s - 0.5) * 20; w.r = 1.5 + w.s * 2.5; w.c = 'rgba(255,255,255,.8)'; },
      ember: function (w) { w.vy = -25 - w.s * 20; w.vx = (w.s - 0.5) * 15; w.r = 1.5 + w.s * 2; w.c = 'rgba(255,' + (120 + w.s * 80) + ',40,.7)'; },
      soul: function (w) { w.vy = -12 - w.s * 10; w.vx = (w.s - 0.5) * 8; w.r = 2 + w.s * 2.5; w.c = 'rgba(160,140,255,.5)'; },
      holy: function (w) { w.vy = -10 - w.s * 8; w.vx = (w.s - 0.5) * 6; w.r = 1.5 + w.s * 2; w.c = 'rgba(255,240,180,.6)'; },
      cloud: function (w) { w.vy = 6; w.vx = 12 + w.s * 10; w.r = 5 + w.s * 6; w.c = 'rgba(255,255,255,.35)'; },
      gold: function (w) { w.vy = 20 + w.s * 16; w.vx = (w.s - 0.5) * 14; w.r = 1.5 + w.s * 2; w.c = 'rgba(255,200,60,.85)'; }
    };
    (P[kind] || P.snow)(w);
    if (!anywhere) w.y = -10;
    return w;
  }

  /* ---------- DOM ---------- */
  buildDOM() {
    const U = GTD.U;
    const B = this;
    this.root.innerHTML = '';
    const wrap = U.el('div', 'battle-wrap');
    const stage = U.el('div', 'bstage');
    const cv = document.createElement('canvas');
    cv.id = 'bcv'; cv.width = this.W; cv.height = this.H;
    stage.appendChild(cv);
    this.canvas = cv; this.ctx = cv.getContext('2d');

    const hud = U.el('div', 'b-hud');
    hud.innerHTML =
      '<div class="b-hud-left">' +
      '<div class="b-hearts" id="bHearts"></div>' +
      '<div class="b-mine" id="bMine">◆ 0</div>' +
      '<div class="b-wave" id="bWave">0/20</div>' +
      '</div>' +
      '<div class="b-hud-right">' +
      '<button class="b-btn spd" id="bSpeed">1x</button>' +
      '<button class="b-btn psv" id="bPause">II</button>' +
      '</div>';
    stage.appendChild(hud);
    this.elHearts = stage.querySelector('#bHearts');
    this.elMine = stage.querySelector('#bMine');
    this.elWave = stage.querySelector('#bWave');
    this.elSpeed = stage.querySelector('#bSpeed');
    this.elPause = stage.querySelector('#bPause');

    const bb = U.el('div', 'b-bossbar hidden');
    bb.innerHTML = '<div class="bb-name"></div><div class="bb-track"><div class="bb-fill"></div></div>';
    stage.appendChild(bb);
    this.elBossBar = bb;
    this.elBossName = bb.querySelector('.bb-name');
    this.elBossFill = bb.querySelector('.bb-fill');

    const hh = U.el('div', 'b-heroes');
    this.heroCards = [];
    this.heroes.forEach(function (h, i) {
      const c = U.el('div', 'hcard rar' + h.def.r);
      c.innerHTML = '<div class="hc-name"></div><div class="hc-bar"><div class="hc-fill"></div></div><div class="hc-dead"></div>';
      c.addEventListener('click', function () { B._selectHero(i); });
      hh.appendChild(c);
      this.heroCards.push({ name: c.querySelector('.hc-name'), fill: c.querySelector('.hc-fill'), dead: c.querySelector('.hc-dead'), root: c });
    }.bind(this));
    stage.appendChild(hh);
    this.heroNameCache = {};

    const bottom = U.el('div', 'b-bottom');
    const ab = U.el('div', 'b-abilities');
    this.abilityBtns = {};
    GTD.ABILITIES.forEach(function (a, i) {
      const b = U.el('button', 'abtn ab' + i);
      b.innerHTML = '<span class="ab-key">' + ((i + 1) % 10) + '</span><span class="ab-ico">' + this.abIcon(a.key) + '</span><span class="ab-lab">' + GTD.t('ab_' + a.key) + '</span><span class="ab-cd"></span><span class="ab-cost"></span>';
      b.title = GTD.t('ab_' + a.key + '_d');
      b.addEventListener('click', function (e) { e.stopPropagation(); B._clickAbility(a); });
      ab.appendChild(b);
      const cb = b.querySelector('.ab-cd');
      const cc = b.querySelector('.ab-cost');
      const costTxt = a.cost ? (a.cost.gold ? GTD.U.fmt(a.cost.gold) + '🪙' : GTD.U.fmt(a.cost.ruby) + '🔴') : '';
      if (costTxt) cc.textContent = costTxt;
      this.abilityBtns[a.key] = { btn: b, cdEl: cb };
    }.bind(this));
    bottom.appendChild(ab);

    const strip = U.el('div', 'b-strip');
    this.stripBtns = {};
    GTD.TOWERS.forEach(function (t) {
      const owned = this.save.towers[t.key].owned;
      const b = U.el('button', 'tstrip rar' + this.save.towers[t.key].tier + (owned ? '' : ' locked'));
      b.innerHTML = '<canvas width="44" height="44"></canvas><span class="ts-name">' + GTD.towerName(t) + '</span><span class="ts-cost">100</span>';
      b.title = GTD.t('td_' + t.key);
      if (owned) b.addEventListener('click', function (e) { e.stopPropagation(); B._selectTower(t.key); });
      strip.appendChild(b);
      this.stripBtns[t.key] = b;
      GTD.drawTowerIcon(b.querySelector('canvas').getContext('2d'), 22, 22, t.key, this.save.towers[t.key].tier);
    }.bind(this));
    bottom.appendChild(strip);
    stage.appendChild(bottom);

    const panel = U.el('div', 'b-panel hidden');
    panel.innerHTML =
      '<div class="bp-head"><span class="bp-name"></span><button class="bp-x">✕</button></div>' +
      '<div class="bp-row bp-rar"></div>' +
      '<div class="bp-grid">' +
      '<span>' + GTD.t('attr') + '</span><span class="bp-attr"></span>' +
      '<span>' + GTD.t('tower_level') + '</span><span class="bp-lvl"></span>' +
      '<span>' + GTD.t('atk') + '</span><span class="bp-atk"></span>' +
      '<span>' + GTD.t('range') + '</span><span class="bp-range"></span>' +
      '</div>' +
      '<div class="bp-actions">' +
      '<button class="btn gold bp-up"></button>' +
      '<button class="btn red bp-sell"></button>' +
      '</div>';
    stage.appendChild(panel);
    this.panel = panel;
    this.panel.querySelector('.bp-x').addEventListener('click', function () { B._closePanel(); });
    this.panel.querySelector('.bp-up').addEventListener('click', function () { B._panelUpgrade(); });
    this.panel.querySelector('.bp-sell').addEventListener('click', function () { B._panelSell(); });

    const toastEl = U.el('div', 'b-toast');
    stage.appendChild(toastEl);
    this.toastEl = toastEl;

    const tutEl = U.el('div', 'b-tut hidden');
    stage.appendChild(tutEl);
    this.tutEl = tutEl;

    const ov = U.el('div', 'b-overlay hidden');
    stage.appendChild(ov);
    this.overlay = ov;

    wrap.appendChild(stage);
    this.root.appendChild(wrap);
    this.stageEl = stage;

    this.elSpeed.addEventListener('click', function (e) { e.stopPropagation(); B._cycleSpeed(); });
    this.elPause.addEventListener('click', function (e) { e.stopPropagation(); B._togglePause(); });
  }

  abIcon(key) {
    const M = { volunteer: '🚩', meteor: '☄️', move: '👣', bomb: '💣', freeze: '❄️', nuke: '☢️', heart: '❤️', mineral: '⛏️', speed: '⚡', callwave: '🌊' };
    return M[key] || '•';
  }

  buildGround() {
    const oc = document.createElement('canvas');
    oc.width = this.W; oc.height = this.H;
    const g = oc.getContext('2d');
    g.fillStyle = this.region.grass[0];
    g.fillRect(0, 0, this.W, this.H);
    let seed = (this.regionIndex + 7) * 999;
    const rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    g.fillStyle = this.region.grass[1];
    for (let i = 0; i < 420; i++) {
      const x = rnd() * this.W, y = rnd() * this.H, r = 4 + rnd() * 16;
      g.globalAlpha = 0.25 + rnd() * 0.3;
      g.beginPath(); g.ellipse(x, y, r, r * 0.6, rnd() * 3, 0, 6.283); g.fill();
    }
    g.globalAlpha = 1;
    /* path */
    g.lineCap = 'round'; g.lineJoin = 'round';
    const wps = this.path.wps;
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 34;
    g.beginPath(); g.moveTo(wps[0][0], wps[0][1]);
    for (let i = 1; i < wps.length; i++) g.lineTo(wps[i][0], wps[i][1]);
    g.stroke();
    g.strokeStyle = this.region.path; g.lineWidth = 26;
    g.beginPath(); g.moveTo(wps[0][0], wps[0][1]);
    for (let i = 1; i < wps.length; i++) g.lineTo(wps[i][0], wps[i][1]);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(wps[0][0], wps[0][1]);
    for (let i = 1; i < wps.length; i++) g.lineTo(wps[i][0], wps[i][1]);
    g.stroke();
    /* start portal */
    const p0 = wps[0];
    g.fillStyle = 'rgba(90,60,200,.9)';
    g.beginPath(); g.arc(p0[0], p0[1], 26, 0, 6.283); g.fill();
    g.strokeStyle = '#a24fd6'; g.lineWidth = 4; g.stroke();
    /* base / end */
    const pe = wps[wps.length - 1];
    g.fillStyle = '#f5c542';
    g.beginPath(); g.arc(pe[0] - 14, pe[1], 24, 0, 6.283); g.fill();
    g.fillStyle = '#b8860b';
    g.fillRect(pe[0] - 26, pe[1] - 14, 8, 28);
    g.fillRect(pe[0] - 18, pe[1] - 20, 8, 34);
    g.fillRect(pe[0] - 10, pe[1] - 14, 8, 28);
    this.groundCv = oc;
  }

  /* ---------- input ---------- */
  bindInput() {
    this.canvas.addEventListener('pointerdown', this.onPointer.bind(this));
    this.canvas.addEventListener('pointermove', this.onHover.bind(this));
    this.onKey = function (e) { this._onKey(e); }.bind(this);
    window.addEventListener('keydown', this.onKey);
  }
  destroy() {
    this._destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    GTD.Audio.setTheme(-1, false);
  }
  toXY(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * this.W / r.width, y: (e.clientY - r.top) * this.H / r.height };
  }
  onHover(e) {
    const p = this.toXY(e);
    this.hover = p;
  }
  onPointer(e) {
    if (this.state !== 'playing') return;
    const p = this.toXY(e);
    if (this.castMode === 'meteor') { this._castMeteor(p); return; }
    if (this.castMode === 'bomb') { this._castBomb(p); return; }
    /* tower on slot? */
    let slotHit = -1;
    for (let i = 0; i < this.slots.length; i++) {
      if (GTD.U.dist2(p.x, p.y, this.slots[i].x, this.slots[i].y) < 30 * 30) { slotHit = i; break; }
    }
    if (slotHit >= 0) {
      const s = this.slots[slotHit];
      if (s.tower) { this._openPanel(slotHit); this.selTowerKey = null; this.castMode = null; return; }
      if (this.selTowerKey) { this._buildAt(slotHit); return; }
      this._closePanel();
      return;
    }
    /* hero click? */
    for (let i = 0; i < this.heroes.length; i++) {
      const h = this.heroes[i];
      if (!h.dead && GTD.U.dist2(p.x, p.y, h.x, h.y) < 26 * 26) {
        this._selectHero(i);
        return;
      }
    }
    /* empty field */
    if (this.selHero >= 0) {
      const h = this.heroes[this.selHero];
      if (h && !h.dead) {
        h.commandX = p.x; h.commandY = p.y;
        h.state = 'move';
        this.selHero = -1;
        GTD.Audio.sfx('click');
        return;
      }
    }
    this.selTowerKey = null;
    this._closePanel();
  }
  _onKey(e) {
    if (this._destroyed) return;
    if (e.key >= '1' && e.key <= '9') { this._clickAbility(GTD.ABILITIES[+e.key - 1]); }
    else if (e.key === '0') { this._clickAbility(GTD.ABILITIES[9]); }
    else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (e.key === 'Escape' && (this.castMode || this.selTowerKey || this.selHero >= 0)) {
        this.castMode = null; this.selTowerKey = null; this.selHero = -1;
      } else this._togglePause();
    }
  }

  _selectTower(key) {
    if (this.save.towers[key] && !this.save.towers[key].owned) return;
    this.selTowerKey = (this.selTowerKey === key) ? null : key;
    this.selHero = -1; this.castMode = null; this._closePanel();
    GTD.Audio.sfx('click');
    if (this.tut && this.tut.step === 1 && this.selTowerKey) { this.tut.step = 2; this._tutRender(); }
  }
  _selectHero(i) {
    if (this.heroes[i].dead) return;
    this.selHero = (this.selHero === i) ? -1 : i;
    this.selTowerKey = null; this.castMode = null; this._closePanel();
    GTD.Audio.sfx('click');
  }

  _buildAt(i) {
    const s = this.slots[i];
    if (s.tower) return;
    if (this.mine < GTD.BUILD_COST) { this.toast(GTD.t('no_mineral')); GTD.Audio.sfx('pop'); return; }
    const def = GTD.TOWER_BY_KEY[this.selTowerKey];
    if (!def) return;
    this.mine -= GTD.BUILD_COST;
    const tier = this.save.towers[def.key].tier;
    const tower = {
      def, key: def.key, slot: i, level: 1, tier,
      x: s.x, y: s.y, cd: 0,
      atk: this._towerAtk(def, tier, 1),
      units: [], unitCd: 0
    };
    s.tower = tower;
    this.towers.push(tower);
    this.save.stats.totalBuilds++;
    this.save.missions.daily.builds++;
    GTD.Save.storeSoon();
    GTD.Audio.sfx('build');
    this.burst(s.x, s.y, '#f5c542', 14, 90);
    if (this.tut && this.tut.step === 2) { this.tut.step = 3; this._tutRender(); }
  }

  _towerAtk(def, tier, level) {
    let a = GTD.towerAtk(def, tier, level, this.scale, GTD.tripleTowerBonus(this._ownedMap()));
    if (def.key === 'iceArrow' && this.iceArrowBoost) a *= 3;
    return a;
  }
  _ownedMap() {
    const m = {};
    GTD.TOWERS.forEach(t => { if (this.save.towers[t.key].owned) m[t.key] = true; });
    return m;
  }

  /* ---------- panel ---------- */
  _openPanel(i) {
    this.selSlot = i;
    const t = this.slots[i].tower;
    this.panel.classList.remove('hidden');
    this.panel.querySelector('.bp-name').textContent = GTD.towerName(t.def);
    const rar = this.panel.querySelector('.bp-rar');
    rar.textContent = GTD.t(GTD.RAR_NAMES[t.tier]);
    rar.style.color = GTD.RAR_COLORS[t.tier];
    this.panel.querySelector('.bp-attr').textContent = GTD.t(GTD.ATTRS[t.def.attr].i18n);
    this._panelRefresh();
  }
  _panelRefresh() {
    const t = this.selSlot >= 0 ? this.slots[this.selSlot].tower : null;
    if (!t) return;
    this.panel.querySelector('.bp-lvl').textContent = t.level + ' / 3';
    this.panel.querySelector('.bp-atk').textContent = GTD.U.fmt(t.atk);
    this.panel.querySelector('.bp-range').textContent = t.def.range;
    const up = this.panel.querySelector('.bp-up');
    const sell = this.panel.querySelector('.bp-sell');
    if (t.level >= GTD.TOWER_MAX_LEVEL) { up.textContent = GTD.t('max'); up.disabled = true; }
    else {
      const c = GTD.TOWER_UP_COST[t.level];
      up.textContent = GTD.t('upgrade_tower') + ' (' + c + '◆)';
      up.disabled = this.mine < c;
    }
    sell.textContent = GTD.t('sell_tower') + ' (+' + GTD.TOWER_SELL[t.level - 1] + '◆)';
    sell.disabled = false;
  }
  _closePanel() { this.panel.classList.add('hidden'); this.selSlot = -1; }
  _panelUpgrade() {
    const t = this.slots[this.selSlot].tower;
    if (!t || t.level >= GTD.TOWER_MAX_LEVEL) return;
    const c = GTD.TOWER_UP_COST[t.level];
    if (this.mine < c) { this.toast(GTD.t('no_mineral')); return; }
    this.mine -= c;
    t.level++;
    t.atk = this._towerAtk(t.def, t.tier, t.level);
    GTD.Audio.sfx('levelup');
    this.burst(t.x, t.y, '#f5c542', 18, 110);
    this.float(t.x, t.y - 20, 'LV ' + t.level, '#f5c542', 15);
    this._panelRefresh();
  }
  _panelSell() {
    const t = this.slots[this.selSlot].tower;
    if (!t) return;
    this.mine += GTD.TOWER_SELL[t.level - 1];
    this.slots[t.slot].tower = null;
    this.towers.splice(this.towers.indexOf(t), 1);
    t.units.forEach(u => { this.units.splice(this.units.indexOf(u), 1); });
    GTD.Audio.sfx('coin');
    this.float(t.x, t.y, '+' + GTD.TOWER_SELL[t.level - 1] + '◆', '#8fe08f', 14);
    this._closePanel();
  }

  /* ---------- abilities ---------- */
  _clickAbility(a) {
    if (this.state !== 'playing') return;
    const key = a.key;
    const cdNow = this.abilityCd[key] || 0;
    if (this.time < cdNow) { GTD.Audio.sfx('pop'); return; }
    switch (key) {
      case 'volunteer': {
        if (a.cost && !this._payCost(a.cost)) return;
        this._spawnVolunteer();
        this.abilityCd[key] = this.time + a.cd / 1000;
        GTD.Audio.sfx('deploy');
        break;
      }
      case 'meteor': {
        this.castMode = (this.castMode === 'meteor') ? null : 'meteor';
        this.selTowerKey = null; this.selHero = -1; this._closePanel();
        if (this.castMode) this.toast(GTD.t('select_point'));
        break;
      }
      case 'move': {
        this.abilityCd[key] = this.time + a.cd / 1000;
        let chosen = -1;
        /* cycle through living heroes in team order */
        for (let n = 0; n < this.heroes.length; n++) {
          const i = (this.selHero + 1 + n) % this.heroes.length;
          if (!this.heroes[i].dead) { chosen = i; break; }
        }
        if (chosen >= 0) { this.selHero = chosen; this.selTowerKey = null; this.castMode = null; this._closePanel(); this.toast(GTD.t('select_hero')); GTD.Audio.sfx('click'); }
        break;
      }
      case 'bomb': {
        if (a.cost && !this._payCost(a.cost)) return;
        this.castMode = (this.castMode === 'bomb') ? null : 'bomb';
        if (this.castMode) { this.selTowerKey = null; this.selHero = -1; this._closePanel(); this.toast(GTD.t('select_point')); }
        this._bombArmed = this.castMode === 'bomb';
        break;
      }
      case 'freeze': {
        if (a.cost && !this._payCost(a.cost)) return;
        const dur = this.frozenInTeam ? 15 : 10;
        this.freezeUntil = this.time + dur;
        this.abilityCd[key] = this.time + a.cd / 1000;
        GTD.Audio.sfx('iceArrow');
        this._freezeFx();
        break;
      }
      case 'nuke': {
        if (a.cost && !this._payCost(a.cost)) return;
        this.abilityCd[key] = this.time + a.cd / 1000;
        const dmg = 200000 * this.scale;
        this.monsters.slice().forEach(m => { this.damageMonster(m, dmg, 'paper', { noAttr: true, src: 'nuke' }); });
        this.shake = 14;
        GTD.Audio.sfx('boom');
        this.burst(this.W / 2, this.H / 2, '#ff8040', 60, 300);
        break;
      }
      case 'heart': {
        if (a.cost && !this._payCost(a.cost)) return;
        this.abilityCd[key] = this.time + a.cd / 1000;
        this.hearts = Math.min(this.hearts + 5, Math.max(GTD.BATTLE.maxHearts, this.hearts));
        GTD.Audio.sfx('heal');
        this.float(this.W / 2, 120, '+5 ❤', '#ff6a6a', 22);
        break;
      }
      case 'mineral': {
        if (a.cost && !this._payCost(a.cost)) return;
        this.abilityCd[key] = this.time + a.cd / 1000;
        this.mine += 250;
        GTD.Audio.sfx('coin');
        this.float(this.W / 2, 120, '+250 ◆', '#8fe08f', 20);
        break;
      }
      case 'speed': {
        this._cycleSpeed();
        break;
      }
      case 'callwave': {
        if (this.phase !== 'countdown') { this.toast(GTD.t('wave_incoming')); return; }
        const gold = Math.floor(100 * (this.countdown / GTD.BATTLE.initialTimer));
        const mine = 15 + this.wave * 3;
        this.save.currencies.gold += gold;
        this.mine += mine;
        GTD.Save.storeSoon();
        this.toast(GTD.t('call_wave_bonus', { g: gold, m: mine }));
        GTD.Audio.sfx('chime');
        this.countdown = 0;
        break;
      }
    }
  }
  _payCost(cost) {
    if (!GTD.canPay(cost)) { this.toast(GTD.t('not_enough')); GTD.Audio.sfx('pop'); return false; }
    GTD.pay(cost);
    return true;
  }
  _cycleSpeed() {
    this.speed = this.speed >= 3 ? 1 : this.speed + 1;
    this.save.settings.speed = this.speed;
    GTD.Save.storeSoon();
    GTD.Audio.sfx('click');
  }

  _spawnVolunteer() {
    const lvl = this.save.upgrades.volunteer;
    const atk = GTD.volunteerAtk(lvl) * this.scale;
    const hp = GTD.volunteerHp(lvl) * this.scale;
    const p = this.path.posAt(this.path.total - 130);
    this.units.push({
      type: 'volunteer', x: p.x, y: p.y, dist: this.path.total - 130,
      hp, maxHp: hp, atk, cd: 0, range: 90, block: true, life: 40,
      attr: 'paper', towerRef: null, target: null
    });
    this.burst(p.x, p.y, '#5ecb5e', 12, 80);
  }

  _castMeteor(p) {
    this.castMode = null;
    this.abilityCd.meteor = this.time + 20;
    const dmg = GTD.meteorDamage(this.save.upgrades.meteor) * this.scale;
    this._meteorFx(p.x, p.y);
    this.monsters.slice().forEach(m => {
      const yy = m.air ? m.y - 14 : m.y;
      if (GTD.U.dist(p.x, p.y, m.x, yy) <= 80 + m.radius) this.damageMonster(m, dmg, 'rock', { noAttr: true, src: 'meteor' });
    });
    this.save.stats.totalMeteors++;
    this.save.missions.daily.meteors++;
    GTD.Save.storeSoon();
    this.shake = 12;
    GTD.Audio.sfx('boom');
  }
  _castBomb(p) {
    this.castMode = null;
    this.abilityCd.bomb = this.time + 5;
    const dmg = 9900 * this.scale;
    this.monsters.slice().forEach(m => {
      const yy = m.air ? m.y - 14 : m.y;
      if (GTD.U.dist(p.x, p.y, m.x, yy) <= 120 + m.radius) this.damageMonster(m, dmg, null, { noAttr: true, src: 'bomb' });
    });
    this.shake = 10;
    GTD.Audio.sfx('cannon');
    this.burst(p.x, p.y, '#ffb040', 30, 200);
  }
  _freezeFx() {
    this.monsters.forEach(m => {
      this.float(m.x, m.y - 14, '❄', '#9fd8ff', 13);
    });
    this.burst(this.W / 2, this.H / 2, '#bfe8ff', 40, 260);
  }
  _meteorFx(x, y) {
    this.burst(x, y, '#ff9040', 26, 220);
    this.ringFx(x, y, '#ff7030', 80);
  }

  /* ---------- waves ---------- */
  _hpMult() {
    return (1 + 0.05 * this.stageIdx) * this.topMult;
  }
  _waveMult(wave) {
    return this._hpMult() * (1 + 0.04 * wave);
  }
  _makeWave(wave) {
    const q = [];
    const push = function (t, def) { q.push({ t: t, def: def }); };
    if (wave >= this.lastWave) {
      /* BOSS WAVE: boss first, then (2+regionIndex) elites @2s, 3×pool[6] @1.2s */
      push(0, this.pool[9]);
      const nEl = 2 + this.regionIndex;
      for (let i = 0; i < nEl; i++) push(2 + i * 2, this.pool[8]);
      for (let i = 0; i < 3; i++) push(1.2 * (i + 1), this.pool[6]);
      return q;
    }
    const hi = Math.min(this.pool.length - 2, 2 + Math.floor(wave / 3));
    const A = this.pool[GTD.U.randInt(0, hi)];
    const B = this.pool[GTD.U.randInt(1, hi)];
    const nA = 3 + Math.floor(wave * 0.7);
    const nB = 2 + Math.floor(wave * 0.5);
    const gapA = wave < 4 ? 1.6 : 1.1;
    const gapB = 1.4;
    for (let i = 0; i < nA; i++) push(i * gapA, A);
    for (let i = 0; i < nB; i++) push(0.6 + i * gapB, B);
    if (wave % 5 === 0) push(1.0, this.pool[8]);
    return q;
  }
  _startWave(w) {
    this.wave = w;
    this.waveT = 0;
    this.spawnQueue = this._makeWave(w);
    this.phase = 'wave';
    if (w === this.lastWave) {
      this.elBossBar.classList.remove('hidden');
      this.toast(GTD.t('boss_wave'));
      GTD.Audio.sfx('roar');
    } else {
      this.elBossBar.classList.add('hidden');
    }
    if (this.tut && this.tut.step === 3) { this.tut.step = 4; this._tutRender(); }
  }
  _spawnMonster(def, behindBoss) {
    const wm = this._waveMult(this.wave);
    const hp = def.baseHp * wm;
    const m = {
      def, attr: def.attr, air: def.air, ranged: def.ranged, fast: def.fast,
      elite: def.elite, boss: def.boss,
      x: -40, y: 0, dist: 0,
      hp, maxHp: hp,
      atk: def.baseAtk * wm,
      radius: def.boss ? 24 : def.elite ? 15 : (def.air ? 10 : 11),
      hc: def.hc, regen: def.regen * wm,
      speed: GTD.monsterSpeed(def) * GTD.U.rand(0.9, 1.1),
      slowUntil: 0, frozen: false,
      poison: null, burn: null, bleed: null,
      attackCd: 0, target: null,
      summonT: 0, aoeT: 0, healT: 0, enraged: false,
      colorIdx: def.idx
    };
    if (behindBoss && this.boss) m.dist = Math.max(0, this.boss.dist - 14);
    const p = this.path.posAt(m.dist);
    m.x = p.x; m.y = p.y;
    this.monsters.push(m);
    if (m.boss) {
      this.boss = m;
      this.elBossName.textContent = GTD.monsterName(def);
      GTD.Audio.setTheme(this.regionIndex, true);
      GTD.Audio.sfx('roar');
      this.shake = 8;
    }
    if (this.tut && this.tut.step === 4) { /* keep waiting for kills */ }
    return m;
  }

  /* ---------- damage / status ---------- */
  _crit(level) {
    const chance = 0.05 + Math.min(0.25, level * 0.001);
    if (Math.random() < chance) return { crit: true };
    return { crit: false };
  }
  damageMonster(m, dmg, attr, opts) {
    opts = opts || {};
    if (m.hp <= 0 || this.ended) return;
    let mult = 1, strong = 0, weak = 0;
    if (!opts.noAttr && attr) {
      mult = GTD.attrMult(attr, m.attr);
      if (mult > 1) strong = 1; else if (mult < 1) weak = 1;
    }
    let final = dmg * mult;
    let crit = false;
    if (opts.level) {
      const c = this._crit(opts.level);
      if (c.crit) { crit = true; final *= 2; }
    }
    /* armor HC: flat reduction per hit; armor-pierce breaks it permanently */
    if (m.hc > 0) {
      const pierce = opts.pierceHC || 0;
      if (pierce > 0) {
        m.hc = Math.max(0, m.hc - Math.min(m.hc, pierce));
        if (m.hc === 0) this.float(m.x, m.y - m.radius - 12, 'BREAK!', '#e8ecf0', 13);
      }
      final = Math.max(1, final - m.hc);
    }
    m.hp -= final;
    const yy = m.air ? m.y - 14 : m.y;
    let col = strong ? '#5ecb5e' : weak ? '#e05555' : '#ffffff';
    if (crit) col = '#ffd75e';
    if (this.save.settings.showDamage !== false) {
      this.float(m.x + GTD.U.rand(-8, 8), yy - m.radius - 14, GTD.U.fmt(final), col, crit ? 17 : 13);
    }
    /* statuses */
    if (opts.slow) m.slowUntil = Math.max(m.slowUntil, this.time + opts.slow);
    if (opts.burn) m.burn = { left: 2, total: final * opts.burn, dps: final * opts.burn / 2 };
    if (opts.poison) m.poison = { left: 3, total: final * opts.poison, dps: final * opts.poison / 3 };
    if (opts.bleed) m.bleed = { left: 4, total: final * opts.bleed, dps: final * opts.bleed / 4, src: opts.bleedSrc || null };
    if (m.hp <= 0) this._kill(m, opts.src || null, opts.bleedSrc || null);
  }

  _kill(m, src, bleedSrc) {
    if (m.hp > 0) return;
    const i = this.monsters.indexOf(m);
    if (i >= 0) this.monsters.splice(i, 1);
    this.kills++;
    this.save.stats.totalKills++;
    this.save.missions.daily.kills++;
    this.save.missions.weekly.kills++;
    /* mineral bounty */
    let bounty = Math.ceil((6 + this.regionIndex * 4) * (m.boss ? 10 : m.elite ? 4 : 1));
    const kibong = this.save.team.includes('kibong');
    if (kibong) {
      const kl = this.save.heroes.kibong.level;
      if (kl >= 10) bounty *= 15; else if (kl >= 3) bounty *= 3;
    }
    this.mine += bounty;
    if (bleedSrc === 'kibong') {
      this.hearts = Math.min(this.hearts + 1, 50);
      this.float(m.x, m.y - 24, '+1 ❤', '#ff8a8a', 15);
      GTD.Audio.sfx('heal');
    }
    this.float(m.x, m.y - m.radius - 4, '+' + GTD.U.fmt(bounty) + '◆', '#8fe08f', 12);
    /* xp for all living heroes */
    let xp = (6 + this.regionIndex * 10) * (m.boss ? 20 : m.elite ? 5 : 1);
    if (m.boss) this._onBossKilled(m);
    this.heroes.forEach(h => {
      if (!h.dead) this._gainXp(h, xp);
    });
    this.burst(m.x, m.y - (m.air ? 14 : 0), m.boss ? '#ffd75e' : '#c05050', m.boss ? 34 : 10, m.boss ? 200 : 90);
    GTD.Audio.sfx(m.boss ? 'boom' : (m.air ? 'squeal' : 'pop'));
    if (this.tut && this.tut.step === 4 && this.kills >= 1) { this.tut.step = 5; this._tutRender(); }
    if (m.boss) {
      this.elBossBar.classList.add('hidden');
      GTD.Audio.setTheme(this.regionIndex, false);
    }
  }
  _onBossKilled(m) {
    this.bossKills++;
    this.save.stats.totalBossKills++;
    this.shake = 12;
    this.boss = null;
  }
  _gainXp(h, xp) {
    if (h.level >= 60) return;
    h.xp += xp;
    while (h.xp >= GTD.xpNeed(h.level) && h.level < 60) {
      h.xp -= GTD.xpNeed(h.level);
      h.level++;
      h.atk = GTD.heroAtk(h.def, h.level);
      h.maxHp = GTD.heroHp(h.def, h.level);
      h.hp = h.maxHp;
      this.float(h.x, h.y - 26, 'LV UP!', '#ffd75e', 15);
      GTD.Audio.sfx('levelup');
    }
    this.save.heroes[h.key].level = h.level;
    this.save.heroes[h.key].xp = h.xp;
    GTD.Save.storeSoon();
  }

  /* ---------- units ---------- */
  _spawnUnit(tower, type) {
    const s = this.slots[tower.slot];
    const scale = this.scale;
    let u;
    if (type === 'soldier') {
      const lvl = this.save.upgrades.soldier;
      u = {
        type, x: s.x, y: s.y, dist: s.dist,
        hp: (20 + lvl * 100) * scale * (1 + lvl * 0.2),
        atk: (2 + lvl * 4) * scale * (1 + lvl * 0.2),
        cd: 0, range: 110, block: true, attr: 'paper', towerRef: tower, target: null, life: 0
      };
    } else if (type === 'assassin') {
      u = { type, x: s.x, y: s.y, dist: s.dist, hp: 150 * scale, atk: tower.atk, cd: 0, range: tower.def.range, block: false, attr: tower.def.attr, towerRef: tower, target: null, life: 0 };
    } else if (type === 'wolf') {
      u = { type, x: s.x, y: s.y, dist: s.dist, hp: 200 * scale, atk: tower.atk, cd: 0, range: tower.def.range, block: false, attr: tower.def.attr, towerRef: tower, target: null, life: 0 };
    }
    u.maxHp = u.hp;
    this.units.push(u);
    this.burst(s.x, s.y, '#9aa0a6', 8, 70);
  }
  _spawnSpirit(x, y, big) {
    this.spirits.push({ x, y, hp: 50, maxHp: 50, atk: 250 * this.scale, cd: 0, life: 5, target: null });
    if (big) this.burst(x, y, '#b0e0ff', 14, 100);
  }
  _spiritDie(sp) {
    this.burst(sp.x, sp.y, '#bfe8ff', 24, 220);
    this.ringFx(sp.x, sp.y, '#9fd4ff', 130);
    this.shake = Math.max(this.shake, 6);
    GTD.Audio.sfx('howl');
    this.monsters.slice().forEach(m => {
      if (!m.air && GTD.U.dist(sp.x, sp.y, m.x, m.y) <= 130) {
        this.damageMonster(m, 400 * this.scale, 'scissors', { noAttr: true, src: 'spirit' });
      }
    });
  }

  /* ---------- pause ---------- */
  _togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this._showPauseMenu();
      GTD.Audio.sfx('click');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.lastT = performance.now();
      this.overlay.classList.add('hidden');
      GTD.Audio.sfx('click');
    }
  }
  _showPauseMenu() {
    const s = this.save.settings;
    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML =
      '<div class="ov-card">' +
      '<div class="ov-title">' + GTD.t('paused') + '</div>' +
      '<button class="btn gold big" id="pResume">' + GTD.t('resume') + '</button>' +
      '<button class="btn" id="pRestart">' + GTD.t('restart') + '</button>' +
      '<button class="btn" id="pQuit">' + GTD.t('quit') + '</button>' +
      '<button class="btn" id="pBgm">' + (s.bgm ? GTD.t('bgm_on') : GTD.t('bgm_off')) + '</button>' +
      '<button class="btn" id="pSfx">' + (s.sfx ? GTD.t('sfx_on') : GTD.t('sfx_off')) + '</button>' +
      '</div>';
    this.overlay.querySelector('#pResume').addEventListener('click', () => this._togglePause());
    this.overlay.querySelector('#pRestart').addEventListener('click', () => { if (this.cfg.onRetry) this.cfg.onRetry(); });
    this.overlay.querySelector('#pQuit').addEventListener('click', () => { if (this.cfg.onQuit) this.cfg.onQuit(); });
    this.overlay.querySelector('#pBgm').addEventListener('click', function () {
      s.bgm = !s.bgm; GTD.Audio.setBgmOn(s.bgm); GTD.Save.storeSoon();
      this.querySelector('#pBgm').textContent = s.bgm ? GTD.t('bgm_on') : GTD.t('bgm_off');
    }.bind(this.overlay));
    this.overlay.querySelector('#pSfx').addEventListener('click', function () {
      s.sfx = !s.sfx; GTD.Audio.setSfxOn(s.sfx); GTD.Save.storeSoon();
      this.querySelector('#pSfx').textContent = s.sfx ? GTD.t('sfx_on') : GTD.t('sfx_off');
    }.bind(this.overlay));
  }

  /* ---------- end states ---------- */
  _victory() {
    if (this.ended) return;
    this.ended = true;
    this.state = 'victory';
    GTD.Audio.sfx('win');
    GTD.Audio.setTheme(this.regionIndex, false);
    this._showResult(true);
  }
  _defeat() {
    if (this.ended) return;
    this.ended = true;
    this.state = 'defeat';
    GTD.Audio.sfx('lose');
    this._showResult(false);
  }
  _showResult(win) {
    const s = this.save;
    const cfg = this.cfg;
    let html = '<div class="ov-card">';
    html += '<div class="ov-title ' + (win ? 'win' : 'lose') + '">' + (win ? GTD.t('victory') : GTD.t('defeat')) + '</div>';
    const rows = [];
    if (win && (cfg.mode === 'stage')) {
      const stage = cfg.stage;
      const rIdx = GTD.regionOfStage(stage);
      const sIdx = GTD.stageIndexInRegion(stage);
      const first = !s.stars[stage - 1];
      const stars = GTD.starFor(this.hearts);
      s.stars[stage - 1] = Math.max(s.stars[stage - 1] || 0, stars);
      const gold = GTD.victoryGold(rIdx, sIdx, first);
      const dia = first ? GTD.REGIONS[rIdx].diamond : 0;
      s.currencies.gold += gold;
      s.currencies.diamond += dia;
      s.stats.stagesCleared++;
      s.missions.daily.clears++;
      s.missions.weekly.clears++;
      if (stage === s.maxStage) {
        s.maxStage = Math.min(200, stage + 1);
        s.currentStage = s.maxStage;
        if (s.maxStage <= 200 && stage < 200) rows.push('<div class="ov-row">' + GTD.t('unlocked_next', { s: stage + 1 }) + '</div>');
        else rows.push('<div class="ov-row">' + GTD.t('max_reached') + '</div>');
      }
      html += '<div class="ov-stars">' + '★'.repeat(stars) + '<span class="dim">' + '★'.repeat(3 - stars) + '</span></div>';
      html += '<div class="ov-sub">' + GTD.t('stars_earned') + ' ★' + stars + ' • ' + (first ? GTD.t('first_clear_bonus') : GTD.t('replay_bonus')) + '</div>';
      rows.push('<div class="ov-row">🪙 +' + GTD.U.fmtFull(gold) + '</div>');
      if (dia) rows.push('<div class="ov-row">💎 +' + dia + '</div>');
    } else if (win && cfg.mode === 'top') {
      const f = cfg.floor;
      if (!s.towerOfProof.cleared[f - 1]) {
        s.towerOfProof.cleared[f - 1] = true;
        const rewards = GTD.TOP.rewards[f - 1];
        if (rewards) {
          rewards.forEach(r => {
            if (r.cur === 'cards') {
              const owned = GTD.TOWERS.filter(t => s.towers[t.key].owned);
              const pool = owned.length ? owned : GTD.TOWERS;
              const t = GTD.U.choice(pool);
              s.towers[t.key].cards += r.n;
              rows.push('<div class="ov-row">+' + r.n + ' ' + GTD.towerName(t) + ' ' + GTD.t('tower_rarity') + '</div>');
            } else {
              s.currencies[r.cur] = (s.currencies[r.cur] || 0) + r.n;
              rows.push('<div class="ov-row">' + GTD.t(GTD.CUR_META[r.cur].i18n) + ' +' + GTD.U.fmtFull(r.n) + '</div>');
            }
          });
        }
        s.towerOfProof.floor = Math.max(s.towerOfProof.floor, Math.min(15, f));
      }
      if (s.towerOfProof.floor >= 15 && s.towerOfProof.cleared.every(c => c)) {
        rows.push('<div class="ov-row topconq">' + GTD.t('top_conquered') + '</div>');
      } else {
        rows.push('<div class="ov-row">' + GTD.t('floor_clear', { f: f }) + '</div>');
      }
    } else if (win && cfg.mode === 'daily') {
      const d = GTD.DC.difficulties[cfg.diff];
      s.currencies.diamond += d.reward;
      s.dailyChallenge.clears[d.key]++;
      const t = GTD.U.choice(GTD.TOWERS);
      const tr = s.towers[t.key];
      if (!tr.owned) {
        tr.owned = true;
        tr.tier = Math.max(tr.tier, d.tier);
        rows.push('<div class="ov-row">💎 +' + d.reward + '</div>');
        rows.push('<div class="ov-row">' + GTD.t('dc_unlocked', { n: GTD.towerName(t) }) + '</div>');
      } else {
        tr.cards += 5;
        rows.push('<div class="ov-row">💎 +' + d.reward + '</div>');
        rows.push('<div class="ov-row">' + GTD.t('dc_cards', { n: GTD.towerName(t) }) + '</div>');
      }
    }
    html += rows.join('');
    if (win) {
      if (cfg.mode === 'stage' && cfg.stage < 200 && cfg.stage + 1 <= s.maxStage) {
        html += '<button class="btn gold big" id="rNext">' + GTD.t('next_stage') + '</button>';
      }
      html += '<button class="btn" id="rRestart">' + (cfg.mode === 'stage' ? GTD.t('restart') : GTD.t('retry')) + '</button>';
    } else {
      if (cfg.mode !== 'stage') {
        const cost = cfg.mode === 'top' ? GTD.TOP.entry : 0;
        if (cfg.mode === 'top') html += '<div class="ov-sub">' + GTD.t('top_reentry') + '</div>';
        html += '<button class="btn gold big" id="rRetry">' + GTD.t('retry') + (cfg.mode === 'top' ? ' (-50,000🪙)' : '') + '</button>';
      } else {
        html += '<button class="btn gold big" id="rRetry">' + GTD.t('retry') + '</button>';
      }
    }
    html += '<button class="btn" id="rQuit">' + GTD.t('quit') + '</button>';
    html += '</div>';
    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = html;
    const next = this.overlay.querySelector('#rNext');
    if (next) next.addEventListener('click', function () { if (cfg.onNext) cfg.onNext(); });
    const rest = this.overlay.querySelector('#rRestart');
    if (rest) rest.addEventListener('click', function () { if (cfg.onRetry) cfg.onRetry(); });
    const retr = this.overlay.querySelector('#rRetry');
    if (retr) retr.addEventListener('click', function () { if (cfg.onRetry) cfg.onRetry(); });
    const quit = this.overlay.querySelector('#rQuit');
    if (quit) quit.addEventListener('click', function () { if (cfg.onQuit) cfg.onQuit(); });
    GTD.Save.storeSoon();
  }

  /* ---------- tutorial ---------- */
  _tutRender() {
    if (!this.tut) { this.tutEl.classList.add('hidden'); return; }
    this.tutEl.classList.remove('hidden');
    this.tutEl.textContent = GTD.t('tut' + this.tut.step);
    if (this.tut.step === 5) {
      setTimeout(function () {
        if (this._destroyed || !this.tut) return;
        this.save.currencies.gold += 1000;
        this.save.tutorialCompleted = true;
        GTD.Save.storeSoon();
        this.toast(GTD.t('tut_done'));
        GTD.Audio.sfx('coin');
        this.tut = null;
        this.tutEl.classList.add('hidden');
      }.bind(this), 2500);
    }
  }

  /* ---------- fx helpers ---------- */
  burst(x, y, color, n, spd) {
    n = Math.min(n, 30);
    for (let i = 0; i < n; i++) {
      const p = this.particles.get();
      if (!p) return;
      const a = Math.random() * 6.283, v = spd * (0.4 + Math.random() * 0.8);
      p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v;
      p.life = 0.5 + Math.random() * 0.4; p.maxLife = p.life;
      p.size = 2 + Math.random() * 3; p.color = color; p.kind = 'spark';
    }
  }
  ringFx(x, y, color, r) {
    const p = this.particles.get();
    if (!p) return;
    p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.life = 0.5; p.maxLife = 0.5; p.size = r; p.color = color; p.kind = 'ring';
  }
  plumFx(x, y) {
    for (let i = 0; i < 16; i++) {
      const p = this.particles.get();
      if (!p) return;
      const a = Math.random() * 6.283, v = 40 + Math.random() * 90;
      p.x = x; p.y = y; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 30;
      p.life = 0.8 + Math.random() * 0.5; p.maxLife = p.life;
      p.size = 3 + Math.random() * 3; p.color = i % 2 ? '#ff9ec4' : '#ffd1e6'; p.kind = 'petal';
    }
  }
  float(x, y, text, color, size) {
    const f = this.floats.get();
    if (!f) return;
    f.x = x; f.y = y; f.vy = -34; f.life = 0.9; f.maxLife = 0.9;
    f.text = text; f.color = color; f.size = size || 13;
  }
  toast(msg) {
    const d = GTD.U.el('div', 'bt-line', msg);
    this.toastEl.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2600);
    while (this.toastEl.children.length > 3) this.toastEl.removeChild(this.toastEl.firstChild);
  }

  /* ============================================================
     SIMULATION (fixed step)
     ============================================================ */
  sim(dt) {
    this.time += dt;
    const frozen = this.time < this.freezeUntil;

    /* wave flow */
    if (this.phase === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) this._startWave(this.wave + 1);
    } else if (this.phase === 'wave') {
      this.waveT += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].t <= this.waveT) {
        const sp = this.spawnQueue.shift();
        this._spawnMonster(sp.def, false);
      }
      if (!this.spawnQueue.length && !this.monsters.length) {
        if (this.wave >= this.lastWave) { this._victory(); return; }
        this.phase = 'countdown';
        this.countdown = GTD.BATTLE.interWave;
      }
    }

    /* monsters */
    this.grid.clear();
    for (let i = 0; i < this.monsters.length; i++) this.grid.insert(this.monsters[i]);

    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.hp <= 0) continue;
      /* DoTs always tick (even frozen) */
      if (m.poison) {
        m.poison.left -= dt;
        m.hp -= m.poison.dps * dt;
        if (m.poison.left <= 0) m.poison = null;
        if (m.hp <= 0) { this._kill(m, null, null); continue; }
      }
      if (m.burn) {
        m.burn.left -= dt;
        m.hp -= m.burn.dps * dt;
        if (m.burn.left <= 0) m.burn = null;
        if (m.hp <= 0) { this._kill(m, null, null); continue; }
      }
      if (m.bleed) {
        m.bleed.left -= dt;
        m.hp -= m.bleed.dps * dt;
        const bsrc = m.bleed.src;
        if (m.bleed.left <= 0) m.bleed = null;
        if (m.hp <= 0) { this._kill(m, null, bsrc); continue; }
      }
      if (frozen) continue;
      /* regen */
      if (m.regen > 0 && m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.regen * dt);
      /* movement */
      let speed = m.speed * (m.slowUntil > this.time ? 0.5 : 1);
      if (m.enraged) speed *= 1.3;
      let blockedBy = null, attackT = null;
      if (!m.air) {
        /* block check: soldier ahead within 26px */
        for (let u = 0; u < this.units.length; u++) {
          const un = this.units[u];
          if (un.block && un.dist > m.dist && un.dist - m.dist < 26) { blockedBy = un; break; }
        }
      }
      if (blockedBy) {
        /* attack blocker */
        m.attackCd -= dt;
        if (m.attackCd <= 0) {
          m.attackCd = 1.0;
          blockedBy.hp -= m.atk;
          this.float(blockedBy.x, blockedBy.y - 16, GTD.U.fmt(m.atk), '#ff9a9a', 12);
          GTD.Audio.sfx('hurt');
          if (blockedBy.hp <= 0) this._unitDie(blockedBy);
        }
      } else {
        /* ranged: shoot heroes/soldiers */
        let acted = false;
        if (m.ranged) {
          const t = this._findHeroOrUnitIn(m, 150);
          if (t) {
            acted = true;
            m.attackCd -= dt;
            if (m.attackCd <= 0) {
              m.attackCd = 1.5;
              this.projectiles.push({
                x: m.x, y: m.y - (m.air ? 14 : 0), tx: t.x, ty: t.y, target: t, speed: 300,
                dmg: m.atk, attr: m.attr, kind: 'enemy', from: 'monster'
              });
              GTD.Audio.sfx('hiss');
            }
          }
        }
        if (!acted && !m.air) {
          const t = this._findHeroOrUnitIn(m, m.radius + 22);
          if (t) {
            m.attackCd -= dt;
            if (m.attackCd <= 0) {
              m.attackCd = 1.0;
              t.hp -= m.atk;
              this.float(t.x, t.y - 18, GTD.U.fmt(m.atk), '#ff9a9a', 12);
              GTD.Audio.sfx('hurt');
              if (t.hp <= 0) {
                if (t.def) this._heroDie(t); else this._unitDie(t);
              }
            }
          }
        }
        if (!acted && !m.air) m.dist += speed * dt;
        else if (!blockedBy && m.air) m.dist += speed * dt;
        else if (acted) { /* ranged stopped */ }
      }
      /* boss behaviors */
      if (m.boss) {
        m.summonT += dt;
        m.aoeT += dt;
        m.healT += dt;
        if (m.summonT >= 10) {
          m.summonT = 0;
          this._spawnMonster(this.pool[0], true);
          this._spawnMonster(this.pool[0], true);
          GTD.Audio.sfx('squeak');
        }
        if (m.aoeT >= 15) {
          m.aoeT = 0;
          this._bossAoE(m);
        }
        if (m.healT >= 30) {
          m.healT = 0;
          m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.05);
          this.float(m.x, m.y - 30, '+5%', '#7ee07e', 14);
          GTD.Audio.sfx('heal');
        }
        if (!m.enraged && m.hp < m.maxHp * 0.3) {
          m.enraged = true;
          m.atk *= 1.5;
          this.toast(GTD.t('boss_enraged'));
          GTD.Audio.sfx('roar');
          this.shake = 10;
          this.ringFx(m.x, m.y, '#ff4040', 90);
        }
      }
      /* leak */
      if (m.dist >= this.path.total) {
        const cost = m.boss ? GTD.BATTLE.leakBoss : GTD.BATTLE.leakNormal;
        this.hearts -= cost;
        this.shake = Math.max(this.shake, 8);
        GTD.Audio.sfx('hurt');
        this.float(this.W - 60, this.H - 60, '-' + cost + ' ❤', '#ff5050', 20);
        const idx = this.monsters.indexOf(m);
        if (idx >= 0) this.monsters.splice(idx, 1);
        if (m.boss) { this.boss = null; this.elBossBar.classList.add('hidden'); GTD.Audio.setTheme(this.regionIndex, false); }
        if (this.hearts <= 0) { this.hearts = 0; this._defeat(); return; }
      }
      /* position */
      const p = this.path.posAt(m.dist);
      m.x = p.x; m.y = p.y;
    }

    /* towers */
    for (let i = 0; i < this.towers.length; i++) {
      const t = this.towers[i];
      t.cd -= dt;
      /* spawner upkeep */
      if (t.def.mode === 'spawner') {
        t.unitCd -= dt;
        let want = t.def.units;
        if (t.key === 'barracks') want = GTD.barracksSoldiers(this.save.upgrades.barracks);
        let alive = 0;
        this.units.forEach(u => { if (u.towerRef === t) alive++; });
        if (alive < want && t.unitCd <= 0) {
          t.unitCd = GTD.BATTLE.soldierRespawn;
          this._spawnUnit(t, t.def.unit);
          GTD.Audio.sfx('deploy');
        }
      }
      if (t.cd > 0) continue;
      if (t.def.mode === 'heal') {
        let healed = false;
        this.heroes.forEach(h => {
          if (!h.dead && h.hp < h.maxHp && GTD.U.dist(t.x, t.y, h.x, h.y) <= t.def.range) {
            const amt = h.maxHp * t.def.heal;
            h.hp = Math.min(h.maxHp, h.hp + amt);
            this.float(h.x, h.y - 22, '+' + GTD.U.fmt(amt), '#7ee07e', 12);
            healed = true;
          }
        });
        this.units.forEach(u => {
          if (u.hp < u.maxHp && GTD.U.dist(t.x, t.y, u.x, u.y) <= t.def.range) {
            const amt = u.maxHp * t.def.heal;
            u.hp = Math.min(u.maxHp, u.hp + amt);
            healed = true;
          }
        });
        if (healed) {
          t.cd = t.def.rate / 1000;
          this.ringFx(t.x, t.y, '#9fe89f', t.def.range * 0.5);
          GTD.Audio.sfx('heal');
        }
        continue;
      }
      /* acquire: grid + exact range filter, furthest along path */
      let target = null;
      const q = this.grid.query(t.x, t.y, t.def.range, this._q);
      for (let i2 = 0; i2 < q.length; i2++) {
        const m = q[i2];
        if (m.hp <= 0) continue;
        if (t.def.airOnly && !m.air) continue;
        if (!t.def.airOnly && t.def.air === false && m.air) continue;
        if (GTD.U.dist(t.x, t.y, m.x, m.y) > t.def.range + m.radius) continue;
        if (!target || m.dist > target.dist) target = m;
      }
      if (!target) continue;
      t.cd = t.def.rate / 1000;
      const atk = t.atk;
      if (t.def.mode === 'spike') {
        GTD.Audio.sfx('spikes');
        for (let qj = 0; qj < q.length; qj++) {
          const m = q[qj];
          if (m.hp <= 0 || m.air) continue;
          if (GTD.U.dist(t.x, t.y, m.x, m.y) > t.def.range + m.radius) continue;
          this.damageMonster(m, atk, t.def.attr, { level: t.level });
          this.burst(m.x, m.y, '#cbb27a', 4, 60);
        }
      } else if (t.def.mode === 'chain') {
        this._chainFire(t, target);
      } else {
        /* projectile towers */
        if (t.def.multi) {
          let targets = [target];
          for (let i3 = 0; i3 < q.length && targets.length < t.def.multi; i3++) {
            const m = q[i3];
            if (targets.indexOf(m) >= 0) continue;
            if (t.def.air === false && m.air) continue;
            if (GTD.U.dist(t.x, t.y, m.x, m.y) > t.def.range + m.radius) continue;
            targets.push(m);
          }
          targets.forEach(m => this._shoot(t, m));
        } else {
          this._shoot(t, target);
        }
      }
    }

    /* heroes */
    for (let i = 0; i < this.heroes.length; i++) {
      const h = this.heroes[i];
      if (h.dead) {
        if (this.time >= h.respawnAt) {
          h.dead = false;
          h.hp = h.maxHp;
          h.x = h.baseX; h.y = h.baseY;
          h.commandX = null; h.commandY = null;
          this.burst(h.x, h.y, '#7ee07e', 14, 90);
          GTD.Audio.sfx('heal');
        }
        continue;
      }
      if (h.def.mode === 'heal') {
        h.cd -= dt;
        if (h.cd <= 0) {
          const healPct = GTD.heroHeal(h.def, h.level);
          /* damaged heroes first, then soldiers */
          let target = null;
          this.heroes.forEach(function (o) {
            if (o === h || o.dead) return;
            if (o.hp < o.maxHp && GTD.U.dist(h.x, h.y, o.x, o.y) <= h.def.range) target = o;
          });
          if (!target) {
            for (let u = 0; u < this.units.length; u++) {
              const un = this.units[u];
              if (un.hp < un.maxHp && GTD.U.dist(h.x, h.y, un.x, un.y) <= h.def.range) { target = un; break; }
            }
          }
          if (target) {
            h.cd = h.def.rate / 1000;
            const amt = target.maxHp * healPct;
            target.hp = Math.min(target.maxHp, target.hp + amt);
            this.float(target.x, target.y - 22, '+' + GTD.U.fmt(amt), '#7ee07e', 13);
            this.ringFx(h.x, h.y, '#9fe89f', 40);
            GTD.Audio.sfx('heal');
            this._gainXp(h, 2 + this.regionIndex * 2);
          }
        }
        continue;
      }
      h.cd -= dt;
      /* acquire target: nearest enemy in range (air filter) */
      let target = null, bd = Infinity;
      const qr = this.grid.query(h.x, h.y, h.def.range, this._q);
      for (let j = 0; j < qr.length; j++) {
        const m = qr[j];
        if (m.hp <= 0) continue;
        if (!h.def.air && m.air) continue;
        const d = GTD.U.dist(h.x, h.y, m.x, m.y);
        if (d <= h.def.range + m.radius && d < bd) { bd = d; target = m; }
      }
      const melee = h.def.range < 90;
      if (target) {
        if (GTD.U.dist(h.x, h.y, target.x, target.y) > h.def.range + target.radius) {
          if (melee) {
            /* approach */
            const a = Math.atan2(target.y - h.y, target.x - h.x);
            h.x += Math.cos(a) * 90 * dt;
            h.y += Math.sin(a) * 90 * dt;
            h.state = 'move';
          } else {
            h.state = 'idle';
          }
        } else {
          h.state = 'fight';
          if (h.cd <= 0) {
            h.cd = h.def.rate / 1000;
            this._heroAttack(h, target);
          }
          /* pet companion (cat / falcon) — independent cooldown */
          if (h.def.companion) {
            h.compCd = (h.compCd || 0) - dt;
            if (h.compCd <= 0) {
              h.compCd = h.def.companion === 'falcon' ? 1.2 : 2.0;
              this._companionAttack(h, target);
            }
          }
        }
      } else {
        if (h.commandX != null) {
          const d = GTD.U.dist(h.x, h.y, h.commandX, h.commandY);
          if (d < 6) { h.commandX = null; h.state = 'idle'; }
          else {
            const a = Math.atan2(h.commandY - h.y, h.commandX - h.x);
            h.x += Math.cos(a) * 90 * dt;
            h.y += Math.sin(a) * 90 * dt;
            h.state = 'move';
          }
        } else h.state = 'idle';
      }
    }

    /* units (soldiers / assassins / wolves / volunteers) */
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.hp <= 0) { this._unitDie(u); continue; }
      if (u.life > 0) {
        u.life -= dt;
        if (u.life <= 0) {
          this.units.splice(i, 1);
          this.burst(u.x, u.y, '#9aa0a6', 8, 60);
          continue;
        }
      }
      u.cd -= dt;
      let t = null, bd = Infinity;
      for (let j = 0; j < this.monsters.length; j++) {
        const m = this.monsters[j];
        if (m.hp <= 0 || m.air) continue;
        const d = GTD.U.dist(u.x, u.y, m.x, m.y);
        if (d < bd) { bd = d; t = m; }
      }
      if (t) {
        if (bd > u.range) {
          const a = Math.atan2(t.y - u.y, t.x - u.x);
          const nx = u.x + Math.cos(a) * 70 * dt, ny = u.y + Math.sin(a) * 70 * dt;
          u.x = nx; u.y = ny;
          u.dist = this.path.nearestDist(u.x, u.y);
        } else if (u.cd <= 0) {
          u.cd = 1.0;
          this.damageMonster(t, u.atk, u.attr, {});
          GTD.Audio.sfx('sword');
        }
      } else if (u.towerRef) {
        /* return to tower */
        const s = this.slots[u.towerRef.slot];
        if (GTD.U.dist(u.x, u.y, s.x, s.y) > 8) {
          const a = Math.atan2(s.y - u.y, s.x - u.x);
          u.x += Math.cos(a) * 60 * dt;
          u.y += Math.sin(a) * 60 * dt;
          u.dist = this.path.nearestDist(u.x, u.y);
        }
      }
    }

    /* wolf spirits */
    for (let i = this.spirits.length - 1; i >= 0; i--) {
      const sp = this.spirits[i];
      sp.life -= dt;
      sp.cd -= dt;
      let t = null, bd = Infinity;
      for (let j = 0; j < this.monsters.length; j++) {
        const m = this.monsters[j];
        if (m.hp <= 0 || m.air) continue;
        const d = GTD.U.dist(sp.x, sp.y, m.x, m.y);
        if (d < bd) { bd = d; t = m; }
      }
      if (t) {
        if (bd > 30) {
          const a = Math.atan2(t.y - sp.y, t.x - sp.x);
          sp.x += Math.cos(a) * 130 * dt;
          sp.y += Math.sin(a) * 130 * dt;
        } else if (sp.cd <= 0) {
          sp.cd = 0.5;
          this.damageMonster(t, sp.atk, 'scissors', {});
        }
      }
      if (sp.life <= 0 || sp.hp <= 0) {
        this.spirits.splice(i, 1);
        this._spiritDie(sp);
      }
    }

    /* projectiles */
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const tgt = p.target && (p.target.hp != null || p.target.def) ? p.target : null;
      let tx = p.tx, ty = p.ty;
      if (tgt) { tx = tgt.x; ty = tgt.y - (tgt.air ? 14 : 0); p.tx = tx; p.ty = ty; }
      const d = GTD.U.dist(p.x, p.y, tx, ty);
      const step = p.speed * dt;
      if (d <= step + 6) {
        /* impact */
        this._projectileHit(p, tgt);
        this.projectiles.splice(i, 1);
      } else {
        p.x += (tx - p.x) / d * step;
        p.y += (ty - p.y) / d * step;
      }
    }

    /* bolts (lightning visuals) */
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].life -= dt;
      if (this.bolts[i].life <= 0) this.bolts.splice(i, 1);
    }

    /* particles */
    for (let i = 0; i < this.particles.list.length; i++) {
      const p = this.particles.list[i];
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'petal') { p.vy += 60 * dt; p.vx *= 0.98; }
      if (p.kind === 'spark') { p.vx *= 0.92; p.vy *= 0.92; }
    }
    /* floaters */
    for (let i = 0; i < this.floats.list.length; i++) {
      const f = this.floats.list[i];
      if (!f.on) continue;
      f.life -= dt;
      if (f.life <= 0) { f.on = false; continue; }
      f.y += f.vy * dt;
    }
    /* weather */
    for (let i = 0; i < this.weather.length; i++) {
      const w = this.weather[i];
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      if (w.x < -20) w.x = this.W + 10;
      if (w.x > this.W + 20) w.x = -10;
      if (w.y < -20 || w.y > this.H + 20) this.weather[i] = this.newWeather(false);
    }
    /* shake decay */
    this.shake *= Math.pow(0.03, dt);
    if (this.shake < 0.2) this.shake = 0;
  }

  _findHeroOrUnitIn(m, r) {
    let best = null, bd = Infinity;
    this.heroes.forEach(function (h) {
      if (h.dead) return;
      const d = GTD.U.dist2(m.x, m.y, h.x, h.y);
      if (d < r * r && d < bd) { bd = d; best = h; }
    });
    for (let u = 0; u < this.units.length; u++) {
      const un = this.units[u];
      const d = GTD.U.dist2(m.x, m.y, un.x, un.y);
      if (d < r * r && d < bd) { bd = d; best = un; }
    }
    return best;
  }

  _bossAoE(m) {
    this.shake = Math.max(this.shake, 10);
    GTD.Audio.sfx('boom');
    this.ringFx(m.x, m.y, '#ff6040', 95);
    const dmg = m.atk * 1.5;
    this.heroes.forEach(function (h) {
      if (h.dead) return;
      if (GTD.U.dist(m.x, m.y, h.x, h.y) <= 95) {
        h.hp -= dmg;
        this.float(h.x, h.y - 20, GTD.U.fmt(dmg), '#ff7070', 14);
        if (h.hp <= 0) this._heroDie(h);
      }
    }.bind(this));
    for (let u = 0; u < this.units.length; u++) {
      const un = this.units[u];
      if (GTD.U.dist(m.x, m.y, un.x, un.y) <= 95) {
        un.hp -= dmg;
        this.float(un.x, un.y - 14, GTD.U.fmt(dmg), '#ff7070', 12);
        if (un.hp <= 0) this._unitDie(un);
      }
    }
  }

  _heroDie(h) {
    h.dead = true;
    h.hp = 0;
    h.respawnAt = this.time + GTD.BATTLE.heroRespawn;
    this.burst(h.x, h.y, '#e05555', 18, 120);
    GTD.Audio.sfx('hurt');
  }
  _unitDie(u) {
    const i = this.units.indexOf(u);
    if (i >= 0) this.units.splice(i, 1);
    this.burst(u.x, u.y, '#8a8f96', 8, 70);
    if (u.type === 'wolf') this._spawnSpirit(u.x, u.y, false);
  }

  _heroAttack(h, target) {
    const base = h.atk * this.scale * (this.tripleHero ? 1.5 : 1);
    const useProj = !!h.def.proj;
    if (h.def.skill === 'ultArrow') {
      /* Robin Awakened: line arrow, 1.5x, hits all on line */
      const a = Math.atan2(target.y - h.y, target.x - h.x);
      const ex = h.x + Math.cos(a) * 260, ey = h.y + Math.sin(a) * 260;
      this.bolts.push({ x1: h.x, y1: h.y, x2: ex, y2: ey, life: 0.18, color: '#ffe08a', w: 3 });
      GTD.Audio.sfx('bow');
      this.monsters.slice().forEach(function (m) {
        const d = this._segDist(m.x, m.y - (m.air ? 14 : 0), h.x, h.y, ex, ey);
        if (d < 26) this.damageMonster(m, base * 1.5, h.def.attr, { level: h.level });
      }.bind(this));
      return;
    }
    if (useProj) {
      this.projectiles.push({
        x: h.x, y: h.y - 10, target: target, tx: target.x, ty: target.y - (target.air ? 14 : 0),
        speed: h.def.proj === 'arrow' ? 520 : 420,
        dmg: base, attr: h.def.attr, kind: h.def.proj, from: 'hero', level: h.level,
        aoe: h.def.aoe, slow: h.def.slow, hero: h
      });
      GTD.Audio.sfx(h.def.proj === 'arrow' ? 'bow' : h.def.proj === 'fire' ? 'fireball' : h.def.proj === 'shuriken' ? 'shuriken' : h.def.proj === 'ice' ? 'iceArrow' : 'sword');
    } else {
      this._meleeHero(h, target, base);
    }
    /* hit count specials */
    if (h.def.skill === 'plum') {
      h.hitCount++;
      if (h.hitCount % 3 === 0) this._plum(h, target, base);
    }
    if (h.def.skill === 'wolfSpirit') {
      h.hitCount++;
      if (h.hitCount % 5 === 0) {
        this._spawnSpirit(h.x + GTD.U.rand(-20, 20), h.y + GTD.U.rand(-20, 20), true);
        GTD.Audio.sfx('howl');
      }
    }
  }
  _companionAttack(h, primary) {
    const falcon = h.def.companion === 'falcon';
    const dmg = h.atk * this.scale * (this.tripleHero ? 1.5 : 1) * (falcon ? 0.3 : 0.4);
    const range = Math.min(h.def.range, 170);
    let target = primary;
    if (!target || target.hp <= 0) {
      target = null;
      const q = this.grid.query(h.x, h.y, range, this._q);
      for (let i = 0; i < q.length; i++) {
        const m = q[i];
        if (m.hp <= 0) continue;
        if (GTD.U.dist(h.x, h.y, m.x, m.y) <= range + m.radius) { target = m; break; }
      }
      if (!target) return;
    }
    if (falcon) {
      const yy = target.y - (target.air ? 14 : 0);
      this.bolts.push({ x1: h.x, y1: h.y - 12, x2: target.x, y2: yy, life: 0.12, color: '#e8e0d0', w: 1.6, zig: true });
      GTD.Audio.sfx('sword');
      this.damageMonster(target, dmg, h.def.attr, { level: h.level, src: h.key });
    } else {
      this.projectiles.push({
        x: h.x, y: h.y - 12, target: target, tx: target.x, ty: target.y - (target.air ? 14 : 0),
        speed: 380, dmg: dmg, attr: h.def.attr, kind: 'petal', from: 'hero', level: h.level, aoe: 40, hero: h
      });
      GTD.Audio.sfx('fireball');
    }
  }
  _segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return GTD.U.dist(px, py, x1, y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return GTD.U.dist(px, py, x1 + t * dx, y1 + t * dy);
  }
  _meleeHero(h, target, base) {
    if (h.def.aoe) {
      GTD.Audio.sfx('punch');
      this.burst(target.x, target.y, '#ffd0a0', 8, 90);
      const t = target;
      this.monsters.slice().forEach(function (m) {
        const yy = m.y - (m.air ? 14 : 0);
        if (GTD.U.dist(t.x, t.y - (t.air ? 14 : 0), m.x, yy) <= h.def.aoe) {
          const pierce = h.def.armorPierce || 0;
          this.damageMonster(m, base, h.def.attr, { level: h.level, pierceHC: pierce });
        }
      }.bind(this));
    } else {
      GTD.Audio.sfx('sword');
      this.bolts.push({ x1: h.x, y1: h.y, x2: target.x, y2: target.y - (target.air ? 14 : 0), life: 0.1, color: '#ffffff', w: 2 });
      this.damageMonster(target, base, h.def.attr, { level: h.level, pierceHC: h.def.armorPierce || 0 });
    }
  }
  _plum(h, target, base) {
    GTD.Audio.sfx('plum');
    this.plumFx(target.x, target.y - 10);
    this.ringFx(target.x, target.y, '#ff9ec4', h.def.aoe);
    this.monsters.slice().forEach(function (m) {
      const yy = m.y - (m.air ? 14 : 0);
      if (GTD.U.dist(target.x, target.y, m.x, yy) <= h.def.aoe) {
        this.damageMonster(m, base * 0.8, h.def.attr, { level: h.level, bleed: 0.3, bleedSrc: 'kibong', slow: 1.5 });
      }
    }.bind(this));
  }

  _shoot(t, target) {
    this.projectiles.push({
      x: t.x, y: t.y - 10, target: target, tx: target.x, ty: target.y - (target.air ? 14 : 0),
      speed: t.def.proj === 'cannon' ? 260 : t.def.proj === 'bamboo' ? 500 : 420,
      dmg: t.atk, attr: t.def.attr, kind: t.def.proj, from: 'tower', level: t.level,
      aoe: t.def.aoe, slow: t.def.slow, burn: t.def.burn, poison: t.def.poison,
      pierceHC: t.def.armorPierce || t.def.pierce || 0, tower: t
    });
    const sfxMap = { ice: 'iceArrow', fire: 'fireball', shuriken: 'shuriken', cannon: 'cannon', petal: 'plum', bamboo: 'bamboo', poison: 'hiss' };
    GTD.Audio.sfx(sfxMap[t.def.proj] || 'pop');
  }
  _chainFire(t, primary) {
    const hits = [primary];
    let last = primary;
    for (let i = 1; i < t.def.chain; i++) {
      let best = null, bd = Infinity;
      for (let j = 0; j < this.monsters.length; j++) {
        const m = this.monsters[j];
        if (m.hp <= 0) continue;
        if (t.def.airOnly && !m.air) continue;
        if (hits.indexOf(m) >= 0) continue;
        const d = GTD.U.dist(last.x, last.y, m.x, m.y);
        if (d <= 100 && d < bd) { bd = d; best = m; }
      }
      if (!best) break;
      hits.push(best);
      last = best;
    }
    let px = t.x, py = t.y - 14;
    hits.forEach(function (m, i) {
      const yy = m.y - (m.air ? 14 : 0);
      this.bolts.push({ x1: px, y1: py, x2: m.x, y2: yy, life: 0.14, color: t.key === 'chrys' ? '#ffd75e' : '#9fd8ff', w: 2.5, zig: true });
      px = m.x; py = yy;
      const dmg = t.atk * Math.pow(0.8, i);
      this.damageMonster(m, dmg, t.def.attr, { level: t.level });
    }.bind(this));
    GTD.Audio.sfx('thunder');
    t.cd = t.def.rate / 1000;
  }

  _projectileHit(p, tgt) {
    const opts = {
      level: p.level,
      slow: p.slow || 0,
      burn: p.burn || 0,
      poison: p.poison || 0,
      pierceHC: p.pierceHC || 0
    };
    const sfxByKind = { arrow: 'bow', fire: 'fireball', ice: 'iceArrow', shuriken: 'shuriken', cannon: 'cannon', petal: 'plum', bamboo: 'bamboo', poison: 'hiss', slash: 'sword', wave: 'zap', enemy: 'hurt' };
    GTD.Audio.sfx(sfxByKind[p.kind] || 'pop');
    if (p.from === 'monster') {
      if (tgt && (tgt.hp != null || tgt.def)) {
        tgt.hp -= p.dmg;
        this.float(tgt.x, tgt.y - 20, GTD.U.fmt(p.dmg), '#ff9a9a', 12);
        if (tgt.def) this._heroDie(tgt); else this._unitDie(tgt);
      }
      return;
    }
    if (p.aoe) {
      this.burst(p.x, p.y, p.kind === 'fire' ? '#ff9040' : p.kind === 'petal' ? '#ff9ec4' : p.kind === 'cannon' ? '#c0c0c0' : '#ffd080', 10, 110);
      this.ringFx(p.x, p.y, '#ffd080', p.aoe);
      const cx = p.x, cy = p.y;
      this.monsters.slice().forEach(function (m) {
        const yy = m.y - (m.air ? 14 : 0);
        if (GTD.U.dist(cx, cy, m.x, yy) <= p.aoe) {
          const d = GTD.U.dist(cx, cy, m.x, yy);
          const mult = d <= (tgt ? 20 : 0) ? 1 : 0.7;
          this.damageMonster(m, p.dmg * mult, p.attr, opts);
        }
      }.bind(this));
    } else if (tgt && tgt.hp > 0) {
      this.damageMonster(tgt, p.dmg, p.attr, opts);
      if (p.kind === 'fire') this.burst(p.x, p.y, '#ff9040', 6, 80);
      if (p.kind === 'poison') this.burst(p.x, p.y, '#7ed07e', 6, 70);
    } else {
      this.burst(p.x, p.y, '#c0c0c0', 4, 60);
    }
  }

  /* ============================================================
     FRAME LOOP + RENDER
     ============================================================ */
  frame(t) {
    if (this._destroyed) return;
    this.raf = requestAnimationFrame(this.frame.bind(this));
    if (!this.lastT) this.lastT = t;
    let dt = (t - this.lastT) / 1000;
    this.lastT = t;
    if (dt > 0.1) dt = 0.1;
    if (this.state === 'playing' && !this.ended) {
      this.acc += dt * this.speed;
      const STEP = 1 / 60;
      let n = 0;
      while (this.acc >= STEP && this.state === 'playing' && !this.ended && n < 12) {
        this.sim(STEP);
        this.acc -= STEP;
        n++;
      }
      if (n >= 12) this.acc = 0;
    }
    this.render(dt);
    this._hud(dt);
  }

  render(dt) {
    const g = this.ctx;
    g.clearRect(0, 0, this.W, this.H);
    g.save();
    if (this.shake > 0) g.translate(GTD.U.rand(-this.shake, this.shake), GTD.U.rand(-this.shake, this.shake));
    g.drawImage(this.groundCv, 0, 0);
    /* weather behind */
    this.weather.forEach(function (w) {
      g.fillStyle = w.c;
      g.globalAlpha = 0.8;
      g.beginPath(); g.arc(w.x, w.y, w.r, 0, 6.283); g.fill();
    });
    g.globalAlpha = 1;
    /* slots */
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s.tower) {
        g.beginPath();
        g.arc(s.x, s.y, 20, 0, 6.283);
        g.fillStyle = this.selTowerKey ? 'rgba(245,197,66,.25)' : 'rgba(245,197,66,.10)';
        g.fill();
        g.strokeStyle = this.selTowerKey ? '#f5c542' : 'rgba(245,197,66,.5)';
        g.setLineDash([5, 4]);
        g.lineWidth = 2;
        g.stroke();
        g.setLineDash([]);
        if (this.selTowerKey) {
          const pu = 22 + Math.sin(this.time * 5) * 2;
          g.beginPath(); g.arc(s.x, s.y, pu, 0, 6.283);
          g.strokeStyle = 'rgba(245,197,66,.7)'; g.lineWidth = 1.5; g.stroke();
        }
      }
    }
    /* towers */
    for (let i = 0; i < this.towers.length; i++) {
      const t = this.towers[i];
      const sel = this.selSlot === t.slot;
      if (sel) {
        g.beginPath(); g.arc(t.x, t.y, t.def.range, 0, 6.283);
        g.fillStyle = 'rgba(245,197,66,.08)'; g.fill();
        g.strokeStyle = 'rgba(245,197,66,.55)'; g.lineWidth = 1.5; g.stroke();
      }
      GTD.drawTowerSprite(g, t.x, t.y, t);
    }
    /* units */
    this.units.forEach(function (u) { GTD.drawUnit(g, u); });
    this.spirits.forEach(function (sp) { GTD.drawSpirit(g, sp); });
    /* heroes */
    this.heroes.forEach((h, i) => GTD.drawHero(g, h, i, this.selHero, this.time));
    /* monsters */
    const airList = [];
    for (let i = 0; i < this.monsters.length; i++) {
      const m = this.monsters[i];
      if (m.air) airList.push(m); else GTD.drawMonster(g, m, this, false);
    }
    airList.forEach(m => GTD.drawMonster(g, m, this, true));
    /* projectiles */
    this.projectiles.forEach(p => GTD.drawProjectile(g, p));
    /* bolts */
    this.bolts.forEach(b => {
      g.strokeStyle = b.color;
      g.lineWidth = b.w;
      g.globalAlpha = Math.max(0, b.life / 0.18);
      g.beginPath();
      if (b.zig) {
        g.moveTo(b.x1, b.y1);
        const n = 5;
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const mx = b.x1 + (b.x2 - b.x1) * t + (i < n ? GTD.U.rand(-8, 8) : 0);
          const my = b.y1 + (b.y2 - b.y1) * t + (i < n ? GTD.U.rand(-8, 8) : 0);
          g.lineTo(mx, my);
        }
      } else {
        g.moveTo(b.x1, b.y1); g.lineTo(b.x2, b.y2);
      }
      g.stroke();
      g.globalAlpha = 1;
    });
    /* particles */
    for (let i = 0; i < this.particles.list.length; i++) {
      const p = this.particles.list[i];
      if (!p.on) continue;
      const a = p.life / p.maxLife;
      g.globalAlpha = a;
      if (p.kind === 'ring') {
        g.strokeStyle = p.color;
        g.lineWidth = 3 * a;
        g.beginPath(); g.arc(p.x, p.y, p.size * (1 - a) + 8, 0, 6.283); g.stroke();
      } else {
        g.fillStyle = p.color;
        g.beginPath(); g.arc(p.x, p.y, p.size * a + 0.5, 0, 6.283); g.fill();
      }
    }
    g.globalAlpha = 1;
    /* floaters */
    for (let i = 0; i < this.floats.list.length; i++) {
      const f = this.floats.list[i];
      if (!f.on) continue;
      g.globalAlpha = Math.min(1, f.life / 0.4);
      g.font = 'bold ' + f.size + 'px system-ui';
      g.textAlign = 'center';
      g.fillStyle = 'rgba(0,0,0,.6)';
      g.fillText(f.text, f.x + 1, f.y + 1);
      g.fillStyle = f.color;
      g.fillText(f.text, f.x, f.y);
    }
    g.globalAlpha = 1;
    /* freeze overlay */
    if (this.time < this.freezeUntil) {
      g.fillStyle = 'rgba(120,190,255,.12)';
      g.fillRect(0, 0, this.W, this.H);
    }
    /* tutorial highlight */
    if (this.tut) {
      if (this.tut.step === 2) {
        for (let i = 0; i < this.slots.length; i++) {
          const s = this.slots[i];
          if (!s.tower) {
            g.beginPath(); g.arc(s.x, s.y, 26 + Math.sin(this.time * 6) * 3, 0, 6.283);
            g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
            break;
          }
        }
      }
    }
    /* cast mode crosshair */
    if ((this.castMode === 'meteor' || this.castMode === 'bomb') && this.hover) {
      g.beginPath();
      g.arc(this.hover.x, this.hover.y, this.castMode === 'meteor' ? 80 : 120, 0, 6.283);
      g.strokeStyle = this.castMode === 'meteor' ? 'rgba(255,140,60,.8)' : 'rgba(255,200,80,.8)';
      g.setLineDash([8, 6]); g.lineWidth = 2; g.stroke(); g.setLineDash([]);
    }
    /* hero selected range */
    if (this.selHero >= 0 && !this.heroes[this.selHero].dead) {
      const h = this.heroes[this.selHero];
      g.beginPath(); g.arc(h.x, h.y, h.def.range, 0, 6.283);
      g.fillStyle = 'rgba(94,203,94,.07)'; g.fill();
      g.strokeStyle = 'rgba(94,203,94,.6)'; g.lineWidth = 1.5; g.stroke();
    }
    g.restore();
  }
  _heroSel() { return this.selHero; }

  _hud(dt) {
    const now = performance.now();
    if (this._hudAt && now - this._hudAt < 120) return;
    this._hudAt = now;
    /* hearts */
    const heartsTxt = '❤'.repeat(Math.min(10, Math.max(0, Math.ceil(this.hearts)))) + (this.hearts > 10 ? ' +' + (Math.ceil(this.hearts) - 10) : '');
    if (this._hudCache.hearts !== heartsTxt) {
      this._hudCache.hearts = heartsTxt;
      this.elHearts.textContent = heartsTxt + ' ' + Math.ceil(Math.max(0, this.hearts));
    }
    if (this._hudCache.mine !== this.mine) {
      this._hudCache.mine = this.mine;
      this.elMine.textContent = '◆ ' + GTD.U.fmt(this.mine);
    }
    if (this._hudCache.wave !== this.wave) {
      this._hudCache.wave = this.wave;
      this.elWave.textContent = this.wave + '/' + this.lastWave + (this.phase === 'countdown' ? ' (' + Math.ceil(Math.max(0, this.countdown)) + 's)' : '');
    }
    if (this._hudCache.speed !== this.speed) {
      this._hudCache.speed = this.speed;
      this.elSpeed.textContent = this.speed + 'x';
    }
    /* boss bar */
    if (this.boss) {
      const w = Math.max(0, this.boss.hp / this.boss.maxHp * 100);
      if (this._hudCache.bossW !== w) {
        this._hudCache.bossW = w;
        this.elBossFill.style.width = w + '%';
      }
    }
    /* hero cards */
    this.heroes.forEach(function (h, i) {
      const c = this.heroCards[i];
      if (!c) return;
      const nm = GTD.heroName(h.def);
      if (this.heroNameCache[i] !== nm) { this.heroNameCache[i] = nm; c.name.textContent = nm; }
      const w = Math.max(0, h.hp / h.maxHp * 100);
      c.fill.style.width = w + '%';
      c.fill.style.background = h.dead ? '#555' : (w > 50 ? '#5ecb5e' : w > 25 ? '#f5c542' : '#e05555');
      const dt2 = h.dead ? Math.ceil(h.respawnAt - this.time) + 's' : '';
      if (c.dead.textContent !== dt2) c.dead.textContent = dt2;
      c.root.classList.toggle('dead', h.dead);
    }.bind(this));
    /* ability cds */
    GTD.ABILITIES.forEach(function (a) {
      const b = this.abilityBtns[a.key];
      const left = Math.max(0, (this.abilityCd[a.key] || 0) - this.time);
      b.cdEl.textContent = left > 0.05 ? Math.ceil(left) : '';
      b.btn.classList.toggle('cding', left > 0.05);
    }.bind(this));
    /* strip selection */
    GTD.TOWERS.forEach(function (t) {
      this.stripBtns[t.key].classList.toggle('sel', this.selTowerKey === t.key);
    }.bind(this));
    /* panel refresh (mineral changes) */
    if (this.selSlot >= 0) this._panelRefresh();
    /* tutorial */
    if (this.tut) {
      const txt = GTD.t('tut' + this.tut.step);
      if (this.tutEl.textContent !== txt) this.tutEl.textContent = txt;
    }
  }
};

/* ============================================================
   UNIT / HERO / MONSTER RENDERERS (canvas, original art)
   ============================================================ */
const ARCH_COLORS = {
  knight: '#8fa8c8', blade: '#c8b080', icequeen: '#9fd8ff', dragonrider: '#ff9a60', dwarf: '#c08050',
  wizard: '#a24fd6', archer: '#7ed07e', necro: '#9a70c8', dancer: '#ffd0e0', ninja: '#c0c8d0',
  priest: '#f0ead0', wolf: '#9aa8b8', swordsman: '#ff9ec4', monk: '#ffb840', palm: '#80c8a0',
  trickster: '#60c8c0', paladin: '#e07050', serpent: '#70c860'
};

GTD.drawHero = function (g, h, idx, selIdx, btime) {
  const x = h.x, y = h.y;
  if (h.dead) {
    g.globalAlpha = 0.4;
    g.fillStyle = '#333';
    g.beginPath(); g.arc(x, y, 12, 0, 6.283); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = '#aaa'; g.font = '10px system-ui'; g.textAlign = 'center';
    g.fillText(Math.max(0, Math.ceil(h.respawnAt - (btime || 0))) + 's', x, y + 3);
    return;
  }
  const col = ARCH_COLORS[h.def.arch] || '#ccc';
  const rar = GTD.RAR_COLORS[h.def.r];
  g.save();
  /* shadow */
  g.fillStyle = 'rgba(0,0,0,.3)';
  g.beginPath(); g.ellipse(x, y + 12, 10, 4, 0, 0, 6.283); g.fill();
  /* body */
  g.beginPath(); g.arc(x, y, 11, 0, 6.283);
  g.fillStyle = col; g.fill();
  g.lineWidth = selIdx === idx ? 3 : 2;
  g.strokeStyle = selIdx === idx ? '#ffd75e' : rar; g.stroke();
  if (h.def.r >= 5) {
    g.shadowColor = rar; g.shadowBlur = 12;
    g.beginPath(); g.arc(x, y, 11, 0, 6.283); g.stroke();
    g.shadowBlur = 0;
  }
  /* arch glyph */
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.font = 'bold 10px system-ui'; g.textAlign = 'center';
  const gl = { knight: '♜', blade: '⚔', icequeen: '❄', dragonrider: '🜂', dwarf: '⛏', wizard: '✦', archer: '➶', necro: '☠', dancer: '❋', ninja: '✂', priest: '✚', wolf: '🜏', swordsman: '✿', monk: '☯', palm: '✊', trickster: '🜚', paladin: '♞', serpent: '🜛' }[h.def.arch] || '•';
  g.fillText(gl, x, y + 3.5);
  /* attribute badge */
  GTD.drawAttrBadge(g, x + 10, y - 10, h.def.attr);
  /* pet companion */
  if (h.def.companion) {
    const cx = x + (h.def.companion === 'falcon' ? 16 : -15), cy = y - (h.def.companion === 'falcon' ? 14 : 8);
    g.fillStyle = h.def.companion === 'falcon' ? '#dfe6ee' : '#c9a06a';
    g.beginPath(); g.arc(cx, cy, 4, 0, 6.283); g.fill();
    g.fillStyle = '#fff'; g.font = '7px system-ui'; g.textAlign = 'center';
    g.fillText(h.def.companion === 'falcon' ? '🦅' : '🐱', cx, cy + 2.5);
  }
  /* hp bar */
  GTD.drawHpBar(g, x - 14, y - 20, 28, h.hp / h.maxHp);
  g.restore();
};

GTD.drawUnit = function (g, u) {
  const x = u.x, y = u.y;
  g.save();
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.beginPath(); g.ellipse(x, y + 8, 7, 3, 0, 0, 6.283); g.fill();
  if (u.type === 'soldier' || u.type === 'volunteer') {
    const c = u.type === 'volunteer' ? '#5ecb5e' : '#8090b0';
    g.fillStyle = c;
    g.fillRect(x - 6, y - 8, 12, 14);
    g.fillStyle = '#d0d8e8';
    g.beginPath(); g.arc(x, y - 10, 5, 0, 6.283); g.fill();
    if (u.type === 'volunteer') {
      g.strokeStyle = '#fff'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x + 6, y - 8); g.lineTo(x + 12, y - 14); g.stroke();
    }
  } else if (u.type === 'assassin') {
    g.fillStyle = '#202028';
    g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 8, y + 8); g.lineTo(x - 8, y + 8); g.closePath(); g.fill();
    g.fillStyle = '#80e0ff';
    g.beginPath(); g.arc(x - 2, y - 2, 1.4, 0, 6.283); g.arc(x + 2, y - 2, 1.4, 0, 6.283); g.fill();
  } else if (u.type === 'wolf') {
    g.fillStyle = '#6a7888';
    g.beginPath(); g.ellipse(x, y, 9, 6, 0, 0, 6.283); g.fill();
    g.beginPath(); g.arc(x + 8, y - 4, 4.5, 0, 6.283); g.fill();
    g.beginPath(); g.moveTo(x + 10, y - 8); g.lineTo(x + 13, y - 12); g.lineTo(x + 12, y - 6); g.closePath(); g.fill();
    g.fillStyle = '#ffd75e';
    g.beginPath(); g.arc(x + 10, y - 4, 1.2, 0, 6.283); g.fill();
  }
  GTD.drawHpBar(g, x - 10, y - 18, 20, u.hp / u.maxHp);
  g.restore();
};

GTD.drawSpirit = function (g, sp) {
  g.save();
  g.globalAlpha = 0.85;
  g.shadowColor = '#9fd8ff'; g.shadowBlur = 14;
  g.fillStyle = '#cfeaff';
  g.beginPath(); g.ellipse(sp.x, sp.y, 9, 5.5, 0, 0, 6.283); g.fill();
  g.beginPath(); g.arc(sp.x + 8, sp.y - 4, 4, 0, 6.283); g.fill();
  g.shadowBlur = 0;
  g.restore();
};

GTD.drawAttrBadge = function (g, x, y, attr) {
  const c = { scissors: '#4aa3e8', rock: '#c8a050', paper: '#a24fd6' }[attr] || '#fff';
  g.fillStyle = 'rgba(13,10,26,.8)';
  g.beginPath(); g.arc(x, y, 5.5, 0, 6.283); g.fill();
  g.strokeStyle = c; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = c;
  g.font = '7px system-ui'; g.textAlign = 'center';
  const t = { scissors: '✂', rock: '⛰', paper: '✉' }[attr] || '?';
  g.fillText(t, x, y + 2.5);
};

GTD.drawHpBar = function (g, x, y, w, pct) {
  g.fillStyle = 'rgba(0,0,0,.65)';
  g.fillRect(x - 1, y - 1, w + 2, 5);
  g.fillStyle = pct > 0.5 ? '#5ecb5e' : pct > 0.25 ? '#f5c542' : '#e05555';
  g.fillRect(x, y, w * Math.max(0, Math.min(1, pct)), 3);
};

/* per-monster region colors: 10 colors per region */
function monsterColor(regionIndex, idx) {
  const baseH = [100, 90, 42, 200, 10, 270, 250, 190, 210, 45][regionIndex];
  const h = (baseH + idx * 14) % 360;
  const light = idx === 9 ? 55 : idx === 8 ? 45 : 48;
  return hsl(h, idx >= 8 ? 75 : 55, light);
}

GTD.drawMonster = function (g, m, battle, isAir) {
  const x = m.x;
  const y = m.y - (isAir ? 14 : 0);
  const r = m.radius;
  g.save();
  if (isAir) {
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.beginPath(); g.ellipse(x, m.y + 4, r * 0.7, r * 0.3, 0, 0, 6.283); g.fill();
    /* wings */
    const flap = Math.sin((battle.time || 0) * 14 + x * 0.1) * 3;
    g.fillStyle = 'rgba(220,230,255,.5)';
    g.beginPath(); g.ellipse(x - r * 0.9, y - 2, r * 0.7, r * 0.35, -0.5 + flap * 0.05, 0, 6.283); g.fill();
    g.beginPath(); g.ellipse(x + r * 0.9, y - 2, r * 0.7, r * 0.35, 0.5 - flap * 0.05, 0, 6.283); g.fill();
  }
  const bob = isAir ? Math.sin((battle.time || 0) * 3 + x * 0.05) * 3 : 0;
  const yy = y + bob;
  const col = monsterColor(battle.regionIndex, m.colorIdx);
  /* boss aura */
  if (m.boss) {
    g.shadowColor = m.enraged ? '#ff4040' : '#ffd75e';
    g.shadowBlur = 18;
  }
  g.beginPath(); g.arc(x, yy, r, 0, 6.283);
  g.fillStyle = col; g.fill();
  g.shadowBlur = 0;
  g.lineWidth = m.boss ? 3 : m.elite ? 2.5 : 1.5;
  g.strokeStyle = m.boss ? (m.enraged ? '#ff4040' : '#ffd75e') : m.elite ? '#ffb040' : 'rgba(0,0,0,.5)';
  g.stroke();
  /* eyes */
  g.fillStyle = m.enraged ? '#ff5050' : '#fff';
  const ex = r * 0.35;
  g.beginPath(); g.arc(x - ex, yy - r * 0.15, r * 0.16, 0, 6.283); g.arc(x + ex, yy - r * 0.15, r * 0.16, 0, 6.283); g.fill();
  g.fillStyle = '#201010';
  g.beginPath(); g.arc(x - ex, yy - r * 0.15, r * 0.07, 0, 6.283); g.arc(x + ex, yy - r * 0.15, r * 0.07, 0, 6.283); g.fill();
  /* elite crown */
  if (m.elite && !m.boss) {
    g.fillStyle = '#ffd75e';
    g.font = '10px system-ui'; g.textAlign = 'center';
    g.fillText('◆', x, yy - r - 8);
  }
  if (m.boss) {
    g.fillStyle = '#ffd75e';
    g.font = 'bold 11px system-ui'; g.textAlign = 'center';
    g.fillText('♛ ' + GTD.monsterName(m.def), x, yy - r - 10);
  }
  /* status tints */
  const frozen = (battle.time || 0) < battle.freezeUntil;
  if (frozen) {
    g.fillStyle = 'rgba(140,200,255,.45)';
    g.beginPath(); g.arc(x, yy, r + 1, 0, 6.283); g.fill();
  }
  if (m.slowUntil > (battle.time || 0)) {
    g.strokeStyle = '#7ec8ff'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, yy, r + 3, 0, 6.283); g.stroke();
  }
  if (m.poison) { g.fillStyle = '#5ecb5e'; g.beginPath(); g.arc(x - r - 4, yy - r, 2.5, 0, 6.283); g.fill(); }
  if (m.burn) { g.fillStyle = '#ff9040'; g.beginPath(); g.arc(x, yy - r - 3, 2.5, 0, 6.283); g.fill(); }
  if (m.bleed) { g.fillStyle = '#e05555'; g.beginPath(); g.arc(x + r + 4, yy - r, 2.5, 0, 6.283); g.fill(); }
  /* HC badge */
  if (m.hc > 0) {
    g.fillStyle = 'rgba(13,10,26,.8)';
    g.fillRect(x - 12, yy + r + 3, 24, 10);
    g.strokeStyle = '#c8ccd0'; g.lineWidth = 1; g.strokeRect(x - 12, yy + r + 3, 24, 10);
    g.fillStyle = '#e8ecf0'; g.font = 'bold 8px system-ui'; g.textAlign = 'center';
    g.fillText('HC ' + m.hc, x, yy + r + 11);
  }
  GTD.drawHpBar(g, x - r - 2, yy - r - 8, (r + 2) * 2, m.hp / m.maxHp);
  g.restore();
};

GTD.drawTowerSprite = function (g, x, y, t) {
  const rar = GTD.RAR_COLORS[t.tier];
  g.save();
  /* base plate */
  g.beginPath(); g.arc(x, y, 17, 0, 6.283);
  g.fillStyle = 'rgba(20,16,40,.9)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = rar; g.stroke();
  if (t.tier >= 3) { g.shadowColor = rar; g.shadowBlur = 10; g.stroke(); g.shadowBlur = 0; }
  GTD.drawTowerIcon(g, x, y, t.key, t.tier);
  /* level pips */
  for (let i = 0; i < t.level; i++) {
    g.fillStyle = '#f5c542';
    g.beginPath(); g.arc(x - 8 + i * 8, y + 21, 2.5, 0, 6.283); g.fill();
  }
  g.restore();
};

GTD.drawTowerIcon = function (g, x, y, key, tier) {
  g.save();
  g.translate(x, y);
  const gold = '#f5c542';
  switch (key) {
    case 'thorn':
      g.fillStyle = '#7a5a30';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.5;
        g.beginPath();
        g.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
        g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
        g.lineTo(Math.cos(a + 0.25) * 5, Math.sin(a + 0.25) * 5);
        g.closePath(); g.fill();
      }
      g.fillStyle = '#5aa838'; g.beginPath(); g.arc(0, 3, 5, 0, 6.283); g.fill();
      break;
    case 'iceArrow':
      g.fillStyle = '#bfe8ff';
      g.beginPath(); g.moveTo(0, -12); g.lineTo(5, 0); g.lineTo(0, 12); g.lineTo(-5, 0); g.closePath(); g.fill();
      g.strokeStyle = '#7ec8e8'; g.lineWidth = 1.5; g.stroke();
      break;
    case 'assassin':
      g.fillStyle = '#181820';
      g.beginPath(); g.arc(0, 0, 9, 0, 6.283); g.fill();
      g.fillStyle = '#80e0ff';
      g.beginPath(); g.arc(-3, -1, 1.5, 0, 6.283); g.arc(3, -1, 1.5, 0, 6.283); g.fill();
      break;
    case 'shuriken':
      g.fillStyle = '#c0c8d0';
      for (let i = 0; i < 4; i++) {
        g.rotate(Math.PI / 2);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(3, -4); g.lineTo(0, -12); g.lineTo(-3, -4); g.closePath(); g.fill();
      }
      g.fillStyle = '#404850'; g.beginPath(); g.arc(0, 0, 2.5, 0, 6.283); g.fill();
      break;
    case 'magic':
      g.fillStyle = '#a24fd6'; g.beginPath(); g.arc(0, 2, 7, 0, 6.283); g.fill();
      const fl = 4 + Math.sin(Date.now() * 0.01) * 2;
      g.fillStyle = '#ff9040';
      g.beginPath(); g.moveTo(0, -12); g.quadraticCurveTo(6, -4, 0, 2); g.quadraticCurveTo(-6, -4, 0, -12); g.fill();
      break;
    case 'lightning':
      g.strokeStyle = '#7ec8e8'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(0, -11); g.lineTo(0, 11); g.stroke();
      g.strokeStyle = '#9fd8ff';
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.arc(0, 0, 10, -0.5 + i * 0.9, 0.5 + i * 0.9); g.stroke();
      }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -11, 2.5, 0, 6.283); g.fill();
      break;
    case 'nun':
      g.fillStyle = '#f0ead0';
      g.beginPath(); g.arc(0, -3, 6, 0, 6.283); g.fill();
      g.fillRect(-6, -3, 12, 12);
      g.strokeStyle = '#e0b040'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(8, -8); g.lineTo(8, 2); g.moveTo(4, -3); g.lineTo(12, -3); g.stroke();
      break;
    case 'barracks':
      g.fillStyle = '#8a6a40';
      g.fillRect(-10, -4, 20, 14);
      g.fillStyle = '#6a4a28';
      g.fillRect(-10, -10, 5, 8); g.fillRect(-2, -10, 5, 8); g.fillRect(6, -10, 5, 8);
      g.fillStyle = '#2a1a0a'; g.fillRect(-3, 2, 6, 8);
      break;
    case 'cannon':
      g.fillStyle = '#404850';
      g.beginPath(); g.arc(0, 2, 8, 0, 6.283); g.fill();
      g.fillStyle = '#5a6470';
      g.save(); g.rotate(-0.7); g.fillRect(-3, -16, 6, 16); g.restore();
      g.fillStyle = '#20262c'; g.beginPath(); g.arc(0, 2, 4, 0, 6.283); g.fill();
      break;
    case 'wolf':
      g.fillStyle = '#6a7888';
      g.beginPath(); g.ellipse(0, 3, 9, 6, 0, 0, 6.283); g.fill();
      g.beginPath(); g.arc(7, -4, 4.5, 0, 6.283); g.fill();
      g.beginPath(); g.moveTo(8, -8); g.lineTo(11, -12); g.lineTo(10, -6); g.closePath(); g.fill();
      g.fillStyle = '#ffd75e'; g.beginPath(); g.arc(8, -4, 1.3, 0, 6.283); g.fill();
      break;
    case 'bat':
      g.fillStyle = '#5a4a70';
      g.beginPath(); g.ellipse(0, 2, 5, 4, 0, 0, 6.283); g.fill();
      const bf = Math.sin(Date.now() * 0.02) * 2;
      g.beginPath(); g.ellipse(-7, 0 + bf, 6, 3, -0.4, 0, 6.283); g.fill();
      g.beginPath(); g.ellipse(7, 0 - bf, 6, 3, 0.4, 0, 6.283); g.fill();
      g.fillStyle = '#ff8080'; g.beginPath(); g.arc(-1.5, 0, 1, 0, 6.283); g.arc(1.5, 0, 1, 0, 6.283); g.fill();
      break;
    case 'blossom':
      g.fillStyle = '#ff9ec4';
      for (let i = 0; i < 5; i++) {
        const a = i * 1.256 - 1.57;
        g.beginPath(); g.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 4.5, 3, a, 0, 6.283); g.fill();
      }
      g.fillStyle = gold; g.beginPath(); g.arc(0, 0, 3, 0, 6.283); g.fill();
      break;
    case 'bamboo':
      g.strokeStyle = '#5aa838'; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(-3, 12); g.lineTo(-3, -12); g.stroke();
      g.beginPath(); g.moveTo(3, 10); g.lineTo(3, -8); g.stroke();
      g.strokeStyle = '#3a7828'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-6, 2); g.lineTo(0, 2); g.moveTo(0, -4); g.lineTo(6, -4); g.stroke();
      break;
    case 'orchid':
      g.fillStyle = '#a24fd6';
      for (let i = 0; i < 3; i++) {
        const a = i * 2.094 - 1.57;
        g.beginPath(); g.ellipse(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 5, 3, a, 0, 6.283); g.fill();
      }
      g.fillStyle = '#5ecb5e'; g.beginPath(); g.arc(0, 0, 2.5, 0, 6.283); g.fill();
      break;
    case 'chrys':
      g.strokeStyle = gold; g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.7;
        g.beginPath();
        g.moveTo(0, 4);
        g.quadraticCurveTo(Math.cos(a) * 10, Math.sin(a) * 10, Math.cos(a) * 14, Math.sin(a) * 14);
        g.stroke();
      }
      g.fillStyle = gold; g.beginPath(); g.arc(0, 5, 4, 0, 6.283); g.fill();
      break;
    default:
      g.fillStyle = '#ccc'; g.beginPath(); g.arc(0, 0, 8, 0, 6.283); g.fill();
  }
  g.restore();
};

GTD.drawProjectile = function (g, p) {
  g.save();
  const a = Math.atan2(p.ty - p.y, p.tx - p.x);
  switch (p.kind) {
    case 'arrow':
      g.strokeStyle = '#d8c890'; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(p.x - Math.cos(a) * 7, p.y - Math.sin(a) * 7);
      g.lineTo(p.x + Math.cos(a) * 7, p.y + Math.sin(a) * 7);
      g.stroke();
      break;
    case 'fire':
      g.shadowColor = '#ff9040'; g.shadowBlur = 10;
      g.fillStyle = '#ffb060';
      g.beginPath(); g.arc(p.x, p.y, 5, 0, 6.283); g.fill();
      g.shadowBlur = 0;
      break;
    case 'ice':
      g.fillStyle = '#bfe8ff';
      g.translate(p.x, p.y); g.rotate(a || 0);
      g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 0); g.lineTo(0, 6); g.lineTo(-4, 0); g.closePath(); g.fill();
      break;
    case 'shuriken':
      g.translate(p.x, p.y); g.rotate((performance.now() * 0.02) % 6.283);
      g.fillStyle = '#c0c8d0';
      for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(2, -3); g.lineTo(0, -7); g.lineTo(-2, -3); g.closePath(); g.fill(); }
      break;
    case 'cannon':
      g.fillStyle = '#30363c';
      g.beginPath(); g.arc(p.x, p.y, 5, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(150,150,150,.4)';
      g.beginPath(); g.arc(p.x - 4, p.y - 3, 3, 0, 6.283); g.fill();
      break;
    case 'petal':
      g.fillStyle = '#ff9ec4';
      g.beginPath(); g.ellipse(p.x, p.y, 5, 3, performance.now() * 0.01, 0, 6.283); g.fill();
      break;
    case 'bamboo':
      g.strokeStyle = '#5aa838'; g.lineWidth = 3;
      const b2 = Math.atan2(p.ty - p.y, p.tx - p.x);
      g.beginPath();
      g.moveTo(p.x - Math.cos(b2) * 8, p.y - Math.sin(b2) * 8);
      g.lineTo(p.x + Math.cos(b2) * 8, p.y + Math.sin(b2) * 8);
      g.stroke();
      break;
    case 'poison':
      g.fillStyle = '#7ed07e';
      g.beginPath(); g.arc(p.x, p.y, 4, 0, 6.283); g.fill();
      break;
    case 'enemy':
      g.fillStyle = '#c04040';
      g.beginPath(); g.arc(p.x, p.y, 3.5, 0, 6.283); g.fill();
      break;
    default:
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(p.x, p.y, 3, 0, 6.283); g.fill();
  }
  g.restore();
};
