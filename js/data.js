/* ============================================================
   GOLD TOWER DEFENCE M — DATA TABLES (single source of truth)
   ============================================================ */
'use strict';
window.GTD = window.GTD || {};

/* ---------- ATTRIBUTES ---------- */
GTD.ATTR_KEYS = ['scissors', 'rock', 'paper'];
GTD.ATTRS = {
  scissors: { beats: 'rock',   i18n: 'attr_scissors' },
  rock:     { beats: 'paper',  i18n: 'attr_rock' },
  paper:    { beats: 'scissors', i18n: 'attr_paper' }
};
GTD.attrMult = function (atkAttr, defAttr) {
  if (!atkAttr || !defAttr) return 1;
  if (atkAttr === defAttr) return 1.0;
  if (GTD.ATTRS[atkAttr].beats === defAttr) return 1.4;
  return 0.6;
};

/* ---------- RARITY ---------- */
GTD.RAR_MULT = [1.0, 1.3, 1.7, 2.2, 3.0, 4.2];
GTD.RAR_COLORS = ['#9aa0a6', '#4caf50', '#2196f3', '#a24fd6', '#e04040', '#ffc107'];
GTD.RAR_NAMES = ['rarity_gray', 'rarity_green', 'rarity_blue', 'rarity_epic', 'rarity_legend', 'rarity_mythic'];

/* ---------- HEROES ---------- */
/* atk/hp: base, ga/gh: per level, rate: ms, range: px */
GTD.HEROES = [
  { key: 'nameless', r: 0, attr: 'scissors', atk: 210, hp: 2620, ga: 32, gh: 320, rate: 1400, range: 46, air: false, arch: 'knight', cost: 0, cur: 'gold' },
  { key: 'ace', r: 0, attr: 'rock', atk: 200, hp: 2400, ga: 30, gh: 300, rate: 1200, range: 48, air: false, arch: 'blade', cost: 0, cur: 'gold' },
  { key: 'frozenHeart', r: 1, attr: 'paper', atk: 420, hp: 5200, ga: 52, gh: 420, rate: 900, range: 130, air: true, proj: 'ice', cost: 800, cur: 'ruby', special: 'freezeBoost', arch: 'icequeen' },
  { key: 'elisia', r: 1, attr: 'paper', atk: 375, hp: 8000, ga: 45, gh: 640, rate: 900, range: 120, air: true, proj: 'fire', slow: 1.5, cost: 800, cur: 'ruby', arch: 'dragonrider' },
  { key: 'grombar', r: 1, attr: 'rock', atk: 490, hp: 5000, ga: 56, gh: 320, rate: 800, range: 52, air: false, aoe: 60, cost: 800, cur: 'ruby', arch: 'dwarf' },
  { key: 'merlin', r: 1, attr: 'scissors', atk: 368, hp: 1725, ga: 56, gh: 240, rate: 1500, range: 150, air: true, proj: 'fire', aoe: 55, cost: 800, cur: 'ruby', arch: 'wizard', companion: 'cat' },
  { key: 'robin', r: 1, attr: 'scissors', atk: 525, hp: 4375, ga: 90, gh: 480, rate: 700, range: 175, air: true, proj: 'arrow', cost: 800, cur: 'ruby', arch: 'archer', companion: 'falcon', awaken: 'robinAwk' },
  { key: 'robinAwk', r: 5, attr: 'scissors', atk: 21000, hp: 70000, ga: 900, gh: 2800, rate: 480, range: 190, air: true, proj: 'arrow', mythic: true, skill: 'ultArrow', baseHero: 'robin', arch: 'archer' },
  { key: 'duke', r: 2, attr: 'rock', atk: 315, hp: 12000, ga: 30, gh: 800, rate: 1400, range: 80, air: true, proj: 'wave', aoe: 70, cost: 2000, cur: 'ruby', arch: 'necro' },
  { key: 'anna', r: 2, attr: 'paper', atk: 560, hp: 3450, ga: 63, gh: 210, rate: 1000, range: 145, air: true, proj: 'slash', cost: 2000, cur: 'ruby', arch: 'dancer' },
  { key: 'dangsoso', r: 2, attr: 'scissors', atk: 560, hp: 2475, ga: 74, gh: 180, rate: 450, range: 135, air: true, proj: 'shuriken', cost: 1500, cur: 'ruby', arch: 'ninja' },
  { key: 'elijah', r: 2, attr: 'paper', atk: 0, hp: 8900, ga: 0, gh: 850, rate: 1000, range: 155, heal: 0.05, air: false, mode: 'heal', cost: 1500, cur: 'ruby', arch: 'priest' },
  { key: 'fenrir', r: 3, attr: 'rock', atk: 1980, hp: 7700, ga: 250, gh: 800, rate: 600, range: 64, air: false, aoe: 80, cost: 1000, cur: 'magicstone', arch: 'wolf', awaken: 'fenrirAwk' },
  { key: 'fenrirAwk', r: 5, attr: 'rock', atk: 156750, hp: 60000, ga: 3000, gh: 3000, rate: 420, range: 80, air: false, aoe: 85, mythic: true, armorPierce: 999, skill: 'wolfSpirit', baseHero: 'fenrir', arch: 'wolf' },
  { key: 'kibong', r: 5, attr: 'scissors', atk: 50000, hp: 150000, ga: 10000, gh: 15000, rate: 500, range: 80, air: false, aoe: 75, mythic: true, soul: 'kibong', skill: 'plum', cost: 150, cur: 'soul', arch: 'swordsman' },
  { key: 'nancheon', r: 5, attr: 'rock', atk: 45000, hp: 120000, ga: 9000, gh: 12000, rate: 420, range: 70, air: false, mythic: true, soul: 'nancheon', cost: 150, cur: 'soul', arch: 'monk' },
  { key: 'dalma', r: 5, attr: 'paper', atk: 40000, hp: 200000, ga: 8000, gh: 20000, rate: 700, range: 75, air: false, aoe: 85, mythic: true, soul: 'dalma', cost: 150, cur: 'soul', arch: 'palm' },
  { key: 'mukhyang', r: 5, attr: 'scissors', atk: 60000, hp: 100000, ga: 12000, gh: 10000, rate: 480, range: 170, air: true, proj: 'slash', mythic: true, soul: 'mukhyang', cost: 150, cur: 'soul', arch: 'swordsman' },
  { key: 'loki', r: 5, attr: 'paper', atk: 25000, hp: 100000, ga: 5000, gh: 10000, rate: 500, range: 175, air: true, proj: 'fire', aoe: 65, mythic: true, soul: 'loki', cost: 150, cur: 'soul', arch: 'trickster' },
  { key: 'hellknight', r: 5, attr: 'rock', atk: 30000, hp: 80000, ga: 6000, gh: 8000, rate: 600, range: 82, air: false, aoe: 90, mythic: true, soul: 'hellknight', cost: 150, cur: 'soul', arch: 'paladin' },
  { key: 'wolfking', r: 5, attr: 'scissors', atk: 35000, hp: 180000, ga: 7000, gh: 18000, rate: 520, range: 75, air: false, aoe: 80, mythic: true, soul: 'wolfking', cost: 150, cur: 'soul', arch: 'wolf' },
  { key: 'queensnake', r: 5, attr: 'paper', atk: 40000, hp: 150000, ga: 8000, gh: 15000, rate: 480, range: 135, air: true, proj: 'wave', mythic: true, soul: 'queensnake', cost: 150, cur: 'soul', arch: 'serpent' }
];
GTD.HERO_BY_KEY = {};
GTD.HEROES.forEach(h => { GTD.HERO_BY_KEY[h.key] = h; });
GTD.SOUL_TYPES = ['kibong', 'nancheon', 'dalma', 'mukhyang', 'loki', 'hellknight', 'wolfking', 'queensnake'];

GTD.AWAKEN = {
  robin: { to: 'robinAwk', lvl: 50, gold: 10000000, ms: 1000 },
  fenrir: { to: 'fenrirAwk', lvl: 50, gold: 10000000, ms: 1000 }
};

