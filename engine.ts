/* =====================================================================
   GOLD TOWER DEFENCE – BATTLE ENGINE (Canvas 2D, không phụ thuộc React)
   ===================================================================== */
import {
  W, H, Attr, ATTR_INFO, attrMult, GRADES, TowerType, TowerDef, towerCost, levelUpCost,
  MAX_INGAME_LEVEL, EnemyType, EnemyDef, ENEMY_DEFS, Pt, RegionDef, stageInfo, generatePlots, nearestOnPath,
  WaveDef, generateWaves, enemyHpMul, HeroDef, ItemId, meteorDamage, STARTING_MINERALS, STARTING_HEARTS,
} from "./data";

/* ---------------- KIỂU DỮ LIỆU CÔNG KHAI ---------------- */
export interface DeckCard { key: string; type: TowerType; attr: Attr; grade: number; level: number; setBonus: boolean; def: TowerDef }
export interface HeroCfg { def: HeroDef; level: number }
export interface BattleConfig { stage: number; deck: DeckCard[]; hero: HeroCfg | null; items: Record<ItemId, number>; meteorLevel: number; sound: boolean }
export interface BattleStats { towersBuilt: number; levelUps: number; meteors: number; reinforcements: number; bombs: number; kills: number; itemsUsed: Record<ItemId, number> }
export interface BattleResult { won: boolean; stars: number; heartsLost: number; wavesCleared: number; totalWaves: number; stats: BattleStats; minerals: number }
export type Mode = { kind: "none" } | { kind: "build"; card: number } | { kind: "item"; item: "meteor" | "bomb" | "reinforce" } | { kind: "heromove" };
export type Selection = { kind: "plot"; idx: number } | { kind: "tower"; id: number } | null;

/* ---------------- THỰC THỂ ---------------- */
interface Enemy {
  id: number; def: EnemyDef; attr: Attr; x: number; y: number; hp: number; maxHp: number; speed: number;
  wp: number; progress: number; alive: boolean; slowUntil: number; slowPct: number; stunUntil: number; freezeUntil: number;
  blockedBy: Unit | null; atkTimer: number; elite: boolean; reward: number; leakDmg: number; wobble: number; flash: number;
  dirX: number; dirY: number; burn: number; burnDmg: number; burnAttr: Attr; leaked: boolean;
}
type UnitKind = "soldier" | "knight" | "assassin" | "reinforce" | "hero";
interface Unit {
  id: number; kind: UnitKind; name: string; x: number; y: number; hx: number; hy: number; tx: number; ty: number;
  hp: number; maxHp: number; dmg: number; rate: number; cd: number; range: number; melee: boolean; splash: number; slow: number;
  air: boolean; attr: Attr; alive: boolean; speed: number; ttl: number; towerId: number; dodge: number; crit: number; instakill: number;
  engaged: number[]; size: number; color: string; color2: string; maxEngage: number; facing: number; hitFlash: number;
}
interface Tower {
  id: number; plot: number; x: number; y: number; card: DeckCard; def: TowerDef; level: number; cd: number; invested: number;
  angle: number; spin: number; unitIds: number[]; respawnT: number; kills: number; rally: Pt; flash: number;
}
interface Proj { x: number; y: number; target: Enemy; tx: number; ty: number; speed: number; dmg: number; kind: "shuriken" | "arrow" | "ice" | "cannon" | "fire" | "heroarrow"; splash: number; slow: number; slowDur: number; freeze: number; attr: Attr; alive: boolean; spin: number; stun: number; arcT: number; arcDur: number; sx: number; sy: number }
interface Fx { kind: "ring" | "pillar" | "bolt" | "flash" | "meteor" | "ice" | "smoke" | "slash" | "heal"; x: number; y: number; t: number; dur: number; r: number; color: string; pts?: Pt[]; tx?: number; ty?: number }
interface FloatText { x: number; y: number; text: string; color: string; t: number; dur: number; size: number }

export interface HudSnapshot {
  minerals: number; hearts: number; wave: number; totalWaves: number; prepTimer: number; waveActive: boolean; paused: boolean; speed: number;
  mode: Mode; selection: Selection; items: Record<ItemId, number>; reinforceCd: number; hero: { name: string; hp: number; maxHp: number; alive: boolean; respawn: number; icon: string } | null;
  enemiesLeft: number; over: BattleResult | null; nextWave: { type: EnemyType; count: number; attr: Attr }[]; kills: number;
  selectedTower: { id: number; name: string; icon: string; level: number; grade: number; attr: Attr; dmg: number; range: number; rate: number; upCost: number; sellValue: number; kills: number; x: number; y: number; maxed: boolean } | null;
  selectedPlot: { idx: number; x: number; y: number } | null;
}

/* ---------------- ÂM THANH (WebAudio synth nhẹ) ---------------- */
class Sound {
  ctx: AudioContext | null = null; enabled = true;
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { return null; } }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }
  tone(f: number, d: number, type: OscillatorType = "square", v = 0.05, slide = 0) {
    if (!this.enabled) return;
    const c = this.ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), c.currentTime + d);
    g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d);
  }
  shoot(k: string) {
    if (k === "cannon") this.tone(120, 0.2, "sawtooth", 0.06, -60);
    else if (k === "icebow") this.tone(900, 0.1, "sine", 0.04, 250);
    else if (k === "magic") this.tone(200, 0.25, "sawtooth", 0.05, 300);
    else if (k === "lightning") this.tone(1400, 0.1, "sawtooth", 0.04, -900);
    else if (k === "shuriken") this.tone(700, 0.05, "square", 0.025, -100);
    else if (k === "thorn") this.tone(160, 0.06, "triangle", 0.02, 40);
    else this.tone(500, 0.06, "square", 0.03, -50);
  }
  coin() { this.tone(1200, 0.08, "sine", 0.04); setTimeout(() => this.tone(1600, 0.1, "sine", 0.04), 60); }
  boom() { this.tone(80, 0.35, "sawtooth", 0.09, -40); }
  leak() { this.tone(280, 0.4, "sawtooth", 0.08, -200); }
  build() { this.tone(520, 0.12, "triangle", 0.06, 140); }
  up() { this.tone(660, 0.1, "triangle", 0.06); setTimeout(() => this.tone(990, 0.15, "triangle", 0.06), 90); }
  wave() { this.tone(440, 0.14, "square", 0.05); setTimeout(() => this.tone(587, 0.2, "square", 0.05), 130); }
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, "triangle", 0.07), i * 140)); }
  lose() { [400, 320, 240, 150].forEach((f, i) => setTimeout(() => this.tone(f, 0.28, "sawtooth", 0.06), i * 170)); }
  hit() { this.tone(300, 0.04, "square", 0.02, -100); }
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/* =====================================================================
   BATTLE
   ===================================================================== */
export class Battle {
  cfg: BattleConfig; region: RegionDef; idx: number; wps: Pt[]; plots: Pt[]; waves: WaveDef[]; totalWaves: number;
  minerals: number; hearts: number; heartsLost = 0; waveIdx = 0; prepTimer = 18; spawnQueue: { type: EnemyType; attr: Attr; t: number; elite?: boolean }[] = []; spawnClock = 0;
  enemies: Enemy[] = []; towers: Tower[] = []; units: Unit[] = []; projs: Proj[] = []; fx: Fx[] = []; texts: FloatText[] = [];
  time = 0; speed = 1; paused = false; over: BattleResult | null = null;
  mode: Mode = { kind: "none" }; selection: Selection = null; hover: Pt | null = null;
  items: Record<ItemId, number>; reinforceCd = 0; hero: Unit | null = null; heroRespawn = 0;
  stats: BattleStats = { towersBuilt: 0, levelUps: 0, meteors: 0, reinforcements: 0, bombs: 0, kills: 0, itemsUsed: { meteor: 0, bomb: 0, heart: 0, mineral: 0 } };
  nextId = 1; shake = 0; bg: HTMLImageElement | null = null; snd = new Sound(); wavesCleared = 0; bossWarn = 0;

  constructor(cfg: BattleConfig) {
    this.cfg = cfg;
    const si = stageInfo(cfg.stage);
    this.region = si.region; this.idx = si.idx;
    this.wps = si.region.waypoints;
    this.plots = generatePlots(this.wps);
    this.waves = generateWaves(cfg.stage);
    this.totalWaves = this.waves.length;
    this.minerals = STARTING_MINERALS(cfg.stage);
    this.hearts = STARTING_HEARTS;
    this.items = { ...cfg.items };
    this.snd.enabled = cfg.sound;
    const img = new Image(); img.src = si.region.bg; img.onload = () => { this.bg = img; };
    if (cfg.hero) this.spawnHero();
  }

  /* ---------------- HERO ---------------- */
  spawnHero() {
    const h = this.cfg.hero!; const d = h.def; const m = 1 + (h.level - 1) * 0.06;
    const vault = this.wps[this.wps.length - 1];
    const near = nearestOnPath({ x: vault.x - 120, y: vault.y }, this.wps).pt;
    const u: Unit = {
      id: this.nextId++, kind: "hero", name: d.name, x: near.x, y: near.y - 30, hx: near.x, hy: near.y - 30, tx: near.x, ty: near.y - 30,
      hp: Math.round(d.hp * m), maxHp: Math.round(d.hp * m), dmg: d.dmg * m, rate: d.rate, cd: 0, range: d.range, melee: d.melee, splash: d.splash, slow: d.slow,
      air: d.air, attr: d.attr, alive: true, speed: d.speed, ttl: Infinity, towerId: 0, dodge: 0, crit: 0.1, instakill: 0, engaged: [], size: 15,
      color: d.color, color2: d.color2, maxEngage: 3, facing: 0, hitFlash: 0,
    };
    this.units.push(u); this.hero = u;
  }

