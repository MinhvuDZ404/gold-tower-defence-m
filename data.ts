/* =====================================================================
   GOLD TOWER DEFENCE – DỮ LIỆU GAME
   Dựa trên bản gốc của Busidol (2022): hệ Kéo-Búa-Bao ±40%, ô đặt tháp cố
   định, khoáng (미네랄) + tim, quái bộ binh/bay/giáp, 5 cấp tháp gacha,
   anh hùng điều khiển, item phím tắt, 4 vùng bản đồ theo cốt truyện.
   ===================================================================== */

export const W = 1280;
export const H = 720;

/* ---------------- THUỘC TÍNH KÉO-BÚA-BAO ---------------- */
export type Attr = "rock" | "scissors" | "paper";
export const ATTRS: Attr[] = ["rock", "scissors", "paper"];
export const ATTR_INFO: Record<Attr, { name: string; icon: string; color: string; ko: string }> = {
  rock: { name: "Búa", icon: "✊", color: "#fb923c", ko: "바위" },
  scissors: { name: "Kéo", icon: "✌️", color: "#22d3ee", ko: "가위" },
  paper: { name: "Bao", icon: "✋", color: "#a3e635", ko: "보" },
};
const BEATS: Record<Attr, Attr> = { rock: "scissors", scissors: "paper", paper: "rock" };
/** Búa > Kéo > Bao > Búa. Khắc chế +40%, bị khắc -40% (đúng bản gốc). */
export function attrMult(att: Attr, def: Attr): number {
  if (att === def) return 1;
  return BEATS[att] === def ? 1.4 : 0.6;
}

/* ---------------- CẤP THÁP (gacha) ---------------- */
export const GRADES = [
  { name: "Thường", ko: "일반", color: "#9ca3af", mult: 1.0 },
  { name: "Cao Cấp", ko: "고급", color: "#4ade80", mult: 1.2 },
  { name: "Hiếm", ko: "희귀", color: "#60a5fa", mult: 1.45 },
  { name: "Anh Hùng", ko: "영웅", color: "#c084fc", mult: 1.8 },
  { name: "Huyền Thoại", ko: "전설", color: "#fbbf24", mult: 2.3 },
];
export const GRADE_ODDS = [0.55, 0.27, 0.12, 0.05, 0.01];
export const DRAW_COST = 400;
export const DRAW10_COST = 3600;
export const MAX_TOWER_META_LEVEL = 20;
export const MAX_INGAME_LEVEL = 5;