/* Hero level formulas */
GTD.heroAtk = function (h, lvl) { return (h.atk || 0) + (h.ga || 0) * (lvl - 1); };
GTD.heroHp = function (h, lvl) { return h.hp + (h.gh || 0) * (lvl - 1); };
GTD.heroHeal = function (h, lvl) { return (h.heal || 0) + 0.0004 * (lvl - 1); };
GTD.xpNeed = function (lvl) { return Math.floor(60 * Math.pow(1.08, lvl - 1)); };
GTD.heroUpCost = function (lvl) { return Math.floor(1000 * Math.pow(1.12, lvl - 1)); }; // gold, level->level+1
GTD.HERO_LEVEL_CAP = 60;

/* ---------- TOWERS ---------- */
GTD.TOWERS = [
  { key: 'thorn', attr: 'paper', atk: 45, range: 78, rate: 1000, mode: 'spike', air: false, tier: 0 },
  { key: 'iceArrow', attr: 'scissors', atk: 34, range: 155, rate: 1100, proj: 'ice', air: true, slow: 2, tier: 0 },
  { key: 'assassin', attr: 'scissors', atk: 60, range: 95, rate: 900, mode: 'spawner', unit: 'assassin', units: 1, tier: 1 },
  { key: 'shuriken', attr: 'paper', atk: 22, range: 145, rate: 450, proj: 'shuriken', air: true, multi: 3, tier: 1 },
  { key: 'magic', attr: 'scissors', atk: 85, range: 145, rate: 1300, proj: 'fire', air: true, aoe: 55, burn: 0.3, tier: 0 },
  { key: 'lightning', attr: 'paper', atk: 95, range: 165, rate: 1200, mode: 'chain', chain: 3, airOnly: true, tier: 2 },
  { key: 'nun', attr: 'paper', atk: 0, mode: 'heal', heal: 0.02, range: 135, rate: 1000, tier: 2 },
  { key: 'barracks', attr: 'paper', atk: 30, mode: 'spawner', unit: 'soldier', units: 2, range: 110, rate: 1000, tier: 1 },
  { key: 'cannon', attr: 'paper', atk: 115, range: 175, rate: 1600, proj: 'cannon', air: true, aoe: 62, tier: 2 },
  { key: 'wolf', attr: 'scissors', atk: 130, range: 115, rate: 800, mode: 'spawner', unit: 'wolf', units: 1, tier: 3 },
  { key: 'bat', attr: 'paper', atk: 45, range: 135, rate: 320, proj: 'ice', air: true, armorPierce: 3, tier: 3 },
  { key: 'blossom', attr: 'paper', atk: 120, range: 150, rate: 1200, proj: 'petal', air: true, aoe: 70, tier: 4 },
  { key: 'bamboo', attr: 'scissors', atk: 95, range: 170, rate: 900, proj: 'bamboo', air: true, pierce: 2, tier: 4 },
  { key: 'orchid', attr: 'rock', atk: 80, range: 150, rate: 1100, proj: 'poison', air: true, poison: 0.35, tier: 4 },
  { key: 'chrys', attr: 'rock', atk: 135, range: 160, rate: 1250, mode: 'chain', chain: 4, tier: 4 }
];
GTD.TOWER_BY_KEY = {};
GTD.TOWERS.forEach(t => { GTD.TOWER_BY_KEY[t.key] = t; });

GTD.BUILD_COST = 100;         // mineral
GTD.TOWER_UP_COST = [0, 150, 250]; // level1->2 :150, level2->3 :250
GTD.TOWER_SELL = [50, 125, 250];   // refund by level
GTD.TOWER_MAX_LEVEL = 3;
/* Cards -> tower rarity tier upgrade (cards to go tier -> tier+1) */
GTD.CARD_COST = [3, 6, 10, 15, 15]; // 0->1:3, 1->2:6, 2->3:10, 3->4:15, 4->5:15
GTD.towerAtk = function (t, tier, level, scale, triple) {
  if (!t || !t.atk) return 0;
  return t.atk * GTD.RAR_MULT[tier] * (1 + (level - 1) * 0.7) * scale * (triple ? 1.2 : 1);
};
GTD.tripleTowerBonus = function (towers) {
  // towers: {key:true} owned map
  const have = { scissors: false, rock: false, paper: false };
  GTD.TOWERS.forEach(t => { if (towers[t.key]) have[t.attr] = true; });
  return have.scissors && have.rock && have.paper;
};