  /* ---------------- API ĐIỀU KHIỂN ---------------- */
  setSound(on: boolean) { this.snd.enabled = on; }
  togglePause() { if (!this.over) this.paused = !this.paused; }
  toggleSpeed() { this.speed = this.speed === 1 ? 2 : 1; }
  selectCard(i: number) {
    if (this.over) return;
    if (this.mode.kind === "build" && this.mode.card === i) this.mode = { kind: "none" };
    else this.mode = { kind: "build", card: i };
    if (this.selection?.kind === "tower") this.selection = null;
  }
  setItemMode(item: "meteor" | "bomb" | "reinforce") {
    if (this.over) return;
    if (item === "reinforce" && this.reinforceCd > 0) return;
    if (item !== "reinforce" && this.items[item] <= 0) return;
    this.mode = this.mode.kind === "item" && this.mode.item === item ? { kind: "none" } : { kind: "item", item };
  }
  setHeroMove() { if (this.hero && this.hero.alive) this.mode = this.mode.kind === "heromove" ? { kind: "none" } : { kind: "heromove" }; }
  cancel() { this.mode = { kind: "none" }; this.selection = null; }
  useInstant(item: "heart" | "mineral") {
    if (this.over || this.items[item] <= 0) return;
    this.items[item]--; this.stats.itemsUsed[item]++;
    if (item === "heart") { this.hearts += 5; this.text(W - 120, 60, "+5 ❤️", "#fb7185", 22); this.addFx("heal", this.wps[this.wps.length - 1].x, this.wps[this.wps.length - 1].y, 0.8, 60, "#fb7185"); }
    else { this.minerals += 250; this.text(120, 60, "+250 💎", "#67e8f9", 22); }
    this.snd.coin();
  }
  callWave() {
    if (this.over || this.waveIdx >= this.totalWaves) return;
    if (this.waveIdx > 0 && this.spawnQueue.length > 0) return; // đang thả wave
    const bonus = this.waveIdx === 0 ? 0 : Math.floor(this.prepTimer * 2.5);
    if (bonus > 0) { this.minerals += bonus; this.text(W / 2, 80, `Gọi sớm +${bonus} 💎`, "#fde047", 22); }
    this.startWave();
  }
  startWave() {
    const wave = this.waves[this.waveIdx];
    this.waveIdx++;
    this.spawnQueue = wave.entries.map((e) => ({ type: e.type, attr: e.attr, t: e.delay, elite: e.elite }));
    this.spawnClock = 0; this.prepTimer = 22;
    this.snd.wave();
    this.text(W / 2, 120, `WAVE ${this.waveIdx} / ${this.totalWaves}`, "#fef3c7", 30);
    if (wave.entries.some((e) => ENEMY_DEFS[e.type].boss)) { this.bossWarn = 3; }
  }

  click(x: number, y: number) {
    if (this.over) return;
    this.snd.ensure();
    const m = this.mode;
    if (m.kind === "item") {
      if (m.item === "meteor") this.castMeteor(x, y);
      else if (m.item === "bomb") this.castBomb(x, y);
      else this.castReinforce(x, y);
      return;
    }
    if (m.kind === "heromove") {
      if (this.hero && this.hero.alive) { this.hero.tx = clamp(x, 20, W - 20); this.hero.ty = clamp(y, 20, H - 20); this.addFx("ring", this.hero.tx, this.hero.ty, 0.5, 18, "#fde047"); }
      this.mode = { kind: "none" }; return;
    }
    // click hero?
    if (this.hero && this.hero.alive && dist({ x, y }, this.hero) < 24) { this.mode = { kind: "heromove" }; this.selection = null; return; }
    // click plot
    const pi = this.plots.findIndex((p) => Math.hypot(p.x - x, p.y - y) < 30);
    if (pi >= 0) {
      const t = this.towers.find((tw) => tw.plot === pi);
      if (t) { this.selection = { kind: "tower", id: t.id }; this.mode = { kind: "none" }; return; }
      if (m.kind === "build") { this.build(pi, m.card); return; }
      this.selection = { kind: "plot", idx: pi }; return;
    }
    this.selection = null;
    if (m.kind === "build") this.mode = { kind: "none" };
  }
  moveTo(x: number, y: number) { this.hover = { x, y }; }
  leave() { this.hover = null; }

  build(plot: number, cardIdx: number) {
    const card = this.cfg.deck[cardIdx]; if (!card) return;
    if (this.towers.some((t) => t.plot === plot)) return;
    const cost = towerCost(card.def, card.grade);
    if (this.minerals < cost) { this.text(this.plots[plot].x, this.plots[plot].y - 30, "Thiếu khoáng!", "#f87171", 16); return; }
    this.minerals -= cost;
    const p = this.plots[plot];
    const rally = nearestOnPath(p, this.wps).pt;
    const t: Tower = { id: this.nextId++, plot, x: p.x, y: p.y, card, def: card.def, level: 1, cd: 0.3, invested: cost, angle: -Math.PI / 2, spin: 0, unitIds: [], respawnT: 0, kills: 0, rally, flash: 0.4 };
    this.towers.push(t); this.stats.towersBuilt++;
    this.snd.build(); this.addFx("ring", p.x, p.y, 0.5, 40, "#fde047");
    for (let i = 0; i < 10; i++) this.addFx("smoke", p.x + (Math.random() - 0.5) * 40, p.y + (Math.random() - 0.5) * 30, 0.6, 8 + Math.random() * 8, "#e7e5e4");
    if (t.def.type === "barracks" || t.def.type === "assassin") this.spawnTowerUnits(t);
    this.selection = { kind: "tower", id: t.id };
    if (this.minerals < cost) this.mode = { kind: "none" };
  }
  levelUp(id: number) {
    const t = this.towers.find((x) => x.id === id); if (!t || t.level >= MAX_INGAME_LEVEL) return;
    const cost = levelUpCost(t.def, t.card.grade, t.level);
    if (this.minerals < cost) { this.text(t.x, t.y - 40, "Thiếu khoáng!", "#f87171", 16); return; }
    this.minerals -= cost; t.invested += cost; t.level++; t.flash = 0.5; this.stats.levelUps++;
    this.snd.up(); this.text(t.x, t.y - 44, `Lv.${t.level}`, "#c084fc", 20); this.addFx("ring", t.x, t.y, 0.6, 46, "#c084fc");
    if (t.def.type === "barracks" || t.def.type === "assassin") {
      for (const uid of t.unitIds) { const u = this.units.find((x) => x.id === uid); if (u && u.alive) { const s = this.unitStatsFor(t); u.maxHp = s.hp; u.hp = Math.min(s.hp, u.hp + s.hp * 0.4); u.dmg = s.dmg; } }
    }
  }
  sell(id: number) {
    const i = this.towers.findIndex((x) => x.id === id); if (i < 0) return;
    const t = this.towers[i]; const v = Math.round(t.invested * 0.7);
    this.minerals += v; this.text(t.x, t.y - 30, `+${v} 💎`, "#4ade80", 18); this.snd.coin();
    for (const uid of t.unitIds) { const u = this.units.find((x) => x.id === uid); if (u) u.alive = false; }
    this.towers.splice(i, 1); this.selection = null;
  }

  /* ---------------- ITEM ---------------- */
  castMeteor(x: number, y: number) {
    if (this.items.meteor <= 0) return;
    this.items.meteor--; this.stats.meteors++; this.stats.itemsUsed.meteor++; this.mode = { kind: "none" };
    this.addFx("meteor", x, y - 320, 0.7, 80, "#f97316", undefined, x, y);
    const dmg = meteorDamage(this.cfg.meteorLevel);
    this.pending.push({ t: this.time + 0.7, fn: () => { this.explode(x, y, 85, dmg, "rock", 0, true); this.shake = 0.5; } });
  }
  castBomb(x: number, y: number) {
    if (this.items.bomb <= 0) return;
    this.items.bomb--; this.stats.bombs++; this.stats.itemsUsed.bomb++; this.mode = { kind: "none" };
    this.explode(x, y, 115, 800, "rock", 2.0, true); this.shake = 0.7;
  }
  castReinforce(x: number, y: number) {
    if (this.reinforceCd > 0) return;
    const np = nearestOnPath({ x, y }, this.wps).pt;
    if (Math.hypot(np.x - x, np.y - y) > 60) { this.text(x, y, "Phải thả lên đường!", "#f87171", 15); return; }
    this.reinforceCd = 25; this.stats.reinforcements++; this.mode = { kind: "none" };
    const hp = 70 + this.cfg.stage * 14, dmg = 4 + this.cfg.stage;
    for (let i = 0; i < 2; i++) {
      const u = this.makeUnit("reinforce", "Viện binh", np.x + (i ? 12 : -12), np.y + (i ? 6 : -6), hp, dmg, 1.0, "paper", 0);
      u.ttl = 20; this.units.push(u);
    }
    this.addFx("ring", np.x, np.y, 0.5, 34, "#4ade80"); this.snd.build();
  }
  pending: { t: number; fn: () => void }[] = [];

  /* ---------------- ĐƠN VỊ (lính / sát thủ / viện binh) ---------------- */
  makeUnit(kind: UnitKind, name: string, x: number, y: number, hp: number, dmg: number, rate: number, attr: Attr, towerId: number): Unit {
    const colors: Record<UnitKind, [string, string]> = { soldier: ["#93c5fd", "#1e3a8a"], knight: ["#e5e7eb", "#374151"], assassin: ["#a78bfa", "#1e1b4b"], reinforce: ["#86efac", "#14532d"], hero: ["#fbbf24", "#92400e"] };
    return { id: this.nextId++, kind, name, x, y, hx: x, hy: y, tx: x, ty: y, hp, maxHp: hp, dmg, rate, cd: 0, range: 40, melee: true, splash: 0, slow: 0, air: false, attr, alive: true, speed: 70, ttl: Infinity, towerId, dodge: 0, crit: 0, instakill: 0, engaged: [], size: 10, color: colors[kind][0], color2: colors[kind][1], maxEngage: 2, facing: 0, hitFlash: 0 };
  }
  unitStatsFor(t: Tower) {
    const g = t.card.grade; const lv = t.level; const meta = 1 + (t.card.level - 1) * 0.05;
    const lm = 1 + (lv - 1) * 0.3;
    if (t.def.type === "barracks") {
      const knight = g >= 2;
      return { hp: Math.round((knight ? 420 : 220) * lm * GRADES[g].mult * meta), dmg: t.def.dmg * lm * GRADES[g].mult * meta * (knight ? 1.5 : 1), kind: (knight ? "knight" : "soldier") as UnitKind, count: 2, name: knight ? "Kỵ sĩ" : "Lính canh" };
    }
    return { hp: Math.round(170 * lm * GRADES[g].mult * meta), dmg: t.def.dmg * lm * GRADES[g].mult * meta, kind: "assassin" as UnitKind, count: 1, name: "Sát thủ" };
  }
  spawnTowerUnits(t: Tower) {
    const s = this.unitStatsFor(t); const g = t.card.grade;
    const a = nearestOnPath(t, this.wps);
    const seg = this.wps[a.seg], seg2 = this.wps[a.seg + 1];
    const dx = seg2.x - seg.x, dy = seg2.y - seg.y; const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    t.unitIds = [];
    for (let i = 0; i < s.count; i++) {
      const off = s.count === 1 ? 0 : i === 0 ? -11 : 11;
      const u = this.makeUnit(s.kind, s.name, t.rally.x + nx * off, t.rally.y + ny * off, s.hp, s.dmg, t.def.rate, t.card.attr, t.id);
      u.x = t.x; u.y = t.y; // chạy từ tháp ra
      if (s.kind === "assassin") { u.dodge = g >= 4 ? 0.45 : g >= 3 ? 0.4 : g >= 2 ? 0.3 : 0.15; u.crit = g >= 3 ? 0.25 : 0.12; u.instakill = g >= 4 ? 0.05 : 0; u.size = 11; }
      if (s.kind === "knight") u.size = 11;
      this.units.push(u); t.unitIds.push(u.id);
    }
  }