/* ---------------- THÁP ---------------- */
export type TowerType = "shuriken" | "icebow" | "magic" | "cannon" | "lightning" | "thorn" | "barracks" | "assassin";
export type TargetMode = "both" | "ground" | "air";
export interface TowerDef {
  type: TowerType;
  name: string;
  ko: string;
  icon: string;
  desc: string;
  cost: number;
  dmg: number;
  rate: number; // phát/giây
  range: number;
  target: TargetMode;
  splash?: number;
  color: string;
  color2: string;
  gradeNotes: string[]; // mô tả theo cấp 0..4
}
export const TOWER_DEFS: Record<TowerType, TowerDef> = {
  shuriken: {
    type: "shuriken", name: "Tháp Phi Tiêu", ko: "표창 타워", icon: "🌀",
    desc: "Bắn nhanh, đánh cả bộ binh + bay. Cấp Hiếm trở lên ném 2 phi tiêu.",
    cost: 80, dmg: 11, rate: 2.4, range: 150, target: "both", color: "#e2e8f0", color2: "#334155",
    gradeNotes: ["Ném 1 phi tiêu", "Ném 1 phi tiêu, mạnh hơn", "Ném 2 phi tiêu cùng lúc", "Ném 2 phi tiêu xuyên", "Ném 3 phi tiêu, 3 mục tiêu"],
  },
  icebow: {
    type: "icebow", name: "Tháp Cung Băng", ko: "얼음활 타워", icon: "🏹",
    desc: "Tên băng làm chậm. Cấp cao đóng băng cả vùng, Huyền Thoại 1 phát 1 mạng quái thường.",
    cost: 100, dmg: 10, rate: 1.4, range: 170, target: "both", color: "#67e8f9", color2: "#0e7490",
    gradeNotes: ["30% bắn tên băng (chậm 35%)", "60% tên băng", "100% tên băng", "Tên băng đóng băng vùng nhỏ", "1 phát hạ quái thường, đóng băng quái giáp"],
  },
  magic: {
    type: "magic", name: "Tháp Ma Pháp", ko: "매직 타워", icon: "🔥",
    desc: "Cột lửa bùng lên gây sát thương diện rộng. Khắc tinh của quái giáp ở cấp cao.",
    cost: 150, dmg: 26, rate: 0.8, range: 140, target: "both", splash: 60, color: "#f472b6", color2: "#7e22ce",
    gradeNotes: ["Cột lửa nhỏ", "Cột lửa nhỏ", "Cột lửa lớn hơn", "Cột lửa + thiêu đốt (2 đòn)", "Bão lửa 3 đòn liên tiếp"],
  },
  cannon: {
    type: "cannon", name: "Tháp Đại Bác", ko: "포탄 타워", icon: "💣",
    desc: "Đạn pháo nổ lan, sát thương cao, bắn chậm.",
    cost: 160, dmg: 42, rate: 0.6, range: 165, target: "both", splash: 55, color: "#fbbf24", color2: "#292524",
    gradeNotes: ["Đạn pháo thường", "Đạn pháo thường", "Đạn pháo mạnh, nổ rộng hơn", "Đạn pháo mạnh + choáng 0.3s", "Đạn vàng nổ cực rộng"],
  },
  lightning: {
    type: "lightning", name: "Tháp Sấm Sét", ko: "번개 타워", icon: "⚡",
    desc: "CHỈ đánh quái bay. Vung búa gọi sét, cấp Hiếm sét lan sang mục tiêu khác.",
    cost: 120, dmg: 32, rate: 1.1, range: 185, target: "air", color: "#fde047", color2: "#854d0e",
    gradeNotes: ["Sét đánh 1 mục tiêu bay", "Sét mạnh hơn", "Sét lan 2 mục tiêu", "Sét lan 3 mục tiêu", "Sét lan 4 mục tiêu, giật điện"],
  },
  thorn: {
    type: "thorn", name: "Tháp Gai", ko: "가시 타워", icon: "🌵",
    desc: "CHỈ đánh bộ binh. Gai mọc từ đất đâm mọi quái trong tầm + làm chậm. Dùng để kìm boss.",
    cost: 90, dmg: 7, rate: 2.0, range: 110, target: "ground", color: "#4ade80", color2: "#14532d",
    gradeNotes: ["Gai đất, chậm 15%", "Gai đất, chậm 20%", "Gai đất, chậm 25%", "Gai tím, chậm 35%", "Gai tím khổng lồ, chậm 45%"],
  },
  barracks: {
    type: "barracks", name: "Tháp Doanh Trại", ko: "배럭 타워", icon: "⛺",
    desc: "Triệu hồi 2 lính ra đường chặn quái bộ binh. Không đánh quái bay.",
    cost: 130, dmg: 9, rate: 1.0, range: 90, target: "ground", color: "#93c5fd", color2: "#1e3a8a",
    gradeNotes: ["2 lính canh đường", "2 lính canh đường", "2 kỵ sĩ giáp sắt", "2 kỵ sĩ giáp sắt", "2 kỵ sĩ giáp Huyền Thoại"],
  },
  assassin: {
    type: "assassin", name: "Tháp Sát Thủ", ko: "암살자 타워", icon: "🗡️",
    desc: "Cử 1 sát thủ ra đường: đánh nhanh, né đòn, chí mạng. Huyền Thoại có 5% giết ngay.",
    cost: 170, dmg: 28, rate: 1.8, range: 90, target: "ground", color: "#c4b5fd", color2: "#312e81",
    gradeNotes: ["1 sát thủ", "1 sát thủ", "1 sát thủ né 30%", "1 sát thủ né 40%, chí mạng x3", "Sát thủ giáp, 5% giết ngay"],
  },
};
export const TOWER_LIST = Object.values(TOWER_DEFS);
export const towerKey = (t: TowerType, a: Attr) => `${t}_${a}`;
export function parseKey(key: string): { type: TowerType; attr: Attr } {
  const [type, attr] = key.split("_");
  return { type: type as TowerType, attr: attr as Attr };
}
export function towerCost(def: TowerDef, grade: number) {
  return Math.round(def.cost * (1 + grade * 0.15));
}
export function levelUpCost(def: TowerDef, grade: number, level: number) {
  return Math.round(towerCost(def, grade) * (0.6 + 0.5 * level));
}