/* ---------- REGIONS ---------- */
GTD.REGION_NAMES = [
  ['Vườn Xanh', 'Green Garden'],
  ['Đầm Lầy', 'Swamp'],
  ['Sa Mạc Chết', 'Desert of Death'],
  ['Đảo Băng', 'Ice Island'],
  ['Dung Nham', 'Lava Field'],
  ['Âm Giới', 'Underworld'],
  ['Nhà Thờ Garmel', 'Carmel Cathedral'],
  ['Đền Băng', 'Ice Temple'],
  ['Vườn Mây', 'Cloud Garden'],
  ['El Dorado', 'El Dorado']
];
GTD.REGIONS = [
  {
    grass: ['#7ec850', '#5aa838'], path: '#b98d5e', hp: 28, atk: 5, gold: 500, diamond: 50, airFrom: 3, hcFrom: 4, weather: 'leaf',
    monsters: [
      ['Heo Rừng', 'Wild Boar'], ['Quả Cầu Cỏ', 'Grass'], ['Trộm Anh Cả', 'Thief Brother'], ['Trộm Em Út', 'Thief Younger'],
      ['Bụi Bặm', 'Munchie'], ['Ong Japbi', 'Japbi'], ['Thỏ Lính', 'Minion Rabbit'], ['Nhện Con', 'Baby Spider'],
      ['Nhện Già', 'Spider'], ['Tượng Đá Rêu', 'Big Grass Stone']
    ]
  },
  {
    grass: ['#5a8a4a', '#3a6a35'], path: '#7a6a4a', hp: 400, atk: 35, gold: 2000, diamond: 100, airFrom: 3, hcFrom: 4, weather: 'bubble',
    monsters: [
      ['Cây Diona', 'Diona'], ['Rắn Boasneck', 'Boasneck'], ['Orc Đầm Lầy', 'Orcs'], ['Bọ Ngựa', 'Mantis'],
      ['Bùn Lỏng', 'Mud'], ['Heo Đột Biến', 'Mutant Boar'], ['Nhện Đột Biến', 'Mutant Spider'], ['Ong Đỏ', 'Mutant Bee'],
      ['Người Thằn Lằn', 'Lizardman'], ['Cá Sấu Quyền', 'Boxing Crocodile']
    ]
  },
  {
    grass: ['#d8b878', '#c8a058'], path: '#b08850', hp: 1400, atk: 110, gold: 5000, diamond: 200, airFrom: 4, hcFrom: 5, weather: 'sand',
    monsters: [
      ['Bọ Cạp Bụi', 'Dust Scorpion'], ['Chiến Binh Ướp', 'Mummy Warrior'], ['Diều Hâu Bụi', 'Dust Vulture'], ['Rắn Mộ', 'Tomb Snake'],
      ['Kẻ Đánh Cáo', 'Jackal Raider'], ['Đàn Kim Đứng', 'Scarab Swarm'], ['Golem Cát', 'Sand Golem'], ['Gác Mộ Anubis', 'Anubis Guard'],
      ['Jinn Bụi', 'Dust Djinn'], ['Pharaoh Vĩnh Hằng', 'Eternal Pharaoh']
    ]
  },
  {
    grass: ['#bfe3f2', '#8fc8e8'], path: '#a8c8d8', hp: 5000, atk: 380, gold: 12000, diamond: 300, airFrom: 3, hcFrom: 5, weather: 'snow',
    monsters: [
      ['Cánh Cụt Băng', 'Frost Penguin'], ['Thỏ Tuyết', 'Snow Hare'], ['Sói Băng', 'Frost Wolf'], ['Yeti', 'Yeti'],
      ['Nguyên Tố Băng', 'Ice Elemental'], ['Harpy Mùa Đông', 'Winter Harpy'], ['Nhện Băng Hà', 'Glacier Spider'], ['Hiệp Sĩ Băng', 'Ice Knight'],
      ['Hiệp Sĩ Sườn Đá', 'Glacier Knight'], ['Leviathan Đóng Băng', 'Frozen Leviathan']
    ]
  },
  {
    grass: ['#5a2a22', '#3a1a16'], path: '#6a3a2a', hp: 18000, atk: 1300, gold: 30000, diamond: 400, airFrom: 4, hcFrom: 6, weather: 'ember',
    monsters: [
      ['Tiểu Quỷ', 'Imp'], ['Trạch Nham', 'Magma Slug'], ['Dơi Lửa', 'Fire Bat'], ['Sâu Nham', 'Lava Worm'],
      ['Golem Thủy Tinh', 'Obsidian Golem'], ['Chó Sói Địa Ngục', 'Hellhound'], ['Ma Lửa', 'Flamewraith'], ['Hiệp Sĩ Quỷ', 'Demon Knight'],
      ['Nguyên Tố Hỏa Ngục', 'Inferno Elemental'], ['Quân Chủ Hỏa Ngục', 'Infernal Tyrant']
    ]
  },
  {
    grass: ['#3a2a4a', '#241a30'], path: '#4a3a5a', hp: 65000, atk: 4500, gold: 80000, diamond: 500, airFrom: 4, hcFrom: 6, weather: 'soul',
    monsters: [
      ['Hồn Lạc Lối', 'Lost Soul'], ['Binh Xương', 'Skeleton Soldier'], ['Quỷ Ám', 'Wraith'], ['Dơi Địa Ngục', 'Hell Bat'],
      ['Nhện Xương', 'Bone Spider'], ['Đệ Tử Tử Thần', 'Reaper Acolyte'], ['Hiệp Sĩ Nguyền Rủa', 'Cursed Knight'], ['Miệng Hầm', 'Abyss Maw'],
      ['Rắn Hư Không', 'Void Serpent'], ['Thần Chết Gặt', 'Death Reaper']
    ]
  },
  {
    grass: ['#4a4258', '#322c40'], path: '#5a5268', hp: 230000, atk: 15000, gold: 200000, diamond: 600, airFrom: 5, hcFrom: 6, weather: 'holy',
    monsters: [
      ['Thần Đạo Hư Hủy', 'Corrupted Cultist'], ['Tước Thạch', 'Gargoyle'], ['Tu Sĩ Hắc', 'Dark Friar'], ['Kẻ Nhiệt Thành', 'Zealot'],
      ['Ca Đoàn Sa Đọa', 'Fallen Choir'], ['Giáp Ma Sở', 'Possessed Armor'], ['Rắn Hư Không', 'Void Serpent'], ['Kẻ Săn Bảo Vật', 'Relic Hunter'],
      ['Thần Vệ Nhà Thờ', 'Cathedral Guardian'], ['Tổng Giám Mục Sụp Đổ', 'Archbishop of Ruin']
    ]
  },
  {
    grass: ['#a8d8ee', '#78b8d8'], path: '#98c0d8', hp: 800000, atk: 50000, gold: 500000, diamond: 700, airFrom: 5, hcFrom: 7, weather: 'snow',
    monsters: [
      ['Vệ Thần', 'Temple Guard'], ['Tư Tế Băng', 'Frost Priestess'], ['Thần Vệ Pha Lê', 'Crystal Sentinel'], ['Cung Thủ Băng', 'Ice Archer'],
      ['Sói Sương', 'Rime Wolf'], ['Góa Phụ Tuyết', 'Snow Widow'], ['Hiệp Sĩ Đóng Băng', 'Frozen Knight'], ['Nguyên Tố Sườn Đá', 'Glacial Elemental'],
      ['Bóng Ma Băng', 'Ice Wraith'], ['Ngôn Sứ Băng', 'Ice Prophet']
    ]
  },
  {
    grass: ['#d8e8f8', '#b8d0ee'], path: '#c8b898', hp: 2800000, atk: 170000, gold: 1200000, diamond: 800, airFrom: 5, hcFrom: 7, weather: 'cloud',
    monsters: [
      ['Cỏ Mây', 'Cloudling'], ['Cáo Trời', 'Sky Fox'], ['Harpy', 'Harpy'], ['Sprite Bão', 'Storm Sprite'],
      ['Griffin Gió', 'Wind Griffin'], ['Nhện Mây', 'Nimbus Spider'], ['Sâu Sấm Con', 'Thunder Roc Chick'], ['Thần Vệ Không Khí', 'Aero Guardian'],
      ['Rắn Trời', 'Sky Serpent'], ['Chúa Tể Cơn Bão', 'Storm Lord']
    ]
  },
  {
    grass: ['#c8a83a', '#a8882a'], path: '#b8934a', hp: 9500000, atk: 600000, gold: 3000000, diamond: 1000, airFrom: 6, hcFrom: 7, weather: 'gold',
    monsters: [
      ['Thằn Lằn Vàng', 'Gold Lizard'], ['Dơi Kho Báu', 'Treasure Bat'], ['Slime Xu', 'Coin Slime'], ['Vệ Sĩ Rắn', 'Serpent Guard'],
      ['Chiến Binh Mặt Trời', 'Sun Warrior'], ['Tượng Ngọc Bích', 'Emerald Idol'], ['Golem Ngọc Bích', 'Jade Golem'], ['Bóng Ma Vàng', 'Golden Phantom'],
      ['Rắn Vàng', 'Golden Serpent'], ['Thần Vệ El Dorado', 'El Dorado Guardian']
    ]
  }
];
GTD.REGION_COUNT = 10;
GTD.STAGES_PER_REGION = 20;
GTD.MAX_STAGE = 200;

GTD.regionOfStage = function (stage) { return Math.min(9, Math.floor((stage - 1) / 20)); };
GTD.stageIndexInRegion = function (stage) { return ((stage - 1) % 20); };
GTD.isBossStage = function (stage) { return stage % 10 === 0; };

/* Base monster modifiers per pool index (0..9) */
GTD.MODS = [
  { atk: 1, hp: 1 }, { atk: 0.8, hp: 0.7 }, { atk: 1.2, hp: 1.3 }, { atk: 1, hp: 1.1, ranged: true },
  { atk: 1.5, hp: 1.6 }, { atk: 1.2, hp: 1.2, fast: true }, { atk: 1.6, hp: 1.8 },
  { atk: 1.8, hp: 2.2 }, { atk: 6, hp: 5, elite: true }, { atk: 30, hp: 60, boss: true }
];

/* Build the 10 monster defs for a region (deterministic) */
GTD.buildRegionPool = function (regionIndex) {
  const reg = GTD.REGIONS[regionIndex];
  const pool = [];
  for (let i = 0; i < 10; i++) {
    const mod = GTD.MODS[i];
    const attr = GTD.ATTR_KEYS[(i + regionIndex) % 3];
    const air = i >= reg.airFrom && i % 2 === 1 && i !== 9;
    const armored = i >= reg.hcFrom && (i === 4 || i === 6 || i === 9);
    const hc = armored ? 15 + reg.hcFrom * 6 : 0;
    const baseAtk = reg.atk * mod.atk;
    const baseHp = reg.hp * mod.hp;
    pool.push({
      idx: i,
      nameVn: reg.monsters[i][0], nameEn: reg.monsters[i][1],
      attr: attr, air: air, ranged: !!mod.ranged, fast: !!mod.fast,
      elite: !!mod.elite, boss: !!mod.boss,
      hc: hc,
      regen: i === 7 ? baseAtk * 0.5 : 0,
      baseAtk: baseAtk, baseHp: baseHp
    });
  }
  return pool;
};

/* Monster speeds (px/s) */
GTD.monsterSpeed = function (m) {
  let base = m.boss ? 26 : m.elite ? 36 : m.fast ? 120 : 48;
  return base; // random 0.9-1.1 applied per instance
};

/* Player regional scale: 3.3 ^ regionIndex */
GTD.playerScale = function (regionIndex) { return Math.pow(3.3, regionIndex); };

