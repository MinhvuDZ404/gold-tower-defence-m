import {
  Attr, ATTRS, GRADE_ODDS, TOWER_LIST, TowerType, towerKey, parseKey, TOWER_DEFS, HEROES, ItemId, StatKey, MISSIONS,
  MAX_TOWER_META_LEVEL, heroLevel,
} from "./data";
import type { DeckCard, HeroCfg } from "./engine";

export interface OwnedTower { grade: number; level: number }
export interface Profile {
  gold: number;
  towers: Record<string, OwnedTower>;
  deck: string[];
  heroes: Record<string, { exp: number }>;
  activeHero: string;
  items: Record<ItemId, number>;
  meteorLevel: number;
  stageStars: Record<number, number>;
  stats: Record<StatKey, number>;
  claimed: string[];
  seenIntro: boolean;
  sound: boolean;
  seenRegionStory: number[];
}

const KEY = "gtd_profile_v2";

export function defaultProfile(): Profile {
  return {
    gold: 1500,
    towers: {
      [towerKey("shuriken", "rock")]: { grade: 0, level: 1 },
      [towerKey("icebow", "scissors")]: { grade: 0, level: 1 },
      [towerKey("cannon", "paper")]: { grade: 0, level: 1 },
      [towerKey("barracks", "rock")]: { grade: 0, level: 1 },
    },
    deck: [towerKey("shuriken", "rock"), towerKey("icebow", "scissors"), towerKey("cannon", "paper"), towerKey("barracks", "rock")],
    heroes: { grombar: { exp: 0 } },
    activeHero: "grombar",
    items: { meteor: 5, bomb: 2, heart: 1, mineral: 1 },
    meteorLevel: 0,
    stageStars: {},
    stats: { towersBuilt: 0, kills: 0, meteors: 0, levelUps: 0, stagesCleared: 0, reinforcements: 0, stars: 0, draws: 0 },
    claimed: [],
    seenIntro: false,
    sound: true,
    seenRegionStory: [],
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultProfile();
    const p = JSON.parse(raw) as Partial<Profile>;
    return { ...defaultProfile(), ...p, items: { ...defaultProfile().items, ...(p.items ?? {}) }, stats: { ...defaultProfile().stats, ...(p.stats ?? {}) } };
  } catch { return defaultProfile(); }
}
export function saveProfile(p: Profile) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ } }
export function resetProfile() { localStorage.removeItem(KEY); }

export function unlockedStage(p: Profile) {
  let s = 1;
  while (p.stageStars[s] && s < 20) s++;
  return s;
}
export function totalStars(p: Profile) { return Object.values(p.stageStars).reduce((a, b) => a + b, 0); }

/** Sở hữu đủ 3 thuộc tính của 1 loại tháp → ×1.2 (đúng bản gốc) */
export function hasSetBonus(p: Profile, type: TowerType) { return ATTRS.every((a) => p.towers[towerKey(type, a)]); }

export function buildDeck(p: Profile): DeckCard[] {
  return p.deck.filter((k) => p.towers[k]).map((k) => {
    const { type, attr } = parseKey(k); const o = p.towers[k];
    return { key: k, type, attr, grade: o.grade, level: o.level, setBonus: hasSetBonus(p, type), def: TOWER_DEFS[type] };
  });
}
export function buildHero(p: Profile): HeroCfg | null {
  const def = HEROES.find((h) => h.id === p.activeHero); if (!def || !p.heroes[def.id]) return null;
  return { def, level: heroLevel(p.heroes[def.id].exp) };
}

/* ---------------- RÚT THÁP (gacha) ---------------- */
export interface DrawResult { key: string; type: TowerType; attr: Attr; grade: number; outcome: "new" | "upgrade" | "level" | "max" }
function rollGrade(minGrade = 0): number {
  let r = Math.random(); let g = 0;
  for (let i = 0; i < GRADE_ODDS.length; i++) { if (r < GRADE_ODDS[i]) { g = i; break; } r -= GRADE_ODDS[i]; g = i; }
  return Math.max(minGrade, g);
}
export function drawTower(p: Profile, minGrade = 0): DrawResult {
  const def = TOWER_LIST[Math.floor(Math.random() * TOWER_LIST.length)];
  const attr = ATTRS[Math.floor(Math.random() * 3)];
  const grade = rollGrade(minGrade);
  const key = towerKey(def.type, attr);
  const cur = p.towers[key];
  let outcome: DrawResult["outcome"] = "new";
  if (!cur) p.towers[key] = { grade, level: 1 };
  else if (grade > cur.grade) { cur.grade = grade; outcome = "upgrade"; }
  else if (cur.level < MAX_TOWER_META_LEVEL) { cur.level++; outcome = "level"; }
  else outcome = "max";
  p.stats.draws++;
  return { key, type: def.type, attr, grade, outcome };
}

/* ---------------- NHIỆM VỤ ---------------- */
export function missionProgress(p: Profile, id: string) {
  const m = MISSIONS.find((x) => x.id === id)!;
  const v = m.stat === "stars" ? totalStars(p) : p.stats[m.stat];
  return { value: v, done: v >= m.target, claimed: p.claimed.includes(id) };
}
export function claimableCount(p: Profile) { return MISSIONS.filter((m) => { const pr = missionProgress(p, m.id); return pr.done && !pr.claimed; }).length; }