/* ---------------- QUÁI ---------------- */
export type EnemyType =
  | "goldrat" | "spider" | "grasstone"
  | "boa" | "orc" | "swampbat" | "croc"
  | "scorpion" | "mummy" | "vulture" | "sphinx"
  | "fireimp" | "lavagolem" | "garuda" | "ifrit";
export interface EnemyDef {
  type: EnemyType;
  name: string;
  ko: string;
  hp: number;
  atk: number;
  speed: number;
  reward: number;
  size: number;
  weight: number;
  air?: boolean;
  armor?: boolean;
  boss?: boolean;
  color: string;
  color2: string;
  shape: "round" | "long" | "rock" | "flame";
  features: string[];
  desc: string;
}
export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  goldrat: { type: "goldrat", name: "Chuột Vàng", ko: "황금쥐", hp: 55, atk: 4, speed: 95, reward: 5, size: 11, weight: 1.2, color: "#d6b26a", color2: "#6b4f1d", shape: "round", features: ["ears", "tail"], desc: "Răng cửa xuyên thép, nhỏ nhưng đừng coi thường." },
  spider: { type: "spider", name: "Nhện Vàng", ko: "거미", hp: 140, atk: 10, speed: 62, reward: 9, size: 14, weight: 2.4, color: "#7c3aed", color2: "#2e1065", shape: "round", features: ["legs"], desc: "Thích vàng lấp lánh, ổ đầy vàng vẫn chưa đủ." },
  grasstone: { type: "grasstone", name: "Big Grasstone", ko: "빅그래스톤", hp: 2400, atk: 50, speed: 34, reward: 200, size: 30, weight: 30, boss: true, color: "#65a30d", color2: "#1a2e05", shape: "rock", features: ["grass", "crown"], desc: "Tượng đá cỏ được Gullveig ban linh hồn. Giẫm nát mọi thứ. LỌT THÀNH = THUA NGAY!" },
  boa: { type: "boa", name: "Rắn Boa Snake", ko: "보아스넥크", hp: 190, atk: 9, speed: 85, reward: 8, size: 12, weight: 1.6, color: "#facc15", color2: "#3f6212", shape: "long", features: ["tongue"], desc: "Tự cho mình là con rắn đẹp nhất, đi nuốt trang sức vàng." },
  orc: { type: "orc", name: "Orc Đầm Lầy", ko: "오크", hp: 330, atk: 14, speed: 55, reward: 13, size: 16, weight: 2.6, color: "#4d7c0f", color2: "#1a2e05", shape: "round", features: ["club", "tusk"], desc: "Cầm chùy to nhưng thực ra là để giã bánh cho Cá Sấu." },
  swampbat: { type: "swampbat", name: "Dơi Đầm Lầy", ko: "늪박쥐", hp: 150, atk: 7, speed: 92, reward: 10, size: 11, weight: 2.0, air: true, color: "#6b7280", color2: "#111827", shape: "round", features: ["wings"], desc: "Bay qua đầu lính. Cần tháp đánh được bay!" },
  croc: { type: "croc", name: "Cá Sấu Quyền Anh", ko: "복싱크록다일", hp: 6000, atk: 90, speed: 38, reward: 350, size: 30, weight: 30, boss: true, color: "#16a34a", color2: "#052e16", shape: "long", features: ["gloves", "crown"], desc: "Thua 10 trận liên tiếp, được Gullveig cho sức mạnh đặc biệt." },
  scorpion: { type: "scorpion", name: "Bọ Cạp Cát", ko: "전갈", hp: 360, atk: 13, speed: 68, reward: 12, size: 14, weight: 2.2, color: "#f59e0b", color2: "#78350f", shape: "round", features: ["pincers", "tail"], desc: "Ẩn dưới cát, đuôi độc." },
  mummy: { type: "mummy", name: "Xác Ướp (Giáp)", ko: "미라", hp: 14, atk: 12, speed: 44, reward: 18, size: 15, weight: 3.0, armor: true, color: "#e7e5e4", color2: "#57534e", shape: "round", features: ["stripes"], desc: "QUÁI GIÁP: mỗi đòn chỉ trừ 1 điểm bất kể sát thương. Dùng tháp bắn nhanh!" },
  vulture: { type: "vulture", name: "Kền Kền", ko: "독수리", hp: 300, atk: 10, speed: 100, reward: 14, size: 13, weight: 2.5, air: true, color: "#a16207", color2: "#292524", shape: "round", features: ["wings", "beak"], desc: "Bay nhanh trên sa mạc." },
  sphinx: { type: "sphinx", name: "Nhân Sư", ko: "스핑크스", hp: 14000, atk: 150, speed: 36, reward: 600, size: 32, weight: 30, boss: true, color: "#fbbf24", color2: "#78350f", shape: "rock", features: ["headdress", "crown"], desc: "Chán ra câu đố, đeo trang sức vàng thấy mình như vua nên đi cướp vàng." },
  fireimp: { type: "fireimp", name: "Tiểu Quỷ Lửa", ko: "화염 임프", hp: 520, atk: 18, speed: 92, reward: 15, size: 12, weight: 2.0, color: "#ef4444", color2: "#7f1d1d", shape: "flame", features: ["horns"], desc: "Nhanh và nóng bỏng." },
  lavagolem: { type: "lavagolem", name: "Golem Dung Nham (Giáp)", ko: "용암 골렘", hp: 22, atk: 20, speed: 40, reward: 24, size: 18, weight: 4.0, armor: true, color: "#1c1917", color2: "#f97316", shape: "rock", features: ["cracks"], desc: "QUÁI GIÁP 22 đòn. Chậm nhưng cứng." },
  garuda: { type: "garuda", name: "Garuda Lửa", ko: "화염가루다", hp: 900, atk: 20, speed: 82, reward: 22, size: 16, weight: 4.0, air: true, color: "#fb923c", color2: "#9a3412", shape: "flame", features: ["wings"], desc: "Họ hàng xa của Phượng Hoàng. Khi chết bùng lửa thiêu lính gần đó." },
  ifrit: { type: "ifrit", name: "Ifrit", ko: "이프리트", hp: 32000, atk: 260, speed: 40, reward: 1000, size: 34, weight: 30, boss: true, color: "#f97316", color2: "#450a0a", shape: "flame", features: ["horns", "crown"], desc: "Chúa tể mọi ngọn lửa. Miễn nhiễm làm chậm." },
};