/* ---------- BATTLEFIELD PATHS ---------- */
GTD.PATHS = [
  {
    wps: [[-40, 90], [680, 90], [680, 270], [240, 270], [240, 450], [1000, 450]],
    slots: [[110, 160], [300, 160], [500, 160], [620, 205], [760, 170], [780, 320], [620, 360], [400, 360], [170, 340], [170, 440], [330, 390], [560, 390], [350, 515], [620, 515], [830, 515]]
  },
  {
    wps: [[-40, 80], [840, 80], [840, 220], [120, 220], [120, 380], [1000, 380]],
    slots: [[150, 150], [350, 150], [550, 150], [750, 150], [940, 150], [700, 300], [500, 300], [300, 300], [60, 300], [300, 455], [520, 455], [740, 455], [900, 455]]
  },
  {
    wps: [[-40, 460], [160, 460], [160, 120], [400, 120], [400, 360], [640, 360], [640, 160], [880, 160], [880, 460], [1000, 460]],
    slots: [[80, 180], [80, 390], [280, 200], [280, 330], [520, 200], [520, 300], [520, 430], [760, 240], [760, 340], [940, 300], [300, 60], [560, 60], [800, 60]]
  },
  {
    wps: [[-40, 100], [300, 100], [300, 300], [620, 300], [620, 140], [1000, 140]],
    slots: [[150, 180], [420, 180], [60, 300], [150, 430], [450, 400], [560, 400], [740, 240], [880, 240], [760, 420], [880, 420], [740, 40]]
  }
];
GTD.pathForRegion = function (regionIndex) { return GTD.PATHS[regionIndex % 4]; };

/* ---------- ABILITIES ---------- */
GTD.ABILITIES = [
  { key: 'volunteer', cd: 30000, cost: null, type: 'summon' },
  { key: 'meteor', cd: 20000, cost: null, type: 'target' },
  { key: 'move', cd: 1000, cost: null, type: 'move' },
  { key: 'bomb', cd: 5000, cost: { gold: 5000 }, type: 'target' },
  { key: 'freeze', cd: 15000, cost: { gold: 10000 }, type: 'global' },
  { key: 'nuke', cd: 30000, cost: { ruby: 30 }, type: 'global' },
  { key: 'heart', cd: 10000, cost: { gold: 100000 }, type: 'global' },
  { key: 'mineral', cd: 8000, cost: { gold: 60000 }, type: 'global' },
  { key: 'speed', cd: 0, cost: null, type: 'toggle' },
  { key: 'callwave', cd: 0, cost: null, type: 'wave' }
];

/* ---------- GLOBAL UPGRADES ---------- */
GTD.UPGRADES = [
  { key: 'soldier', max: 20 },
  { key: 'meteor', max: 6 },
  { key: 'barracks', max: 8 },
  { key: 'volunteer', max: 10 }
];
GTD.upCost = function (level) { return 30000 * (level + 1); };
GTD.meteorDamage = function (level) { return 100 + level * 50; };
GTD.barracksSoldiers = function (level) { return 2 + Math.floor(level / 2); };
GTD.volunteerAtk = function (level) { return 2 + level * 50; };
GTD.volunteerHp = function (level) { return 20 + level * 500; };

/* ---------- SOUL STONES ---------- */
GTD.SOUL_PER_LEVEL = 150;

/* ---------- STAGE VICTORY ---------- */
GTD.starFor = function (hearts) { return hearts >= 5 ? 3 : hearts >= 3 ? 2 : 1; };
GTD.victoryGold = function (regionIndex, stageIdx, firstClear) {
  return Math.floor(GTD.REGIONS[regionIndex].gold * (1 + stageIdx * 0.05) * (firstClear ? 1.0 : 0.2));
};

/* ---------- DAILY CHALLENGE ---------- */
GTD.DC = {
  ticketCost: 50,
  difficulties: [
    { key: 'easy', tickets: 1, minStage: 5, maxStage: 20, reward: 100, tier: 2, need: 5 },
    { key: 'normal', tickets: 2, minStage: 45, maxStage: 60, reward: 200, tier: 3, need: 45 },
    { key: 'hard', tickets: 3, minStage: 65, maxStage: 80, reward: 350, tier: 4, need: 65 }
  ]
};

/* ---------- TOWER OF PROOF ---------- */
GTD.TOP_MAX_FLOOR = 15;
GTD.TOP = { entry: 50000, rewards: [
  null,
  [{ cur: 'gold', n: 100000 }],
  [{ cur: 'cards', n: 5 }],
  [{ cur: 'gold', n: 300000 }],
  [{ cur: 'cards', n: 5 }],
  [{ cur: 'mileage', n: 100 }],
  [{ cur: 'diamond', n: 500 }],
  [{ cur: 'diamond', n: 600 }],
  [{ cur: 'diamond', n: 700 }],
  [{ cur: 'diamond', n: 800 }],
  [{ cur: 'diamond', n: 900 }],
  [{ cur: 'diamond', n: 1000 }],
  [{ cur: 'diamond', n: 1500 }],
  [{ cur: 'diamond', n: 3000 }],
  [{ cur: 'mileage', n: 500 }, { cur: 'gold', n: 1000000 }],
  null
] };
GTD.MILEAGE_EXCHANGE = [
  { cost: 100, give: 'souls3' },
  { cost: 300, give: 'magicstone1000' }
];

/* ---------- ATTENDANCE ---------- */
GTD.ATTENDANCE = [
  { cur: 'gold', n: 50000 }, { cur: 'diamond', n: 50 }, { cur: 'ruby', n: 100 },
  { cur: 'gold', n: 100000 }, { cur: 'diamond', n: 80 }, { cur: 'magicstone', n: 50 },
  { cur: 'soul', n: 2 }, { cur: 'gold', n: 200000 }, { cur: 'diamond', n: 100 }, { cur: 'ruby', n: 200 },
  { cur: 'gold', n: 300000 }, { cur: 'diamond', n: 120 }, { cur: 'magicstone', n: 80 }, { cur: 'soul', n: 5 },
  { cur: 'gold', n: 500000 }, { cur: 'diamond', n: 150 }, { cur: 'ruby', n: 300 },
  { cur: 'gold', n: 600000 }, { cur: 'diamond', n: 180 }, { cur: 'magicstone', n: 120 },
  { cur: 'soul', n: 8 }, { cur: 'gold', n: 800000 }, { cur: 'diamond', n: 200 }, { cur: 'ruby', n: 400 },
  { cur: 'gold', n: 1000000 }, { cur: 'diamond', n: 250 }, { cur: 'magicstone', n: 150 },
  { cur: 'soul', n: 10 }, { cur: 'gold', n: 2000000 },
  { multi: [{ cur: 'diamond', n: 1000 }, { cur: 'soul', n: 20 }] }
];

/* ---------- MISSIONS ---------- */
GTD.MISSIONS_DAILY = [
  { key: 'kills', target: 500, reward: { gold: 300000 } },
  { key: 'builds', target: 50, reward: { ruby: 50 } },
  { key: 'meteors', target: 30, reward: { diamond: 1000 } },
  { key: 'clears', target: 50, reward: { gold: 800000 } }
];
GTD.MISSIONS_WEEKLY = [
  { key: 'kills', target: 5000, reward: { diamond: 1500 } },
  { key: 'clears', target: 100, reward: { ruby: 300 } }
];
GTD.MISSIONS_ACH = [
  { key: 'clears50', target: 50, stat: 'stagesCleared', reward: { diamond: 500 } },
  { key: 'kills10k', target: 10000, stat: 'totalKills', reward: { ruby: 500 } },
  { key: 'boss20', target: 20, stat: 'totalBossKills', reward: { gold: 500000 } },
  { key: 'login6', target: 6, stat: 'logins', reward: { diamond: 2000 } }
];

/* ---------- GACHA ---------- */
GTD.GACHA = {
  normal: { cur: 'ruby', c1: 100, c10: 900, rates: [55, 25, 12, 6, 1.7, 0.3] },
  premium: { cur: 'diamond', c1: 50, c10: 450, rates: [35, 30, 18, 10, 5, 2] },
  pity: 90,
  dupCards: [5, 3, 2, 2, 1, 1]
};