  /* ---------------- SÁT THƯƠNG ---------------- */
  damage(e: Enemy, raw: number, attr: Attr, opt: { slow?: number; slowDur?: number; freeze?: number; stun?: number; instakill?: boolean; silent?: boolean; crit?: boolean } = {}) {
    if (!e.alive) return;
    if (opt.instakill && !e.def.boss) { e.hp = 0; this.text(e.x, e.y - 30, "GIẾT NGAY!", "#f43f5e", 18); }
    else if (e.def.armor) { e.hp -= 1; if (!opt.silent) this.text(e.x + (Math.random() - 0.5) * 16, e.y - 24, "-1🛡", "#e7e5e4", 13); }
    else {
      const m = attrMult(attr, e.attr); const d = raw * m * (opt.crit ? 3 : 1);
      e.hp -= d;
      if (!opt.silent && (d >= 8 || m !== 1)) this.text(e.x + (Math.random() - 0.5) * 16, e.y - 22 - Math.random() * 8, `${Math.round(d)}${m > 1 ? "!" : ""}`, opt.crit ? "#f43f5e" : m > 1 ? "#fde047" : m < 1 ? "#9ca3af" : "#fff", m > 1 || opt.crit ? 15 : 12);
    }
    e.flash = 0.12;
    const immune = e.def.type === "ifrit";
    if (opt.slow && !immune) { if (this.time + (opt.slowDur ?? 1.5) > e.slowUntil) { e.slowUntil = this.time + (opt.slowDur ?? 1.5); } e.slowPct = Math.max(e.slowPct, opt.slow); }
    if (opt.freeze && !immune && !e.def.boss) e.freezeUntil = Math.max(e.freezeUntil, this.time + opt.freeze);
    if (opt.stun && !e.def.boss) e.stunUntil = Math.max(e.stunUntil, this.time + opt.stun);
    if (e.hp <= 0) this.kill(e);
  }
  kill(e: Enemy) {
    e.alive = false; this.minerals += e.reward; this.stats.kills++;
    this.text(e.x, e.y - 34, `+${e.reward}`, "#67e8f9", 14);
    for (let i = 0; i < (e.def.boss ? 30 : 8); i++) this.addFx("smoke", e.x + (Math.random() - 0.5) * e.def.size, e.y + (Math.random() - 0.5) * e.def.size, 0.5 + Math.random() * 0.4, 4 + Math.random() * 6, e.def.color);
    if (e.def.boss) { this.addFx("ring", e.x, e.y, 1, 120, "#fde047"); this.shake = 0.6; this.snd.boom(); } else this.snd.coin();
    if (e.def.type === "garuda") { // nổ lửa khi chết → hại lính gần đó
      this.addFx("ring", e.x, e.y, 0.5, 70, "#fb923c");
      for (const u of this.units) if (u.alive && dist(u, e) < 70) { u.hp -= 60; u.hitFlash = 0.2; if (u.hp <= 0) this.unitDie(u); }
    }
    // gỡ khỏi các unit engaged
    for (const u of this.units) u.engaged = u.engaged.filter((id) => id !== e.id);
  }
  explode(x: number, y: number, r: number, dmg: number, attr: Attr, stun: number, neutral: boolean) {
    this.addFx("ring", x, y, 0.5, r, "#fb923c"); this.addFx("flash", x, y, 0.25, r * 0.8, "#fef3c7");
    for (let i = 0; i < 16; i++) this.addFx("smoke", x + (Math.random() - 0.5) * r, y + (Math.random() - 0.5) * r, 0.7, 6 + Math.random() * 10, i % 2 ? "#f97316" : "#57534e");
    this.snd.boom();
    for (const e of this.enemies) if (e.alive && dist(e, { x, y }) <= r + e.def.size * 0.5) this.damage(e, dmg, neutral ? e.attr : attr, { stun });
  }
  unitDie(u: Unit) {
    u.alive = false; u.engaged = [];
    for (const e of this.enemies) if (e.blockedBy === u) e.blockedBy = null;
    this.addFx("smoke", u.x, u.y, 0.6, 14, "#9ca3af");
    if (u.kind === "hero") { this.heroRespawn = 15; this.text(u.x, u.y - 30, `${u.name} gục! Hồi sinh 15s`, "#f87171", 15); }
    else if (u.towerId) { const t = this.towers.find((tw) => tw.id === u.towerId); if (t && t.unitIds.every((id) => !this.units.find((x) => x.id === id)?.alive)) t.respawnT = u.kind === "assassin" ? 14 : 11; }
  }

  /* ---------------- FX ---------------- */
  addFx(kind: Fx["kind"], x: number, y: number, dur: number, r: number, color: string, pts?: Pt[], tx?: number, ty?: number) { this.fx.push({ kind, x, y, t: 0, dur, r, color, pts, tx, ty }); }
  text(x: number, y: number, text: string, color: string, size = 14) { if (this.texts.length > 80) this.texts.shift(); this.texts.push({ x, y, text, color, t: 0, dur: size >= 20 ? 1.6 : 0.8, size }); }

  /* =====================================================================
     UPDATE
     ===================================================================== */
  update(rawDt: number) {
    if (this.paused || this.over) return;
    const dt = Math.min(0.05, rawDt) * this.speed;
    this.time += dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.bossWarn > 0) this.bossWarn -= dt;
    if (this.reinforceCd > 0) this.reinforceCd -= dt;
    // pending
    this.pending = this.pending.filter((p) => { if (this.time >= p.t) { p.fn(); return false; } return true; });