/* ---------------- VÙNG BẢN ĐỒ ---------------- */
export interface Pt { x: number; y: number }
export interface RegionDef {
  id: number;
  name: string;
  ko: string;
  bg: string;
  fallback: string;
  road: string;
  roadEdge: string;
  waypoints: Pt[];
  roster: EnemyType[];
  boss: EnemyType;
  story: string;
}
export const REGIONS: RegionDef[] = [
  {
    id: 0, name: "Vườn Xanh", ko: "녹색 정원", bg: "/images/bg-garden.jpg", fallback: "#3f6212", road: "#8b6b3e", roadEdge: "#5b4423",
    waypoints: [{ x: -60, y: 180 }, { x: 240, y: 180 }, { x: 240, y: 540 }, { x: 600, y: 540 }, { x: 600, y: 180 }, { x: 960, y: 180 }, { x: 960, y: 520 }, { x: 1200, y: 520 }],
    roster: ["goldrat", "spider"], boss: "grasstone",
    story: "Phù thủy Gullveig nghe tin kho vàng El Dorado. Lũ chuột và nhện trong vườn bị mê hoặc, lao tới cướp vàng!",
  },
  {
    id: 1, name: "Đầm Lầy", ko: "늪지대", bg: "/images/bg-swamp.jpg", fallback: "#1e3a2f", road: "#6b5a3e", roadEdge: "#3d3222",
    waypoints: [{ x: 320, y: -60 }, { x: 320, y: 300 }, { x: 720, y: 300 }, { x: 720, y: 120 }, { x: 1040, y: 120 }, { x: 1040, y: 600 }, { x: 560, y: 600 }, { x: 560, y: 420 }, { x: 160, y: 420 }],
    roster: ["boa", "orc", "swampbat"], boss: "croc",
    story: "Gullveig hứa ban sức mạnh cho ai mang vàng về. Rắn, Orc và bầy dơi đầm lầy đã nhận lời...",
  },
  {
    id: 2, name: "Sa Mạc Tử Thần", ko: "죽음의 사막", bg: "/images/bg-desert.jpg", fallback: "#b45309", road: "#a16207", roadEdge: "#713f12",
    waypoints: [{ x: -60, y: 130 }, { x: 1080, y: 130 }, { x: 1080, y: 370 }, { x: 200, y: 370 }, { x: 200, y: 600 }, { x: 1180, y: 600 }],
    roster: ["scorpion", "mummy", "vulture"], boss: "sphinx",
    story: "Xác ướp giáp cứng xuất hiện! Mỗi đòn chỉ trừ 1 điểm giáp — hãy mang tháp bắn nhanh. Nhân Sư đang chờ ở cuối sa mạc.",
  },
  {
    id: 3, name: "Vùng Dung Nham", ko: "용암 지대", bg: "/images/bg-lava.jpg", fallback: "#1c1917", road: "#44403c", roadEdge: "#1c1917",
    waypoints: [{ x: -60, y: 620 }, { x: 380, y: 620 }, { x: 380, y: 150 }, { x: 1060, y: 150 }, { x: 1060, y: 560 }, { x: 700, y: 560 }, { x: 700, y: 360 }],
    roster: ["fireimp", "lavagolem", "garuda"], boss: "ifrit",
    story: "Trận cuối! Ifrit — chúa tể lửa — dẫn quân đến. Hắn miễn nhiễm làm chậm, Garuda nổ tung khi chết. Bảo vệ El Dorado!",
  },
];
export const TOTAL_STAGES = 20;
export function stageInfo(stage: number) {
  const region = REGIONS[Math.min(REGIONS.length - 1, Math.floor((stage - 1) / 5))];
  const idx = (stage - 1) % 5;
  return { region, idx };
}