/* ---------- SAVE META ---------- */
GTD.GAME_VERSION = '3.0.6';
GTD.SAVE_VERSION = 34;
GTD.LS_KEY = 'GTD_M_SAVE_V1';
GTD.LS_BACKUP_KEY = 'GTD_M_SAVE_V1_backup';
GTD.DB_NAME = 'GTD_SaveDB';
GTD.DB_STORE = 'saves';
GTD.DB_PRIMARY = 'primary';

/* ---------- BATTLE CONSTANTS ---------- */
GTD.BATTLE = {
  W: 960, H: 540,
  lives: 5, topLives: 3,
  mineral: 500, topMineral: 650,
  waves: 20, topWaves: 10,
  initialTimer: 5,
  interWave: 5,
  leakNormal: 1, leakBoss: 3,
  heroRespawn: 8,
  soldierRespawn: 8,
  gridCell: 64,
  maxHearts: 10
};

/* ============================================================
   I18N
   ============================================================ */
GTD.I18N = {
  vn: {
    game_title: 'GOLD TOWER DEFENCE M',
    loading: 'Đang tải...',
    // common
    start_game: 'BẮT ĐẦU TRÒ CHƠI', back: 'Quay lại', close: 'Đóng', confirm: 'Xác nhận', cancel: 'Hủy',
    claim: 'Nhận', claimed: 'Đã nhận', buy: 'Mua', sell: 'Bán', upgrade: 'Nâng cấp', cost: 'Giá', owned: 'Đã sở hữu',
    locked: 'Chưa mở khóa', level: 'Cấp', max: 'TỐI ĐA', wave: 'Làn sóng', lives: 'Sinh mạng', mineral: 'Khoáng sản',
    speed: 'Tốc độ', pause: 'Tạm dừng', resume: 'Tiếp tục', restart: 'Chơi lại', quit: 'Thoát',
    victory: 'CHIẾN THẮNG', defeat: 'THẤT BẠI', next_stage: 'Giai đoạn tiếp', retry: 'Thử lại', reward: 'Phần thưởng',
    gold: 'Vàng', diamond: 'Kim Cương', ruby: 'Hoàng Ngọc', magicstone: 'Thạch Ma Pháp', mileage: 'Lý Trình',
    atk: 'Tấn công', range: 'Tầm', heal: 'Hồi máu', air: 'Hỗn Không', ground: 'Mặt đất', attr: 'Thuộc tính',
    rarity_gray: 'Xám', rarity_green: 'Xanh Lá', rarity_blue: 'Xanh Lam', rarity_epic: 'Epic', rarity_legend: 'Legendary', rarity_mythic: 'Mythic',
    attr_scissors: 'Kéo', attr_rock: 'Búa', attr_paper: 'Bao Bì',
    not_enough: 'Không đủ tài nguyên!', saved: 'Đã lưu!',
    // scenes
    team: 'Đội hình', upgrade_scene: 'Nâng Cấp', gacha: 'Gacha Tháp', missions: 'Nhiệm Vụ', mailbox: 'Hộp Thư',
    codex: 'Lô Kỹ', settings: 'Cài Đặt', daily: 'Thử Thách Ngày', top: 'Tháp Chứng Minh', attendance: 'Điểm Danh',
    stage_select: 'Chọn Giai Đoạn', stage: 'Giai đoạn', region: 'Khu vực', floor: 'Tầng', play: 'CHƠI', enter: 'VÀO',
    tickets: 'Vé', buy_ticket: 'Mua vé (50 Kim Cương)', required_stage: 'Yêu cầu',
    // lobby
    your_team: 'Đội hình của bạn',
    // battle
    build_tower: 'Xây tháp (100 khoáng sản)', tower_level: 'Cấp tháp', upgrade_tower: 'Nâng cấp', sell_tower: 'Bán',
    no_mineral: 'Không đủ khoáng sản!', boss_wave: 'LÀN SÓNG BOSS!', boss_enraged: 'BOSS GIẬN LŨNG!',
    all3_toast: 'Đủ 3 thuộc tính — ATK Anh Hùng ×1.5!', wave_incoming: 'Làn sóng tiếp theo trong ít phút...',
    call_wave_bonus: 'Gọi sóng sớm: +{g} vàng, +{m} khoáng sản',
    tower_unlocked: 'Mở khóa tháp mới: {n}!', hero_woke: '{n} thức tỉnh!',
    // abilities
    ab_volunteer: 'Tình Nguyện Viên', ab_volunteer_d: 'Gọi 1 quân (40s). CD 30s',
    ab_meteor: 'Thiên Thạch', ab_meteor_d: 'Công kích theo tọa độ. CD 20s',
    ab_move: 'Di Chuyển', ab_move_d: 'Lệnh di chuyển anh hùng. CD 1s',
    ab_bomb: 'Bom', ab_bomb_d: 'Bán kính 120. CD 5s',
    ab_freeze: 'Đóng Băng', ab_freeze_d: 'Đóng băng mọi quái. CD 15s',
    ab_nuke: 'Hủy Diệt', ab_nuke_d: 'Tấn công toàn màn. CD 30s',
    ab_heart: 'Trái Tim', ab_heart_d: '+5 sinh mạng (tối đa 10). CD 10s',
    ab_mineral: 'Khoáng Sản', ab_mineral_d: '+250 khoáng sản. CD 8s',
    ab_speed: 'Tốc Độ', ab_speed_d: 'Chuyển 1x→2x→3x',
    ab_callwave: 'Gọi Sóng', ab_callwave_d: 'Gọi sớm làn sóng kế tiếp',
    ready: 'Sẵn sàng', select_hero: 'Chọn anh hùng tiếp theo', select_point: 'Chạm vào chiến trường',
    // team scene
    suggest: 'Gợi Ý Đội', team_full: 'Đội hình đã đủ 5 người!', hero_name: 'Tên', purchase: 'Mua', awaken_btn: 'THỨC TỈNH',
    awaken_req: 'Cần: Cấp {l} • {g} Vàng • {m} Thạch', in_team: 'Trong đội', out_team: 'Chưa trong đội',
    add_team: 'Thêm vào đội', remove_team: 'Bỏ khỏi đội',
    hero_unk: 'Chưa sở hữu', soul_stones: 'Hồn Thạch',
    // upgrade scene
    up_soldier: 'Lính', up_soldier_d: '+20% sát thương / máu mỗi cấp',
    up_meteor: 'Thiên Thạch', up_meteor_d: 'Sát thương: {d}',
    up_barracks: 'Doanh Trại', up_barracks_d: 'Lính: {n}',
    up_volunteer: 'Tình Nguyện Viên', up_volunteer_d: 'ATK {a} / HP {h}',
    up_cost: 'Giá: {g} Vàng', tower_rarity: 'Hạng Tháp (thẻ)', tower_rarity_d: 'Dùng thẻ nâng hạng tháp',
    // gacha
    normal_gacha: 'Gacha Thường', premium_gacha: 'Gacha Cao Cấp', pull1: 'Rút 1', pull10: 'Rút 10',
    pity: 'Pity', new_tower: 'MỚI', dup: 'Trùng — nhận thẻ', rate: 'Tỷ lệ',
    // daily
    easy: 'Dễ', normal: 'Vừa', hard: 'Khó', dc_reward: 'Phần thưởng: {d} Kim Cương',
    dc_tower: 'Tháp mở khóa ngẫu nhiên (hạng {t})', dc_unlocked: 'Thử thách ngày mở khóa: {n}!',
    dc_cards: 'Tháp đã có — +5 thẻ {n}', dc_no_ticket: 'Không đủ vé!', dc_locked: 'Chưa đạt yêu cầu giai đoạn!',
    dc_clears: 'Đã chinh phục',
    // top
    top_entry: 'Vào tháp: 50.000 Vàng', top_floor: 'Tầng hiện tại', top_next: 'Chơi tầng {f}',
    top_conquered: 'ĐÃ CHINH PHỤC THÁP CHỨNG MINH!', top_reward: 'Phần thưởng tầng {f}',
    mileage_exchange: 'Đổi Lý Trình', ex_souls: '100 Lý Trình → 3 Hồn Thạch Mythic', ex_ms: '300 Lý Trình → 1000 Thạch Ma Pháp',
    no_mileage: 'Không đủ lý trình!',
    // attendance
    day: 'Ngày', attendance_claim: 'Nhận thưởng ngày {d}', attendance_done: 'Hôm nay đã nhận!', attendance_next_month: 'Chu kỳ mới tháng sau',
    // missions
    daily_m: 'Hàng Ngày', weekly_m: 'Hàng Tuần', achievement: 'Thành Tựu',
    m_kill500: 'Diệt 500 quái', m_build50: 'Xây 50 tháp', m_meteor30: 'Dùng Thiên Thạch 30 lần', m_clear50: 'Chinh phục 50 giai đoạn',
    m_kill5000: 'Diệt 5000 quái', m_clear100: 'Chinh phục 100 giai đoạn',
    m_a1: 'Chinh phục 50 giai đoạn', m_a2: 'Diệt 10.000 quái', m_a3: 'Diệt 20 boss', m_a4: 'Đăng nhập 6 ngày',
    // mailbox
    mail_welcome_t: 'Chào mừng đến GTD M V3!', mail_empty: 'Không có thư', claim_all: 'Nhận tất cả',
    // codex
    cx_heroes: 'Anh Hùng', cx_towers: 'Tháp', cx_monsters: 'Quái Vật',
    desc: 'Mô tả', skill: 'Kỹ năng', air_cap: 'Hỗn không', hc: 'Giáp HC', fast: 'Nhanh', ranged: 'Tầm xa', regen: 'Tự hồi', boss: 'Boss', elite: 'Elite',
    // settings
    s_bgm: 'Nhạc nền (BGM)', s_sfx: 'Hiệu ứng (SFX)', s_volume: 'Âm lượng', s_lang: 'Ngôn ngữ', s_quality: 'Chất lượng',
    q_low: 'Thấp', q_high: 'Cao', s_gspeed: 'Tốc độ game', s_dmg: 'Hiển thị sát thương',
    s_export: 'Xuất dữ liệu', s_import: 'Nhập dữ liệu', s_reset: 'Xóa dữ liệu',
    reset_q: 'Xóa toàn bộ dữ liệu? Hành động không thể hoàn tác!',
    import_q: 'Nhập dữ liệu đã lưu (dán JSON):', import_ok: 'Nhập thành công!', import_fail: 'JSON không hợp lệ!',
    export_ok: 'Đã sao chép dữ liệu vào clipboard!',
    // results
    stars_earned: 'Sao nhận được', first_clear_bonus: 'Lần đầu: 100%', replay_bonus: 'Chơi lại: 20%',
    unlocked_next: 'Đã mở khóa giai đoạn {s}!', max_reached: 'Đã đạt giai đoạn tối đa 200!',
    // tutorial
    tut1: 'Bước 1: Chọn một tháp ở thanh dưới cùng',
    tut2: 'Bước 2: Chạm vào vòng tròn rỗng trên chiến trường để xây tháp',
    tut3: 'Bước 3: Chờ làn sóng đầu tiên...',
    tut4: 'Bước 4: Diệt quái! (Sát thương hiển thị theo màu)',
    tut5: 'Bước 5: Tuyệt vời! Nhận +1000 Vàng. Chúc may mắn!',
    tut_done: 'Hướng dẫn hoàn thành: +1000 Vàng',
    // misc
    paused: 'TẠM DỪNG', bgm_on: 'BGM: BẬT', bgm_off: 'BGM: TẮT', sfx_on: 'SFX: BẬT', sfx_off: 'SFX: TẮT',
    hero_purchase: 'Mua {n}?', welcome_back: 'Chào mừng quay lại!',
    floor_clear: 'Chinh phục tầng {f}!',
    top_reentry: 'Thử lại tốn 50.000 Vàng',
    // hero descriptions (short)
    d_nameless: 'Kết nối với El Dorado, giấu thân phận, quạ trên vai.',
    d_ace: 'Anh hùng khởi hành miễn phí, kiếm nhanh, máu cứng.',
    d_frozenHeart: 'Nữ vương băng. Có mặt: thời gian Đóng Băng tăng lên 15s. Miễn nhiễm đóng băng.',
    d_elisia: 'Cỡi rồng lửa, gây Chậm 1.5s cho địch.',
    d_grombar: 'Lùn chiến binh, búa đất chấn động gây sát thương diện rộng.',
    d_merlin: 'Pháp sư cùng chú mèo, phép lửa diện rộng tầm xa.',
    d_robin: 'Cung thủ cùng chim ưng, bắn cực nhanh tầm xa.',
    d_robinAwk: 'Tối Thượng Chi Thần: mũi tên xuyên hàng. Tháp Tên Băng ×3 ATK. (Thức tỉnh Robin)',
    d_duke: 'Kẻ sai khiến tử khí, sóng ma diện rộng.',
    d_anna: 'Múa kiếm ánh sáng, chém xé không trung.',
    d_dangsoso: 'Ninja cực tốc, phi tiêu liên hoàn.',
    d_elijah: 'Tư tế hồi máu cho anh hùng và lính nearby. (Hỏa lực 0)',
    d_fenrir: 'Chiến binh sói, cắn xé diện rộng.',
    d_fenrirAwk: 'Mỗi nhát xuyên toàn bộ giáp. Mỗi 5 nhát gọi Linh Hồn Sói. (Thức tỉnh Fenrir)',
    d_kibong: 'Mai Hoa Kiếm Tôn. Mỗi 3 nhát: Lốc Mai Hoa (chảy máu + chậm). Chảy máu giết: +1 tim (tối đa 50). Cấp 3: khoáng sản giết ×3. Cấp 10: ×15.',
    d_nancheon: 'Hồng Lam Đại Sư, quyền hỏa thiêu đốt.',
    d_dalma: 'Cương chưởng chấn địa, sát thương diện rộng khổng lồ.',
    d_mukhyang: 'Thủy kiếm phi thiên, tầm xa cực nhanh.',
    d_loki: 'Thần lừa đảo, lửa hỗn mang diện rộng.',
    d_hellknight: 'Kỵ sĩ địa ngục, aoe khủng khiếp.',
    d_wolfking: 'Vua sói, dẫn đầu đàn sói chiến trận.',
    d_queensnake: 'Nữ hoàng rắn, sóng độc cuộn trào.',
    // tower descriptions
    td_thorn: 'Gai đâm mặt đất, trúng mọi quái mặt đất trong tầm.',
    td_iceArrow: 'Tên băng làm Chậm 2s, bắn được hỗn không.',
    td_assassin: 'Gọi 1 Sát Thủ bóng tối cận chiến.',
    td_shuriken: 'Phi tiêu 3 mục tiêu, siêu nhanh.',
    td_magic: 'Phép lửa diện rộng, gây Đốt 2s.',
    td_lightning: 'Sấm Chuỗi 3 mục tiêu — CHỈ bắn địch hỗn không!',
    td_nun: 'Sư nữ hồi 2% máu anh hùng/lính quanh tháp.',
    td_barracks: 'Gọi lính khiên chặn quái mặt đất (tăng theo nâng cấp Doanh Trại).',
    td_cannon: 'Đại bác nạng lớn, aoe 62.',
    td_wolf: 'Gọi Sói chiến — Sói giết quái tạo Linh Hồn Sói.',
    td_bat: 'Dơi bắn xuyên 3 HC giáp, tốc độ cao.',
    td_blossom: 'Hoa tung cánh aoe 70, đẹp và đau.',
    td_bamboo: 'Mẹ tre xuyên 2 HC, aoe xuyên dọc.',
    td_orchid: 'Hoa lan độc, ĐỘC 3s.',
    td_chrys: 'Chuỗi vàng sấm, chuỗi 4 mục tiêu.'
  },
  en: {
    game_title: 'GOLD TOWER DEFENCE M',
    loading: 'Loading...',
    start_game: 'START GAME', back: 'Back', close: 'Close', confirm: 'Confirm', cancel: 'Cancel',
    claim: 'Claim', claimed: 'Claimed', buy: 'Buy', sell: 'Sell', upgrade: 'Upgrade', cost: 'Cost', owned: 'Owned',
    locked: 'Locked', level: 'Level', max: 'MAX', wave: 'Wave', lives: 'Lives', mineral: 'Mineral',
    speed: 'Speed', pause: 'Pause', resume: 'Resume', restart: 'Restart', quit: 'Quit',
    victory: 'VICTORY', defeat: 'DEFEAT', next_stage: 'Next Stage', retry: 'Retry', reward: 'Reward',
    gold: 'Gold', diamond: 'Diamond', ruby: 'Ruby', magicstone: 'Magic Stone', mileage: 'Mileage',
    atk: 'ATK', range: 'Range', heal: 'Heal', air: 'Air', ground: 'Ground', attr: 'Attribute',
    rarity_gray: 'Gray', rarity_green: 'Green', rarity_blue: 'Blue', rarity_epic: 'Epic', rarity_legend: 'Legendary', rarity_mythic: 'Mythic',
    attr_scissors: 'Scissors', attr_rock: 'Rock', attr_paper: 'Paper',
    not_enough: 'Not enough resources!', saved: 'Saved!',
    team: 'Team', upgrade_scene: 'Upgrade', gacha: 'Tower Gacha', missions: 'Missions', mailbox: 'Mailbox',
    codex: 'Codex', settings: 'Settings', daily: 'Daily Challenge', top: 'Tower of Proof', attendance: 'Attendance',
    stage_select: 'Stage Select', stage: 'Stage', region: 'Region', floor: 'Floor', play: 'PLAY', enter: 'ENTER',
    tickets: 'Tickets', buy_ticket: 'Buy ticket (50 Diamond)', required_stage: 'Requires',
    your_team: 'Your team',
    build_tower: 'Build tower (100 mineral)', tower_level: 'Tower level', upgrade_tower: 'Upgrade', sell_tower: 'Sell',
    no_mineral: 'Not enough mineral!', boss_wave: 'BOSS WAVE!', boss_enraged: 'BOSS ENRAGED!',
    all3_toast: 'All 3 attributes — Hero ATK ×1.5!', wave_incoming: 'Next wave in a moment...',
    call_wave_bonus: 'Early call: +{g} gold, +{m} mineral',
    tower_unlocked: 'New tower unlocked: {n}!', hero_woke: '{n} awakened!',
    ab_volunteer: 'Volunteer', ab_volunteer_d: 'Summon 1 unit (40s). CD 30s',
    ab_meteor: 'Meteor', ab_meteor_d: 'Damage a point. CD 20s',
    ab_move: 'Move', ab_move_d: 'Order a hero to move. CD 1s',
    ab_bomb: 'Bomb', ab_bomb_d: 'Radius 120. CD 5s',
    ab_freeze: 'Freeze', ab_freeze_d: 'Freeze all monsters. CD 15s',
    ab_nuke: 'Nuke', ab_nuke_d: 'Hit every monster. CD 30s',
    ab_heart: 'Heart', ab_heart_d: '+5 lives (max 10). CD 10s',
    ab_mineral: 'Mineral', ab_mineral_d: '+250 mineral. CD 8s',
    ab_speed: 'Speed', ab_speed_d: 'Toggle 1x→2x→3x',
    ab_callwave: 'Call Wave', ab_callwave_d: 'Call next wave early',
    ready: 'Ready', select_hero: 'Next hero selected', select_point: 'Tap the battlefield',
    suggest: 'Suggest Team', team_full: 'Team is full (5)!', hero_name: 'Name', purchase: 'Buy', awaken_btn: 'AWAKEN',
    awaken_req: 'Requires: Lv {l} • {g} Gold • {m} Stone', in_team: 'In team', out_team: 'Not in team',
    add_team: 'Add to team', remove_team: 'Remove from team',
    hero_unk: 'Not owned', soul_stones: 'Soul Stones',
    up_soldier: 'Soldier', up_soldier_d: '+20% damage / HP per level',
    up_meteor: 'Meteor', up_meteor_d: 'Damage: {d}',
    up_barracks: 'Barracks', up_barracks_d: 'Soldiers: {n}',
    up_volunteer: 'Volunteer', up_volunteer_d: 'ATK {a} / HP {h}',
    up_cost: 'Cost: {g} Gold', tower_rarity: 'Tower Rarity (cards)', tower_rarity_d: 'Spend cards to raise tower tier',
    normal_gacha: 'Normal Gacha', premium_gacha: 'Premium Gacha', pull1: 'Pull ×1', pull10: 'Pull ×10',
    pity: 'Pity', new_tower: 'NEW', dup: 'Dup — cards', rate: 'Rates',
    easy: 'Easy', normal: 'Normal', hard: 'Hard', dc_reward: 'Reward: {d} Diamond',
    dc_tower: 'Random tower unlocked (tier {t})', dc_unlocked: 'Daily unlock: {n}!',
    dc_cards: 'Already owned — +5 cards {n}', dc_no_ticket: 'Not enough tickets!', dc_locked: 'Stage requirement not met!',
    dc_clears: 'Clears',
    top_entry: 'Enter: 50,000 Gold', top_floor: 'Current floor', top_next: 'Play floor {f}',
    top_conquered: 'TOWER CONQUERED!', top_reward: 'Floor {f} reward',
    mileage_exchange: 'Mileage Exchange', ex_souls: '100 Mileage → 3 random Mythic souls', ex_ms: '300 Mileage → 1000 Magic Stone',
    no_mileage: 'Not enough mileage!',
    day: 'Day', attendance_claim: 'Claim day {d}', attendance_done: 'Already claimed today!', attendance_next_month: 'New cycle next month',
    daily_m: 'Daily', weekly_m: 'Weekly', achievement: 'Achievement',
    m_kill500: 'Kill 500 monsters', m_build50: 'Build 50 towers', m_meteor30: 'Use Meteor 30 times', m_clear50: 'Clear stages 50 times',
    m_kill5000: 'Kill 5000 monsters', m_clear100: 'Clear stages 100 times',
    m_a1: 'Clear 50 stages', m_a2: 'Kill 10,000 monsters', m_a3: 'Kill 20 bosses', m_a4: 'Login 6 days',
    mail_welcome_t: 'Welcome to GTD M V3!', mail_empty: 'No mail', claim_all: 'Claim all',
    cx_heroes: 'Heroes', cx_towers: 'Towers', cx_monsters: 'Monsters',
    desc: 'Description', skill: 'Skill', air_cap: 'Air', hc: 'Armor HC', fast: 'Fast', ranged: 'Ranged', regen: 'Regen', boss: 'Boss', elite: 'Elite',
    s_bgm: 'BGM', s_sfx: 'SFX', s_volume: 'Volume', s_lang: 'Language', s_quality: 'Quality',
    q_low: 'Low', q_high: 'High', s_gspeed: 'Game speed', s_dmg: 'Show damage',
    s_export: 'Export save', s_import: 'Import save', s_reset: 'Reset data',
    reset_q: 'Erase ALL data? This cannot be undone!',
    import_q: 'Paste saved data (JSON):', import_ok: 'Imported!', import_fail: 'Invalid JSON!',
    export_ok: 'Save copied to clipboard!',
    stars_earned: 'Stars earned', first_clear_bonus: 'First clear: 100%', replay_bonus: 'Replay: 20%',
    unlocked_next: 'Stage {s} unlocked!', max_reached: 'Reached max stage 200!',
    tut1: 'Step 1: Pick a tower from the strip below',
    tut2: 'Step 2: Tap an empty circle on the battlefield to build',
    tut3: 'Step 3: Wait for the first wave...',
    tut4: 'Step 4: Kill enemies! (damage colored by advantage)',
    tut5: 'Step 5: Great! +1000 Gold. Good luck!',
    tut_done: 'Tutorial complete: +1000 Gold',
    paused: 'PAUSED', bgm_on: 'BGM: ON', bgm_off: 'BGM: OFF', sfx_on: 'SFX: ON', sfx_off: 'SFX: OFF',
    hero_purchase: 'Buy {n}?', welcome_back: 'Welcome back!',
    floor_clear: 'Floor {f} cleared!',
    top_reentry: 'Retry costs 50,000 Gold',
    d_nameless: 'Connected to El Dorado, hides identity, raven on shoulder.',
    d_ace: 'Free starter hero, fast blade, sturdy.',
    d_frozenHeart: 'Ice queen. In team: Freeze lasts 15s. Immune to freezing.',
    d_elisia: 'Dragon rider, slows enemies 1.5s.',
    d_grombar: 'Dwarf warrior, earthshatter hammer AoE.',
    d_merlin: 'Wizard with his cat, ranged fire AoE.',
    d_robin: 'Archer with a falcon, very fast long range.',
    d_robinAwk: 'Ultimate Arrow: line attack. Ice Arrow tower ×3 ATK. (Awakened Robin)',
    d_duke: 'Commander of the dead, AoE soul waves.',
    d_anna: 'Light sword dancer, slashes the sky.',
    d_dangsoso: 'Ultra-fast ninja, shuriken spam.',
    d_elijah: 'Heals nearby heroes and soldiers. (0 damage)',
    d_fenrir: 'Wolf warrior, crushing AoE bites.',
    d_fenrirAwk: 'Every hit shreds all armor. Every 5th hit summons Wolf Spirit. (Awakened Fenrir)',
    d_kibong: 'Plum Blade Master. Every 3rd hit: Plum Whirlwind (bleed+slow). Bleed kills: +1 heart (max 50). Lv3: kill mineral ×3. Lv10: ×15.',
    d_nancheon: 'Orchid Master, fiery fists.',
    d_dalma: 'Earthquake palm, massive AoE.',
    d_mukhyang: 'Water blade, extremely fast long range.',
    d_loki: 'Trickster god, chaos fire AoE.',
    d_hellknight: 'Hell knight, terrifying AoE.',
    d_wolfking: 'The wolf king leads the war pack.',
    d_queensnake: 'Snake queen, coiling venom waves.',
    td_thorn: 'Ground spikes hit every ground enemy in range.',
    td_iceArrow: 'Ice arrow slows 2s, hits air.',
    td_assassin: 'Summons a dark melee assassin.',
    td_shuriken: 'Shuriken hits up to 3 targets, very fast.',
    td_magic: 'Fire AoE, burns for 2s.',
    td_lightning: 'Chain lightning 3 hits — AIR ONLY targets!',
    td_nun: 'Heals 2% HP of nearby heroes/soldiers.',
    td_barracks: 'Summons shield soldiers that block ground monsters (scales with Barracks upgrade).',
    td_cannon: 'Heavy artillery, AoE 62.',
    td_wolf: 'Summons a War Wolf — wolf kills create Wolf Spirits.',
    td_bat: 'Bat pierces 3 HC armor, rapid fire.',
    td_blossom: 'Blossom AoE 70, pretty and painful.',
    td_bamboo: 'Bamboo pierces 2 HC, punches through.',
    td_orchid: 'Poison orchid, poison 3s.',
    td_chrys: 'Golden chain lightning, 4 hits.'
  }
};