    // wave timer
    if (this.waveIdx < this.totalWaves && this.spawnQueue.length === 0) {
      this.prepTimer -= dt;
      if (this.prepTimer <= 0) this.startWave();
    }
    // spawn
    if (this.spawnQueue.length) {
      this.spawnClock += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].t <= this.spawnClock) { const s = this.spawnQueue.shift()!; this.spawnEnemy(s.type, s.attr, !!s.elite); }
    }
    // hero respawn
    if (this.hero && !this.hero.alive && this.cfg.hero) { this.heroRespawn -= dt; if (this.heroRespawn <= 0) { this.units = this.units.filter((u) => u !== this.hero); this.spawnHero(); this.text(this.hero!.x, this.hero!.y - 30, "Anh hùng trở lại!", "#fde047", 16); } }

    this.updateEnemies(dt);
    this.updateUnits(dt);
    this.updateTowers(dt);
    this.updateProjs(dt);
    // fx
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter((f) => f.t < f.dur);
    for (const t of this.texts) { t.t += dt; t.y -= dt * 28; } this.texts = this.texts.filter((t) => t.t < t.dur);
    this.enemies = this.enemies.filter((e) => e.alive);
    this.units = this.units.filter((u) => u.alive || u.kind === "hero");
    if (this.spawnQueue.length === 0 && this.enemies.length === 0) {
      if (this.wavesCleared < this.waveIdx) { this.wavesCleared = this.waveIdx; if (this.waveIdx < this.totalWaves) { const bonus = 15 + this.waveIdx * 4; this.minerals += bonus; this.text(W / 2, 150, `Wave ${this.waveIdx} sạch! +${bonus} 💎`, "#67e8f9", 20); } }
    }

    // thắng / thua
    if (this.hearts <= 0) this.finish(false);
    else if (this.waveIdx >= this.totalWaves && this.spawnQueue.length === 0 && this.enemies.length === 0) this.finish(true);
  }
  finish(won: boolean) {
    if (this.over) return;
    const stars = !won ? 0 : this.heartsLost === 0 ? 3 : this.heartsLost <= 3 ? 2 : 1;
    this.over = { won, stars, heartsLost: this.heartsLost, wavesCleared: this.wavesCleared, totalWaves: this.totalWaves, stats: this.stats, minerals: Math.floor(this.minerals) };
    if (won) this.snd.win(); else this.snd.lose();
  }

  spawnEnemy(type: EnemyType, attr: Attr, elite: boolean) {
    const d = ENEMY_DEFS[type];
    const mul = d.boss && !elite ? 1 : enemyHpMul(this.cfg.stage, this.waveIdx) * (elite ? 0.32 : 1);
    const hp = d.armor ? Math.round(d.hp + this.idx * 2) : Math.round(d.hp * mul);
    const e: Enemy = {
      id: this.nextId++, def: d, attr, x: this.wps[0].x, y: this.wps[0].y + (Math.random() - 0.5) * 20, hp, maxHp: hp, speed: d.speed * (1 + this.idx * 0.04),
      wp: 1, progress: 0, alive: true, slowUntil: 0, slowPct: 0, stunUntil: 0, freezeUntil: 0, blockedBy: null, atkTimer: 1, elite,
      reward: Math.round(d.reward * (elite ? 0.35 : 1)), leakDmg: d.boss ? (elite ? 3 : 999) : 1, wobble: Math.random() * 6, flash: 0, dirX: 1, dirY: 0, burn: 0, burnDmg: 0, burnAttr: attr, leaked: false,
    };
    this.enemies.push(e);
  }

  updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.wobble += dt * 7; if (e.flash > 0) e.flash -= dt;
      // thiêu đốt
      if (e.burn > 0) { e.burn -= dt; if (Math.floor((e.burn + dt) * 2) !== Math.floor(e.burn * 2)) this.damage(e, e.burnDmg, e.burnAttr, { silent: true }); }
      const frozen = this.time < e.freezeUntil || this.time < e.stunUntil;
      if (frozen) continue;
      // chặn bởi lính
      if (!e.def.air) {
        if (e.blockedBy && (!e.blockedBy.alive || dist(e, e.blockedBy) > 46)) { if (e.blockedBy.alive) e.blockedBy.engaged = e.blockedBy.engaged.filter((id) => id !== e.id); e.blockedBy = null; }
        if (!e.blockedBy) {
          for (const u of this.units) {
            if (!u.alive || !u.melee || u.engaged.length >= u.maxEngage) continue;
            if (dist(e, u) < 30 + e.def.size * 0.4) { e.blockedBy = u; u.engaged.push(e.id); break; }
          }
        }
        if (e.blockedBy) {
          e.atkTimer -= dt;
          if (e.atkTimer <= 0) {
            e.atkTimer = 1.0; const u = e.blockedBy;
            if (u.dodge > 0 && Math.random() < u.dodge) { this.text(u.x, u.y - 22, "NÉ", "#c4b5fd", 12); }
            else { u.hp -= e.def.atk; u.hitFlash = 0.15; this.addFx("slash", u.x, u.y, 0.2, 14, "#f87171"); if (u.hp <= 0) this.unitDie(u); }
          }
          continue;
        }
        // giẫm đạp unit không chặn (hero bắn xa) khi đi ngang
        for (const u of this.units) if (u.alive && !u.melee && dist(e, u) < 26) { e.atkTimer -= dt; if (e.atkTimer <= 0) { e.atkTimer = 1; u.hp -= e.def.atk; u.hitFlash = 0.15; if (u.hp <= 0) this.unitDie(u); } }
      }
      // di chuyển
      const slowed = this.time < e.slowUntil;
      if (!slowed) e.slowPct = 0;
      const sp = e.speed * (slowed ? 1 - e.slowPct : 1);
      let remain = sp * dt;
      while (remain > 0 && e.wp < this.wps.length) {
        const w = this.wps[e.wp]; const dx = w.x - e.x, dy = w.y - e.y; const d = Math.hypot(dx, dy);
        if (d <= remain) { e.x = w.x; e.y = w.y; e.progress += d; remain -= d; e.wp++; }
        else { e.dirX = dx / d; e.dirY = dy / d; e.x += e.dirX * remain; e.y += e.dirY * remain; e.progress += remain; remain = 0; }
      }
      if (e.wp >= this.wps.length) {
        e.alive = false; e.leaked = true;
        const dmg = Math.min(this.hearts, e.leakDmg);
        this.hearts -= dmg; this.heartsLost += dmg;
        const v = this.wps[this.wps.length - 1];
        this.text(v.x, v.y - 50, e.def.boss && !e.elite ? "BOSS CƯỚP VÀNG!" : `-${dmg} ❤️`, "#f87171", e.def.boss ? 26 : 20);
        this.addFx("ring", v.x, v.y, 0.6, 60, "#ef4444"); this.snd.leak(); this.shake = Math.max(this.shake, 0.4);
        for (const u of this.units) u.engaged = u.engaged.filter((id) => id !== e.id);
      }
    }
  }

  updateUnits(dt: number) {
    for (const u of this.units) {
      if (!u.alive) continue;
      if (u.hitFlash > 0) u.hitFlash -= dt;
      if (u.ttl !== Infinity) { u.ttl -= dt; if (u.ttl <= 0) { u.alive = false; this.addFx("smoke", u.x, u.y, 0.5, 12, "#86efac"); for (const e of this.enemies) if (e.blockedBy === u) e.blockedBy = null; continue; } }
      u.engaged = u.engaged.filter((id) => { const e = this.enemies.find((x) => x.id === id); return e && e.alive; });
      // di chuyển tới mục tiêu / về vị trí
      const goal = u.kind === "hero" ? { x: u.tx, y: u.ty } : { x: u.hx, y: u.hy };
      const dg = dist(u, goal);
      if (dg > 3 && (u.engaged.length === 0 || u.kind === "hero")) {
        const st = Math.min(dg, u.speed * dt * (u.kind === "hero" ? 1 : 1.4));
        u.x += ((goal.x - u.x) / dg) * st; u.y += ((goal.y - u.y) / dg) * st; u.facing = Math.atan2(goal.y - u.y, goal.x - u.x);
        if (u.kind === "hero" && dg > 30) continue; // hero đang chạy thì không đánh
      }
      u.cd -= dt;
      if (u.cd > 0) continue;
      // chọn mục tiêu
      let target: Enemy | null = null;
      if (u.melee) {
        for (const id of u.engaged) { const e = this.enemies.find((x) => x.id === id); if (e && e.alive) { target = e; break; } }
        if (!target) { let best = 1e9; for (const e of this.enemies) { if (!e.alive) continue; if (e.def.air && !u.air) continue; const d = dist(u, e); if (d < (e.def.air ? 60 : u.range + e.def.size * 0.5) && d < best) { best = d; target = e; } } }
      } else {
        let best = -1; for (const e of this.enemies) { if (!e.alive) continue; if (e.def.air && !u.air) continue; if (dist(u, e) <= u.range && e.progress > best) { best = e.progress; target = e; } }
      }
      if (!target) continue;
      u.cd = 1 / u.rate; u.facing = Math.atan2(target.y - u.y, target.x - u.x);
      if (u.melee) {
        const crit = u.crit > 0 && Math.random() < u.crit;
        const ik = u.instakill > 0 && Math.random() < u.instakill;
        this.addFx("slash", target.x, target.y, 0.18, 16 + u.size, u.kind === "hero" ? "#fde047" : "#e0f2fe");
        if (u.splash > 0) { for (const e of this.enemies) if (e.alive && (!e.def.air || u.air) && dist(u, e) <= u.splash + e.def.size * 0.5) this.damage(e, u.dmg, u.attr, { slow: u.slow || undefined, slowDur: 1.2, crit }); this.addFx("ring", u.x, u.y, 0.3, u.splash, u.color); }
        else this.damage(target, u.dmg, u.attr, { crit, instakill: ik });
        this.snd.hit();
      } else {
        this.projs.push({ x: u.x, y: u.y - 10, target, tx: target.x, ty: target.y, speed: 420, dmg: u.dmg, kind: u.splash > 0 ? "fire" : "heroarrow", splash: u.splash, slow: 0, slowDur: 0, freeze: 0, attr: u.attr, alive: true, spin: 0, stun: 0, arcT: 0, arcDur: 0, sx: u.x, sy: u.y });
        this.snd.shoot(u.splash > 0 ? "magic" : "shuriken");
      }
    }
  }

  towerStats(t: Tower) {
    const g = GRADES[t.card.grade].mult; const meta = 1 + (t.card.level - 1) * 0.05; const lv = 1 + (t.level - 1) * 0.3; const set = t.card.setBonus ? 1.2 : 1;
    return { dmg: t.def.dmg * g * meta * lv * set, range: t.def.range + (t.level - 1) * 6, rate: t.def.rate * (1 + (t.level - 1) * 0.06) };
  }
  updateTowers(dt: number) {
    for (const t of this.towers) {
      if (t.flash > 0) t.flash -= dt;
      t.spin += dt * 4;
      const ty = t.def.type;
      if (ty === "barracks" || ty === "assassin") {
        const alive = t.unitIds.some((id) => this.units.find((u) => u.id === id)?.alive);
        if (!alive) { t.respawnT -= dt; if (t.respawnT <= 0) { this.spawnTowerUnits(t); t.respawnT = 0; } }
        continue;
      }
      t.cd -= dt;
      const st = this.towerStats(t);
      const g = t.card.grade;
      const inRange = this.enemies.filter((e) => e.alive && (t.def.target === "both" || (t.def.target === "air") === !!e.def.air) && dist(t, e) <= st.range + e.def.size * 0.4);
      if (inRange.length === 0) continue;
      inRange.sort((a, b) => b.progress - a.progress);
      const main = inRange[0];
      t.angle = Math.atan2(main.y - t.y, main.x - t.x);
      if (t.cd > 0) continue;
      t.cd = 1 / st.rate;
      const attr = t.card.attr;
      this.snd.shoot(ty);
      if (ty === "shuriken") {
        const n = g >= 4 ? 3 : g >= 2 ? 2 : 1;
        for (let i = 0; i < Math.min(n, inRange.length); i++) this.projs.push(this.mkProj(t, inRange[i], "shuriken", 520, st.dmg, 0, 0, 0, 0, attr));
      } else if (ty === "icebow") {
        const chance = g >= 2 ? 1 : g >= 1 ? 0.6 : 0.3;
        const ice = Math.random() < chance;
        const p = this.mkProj(t, main, ice ? "ice" : "arrow", 480, st.dmg, ice && g >= 3 ? 40 : 0, ice ? 0.35 + g * 0.03 : 0, 1.6, g >= 3 && ice ? 0.6 : 0, attr);
        if (g >= 4 && ice && !main.def.boss && !main.def.armor) p.dmg = 99999; // 1 phát 1 mạng quái thường
        this.projs.push(p);
      } else if (ty === "magic") {
        const r = (t.def.splash ?? 60) + (g >= 2 ? 15 : 0) + (t.level - 1) * 3;
        this.addFx("pillar", main.x, main.y, 0.5, r, g >= 3 ? "#c026d3" : "#f97316");
        for (const e of this.enemies) if (e.alive && (t.def.target === "both") && dist(e, main) <= r + e.def.size * 0.4) {
          this.damage(e, st.dmg, attr);
          if (g >= 3) { e.burn = 2; e.burnDmg = st.dmg * 0.25; e.burnAttr = attr; }
        }
        if (g >= 4) { this.pending.push({ t: this.time + 0.25, fn: () => { this.addFx("pillar", main.x, main.y, 0.4, r, "#e879f9"); for (const e of this.enemies) if (e.alive && dist(e, main) <= r) this.damage(e, st.dmg * 0.6, attr, { silent: true }); } }); }
      } else if (ty === "cannon") {
        const p = this.mkProj(t, main, "cannon", 300, st.dmg, (t.def.splash ?? 55) + (g >= 2 ? 15 : 0) + (g >= 4 ? 25 : 0) + (t.level - 1) * 4, 0, 0, 0, attr);
        p.stun = g >= 3 ? 0.3 : 0; p.arcDur = dist(t, main) / 300; p.arcT = 0;
        this.projs.push(p);
      } else if (ty === "lightning") {
        const chain = g >= 4 ? 4 : g >= 3 ? 3 : g >= 2 ? 2 : 1;
        const targets = inRange.slice(0, chain);
        let px = t.x, py = t.y - 34;
        targets.forEach((e, i) => {
          const pts: Pt[] = []; const segs = 7;
          for (let s = 0; s <= segs; s++) { const k = s / segs; pts.push({ x: px + (e.x - px) * k + (s && s < segs ? (Math.random() - 0.5) * 22 : 0), y: py + (e.y - py) * k + (s && s < segs ? (Math.random() - 0.5) * 22 : 0) }); }
          this.addFx("bolt", 0, 0, 0.18, 0, i === 0 ? "#fef08a" : "#a5f3fc", pts);
          this.damage(e, st.dmg * Math.pow(0.8, i), attr, { stun: g >= 4 ? 0.25 : 0 });
          px = e.x; py = e.y;
        });
      } else if (ty === "thorn") {
        const slow = [0.15, 0.2, 0.25, 0.35, 0.45][g];
        for (const e of inRange) { this.damage(e, st.dmg, attr, { slow, slowDur: 0.8, silent: Math.random() < 0.7 }); this.addFx("slash", e.x + (Math.random() - 0.5) * 10, e.y + 6, 0.2, 10, g >= 3 ? "#c084fc" : "#4ade80"); }
        this.addFx("ring", t.x, t.y, 0.35, st.range, g >= 3 ? "rgba(192,132,252,0.6)" : "rgba(74,222,128,0.6)");
      }
    }
  }
  mkProj(t: Tower, e: Enemy, kind: Proj["kind"], speed: number, dmg: number, splash: number, slow: number, slowDur: number, freeze: number, attr: Attr): Proj {
    const mx = t.x + Math.cos(t.angle) * 16, my = t.y - 14 + Math.sin(t.angle) * 16;
    return { x: mx, y: my, target: e, tx: e.x, ty: e.y, speed, dmg, kind, splash, slow, slowDur, freeze, attr, alive: true, spin: 0, stun: 0, arcT: 0, arcDur: 0, sx: mx, sy: my };
  }
  updateProjs(dt: number) {
    for (const p of this.projs) {
      p.spin += dt * 20;
      if (p.target.alive) { p.tx = p.target.x; p.ty = p.target.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y; const d = Math.hypot(dx, dy); const st = p.speed * dt;
      if (p.kind === "cannon") { p.arcT += dt; }
      if (d <= Math.max(6, st)) {
        p.alive = false;
        if (p.splash > 0) {
          this.addFx("ring", p.tx, p.ty, 0.4, p.splash, p.kind === "ice" ? "#a5f3fc" : p.kind === "fire" ? "#f87171" : "#fbbf24");
          if (p.kind === "cannon") { this.snd.boom(); for (let i = 0; i < 8; i++) this.addFx("smoke", p.tx + (Math.random() - 0.5) * 30, p.ty + (Math.random() - 0.5) * 30, 0.5, 6 + Math.random() * 8, "#57534e"); }
          for (const e of this.enemies) if (e.alive && dist(e, { x: p.tx, y: p.ty }) <= p.splash + e.def.size * 0.4) this.damage(e, p.dmg, p.attr, { slow: p.slow || undefined, slowDur: p.slowDur, freeze: p.freeze || undefined, stun: p.stun || undefined });
        } else if (p.target.alive) {
          this.damage(p.target, p.dmg, p.attr, { slow: p.slow || undefined, slowDur: p.slowDur, freeze: p.freeze || undefined });
          if (p.kind === "ice") this.addFx("ice", p.tx, p.ty, 0.35, 14, "#a5f3fc");
        }
      } else { p.x += (dx / d) * st; p.y += (dy / d) * st; }
    }
    this.projs = this.projs.filter((p) => p.alive);
  }

  /* =====================================================================
     HUD SNAPSHOT
     ===================================================================== */
  hud(): HudSnapshot {
    const sel = this.selection;
    let selectedTower: HudSnapshot["selectedTower"] = null, selectedPlot: HudSnapshot["selectedPlot"] = null;
    if (sel?.kind === "tower") {
      const t = this.towers.find((x) => x.id === sel.id);
      if (t) { const st = this.towerStats(t); selectedTower = { id: t.id, name: t.def.name, icon: t.def.icon, level: t.level, grade: t.card.grade, attr: t.card.attr, dmg: Math.round(st.dmg), range: Math.round(st.range), rate: +st.rate.toFixed(1), upCost: levelUpCost(t.def, t.card.grade, t.level), sellValue: Math.round(t.invested * 0.7), kills: t.kills, x: t.x, y: t.y, maxed: t.level >= MAX_INGAME_LEVEL }; }
      else this.selection = null;
    } else if (sel?.kind === "plot") selectedPlot = { idx: sel.idx, x: this.plots[sel.idx].x, y: this.plots[sel.idx].y };
    const nextWave: HudSnapshot["nextWave"] = [];
    if (this.waveIdx < this.totalWaves) {
      const w = this.waves[this.waveIdx]; const m = new Map<string, { type: EnemyType; count: number; attr: Attr }>();
      for (const e of w.entries) { const k = e.type; const cur = m.get(k); if (cur) cur.count++; else m.set(k, { type: e.type, count: 1, attr: e.attr }); }
      nextWave.push(...m.values());
    }
    return {
      minerals: Math.floor(this.minerals), hearts: this.hearts, wave: this.waveIdx, totalWaves: this.totalWaves, prepTimer: Math.max(0, this.prepTimer), waveActive: this.spawnQueue.length > 0 || this.enemies.length > 0,
      paused: this.paused, speed: this.speed, mode: this.mode, selection: this.selection, items: { ...this.items }, reinforceCd: Math.max(0, this.reinforceCd),
      hero: this.hero ? { name: this.hero.name, hp: Math.max(0, Math.round(this.hero.hp)), maxHp: this.hero.maxHp, alive: this.hero.alive, respawn: Math.max(0, this.heroRespawn), icon: this.cfg.hero?.def.icon ?? "🛡️" } : null,
      enemiesLeft: this.enemies.length + this.spawnQueue.length, over: this.over, nextWave, kills: this.stats.kills, selectedTower, selectedPlot,
    };
  }

  /* =====================================================================
     RENDER
     ===================================================================== */
  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake * 16, (Math.random() - 0.5) * this.shake * 16);
    // nền
    if (this.bg) ctx.drawImage(this.bg, -10, -10, W + 20, H + 20); else { ctx.fillStyle = this.region.fallback; ctx.fillRect(-10, -10, W + 20, H + 20); }
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(-10, -10, W + 20, H + 20);
    this.drawRoad(ctx);
    this.drawPortal(ctx); this.drawVault(ctx);
    this.drawPlots(ctx);
    // xếp theo y để có chiều sâu
    const ground = this.enemies.filter((e) => !e.def.air);
    const air = this.enemies.filter((e) => e.def.air);
    for (const t of this.towers) this.drawTower(ctx, t);
    const layer: { y: number; f: () => void }[] = [];
    for (const u of this.units) if (u.alive) layer.push({ y: u.y, f: () => this.drawUnit(ctx, u) });
    for (const e of ground) layer.push({ y: e.y, f: () => this.drawEnemy(ctx, e) });
    layer.sort((a, b) => a.y - b.y).forEach((l) => l.f());
    for (const p of this.projs) this.drawProj(ctx, p);
    for (const f of this.fx) this.drawFx(ctx, f);
    for (const e of air) this.drawEnemy(ctx, e);
    this.drawOverlay(ctx);
    for (const t of this.texts) {
      const a = 1 - t.t / t.dur; ctx.globalAlpha = Math.max(0, a);
      ctx.font = `bold ${t.size}px "Be Vietnam Pro", sans-serif`; ctx.textAlign = "center";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,0.75)"; ctx.strokeText(t.text, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
      ctx.globalAlpha = 1;
    }
    if (this.bossWarn > 0) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.time * 12); ctx.font = "900 46px Cinzel, serif"; ctx.textAlign = "center"; ctx.fillStyle = "#ef4444"; ctx.strokeStyle = "#000"; ctx.lineWidth = 6; ctx.strokeText("⚠ BOSS XUẤT HIỆN ⚠", W / 2, H / 2 - 40); ctx.fillText("⚠ BOSS XUẤT HIỆN ⚠", W / 2, H / 2 - 40); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  drawRoad(ctx: CanvasRenderingContext2D) {
    const path = () => { ctx.beginPath(); this.wps.forEach((w, i) => (i ? ctx.lineTo(w.x, w.y) : ctx.moveTo(w.x, w.y))); };
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    path(); ctx.lineWidth = 70; ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.stroke();
    path(); ctx.lineWidth = 64; ctx.strokeStyle = this.region.roadEdge; ctx.stroke();
    path(); ctx.lineWidth = 54; ctx.strokeStyle = this.region.road; ctx.stroke();
    // đá lát rải rác
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    for (let i = 0; i < this.wps.length - 1; i++) {
      const a = this.wps[i], b = this.wps[i + 1]; const l = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = 20; d < l; d += 34) { const k = d / l; const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k; ctx.beginPath(); ctx.ellipse(x + ((i * 7 + d) % 13) - 6, y + ((d * 3) % 17) - 8, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // mũi tên hướng đi
    path(); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,240,200,0.28)"; ctx.setLineDash([14, 22]); ctx.lineDashOffset = -this.time * 40; ctx.stroke(); ctx.setLineDash([]);
  }
  drawPortal(ctx: CanvasRenderingContext2D) {
    const s = this.wps[0]; const x = clamp(s.x, 30, W - 30), y = clamp(s.y, 30, H - 30);
    const g = ctx.createRadialGradient(x, y, 4, x, y, 60); g.addColorStop(0, "rgba(168,85,247,0.7)"); g.addColorStop(1, "rgba(168,85,247,0)");
    ctx.fillStyle = g; ctx.fillRect(x - 60, y - 60, 120, 120);
    ctx.save(); ctx.translate(x, y); ctx.rotate(this.time);
    ctx.strokeStyle = "rgba(216,180,254,0.8)"; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 18 + i * 8, i, i + 2.4); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = "#e9d5ff"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("CỔNG QUÁI", x, y + 52);
  }
  drawVault(ctx: CanvasRenderingContext2D) {
    const v = this.wps[this.wps.length - 1];
    const g = ctx.createRadialGradient(v.x, v.y, 5, v.x, v.y, 80); g.addColorStop(0, "rgba(253,224,71,0.55)"); g.addColorStop(1, "rgba(253,224,71,0)");
    ctx.fillStyle = g; ctx.fillRect(v.x - 80, v.y - 80, 160, 160);
    // đống vàng
    const coins = [[0, 6, 30], [-18, 12, 16], [18, 12, 16], [-8, -4, 14], [10, -6, 15], [0, -14, 12]];
    for (const [ox, oy, r] of coins) { const cg = ctx.createRadialGradient(v.x + ox - r * 0.3, v.y + oy - r * 0.3, 2, v.x + ox, v.y + oy, r); cg.addColorStop(0, "#fef3c7"); cg.addColorStop(0.5, "#fbbf24"); cg.addColorStop(1, "#b45309"); ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(v.x + ox, v.y + oy, r, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
    // rương
    ctx.fillStyle = "#7c2d12"; ctx.fillRect(v.x - 22, v.y - 34, 44, 26); ctx.fillStyle = "#fbbf24"; ctx.fillRect(v.x - 22, v.y - 24, 44, 4); ctx.fillRect(v.x - 4, v.y - 34, 8, 26);
    // cờ vàng
    ctx.strokeStyle = "#78350f"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(v.x + 30, v.y + 10); ctx.lineTo(v.x + 30, v.y - 62); ctx.stroke();
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.moveTo(v.x + 30, v.y - 62); ctx.lineTo(v.x + 62 + Math.sin(this.time * 5) * 3, v.y - 52); ctx.lineTo(v.x + 30, v.y - 42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fef3c7"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("KHO VÀNG", v.x, v.y + 50);
    // tim
    ctx.font = "bold 13px sans-serif"; ctx.fillStyle = this.hearts <= 3 ? "#f87171" : "#fecaca"; ctx.fillText(`❤️ ${this.hearts}`, v.x, v.y + 66);
  }
  drawPlots(ctx: CanvasRenderingContext2D) {
    const buildCard = this.mode.kind === "build" ? this.cfg.deck[this.mode.card] : null;
    this.plots.forEach((p, i) => {
      const built = this.towers.some((t) => t.plot === i);
      const hov = this.hover && Math.hypot(this.hover.x - p.x, this.hover.y - p.y) < 30;
      const sel = this.selection?.kind === "plot" && this.selection.idx === i;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 27, 20, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();
      const g = ctx.createRadialGradient(p.x - 6, p.y - 6, 2, p.x, p.y, 27); g.addColorStop(0, built ? "#57534e" : "#a8a29e"); g.addColorStop(1, built ? "#292524" : "#57534e");
      ctx.beginPath(); ctx.ellipse(p.x, p.y, 27, 21, 0, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = sel || (hov && !built) ? 3 : 1.5; ctx.strokeStyle = sel ? "#fde047" : hov && !built ? (buildCard ? "#4ade80" : "#fef3c7") : "rgba(0,0,0,0.5)"; ctx.stroke();
      if (!built) {
        // cờ nhỏ đánh dấu ô trống
        ctx.strokeStyle = "#78350f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y + 6); ctx.lineTo(p.x, p.y - 22); ctx.stroke();
        ctx.fillStyle = buildCard ? "#4ade80" : "#fbbf24"; ctx.beginPath(); ctx.moveTo(p.x, p.y - 22); ctx.lineTo(p.x + 14, p.y - 16); ctx.lineTo(p.x, p.y - 10); ctx.closePath(); ctx.fill();
        if (buildCard && hov) {
          ctx.globalAlpha = 0.5; this.drawTowerBody(ctx, p.x, p.y, buildCard.type, buildCard.grade, 1, -Math.PI / 2, 0); ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, buildCard.def.range, 0, Math.PI * 2); ctx.fillStyle = "rgba(74,222,128,0.08)"; ctx.fill(); ctx.strokeStyle = "rgba(74,222,128,0.5)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
        }
      }
    });
  }
  attrBadge(ctx: CanvasRenderingContext2D, x: number, y: number, attr: Attr, r = 8) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = ATTR_INFO[attr].color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.stroke();
    ctx.font = `${r * 1.25}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#000"; ctx.fillText(ATTR_INFO[attr].icon, x, y + 1); ctx.textBaseline = "alphabetic";
  }
  drawTower(ctx: CanvasRenderingContext2D, t: Tower) {
    const sel = this.selection?.kind === "tower" && this.selection.id === t.id;
    const st = this.towerStats(t);
    if (sel) { ctx.beginPath(); ctx.arc(t.x, t.y, st.range, 0, Math.PI * 2); ctx.fillStyle = "rgba(253,224,71,0.07)"; ctx.fill(); ctx.strokeStyle = "rgba(253,224,71,0.55)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
    // vòng cấp
    ctx.beginPath(); ctx.ellipse(t.x, t.y, 27, 21, 0, 0, Math.PI * 2); ctx.lineWidth = sel ? 3.5 : 2.5; ctx.strokeStyle = sel ? "#fde047" : GRADES[t.card.grade].color; ctx.stroke();
    this.drawTowerBody(ctx, t.x, t.y, t.def.type, t.card.grade, t.level, t.angle, t.spin);
    if (t.flash > 0) { ctx.globalAlpha = t.flash; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(t.x, t.y - 10, 30, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    this.attrBadge(ctx, t.x + 20, t.y - 30, t.card.attr, 8);
    // chấm cấp độ
    for (let i = 0; i < t.level; i++) { ctx.fillStyle = "#fef08a"; ctx.beginPath(); ctx.arc(t.x - (t.level - 1) * 4 + i * 8, t.y + 27, 2.4, 0, Math.PI * 2); ctx.fill(); }
    if (t.def.type === "barracks" || t.def.type === "assassin") {
      const alive = t.unitIds.some((id) => this.units.find((u) => u.id === id)?.alive);
      if (!alive && t.respawnT > 0) { ctx.fillStyle = "#fff"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(`⟳ ${Math.ceil(t.respawnT)}s`, t.x, t.y - 36); }
    }
  }
  drawTowerBody(ctx: CanvasRenderingContext2D, x: number, y: number, type: TowerType, grade: number, level: number, angle: number, spin: number) {
    const s = 1 + (level - 1) * 0.06; const gc = GRADES[grade].color;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // bệ đá
    ctx.fillStyle = "#3f3f46"; ctx.beginPath(); ctx.ellipse(0, 2, 20, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#71717a"; ctx.beginPath(); ctx.ellipse(0, -2, 20, 15, 0, 0, Math.PI * 2); ctx.fill();
    if (type === "shuriken") {
      ctx.fillStyle = "#7c2d12"; ctx.fillRect(-9, -30, 18, 30); ctx.fillStyle = "#9a3412"; ctx.fillRect(-11, -34, 22, 6);
      ctx.save(); ctx.translate(0, -40); ctx.rotate(spin * 2);
      ctx.fillStyle = grade >= 3 ? gc : "#e2e8f0"; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, -6); ctx.lineTo(0, -14); ctx.lineTo(-4, -6); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = "#334155"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (type === "icebow") {
      ctx.fillStyle = "#164e63"; ctx.beginPath(); ctx.moveTo(-12, -2); ctx.lineTo(0, -34); ctx.lineTo(12, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#a5f3fc"; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(0, -30); ctx.lineTo(6, -4); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.translate(0, -22); ctx.rotate(angle); ctx.strokeStyle = grade >= 3 ? gc : "#67e8f9"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 12, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = "#e0f2fe"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, -11); ctx.lineTo(-4, 0); ctx.lineTo(4, 11); ctx.stroke(); ctx.restore();
    } else if (type === "magic") {
      ctx.fillStyle = "#3b0764"; ctx.fillRect(-8, -30, 16, 30); ctx.fillStyle = "#581c87"; ctx.fillRect(-11, -8, 22, 6);
      const pulse = 8 + Math.sin(spin * 2) * 1.5;
      const og = ctx.createRadialGradient(0, -38, 1, 0, -38, pulse); og.addColorStop(0, "#fff7ed"); og.addColorStop(0.5, grade >= 3 ? "#e879f9" : "#fb923c"); og.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(0, -38, pulse + 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = grade >= 3 ? "#c026d3" : "#f97316"; for (let i = 0; i < 3; i++) { const a = spin + (i * Math.PI * 2) / 3; ctx.beginPath(); ctx.arc(Math.cos(a) * 10, -38 + Math.sin(a) * 6, 2.5, 0, Math.PI * 2); ctx.fill(); }
    } else if (type === "cannon") {
      ctx.fillStyle = "#292524"; ctx.beginPath(); ctx.arc(0, -12, 13, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(0, -12); ctx.rotate(angle); const cg = ctx.createLinearGradient(0, -7, 0, 7); cg.addColorStop(0, "#57534e"); cg.addColorStop(1, "#0c0a09"); ctx.fillStyle = cg; ctx.fillRect(0, -6, 26, 12); ctx.fillStyle = grade >= 3 ? gc : "#fbbf24"; ctx.fillRect(22, -7, 5, 14); ctx.restore();
      ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(0, -12, 5, 0, Math.PI * 2); ctx.fill();
    } else if (type === "lightning") {
      ctx.fillStyle = "#713f12"; ctx.fillRect(-5, -44, 10, 44); ctx.fillStyle = "#a16207"; ctx.fillRect(-14, -50, 28, 9); ctx.fillStyle = "#fde047"; ctx.fillRect(-14, -50, 28, 3);
      const pulse = 4 + Math.sin(spin * 3) * 1.5; ctx.save(); ctx.shadowColor = "#fde047"; ctx.shadowBlur = 14; ctx.fillStyle = "#fefce8"; ctx.beginPath(); ctx.arc(0, -56, pulse, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.strokeStyle = grade >= 3 ? gc : "#fde047"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-8, -60); ctx.lineTo(-3, -54); ctx.lineTo(-6, -50); ctx.stroke(); ctx.beginPath(); ctx.moveTo(8, -60); ctx.lineTo(3, -54); ctx.lineTo(6, -50); ctx.stroke();
    } else if (type === "thorn") {
      ctx.fillStyle = grade >= 3 ? "#6b21a8" : "#166534"; ctx.beginPath(); ctx.ellipse(0, -8, 17, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = grade >= 3 ? "#c084fc" : "#4ade80";
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + spin * 0.3; const r = 10 + (i % 2) * 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, -8 + Math.sin(a) * 4); ctx.lineTo(Math.cos(a) * r + 3, -8 + Math.sin(a) * r * 0.7 - 10); ctx.lineTo(Math.cos(a) * r - 3, -8 + Math.sin(a) * r * 0.7 - 10); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = grade >= 3 ? "#e9d5ff" : "#bbf7d0"; ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(4, -20); ctx.lineTo(-4, -20); ctx.closePath(); ctx.fill();
    } else if (type === "barracks") {
      ctx.fillStyle = grade >= 2 ? "#cbd5e1" : "#93c5fd"; ctx.beginPath(); ctx.moveTo(-20, -4); ctx.lineTo(0, -36); ctx.lineTo(20, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = grade >= 2 ? "#475569" : "#1e40af"; ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(0, -18); ctx.lineTo(8, -4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#78350f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -52); ctx.stroke(); ctx.fillStyle = gc; ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(12, -47); ctx.lineTo(0, -42); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = "#1e1b4b"; ctx.fillRect(-14, -28, 28, 28); ctx.fillStyle = "#312e81"; ctx.beginPath(); ctx.moveTo(-17, -28); ctx.lineTo(0, -44); ctx.lineTo(17, -28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#0f0e2a"; ctx.fillRect(-5, -16, 10, 16); ctx.fillStyle = grade >= 3 ? gc : "#a78bfa"; ctx.beginPath(); ctx.arc(-6, -22, 1.8, 0, Math.PI * 2); ctx.arc(6, -22, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#c4b5fd"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, -40); ctx.lineTo(20, -52); ctx.stroke();
    }
    ctx.restore();
  }
  drawUnit(ctx: CanvasRenderingContext2D, u: Unit) {
    const hero = u.kind === "hero";
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(u.x, u.y + u.size * 0.9, u.size, u.size * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    if (hero) { ctx.beginPath(); ctx.arc(u.x, u.y + u.size * 0.8, u.size + 6, 0, Math.PI * 2); ctx.strokeStyle = this.mode.kind === "heromove" ? "#fde047" : "rgba(253,224,71,0.45)"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }
    const bob = Math.sin(this.time * 8 + u.id) * 1.2;
    // thân
    const g = ctx.createRadialGradient(u.x - 3, u.y - 3 + bob, 1, u.x, u.y + bob, u.size); g.addColorStop(0, u.hitFlash > 0 ? "#fff" : u.color); g.addColorStop(1, u.color2);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(u.x, u.y + bob, u.size, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
    // đầu
    ctx.fillStyle = u.kind === "assassin" ? "#1e1b4b" : "#fcd9b6"; ctx.beginPath(); ctx.arc(u.x, u.y - u.size * 0.9 + bob, u.size * 0.55, 0, Math.PI * 2); ctx.fill();
    if (u.kind === "soldier" || u.kind === "knight" || u.kind === "reinforce") { ctx.fillStyle = u.kind === "knight" ? "#94a3b8" : u.kind === "reinforce" ? "#166534" : "#1d4ed8"; ctx.beginPath(); ctx.arc(u.x, u.y - u.size * 0.95 + bob, u.size * 0.58, Math.PI, 0); ctx.fill(); }
    if (hero) { ctx.font = `${u.size}px sans-serif`; ctx.textAlign = "center"; ctx.fillText(this.cfg.hero?.def.icon ?? "⚔️", u.x + Math.cos(u.facing) * 12, u.y - 2 + Math.sin(u.facing) * 8 + bob); }
    else { // khiên / vũ khí
      ctx.save(); ctx.translate(u.x, u.y + bob); ctx.rotate(u.facing);
      if (u.kind === "assassin") { ctx.strokeStyle = "#e9d5ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(18, 0); ctx.stroke(); }
      else { ctx.fillStyle = u.kind === "knight" ? "#e5e7eb" : "#fbbf24"; ctx.beginPath(); ctx.arc(8, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#78350f"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(16, -10); ctx.stroke(); }
      ctx.restore();
    }
    // HP
    const bw = hero ? 44 : 26; const pct = clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(u.x - bw / 2, u.y - u.size * 1.7 - 6 + bob, bw, hero ? 6 : 4);
    ctx.fillStyle = hero ? "#fbbf24" : pct > 0.5 ? "#4ade80" : "#f87171"; ctx.fillRect(u.x - bw / 2, u.y - u.size * 1.7 - 6 + bob, bw * pct, hero ? 6 : 4);
    if (hero) { ctx.fillStyle = "#fef3c7"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(u.name, u.x, u.y - u.size * 1.7 - 10 + bob); }
    this.attrBadge(ctx, u.x + u.size * 0.9, u.y - u.size * 1.3 + bob, u.attr, hero ? 7 : 5.5);
    // đường tới đích của hero
    if (hero && dist(u, { x: u.tx, y: u.ty }) > 6) { ctx.strokeStyle = "rgba(253,224,71,0.5)"; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(u.tx, u.ty); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(u.tx, u.ty, 6, 0, Math.PI * 2); ctx.stroke(); }
  }
  drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
    const d = e.def; const s = d.size * (e.elite ? 0.75 : 1);
    const air = !!d.air; const lift = air ? 26 + Math.sin(this.time * 6 + e.wobble) * 3 : 0;
    const y = e.y - lift; const bob = air ? 0 : Math.abs(Math.sin(e.wobble)) * 1.5;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(e.x, e.y + s * 0.75, s * (air ? 0.7 : 1), s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    const frozen = this.time < e.freezeUntil, stunned = this.time < e.stunUntil, slowed = this.time < e.slowUntil;
    const c1 = e.flash > 0 ? "#fff" : d.color, c2 = d.color2;
    const face = Math.atan2(e.dirY, e.dirX);
    // cánh
    if (d.features.includes("wings")) { const flap = Math.sin(this.time * 18 + e.wobble) * 0.5; ctx.fillStyle = c2; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(e.x + sgn * s * 1.2, y - bob - 2, s * 1.1, s * 0.45, sgn * (0.5 + flap), 0, Math.PI * 2); ctx.fill(); } }
    if (d.features.includes("legs")) { ctx.strokeStyle = c2; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = -0.9 + i * 0.6 + Math.sin(this.time * 14 + i) * 0.15; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(e.x, y); ctx.lineTo(e.x + sgn * Math.cos(a) * s * 1.7, y + Math.sin(a) * s * 1.2 + 4); ctx.stroke(); } } }
    if (d.features.includes("tail")) { ctx.strokeStyle = c1; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(e.x - Math.cos(face) * s, y); ctx.quadraticCurveTo(e.x - Math.cos(face) * s * 2, y - 8 + Math.sin(this.time * 6) * 5, e.x - Math.cos(face) * s * 2.4, y + 2); ctx.stroke(); }
    if (d.features.includes("pincers")) { ctx.strokeStyle = c2; ctx.lineWidth = 3; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(e.x + Math.cos(face) * s * 1.3 + sgn * Math.sin(face) * s * 0.8, y + Math.sin(face) * s * 1.3 - sgn * Math.cos(face) * s * 0.8, s * 0.45, 0, Math.PI * 1.5); ctx.stroke(); } }
    // thân
    ctx.save(); ctx.translate(e.x, y - bob);
    const g = ctx.createRadialGradient(-s * 0.3, -s * 0.3, 1, 0, 0, s * 1.1); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g;
    if (d.shape === "long") { ctx.rotate(face); ctx.beginPath(); ctx.ellipse(0, 0, s * 1.45, s * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.rotate(-face); }
    else if (d.shape === "rock") { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const r = s * (i % 2 ? 0.88 : 1.05); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.9); } ctx.closePath(); ctx.fill(); }
    else if (d.shape === "flame") { ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fde047"; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; const fl = s * (1.2 + Math.sin(this.time * 15 + i * 2) * 0.35); ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.25) * s * 0.8, Math.sin(a - 0.25) * s * 0.8); ctx.lineTo(Math.cos(a) * fl, Math.sin(a) * fl); ctx.lineTo(Math.cos(a + 0.25) * s * 0.8, Math.sin(a + 0.25) * s * 0.8); ctx.closePath(); ctx.fill(); } }
    else { ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); }
    ctx.lineWidth = 1.5; ctx.strokeStyle = slowed || frozen ? "#67e8f9" : "rgba(0,0,0,0.5)"; ctx.stroke();
    // đặc điểm
    if (d.features.includes("ears")) { ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(-s * 0.55, -s * 0.85, s * 0.35, 0, Math.PI * 2); ctx.arc(s * 0.55, -s * 0.85, s * 0.35, 0, Math.PI * 2); ctx.fill(); }
    if (d.features.includes("horns")) { ctx.fillStyle = "#fef3c7"; ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.7); ctx.lineTo(-s * 0.8, -s * 1.4); ctx.lineTo(-s * 0.2, -s * 0.9); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.7); ctx.lineTo(s * 0.8, -s * 1.4); ctx.lineTo(s * 0.2, -s * 0.9); ctx.closePath(); ctx.fill(); }
    if (d.features.includes("stripes")) { ctx.strokeStyle = "rgba(120,113,108,0.8)"; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-s, i * s * 0.35); ctx.lineTo(s, i * s * 0.35 + 3); ctx.stroke(); } }
    if (d.features.includes("cracks")) { ctx.strokeStyle = "#fb923c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.3); ctx.lineTo(-s * 0.1, 0); ctx.lineTo(-s * 0.4, s * 0.6); ctx.moveTo(s * 0.2, -s * 0.7); ctx.lineTo(s * 0.4, -s * 0.1); ctx.lineTo(s * 0.8, s * 0.2); ctx.stroke(); }
    if (d.features.includes("grass")) { ctx.fillStyle = "#86efac"; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.3 - 3, -s * 0.8); ctx.lineTo(i * s * 0.3, -s * 1.35 - Math.abs(i) * 2); ctx.lineTo(i * s * 0.3 + 3, -s * 0.8); ctx.closePath(); ctx.fill(); } }
    if (d.features.includes("headdress")) { ctx.fillStyle = "#1d4ed8"; ctx.fillRect(-s * 0.9, -s * 1.3, s * 1.8, s * 0.5); ctx.fillStyle = "#fde047"; ctx.fillRect(-s * 0.9, -s * 1.1, s * 1.8, s * 0.12); }
    if (d.features.includes("club")) { ctx.save(); ctx.rotate(face); ctx.fillStyle = "#78350f"; ctx.fillRect(s * 0.3, -s * 0.9, s * 1.1, s * 0.3); ctx.fillStyle = "#57534e"; ctx.beginPath(); ctx.arc(s * 1.4, -s * 0.75, s * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (d.features.includes("tusk")) { ctx.fillStyle = "#fef3c7"; ctx.beginPath(); ctx.moveTo(-s * 0.4, s * 0.3); ctx.lineTo(-s * 0.5, s * 0.75); ctx.lineTo(-s * 0.2, s * 0.35); ctx.fill(); ctx.beginPath(); ctx.moveTo(s * 0.4, s * 0.3); ctx.lineTo(s * 0.5, s * 0.75); ctx.lineTo(s * 0.2, s * 0.35); ctx.fill(); }
    if (d.features.includes("gloves")) { ctx.fillStyle = "#dc2626"; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(Math.cos(face) * s * 1.2 + sgn * Math.sin(face) * s * 0.9, Math.sin(face) * s * 1.2 - sgn * Math.cos(face) * s * 0.9, s * 0.4, 0, Math.PI * 2); ctx.fill(); } }
    if (d.features.includes("tongue")) { ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.cos(face) * s * 1.4, Math.sin(face) * s * 0.7); ctx.lineTo(Math.cos(face) * s * 2.1 + Math.sin(this.time * 20) * 2, Math.sin(face) * s * 1.1); ctx.stroke(); }
    if (d.features.includes("beak")) { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.moveTo(Math.cos(face) * s * 0.8, Math.sin(face) * s * 0.8 - 2); ctx.lineTo(Math.cos(face) * s * 1.6, Math.sin(face) * s * 1.2); ctx.lineTo(Math.cos(face) * s * 0.8, Math.sin(face) * s * 0.8 + 4); ctx.fill(); }
    // mắt
    const ex = Math.cos(face) * s * 0.35, ey = Math.sin(face) * s * 0.35 - s * 0.15;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex - s * 0.3, ey, s * 0.22, 0, Math.PI * 2); ctx.arc(ex + s * 0.3, ey, s * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = d.boss ? "#dc2626" : "#000"; ctx.beginPath(); ctx.arc(ex - s * 0.3 + Math.cos(face) * 2, ey + Math.sin(face) * 2, s * 0.1, 0, Math.PI * 2); ctx.arc(ex + s * 0.3 + Math.cos(face) * 2, ey + Math.sin(face) * 2, s * 0.1, 0, Math.PI * 2); ctx.fill();
    if (frozen) { ctx.fillStyle = "rgba(165,243,252,0.55)"; ctx.beginPath(); ctx.arc(0, 0, s * 1.15, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#e0f2fe"; ctx.lineWidth = 1; ctx.stroke(); }
    if (stunned) { ctx.fillStyle = "#fde047"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; for (let i = 0; i < 3; i++) { const a = this.time * 6 + (i * Math.PI * 2) / 3; ctx.fillText("★", Math.cos(a) * s * 0.9, -s * 1.1 + Math.sin(a) * 4); } }
    ctx.restore();
    // vương miện boss
    if (d.boss && !e.elite) { ctx.fillStyle = "#fbbf24"; const cw = s; ctx.beginPath(); ctx.moveTo(e.x - cw / 2, y - s - 8); ctx.lineTo(e.x - cw / 2, y - s - 20); ctx.lineTo(e.x - cw / 4, y - s - 12); ctx.lineTo(e.x, y - s - 24); ctx.lineTo(e.x + cw / 4, y - s - 12); ctx.lineTo(e.x + cw / 2, y - s - 20); ctx.lineTo(e.x + cw / 2, y - s - 8); ctx.closePath(); ctx.fill(); }
    // HP / giáp
    const bw = Math.max(28, s * 2.2); const top = y - s - (d.boss && !e.elite ? 34 : 14) - bob;
    if (d.armor) { ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(e.x - bw / 2, top, bw, 12); ctx.fillStyle = "#e7e5e4"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.fillText(`🛡 ${Math.max(0, Math.ceil(e.hp))} đòn`, e.x, top + 9.5); }
    else { const pct = clamp(e.hp / e.maxHp, 0, 1); ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(e.x - bw / 2, top, bw, d.boss ? 7 : 5); ctx.fillStyle = pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#fbbf24" : "#ef4444"; ctx.fillRect(e.x - bw / 2, top, bw * pct, d.boss ? 7 : 5); }
    this.attrBadge(ctx, e.x + bw / 2 + 4, top + 2, e.attr, d.boss ? 9 : 7);
    if (d.boss) { ctx.fillStyle = e.elite ? "#fbbf24" : "#fca5a5"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(e.elite ? `TINH ANH ${d.name}` : `BOSS ${d.name}`, e.x, top - 4); }
  }
  drawProj(ctx: CanvasRenderingContext2D, p: Proj) {
    ctx.save();
    let py = p.y; if (p.kind === "cannon" && p.arcDur > 0) py -= Math.sin(clamp(p.arcT / p.arcDur, 0, 1) * Math.PI) * 50;
    ctx.translate(p.x, py);
    if (p.kind === "shuriken") { ctx.rotate(p.spin); ctx.fillStyle = "#e2e8f0"; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(3, -4); ctx.lineTo(0, -9); ctx.lineTo(-3, -4); ctx.closePath(); ctx.fill(); } }
    else if (p.kind === "arrow" || p.kind === "heroarrow") { const a = Math.atan2(p.ty - p.y, p.tx - p.x); ctx.rotate(a); ctx.strokeStyle = "#fef3c7"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.fillStyle = "#94a3b8"; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(2, -3); ctx.lineTo(2, 3); ctx.fill(); }
    else if (p.kind === "ice") { ctx.shadowColor = "#67e8f9"; ctx.shadowBlur = 10; ctx.fillStyle = "#a5f3fc"; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 7); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill(); }
    else if (p.kind === "cannon") { ctx.fillStyle = "#1c1917"; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(-2, -2, 2, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.shadowColor = "#f97316"; ctx.shadowBlur = 12; ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fef3c7"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  drawFx(ctx: CanvasRenderingContext2D, f: Fx) {
    const k = f.t / f.dur; const a = 1 - k;
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    if (f.kind === "ring") { ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.stroke(); }
    else if (f.kind === "flash") { ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill(); }
    else if (f.kind === "pillar") {
      const h = 90 * Math.sin(Math.min(1, k * 1.6) * Math.PI); const g = ctx.createLinearGradient(0, f.y - h, 0, f.y); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.4, f.color); g.addColorStop(1, "#fde047");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r, f.r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 5; i++) { const ox = (i - 2) * f.r * 0.35; const fh = h * (0.6 + Math.sin(this.time * 20 + i) * 0.4); ctx.beginPath(); ctx.moveTo(f.x + ox - 8, f.y); ctx.quadraticCurveTo(f.x + ox + Math.sin(this.time * 15 + i) * 6, f.y - fh * 0.6, f.x + ox, f.y - fh); ctx.quadraticCurveTo(f.x + ox + 8, f.y - fh * 0.5, f.x + ox + 8, f.y); ctx.fill(); }
    }
    else if (f.kind === "bolt" && f.pts) { ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.shadowColor = f.color; ctx.shadowBlur = 12; ctx.beginPath(); f.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke(); }
    else if (f.kind === "meteor" && f.tx !== undefined && f.ty !== undefined) {
      const x = f.x + (f.tx - f.x) * k, y = f.y + (f.ty - f.y) * k; ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(251,146,60,0.6)"; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - (f.tx - f.x) * 0.1, y - (f.ty - f.y) * 0.1 - 40); ctx.lineTo(x, y); ctx.stroke();
      ctx.shadowColor = "#f97316"; ctx.shadowBlur = 25; ctx.fillStyle = "#fef3c7"; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(239,68,68,0.7)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(f.tx, f.ty, f.r, 0, Math.PI * 2); ctx.stroke();
    }
    else if (f.kind === "ice") { ctx.strokeStyle = f.color; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const ang = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(ang) * f.r * (0.5 + k), f.y + Math.sin(ang) * f.r * (0.5 + k)); ctx.stroke(); } }
    else if (f.kind === "smoke") { ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(f.x, f.y - k * 20, f.r * (0.5 + k), 0, Math.PI * 2); ctx.fill(); }
    else if (f.kind === "slash") { ctx.strokeStyle = f.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, -0.8 + k * 2, 0.6 + k * 2); ctx.stroke(); }
    else if (f.kind === "heal") { ctx.fillStyle = f.color; ctx.font = "20px sans-serif"; ctx.textAlign = "center"; for (let i = 0; i < 5; i++) ctx.fillText("♥", f.x + (i - 2) * 18, f.y - k * 50 - Math.abs(i - 2) * 6); }
    ctx.restore();
  }
  drawOverlay(ctx: CanvasRenderingContext2D) {
    const m = this.mode; const hv = this.hover;
    if (m.kind === "item" && hv) {
      const r = m.item === "meteor" ? 85 : m.item === "bomb" ? 115 : 40; const col = m.item === "reinforce" ? "#4ade80" : "#f97316";
      ctx.beginPath(); ctx.arc(hv.x, hv.y, r, 0, Math.PI * 2); ctx.fillStyle = m.item === "reinforce" ? "rgba(74,222,128,0.12)" : "rgba(249,115,22,0.15)"; ctx.fill(); ctx.strokeStyle = col; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center"; ctx.fillText(m.item === "meteor" ? "☄️ Thả thiên thạch" : m.item === "bomb" ? "💣 Đặt bom" : "🛡️ Thả viện binh lên đường", hv.x, hv.y - r - 8);
    }
    if (m.kind === "heromove" && hv) { ctx.strokeStyle = "#fde047"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hv.x, hv.y, 10, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hv.x - 16, hv.y); ctx.lineTo(hv.x + 16, hv.y); ctx.moveTo(hv.x, hv.y - 16); ctx.lineTo(hv.x, hv.y + 16); ctx.stroke(); ctx.fillStyle = "#fde047"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("Di chuyển anh hùng tới đây", hv.x, hv.y - 18); }
  }
}