/* Ô đặt tháp cố định: sinh dọc 2 bên đường, lọc ô chạm đường/chồng nhau */
export function distToSeg(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}
export function distToPath(p: Pt, wps: Pt[]) {
  let m = Infinity;
  for (let i = 0; i < wps.length - 1; i++) m = Math.min(m, distToSeg(p, wps[i], wps[i + 1]));
  return m;
}
export function nearestOnPath(p: Pt, wps: Pt[]): { pt: Pt; seg: number; progress: number } {
  let best = { pt: wps[0], seg: 0, progress: 0, d: Infinity };
  let acc = 0;
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len);
    t = Math.max(0, Math.min(1, t));
    const pt = { x: a.x + dx * t, y: a.y + dy * t };
    const d = Math.hypot(p.x - pt.x, p.y - pt.y);
    if (d < best.d) best = { pt, seg: i, progress: acc + len * t, d };
    acc += len;
  }
  return best;
}
export function generatePlots(wps: Pt[]): Pt[] {
  const cand: Pt[] = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i], b = wps[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    for (let d = 95; d < len - 30; d += 150) {
      const px = a.x + (dx / len) * d, py = a.y + (dy / len) * d;
      cand.push({ x: px + nx * 84, y: py + ny * 84 });
      cand.push({ x: px - nx * 84, y: py - ny * 84 });
    }
  }
  const plots: Pt[] = [];
  const vault = wps[wps.length - 1];
  for (const c of cand) {
    if (c.x < 45 || c.x > W - 45 || c.y < 45 || c.y > H - 45) continue;
    if (distToPath(c, wps) < 62) continue;
    if (Math.hypot(c.x - vault.x, c.y - vault.y) < 90) continue;
    if (plots.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < 82)) continue;
    plots.push({ x: Math.round(c.x), y: Math.round(c.y) });
  }
  return plots;
}