GTD.t = function (key, vars) {
  const lang = (window.GTD_SAVE && GTD_SAVE.language) || 'vn';
  let s = (GTD.I18N[lang] && GTD.I18N[lang][key]) || GTD.I18N.en[key] || key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
};
GTD.monsterName = function (m) {
  const lang = (window.GTD_SAVE && GTD_SAVE.language) || 'vn';
  return lang === 'vn' ? m.nameVn : m.nameEn;
};
GTD.heroName = function (h) {
  const key = 'hn_' + h.key;
  const lang = (window.GTD_SAVE && GTD_SAVE.language) || 'vn';
  const s = (GTD.I18N[lang] && GTD.I18N[lang][key]) || GTD.I18N.en[key] || h.key;
  return s;
};
GTD.I18N.vn.hn_nameless = 'Vô Danh'; GTD.I18N.en.hn_nameless = 'Nameless';
GTD.I18N.vn.hn_ace = 'Ace'; GTD.I18N.en.hn_ace = 'Ace';
GTD.I18N.vn.hn_frozenHeart = 'Tim Băng'; GTD.I18N.en.hn_frozenHeart = 'Frozen Heart';
GTD.I18N.vn.hn_elisia = 'Elisia'; GTD.I18N.en.hn_elisia = 'Elisia';
GTD.I18N.vn.hn_grombar = 'Grombar'; GTD.I18N.en.hn_grombar = 'Grombar';
GTD.I18N.vn.hn_merlin = 'Merlin'; GTD.I18N.en.hn_merlin = 'Merlin';
GTD.I18N.vn.hn_robin = 'Robin'; GTD.I18N.en.hn_robin = 'Robin';
GTD.I18N.vn.hn_robinAwk = 'Robin (Thức Tỉnh)'; GTD.I18N.en.hn_robinAwk = 'Robin (Awakened)';
GTD.I18N.vn.hn_duke = 'Duke'; GTD.I18N.en.hn_duke = 'Duke';
GTD.I18N.vn.hn_anna = 'Anna'; GTD.I18N.en.hn_anna = 'Anna';
GTD.I18N.vn.hn_dangsoso = 'Dang So-So'; GTD.I18N.en.hn_dangsoso = 'Dang So-So';
GTD.I18N.vn.hn_elijah = 'Elijah'; GTD.I18N.en.hn_elijah = 'Elijah';
GTD.I18N.vn.hn_fenrir = 'Fenrir'; GTD.I18N.en.hn_fenrir = 'Fenrir';
GTD.I18N.vn.hn_fenrirAwk = 'Fenrir (Thức Tỉnh)'; GTD.I18N.en.hn_fenrirAwk = 'Fenrir (Awakened)';
GTD.I18N.vn.hn_kibong = 'Kibong (Mai Hoa Kiếm Tôn)'; GTD.I18N.en.hn_kibong = 'Kibong (Plum Blade Master)';
GTD.I18N.vn.hn_nancheon = 'Nancheon'; GTD.I18N.en.hn_nancheon = 'Nancheon';
GTD.I18N.vn.hn_dalma = 'Dalma'; GTD.I18N.en.hn_dalma = 'Dalma';
GTD.I18N.vn.hn_mukhyang = 'Mukhyang'; GTD.I18N.en.hn_mukhyang = 'Mukhyang';
GTD.I18N.vn.hn_loki = 'Loki'; GTD.I18N.en.hn_loki = 'Loki';
GTD.I18N.vn.hn_hellknight = 'Hell Knight'; GTD.I18N.en.hn_hellknight = 'Hell Knight';
GTD.I18N.vn.hn_wolfking = 'Wolf King'; GTD.I18N.en.hn_wolfking = 'Wolf King';
GTD.I18N.vn.hn_queensnake = 'Queen Snake'; GTD.I18N.en.hn_queensnake = 'Queen Snake';
/* tower names */
const TOWER_NAMES = {
  thorn: ['Gai', 'Thorn'], iceArrow: ['Tên Băng', 'Ice Arrow'], assassin: ['Sát Thủ', 'Assassin'],
  shuriken: ['Phi Tiêu', 'Shuriken'], magic: ['Pháp Thuật', 'Magic'], lightning: ['Sấm Chuỗi', 'Lightning'],
  nun: ['Sư Nữ', 'Nun'], barracks: ['Doanh Trại', 'Barracks'], cannon: ['Đại Bác', 'Cannon'],
  wolf: ['Sói Chiến', 'Wolf'], bat: ['Dơi', 'Bat'], blossom: ['Hoa Saku', 'Blossom'],
  bamboo: ['Tre Xuyên', 'Bamboo'], orchid: ['Lan Độc', 'Orchid'], chrys: ['Chrys', 'Chrys']
};
GTD.towerName = function (t) {
  const lang = (window.GTD_SAVE && GTD_SAVE.language) || 'vn';
  return TOWER_NAMES[t.key][lang === 'vn' ? 0 : 1];
};
