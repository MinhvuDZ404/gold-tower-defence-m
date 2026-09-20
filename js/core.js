/* ============================================================
   GOLD TOWER DEFENCE M — CORE (utils, save, resets)
   ============================================================ */
'use strict';
window.GTD = window.GTD || {};

GTD.U = {
  clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
  rand: function (a, b) { return a + Math.random() * (b - a); },
  randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
  choice: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  dist2: function (ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
  dist: function (ax, ay, bx, by) { return Math.sqrt(GTD.U.dist2(ax, ay, bx, by)); },
  fmt: function (n) {
    n = Math.floor(n);
    if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (n >= 10000) return (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k';
    return String(n);
  },
  fmtFull: function (n) { return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
  todayStr: function () {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  monthStr: function () {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  },
  /* ISO week id, e.g. "2026-W38" */
  isoWeekStr: function () {
    const d = new Date();
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThu = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((date - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
    return date.getUTCFullYear() + '-W' + week;
  },
  uid: function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
  el: function (tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
};

/* ============================================================
   SAVE MANAGER
   ============================================================ */
const IDB = {
  db: null,
  open: function () {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') return reject(new Error('no idb'));
      try {
        const req = indexedDB.open(GTD.DB_NAME, 1);
        req.onupgradeneeded = function () {
          if (!req.result.objectStoreNames.contains(GTD.DB_STORE)) {
            req.result.createObjectStore(GTD.DB_STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
        req.onblocked = function () { reject(new Error('blocked')); };
      } catch (e) { reject(e); }
    });
  },
  get: function (id) {
    return new Promise(function (resolve) {
      if (!IDB.db) return resolve(null);
      try {
        const tx = IDB.db.transaction(GTD.DB_STORE, 'readonly');
        const req = tx.objectStore(GTD.DB_STORE).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  },
  put: function (rec) {
    return new Promise(function (resolve) {
      if (!IDB.db) return resolve(false);
      try {
        const tx = IDB.db.transaction(GTD.DB_STORE, 'readwrite');
        tx.objectStore(GTD.DB_STORE).put(rec);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      } catch (e) { resolve(false); }
    });
  },
  del: function (id) {
    return new Promise(function (resolve) {
      if (!IDB.db) return resolve(false);
      try {
        const tx = IDB.db.transaction(GTD.DB_STORE, 'readwrite');
        tx.objectStore(GTD.DB_STORE).delete(id);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      } catch (e) { resolve(false); }
    });
  }
};

GTD.Save = {
  def: function () {
    const heroes = {};
    GTD.HEROES.forEach(h => {
      heroes[h.key] = { level: 1, xp: 0, unlocked: (h.key === 'nameless' || h.key === 'ace') };
    });
    const towers = {};
    GTD.TOWERS.forEach(t => {
      towers[t.key] = { tier: t.tier, cards: 0, owned: (t.key === 'thorn' || t.key === 'iceArrow' || t.key === 'magic') };
    });
    return {
      guestId: GTD.U.uid(),
      saveVer: GTD.SAVE_VERSION,
      version: GTD.GAME_VERSION,
      timestamp: Date.now(),
      language: 'vn',
      currentStage: 1,
      maxStage: 1,
      currencies: { gold: 12500, diamond: 3200, ruby: 850, gull: 120, mileage: 0, magicstone: 0 },
      soulStones: { kibong: 0, nancheon: 0, dalma: 0, mukhyang: 0, loki: 0, hellknight: 0, wolfking: 0, queensnake: 0 },
      heroes: heroes,
      towers: towers,
      team: ['nameless', 'ace'],
      gachaPity: 0,
      mail: [{ id: 'welcome', title: 'mail_welcome_t', claimed: false, reward: { gold: 50000, ruby: 300 } }],
      missions: {
        daily: { last: GTD.U.todayStr(), kills: 0, builds: 0, meteors: 0, clears: 0, claimed: [false, false, false, false] },
        weekly: { last: GTD.U.isoWeekStr(), kills: 0, clears: 0, claimed: [false, false] }
      },
      achievements: { claimed: [false, false, false, false] },
      dailyChallenge: { tickets: 3, lastReset: GTD.U.todayStr(), clears: { easy: 0, normal: 0, hard: 0 } },
      towerOfProof: { floor: 0, cleared: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false] },
      attendance: { month: GTD.U.monthStr(), claimed: {} },
      settings: { bgm: true, sfx: true, volume: 0.8, quality: 'high', speed: 1, showDamage: true },
      stats: { totalKills: 0, totalBossKills: 0, stagesCleared: 0, totalBuilds: 0, totalMeteors: 0, totalPlayTime: 0, logins: 1 },
      upgrades: { soldier: 0, meteor: 0, barracks: 0, volunteer: 0 },
      stars: [],
      lastLogin: GTD.U.todayStr(),
      tutorialCompleted: false
    };
  },

  migrate: function (o) {
    if (!o || typeof o !== 'object') return null;
    const d = GTD.Save.def();
    const s = {};
    s.guestId = String(o.guestId || d.guestId);
    s.saveVer = o.saveVer || d.saveVer;
    s.version = o.version || d.version;
    s.timestamp = Number(o.timestamp) || Date.now();
    s.language = (o.language === 'en' || o.language === 'vn') ? o.language : d.language;
    s.currentStage = GTD.U.clamp(Number(o.currentStage) || 1, 1, 200);
    s.maxStage = GTD.U.clamp(Number(o.maxStage) || 1, 1, 200);
    if (s.currentStage > s.maxStage) s.currentStage = s.maxStage;
    s.currencies = Object.assign({}, d.currencies, o.currencies || {});
    ['gold', 'diamond', 'ruby', 'gull', 'mileage', 'magicstone'].forEach(k => { s.currencies[k] = Math.max(0, Math.floor(Number(s.currencies[k]) || 0)); });
    s.soulStones = Object.assign({}, d.soulStones, o.soulStones || {});
    GTD.SOUL_TYPES.forEach(k => { s.soulStones[k] = Math.max(0, Math.floor(Number(s.soulStones[k]) || 0)); });
    s.heroes = {};
    GTD.HEROES.forEach(h => {
      const src = (o.heroes && o.heroes[h.key]) || {};
      const lv = GTD.U.clamp(Number(src.level) || 1, 1, 60);
      s.heroes[h.key] = { level: lv, xp: Math.max(0, Number(src.xp) || 0), unlocked: !!(src.unlocked || h.key === 'nameless' || h.key === 'ace') };
    });
    s.towers = {};
    GTD.TOWERS.forEach(t => {
      const src = (o.towers && o.towers[t.key]) || {};
      s.towers[t.key] = {
        tier: GTD.U.clamp(Number(src.tier) != null ? Number(src.tier) : t.tier, 0, 5),
        cards: Math.max(0, Math.floor(Number(src.cards) || 0)),
        owned: !!(src.owned || t.key === 'thorn' || t.key === 'iceArrow' || t.key === 'magic')
      };
    });
    s.team = (Array.isArray(o.team) ? o.team : d.team).filter(k => GTD.HERO_BY_KEY[k] && s.heroes[k] && s.heroes[k].unlocked).slice(0, 5);
    if (!s.team.length) s.team = ['nameless', 'ace'];
    s.gachaPity = GTD.U.clamp(Number(o.gachaPity) || 0, 0, 999);
    s.mail = Array.isArray(o.mail) && o.mail.length ? o.mail.map(m => ({
      id: String(m.id || GTD.U.uid()), title: String(m.title || ''), claimed: !!m.claimed,
      reward: (m.reward && typeof m.reward === 'object') ? m.reward : {}
    })) : d.mail.slice();
    s.missions = {
      daily: {
        last: (o.missions && o.missions.daily && o.missions.daily.last) || d.missions.daily.last,
        kills: Math.max(0, Math.floor((o.missions && o.missions.daily && o.missions.daily.kills) || 0)),
        builds: Math.max(0, Math.floor((o.missions && o.missions.daily && o.missions.daily.builds) || 0)),
        meteors: Math.max(0, Math.floor((o.missions && o.missions.daily && o.missions.daily.meteors) || 0)),
        clears: Math.max(0, Math.floor((o.missions && o.missions.daily && o.missions.daily.clears) || 0)),
        claimed: [false, false, false, false].map((v, i) => !!(o.missions && o.missions.daily && o.missions.daily.claimed && o.missions.daily.claimed[i]))
      },
      weekly: {
        last: (o.missions && o.missions.weekly && o.missions.weekly.last) || d.missions.weekly.last,
        kills: Math.max(0, Math.floor((o.missions && o.missions.weekly && o.missions.weekly.kills) || 0)),
        clears: Math.max(0, Math.floor((o.missions && o.missions.weekly && o.missions.weekly.clears) || 0)),
        claimed: [false, false].map((v, i) => !!(o.missions && o.missions.weekly && o.missions.weekly.claimed && o.missions.weekly.claimed[i]))
      }
    };
    s.achievements = { claimed: [false, false, false, false].map((v, i) => !!(o.achievements && o.achievements.claimed && o.achievements.claimed[i])) };
    const dc = o.dailyChallenge || {};
    s.dailyChallenge = {
      tickets: GTD.U.clamp(Number(dc.tickets) || 0, 0, 99),
      lastReset: dc.lastReset || d.dailyChallenge.lastReset,
      clears: {
        easy: Math.max(0, Math.floor((dc.clears && dc.clears.easy) || 0)),
        normal: Math.max(0, Math.floor((dc.clears && dc.clears.normal) || 0)),
        hard: Math.max(0, Math.floor((dc.clears && dc.clears.hard) || 0))
      }
    };
    const top = o.towerOfProof || {};
    s.towerOfProof = {
      floor: GTD.U.clamp(Number(top.floor) || 0, 0, 15),
      cleared: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false].map((v, i) => !!(top.cleared && top.cleared[i]))
    };
    const att = o.attendance || {};
    s.attendance = {
      month: att.month || d.attendance.month,
      claimed: (att.claimed && typeof att.claimed === 'object') ? att.claimed : {}
    };
    const st = o.settings || {};
    s.settings = {
      bgm: st.bgm !== false, sfx: st.sfx !== false,
      volume: GTD.U.clamp(Number(st.volume) || 0.8, 0, 1),
      quality: st.quality === 'low' ? 'low' : 'high',
      speed: GTD.U.clamp(Number(st.speed) || 1, 1, 3),
      showDamage: st.showDamage !== false
    };
    const stt = o.stats || {};
    s.stats = {
      totalKills: Math.max(0, Math.floor(stt.totalKills) || 0),
      totalBossKills: Math.max(0, Math.floor(stt.totalBossKills) || 0),
      stagesCleared: Math.max(0, Math.floor(stt.stagesCleared) || 0),
      totalBuilds: Math.max(0, Math.floor(stt.totalBuilds) || 0),
      totalMeteors: Math.max(0, Math.floor(stt.totalMeteors) || 0),
      totalPlayTime: Math.max(0, Math.floor(stt.totalPlayTime) || 0),
      logins: Math.max(0, Math.floor(stt.logins) || 1)
    };
    const up = o.upgrades || {};
    s.upgrades = {
      soldier: GTD.U.clamp(Number(up.soldier) || 0, 0, 20),
      meteor: GTD.U.clamp(Number(up.meteor) || 0, 0, 6),
      barracks: GTD.U.clamp(Number(up.barracks) || 0, 0, 8),
      volunteer: GTD.U.clamp(Number(up.volunteer) || 0, 0, 10)
    };
    s.stars = [];
    for (let i = 0; i < 200; i++) s.stars.push(GTD.U.clamp(Number((o.stars && o.stars[i]) || 0), 0, 3));
    s.lastLogin = String(o.lastLogin || d.lastLogin);
    s.tutorialCompleted = !!o.tutorialCompleted;
    return s;
  },

  /* daily / weekly / monthly resets + daily login */
  applyResets: function (s) {
    const today = GTD.U.todayStr(), month = GTD.U.monthStr(), week = GTD.U.isoWeekStr();
    if (s.missions.daily.last !== today) {
      s.missions.daily = { last: today, kills: 0, builds: 0, meteors: 0, clears: 0, claimed: [false, false, false, false] };
      s.dailyChallenge.tickets = 3;
    }
    s.dailyChallenge.lastReset = today;
    if (s.missions.weekly.last !== week) {
      s.missions.weekly = { last: week, kills: 0, clears: 0, claimed: [false, false] };
    }
    if (s.attendance.month !== month) {
      s.attendance = { month: month, claimed: {} };
    }
    if (s.lastLogin !== today) {
      s.stats.logins++;
      s.lastLogin = today;
    }
    return s;
  },

  lsRead: function () {
    try {
      const raw = localStorage.getItem(GTD.LS_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      return GTD.Save.migrate(o);
    } catch (e) { return null; }
  },

  load: async function () {
    let idbSave = null, lsSave = null;
    try { IDB.db = await IDB.open(); } catch (e) { IDB.db = null; }
    if (IDB.db) {
      try { idbSave = GTD.Save.migrate(await IDB.get(GTD.DB_PRIMARY)); } catch (e) { idbSave = null; }
    }
    lsSave = GTD.Save.lsRead();
    let best = null;
    if (idbSave && lsSave) best = idbSave.timestamp >= lsSave.timestamp ? idbSave : lsSave;
    else best = idbSave || lsSave;
    if (!best) {
      best = GTD.Save.def();
      GTD.Save._fresh = true;
    } else {
      GTD.Save._fresh = false;
    }
    GTD.Save.applyResets(best);
    return best;
  },

  store: async function (s) {
    s.timestamp = Date.now();
    GTD.Save.applyResets(s);
    try {
      localStorage.setItem(GTD.LS_KEY, JSON.stringify(s));
      localStorage.setItem(GTD.LS_BACKUP_KEY, JSON.stringify(s));
    } catch (e) { /* storage full/blocked — ignore, IDB still works */ }
    if (IDB.db) {
      try { await IDB.put({ id: GTD.DB_PRIMARY, data: s, ts: s.timestamp }); } catch (e) { }
    }
  },

  /* fire-and-forget store with debounce */
  _t: null,
  storeSoon: function () {
    if (GTD_SAVE) {
      if (GTD._storeTimer) return;
      GTD._storeTimer = setTimeout(async function () {
        GTD._storeTimer = null;
        try { await GTD.Save.store(GTD_SAVE); } catch (e) { }
      }, 400);
    }
  },

  exportText: function (s) { return JSON.stringify(s, null, 2); },
  importText: function (str) {
    try {
      const o = JSON.parse(str);
      const m = GTD.Save.migrate(o);
      if (!m) return null;
      GTD.Save.applyResets(m);
      return m;
    } catch (e) { return null; }
  },

  wipe: async function () {
    try { localStorage.removeItem(GTD.LS_KEY); } catch (e) { }
    try { localStorage.removeItem(GTD.LS_BACKUP_KEY); } catch (e) { }
    if (IDB.db) { try { await IDB.del(GTD.DB_PRIMARY); } catch (e) { } }
  }
};

/* ============================================================
   RESOURCE HELPERS (work on GTD_SAVE)
   ============================================================ */
GTD.CUR_META = {
  gold: { i18n: 'gold', icon: '🪙' },
  diamond: { i18n: 'diamond', icon: '💎' },
  ruby: { i18n: 'ruby', icon: '🔴' },
  magicstone: { i18n: 'magicstone', icon: '🟣' },
  mileage: { i18n: 'mileage', icon: '🛣️' }
};

GTD.pay = function (cost) {
  const s = GTD_SAVE;
  if (!cost) return true;
  if (typeof cost === 'number') cost = { gold: cost };
  for (const k in cost) {
    if (k === 'soul') return false; // soul handled separately
    if ((s.currencies[k] || 0) < cost[k]) return false;
  }
  for (const k in cost) {
    if (k === 'soul') continue;
    s.currencies[k] -= cost[k];
  }
  GTD.Save.storeSoon();
  return true;
};

GTD.paySoul = function (type, n) {
  const s = GTD_SAVE;
  if ((s.soulStones[type] || 0) < n) return false;
  s.soulStones[type] -= n;
  GTD.Save.storeSoon();
  return true;
};

GTD.give = function (reward) {
  const s = GTD_SAVE;
  if (!reward) return;
  for (const k in reward) {
    if (k === 'soul') {
      const n = reward[k];
      // grant to soul type with lowest count
      for (let i = 0; i < n; i++) {
        let minKey = GTD.SOUL_TYPES[0], minV = Infinity;
        GTD.SOUL_TYPES.forEach(t => { if (s.soulStones[t] < minV) { minV = s.soulStones[t]; minKey = t; } });
        s.soulStones[minKey]++;
      }
    } else if (k === 'cards') {
      const n = reward[k];
      const owned = GTD.TOWERS.filter(t => s.towers[t.key] && s.towers[t.key].owned);
      const pool = owned.length ? owned : GTD.TOWERS;
      for (let i = 0; i < n; i++) s.towers[GTD.U.choice(pool).key].cards++;
    } else if (k === 'souls3') {
      // 3 distinct random mythic soul types
      const shuffled = GTD.SOUL_TYPES.slice().sort(() => Math.random() - 0.5).slice(0, 3);
      shuffled.forEach(t => { s.soulStones[t]++; });
    } else if (k === 'magicstone1000') {
      s.currencies.magicstone += 1000;
    } else {
      s.currencies[k] = (s.currencies[k] || 0) + reward[k];
    }
  }
  GTD.Save.storeSoon();
};

GTD.rewardText = function (reward) {
  if (!reward) return '';
  const parts = [];
  for (const k in reward) {
    if (k === 'soul') parts.push(reward[k] + ' ' + GTD.t('soul_stones'));
    else if (k === 'cards') parts.push(reward[k] + ' ' + GTD.t('tower_rarity'));
    else parts.push(GTD.U.fmtFull(reward[k]) + ' ' + GTD.t(GTD.CUR_META[k] ? GTD.CUR_META[k].i18n : k));
  }
  return parts.join(' + ');
};

GTD.canPay = function (cost) {
  const s = GTD_SAVE;
  if (!cost) return true;
  for (const k in cost) {
    if (k === 'soul') return (s.soulStones[cost.soul] || 0) >= cost.n;
    if ((s.currencies[k] || 0) < cost[k]) return false;
  }
  return true;
};