/* ---------------- WAVE ---------------- */
export interface SpawnEntry { type: EnemyType; attr: Attr; delay: number; elite?: boolean }
export interface WaveDef { entries: SpawnEntry[]; mainAttr: Attr }
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function waveCount(stage: number) {
  const { idx } = stageInfo(stage);
  return 8 + idx + Math.floor(stage / 7);
}
export function generateWaves(stage: number): WaveDef[] {
  const { region, idx } = stageInfo(stage);
  const rnd = mulberry32(stage * 7919 + 13);
  const n = waveCount(stage);
  const waves: WaveDef[] = [];
  for (let w = 1; w <= n; w++) {
    const entries: SpawnEntry[] = [];
    const budget = (5 + w * 2.3) * (1 + idx * 0.22);
    const mainAttr = ATTRS[Math.floor(rnd() * 3)];
    const pool = region.roster.filter((t) => {
      const d = ENEMY_DEFS[t];
      if (d.air && w < 3) return false;
      if (d.armor && w < 4) return false;
      return true;
    });
    let spent = 0, t = 0;
    while (spent < budget) {
      const type = pool[Math.floor(rnd() * pool.length)];
      const d = ENEMY_DEFS[type];
      entries.push({ type, attr: rnd() < 0.7 ? mainAttr : ATTRS[Math.floor(rnd() * 3)], delay: t });
      t += d.air ? 0.7 : d.weight >= 3 ? 1.2 : 0.85;
      spent += d.weight;
    }
    const isLast = w === n;
    if (isLast && idx === 4) entries.push({ type: region.boss, attr: mainAttr, delay: t + 2.5 });
    if (isLast && idx === 2) entries.push({ type: region.boss, attr: mainAttr, delay: t + 2, elite: true });
    entries.sort((a, b) => a.delay - b.delay);
    waves.push({ entries, mainAttr });
  }
  return waves;
}
export function enemyHpMul(stage: number, wave: number) {
  const { idx } = stageInfo(stage);
  return (1 + idx * 0.25) * (1 + 0.05 * (wave - 1));
}

/* ---------------- ANH HÙNG ---------------- */
export interface HeroDef {
  id: string; name: string; ko: string; title: string; desc: string; attr: Attr;
  hp: number; dmg: number; rate: number; range: number; speed: number;
  melee: boolean; splash: number; slow: number; air: boolean; cost: number;
  color: string; color2: string; icon: string;
}
export const HEROES: HeroDef[] = [
  { id: "grombar", name: "Grombar", ko: "그롬바르", title: "Thủ lĩnh Người Lùn", desc: "Búa chiến đập vòng tròn, máu trâu. Chặn đường cực tốt.", attr: "rock", hp: 900, dmg: 46, rate: 1.0, range: 48, speed: 85, melee: true, splash: 45, slow: 0, air: true, cost: 0, color: "#fbbf24", color2: "#92400e", icon: "🔨" },
  { id: "robin", name: "Robin", ko: "로빈", title: "Xạ thủ Elf", desc: "Bắn tên tầm xa, tốc độ cao. Đánh được quái bay.", attr: "scissors", hp: 350, dmg: 38, rate: 1.7, range: 175, speed: 95, melee: false, splash: 0, slow: 0, air: true, cost: 1500, color: "#4ade80", color2: "#14532d", icon: "🏹" },
  { id: "merlin", name: "Merlin", ko: "머린", title: "Đại Pháp Sư Lửa", desc: "Phượng hoàng lửa nổ diện rộng.", attr: "paper", hp: 300, dmg: 58, rate: 0.7, range: 155, speed: 80, melee: false, splash: 55, slow: 0, air: true, cost: 2000, color: "#f87171", color2: "#7f1d1d", icon: "🔥" },
  { id: "anna", name: "Anna", ko: "안나", title: "Kiếm Sĩ Băng Sơn", desc: "Kiếm băng chém vòng, làm chậm quái. Máu cực trâu.", attr: "rock", hp: 1400, dmg: 32, rate: 0.9, range: 50, speed: 75, melee: true, splash: 50, slow: 0.3, air: false, cost: 2500, color: "#93c5fd", color2: "#1e3a8a", icon: "❄️" },
];
export function heroLevel(exp: number) { return 1 + Math.floor(exp / 800); }

/* ---------------- ITEM ---------------- */
export type ItemId = "meteor" | "bomb" | "heart" | "mineral";
export const ITEM_DEFS: Record<ItemId, { name: string; ko: string; icon: string; key: string; price: number; desc: string }> = {
  meteor: { name: "Thiên Thạch", ko: "메테오", icon: "☄️", key: "2", price: 150, desc: "Rơi xuống vùng chọn, nổ diện rộng. Nâng cấp +300 sát thương/lần." },
  bomb: { name: "Bom", ko: "폭탄", icon: "💣", key: "4", price: 350, desc: "Nổ cực mạnh + choáng 2s toàn bộ quái trong vùng." },
  heart: { name: "Bó Tim", ko: "하트 꾸러미", icon: "💖", key: "7", price: 300, desc: "Hồi ngay 5 tim." },
  mineral: { name: "Túi Khoáng", ko: "미네랄 주머니", icon: "💎", key: "8", price: 250, desc: "+250 khoáng ngay lập tức." },
};
export const METEOR_UPGRADE_BASE = 800;
export const meteorDamage = (lv: number) => 100 + 300 * lv;

/* ---------------- NHIỆM VỤ ---------------- */
export type StatKey = "towersBuilt" | "kills" | "meteors" | "levelUps" | "stagesCleared" | "reinforcements" | "stars" | "draws";
export const MISSIONS: { id: string; name: string; stat: StatKey; target: number; gold: number }[] = [
  { id: "build20", name: "Xây 20 tháp", stat: "towersBuilt", target: 20, gold: 500 },
  { id: "kill300", name: "Tiêu diệt 300 quái", stat: "kills", target: 300, gold: 800 },
  { id: "meteor10", name: "Dùng Thiên Thạch 10 lần", stat: "meteors", target: 10, gold: 600 },
  { id: "lvl15", name: "Nâng cấp tháp trong trận 15 lần", stat: "levelUps", target: 15, gold: 500 },
  { id: "clear5", name: "Thắng 5 màn", stat: "stagesCleared", target: 5, gold: 1000 },
  { id: "reinf10", name: "Gọi Viện Binh 10 lần", stat: "reinforcements", target: 10, gold: 400 },
  { id: "stars15", name: "Đạt tổng 15 sao", stat: "stars", target: 15, gold: 1500 },
  { id: "draw10", name: "Rút tháp 10 lần", stat: "draws", target: 10, gold: 600 },
  { id: "kill1500", name: "Tiêu diệt 1500 quái", stat: "kills", target: 1500, gold: 2500 },
  { id: "clear20", name: "Giải phóng El Dorado (thắng màn 20)", stat: "stagesCleared", target: 20, gold: 5000 },
];

export const STARTING_MINERALS = (stage: number) => 320 + stage * 15;
export const STARTING_HEARTS = 10;
