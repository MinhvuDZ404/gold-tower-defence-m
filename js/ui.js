/* ============================================================
   GOLD TOWER DEFENCE M — UI SCENES
   ============================================================ */
'use strict';
window.GTD = window.GTD || {};

GTD.UI = {
  /* ---------- shared widgets ---------- */
  toast: function (msg, cls) {
    const root = document.getElementById('toasts');
    const d = GTD.U.el('div', 'toast ' + (cls || ''), msg);
    root.appendChild(d);
    setTimeout(function () { d.classList.add('out'); }, 2200);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2700);
  },
  modal: function (title, bodyHTML, buttons) {
    const root = document.getElementById('modal-root');
    root.innerHTML = '';
    const wrap = GTD.U.el('div', 'modal-wrap');
    const card = GTD.U.el('div', 'modal-card');
    card.innerHTML = '<div class="modal-title">' + title + '</div><div class="modal-body">' + bodyHTML + '</div>';
    const acts = GTD.U.el('div', 'modal-actions');
    (buttons || [{ label: GTD.t('close'), cls: 'btn', cb: function () { close(); } }]).forEach(b => {
      const btn = GTD.U.el('button', 'btn ' + (b.cls || ''), b.label);
      btn.addEventListener('click', function () { close(); if (b.cb) b.cb(); });
      acts.appendChild(btn);
    });
    card.appendChild(acts);
    wrap.appendChild(card);
    root.appendChild(wrap);
    function close() { root.innerHTML = ''; }
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    GTD.Audio.sfx('click');
    return card;
  },
  refreshRes: function (root) {
    const old = root.querySelector('.resbar');
    if (old) old.replaceWith(GTD.UI.resBar());
  },
  confirm: function (title, msg, onYes, yesCls) {
    GTD.UI.modal(title, '<p>' + msg + '</p>', [
      { label: GTD.t('cancel'), cls: 'btn', cb: null },
      { label: GTD.t('confirm'), cls: yesCls || 'btn red', cb: onYes }
    ]);
  },
  resBar: function () {
    const s = GTD_SAVE;
    const bar = GTD.U.el('div', 'resbar');
    ['gold', 'diamond', 'ruby', 'magicstone', 'mileage'].forEach(k => {
      const chip = GTD.U.el('div', 'res ' + k,
        '<span class="res-ico">' + GTD.CUR_META[k].icon + '</span><span class="res-val">' + GTD.U.fmt(s.currencies[k]) + '</span><span class="res-lab">' + GTD.t(GTD.CUR_META[k].i18n) + '</span>');
      bar.appendChild(chip);
    });
    return bar;
  },
  heroIcon(g, x, y, def, size) {
    const ARCH = {
      knight: '#8fa8c8', blade: '#c8b080', icequeen: '#9fd8ff', dragonrider: '#ff9a60', dwarf: '#c08050',
      wizard: '#a24fd6', archer: '#7ed07e', necro: '#9a70c8', dancer: '#ffd0e0', ninja: '#c0c8d0',
      priest: '#f0ead0', wolf: '#9aa8b8', swordsman: '#ff9ec4', monk: '#ffb840', palm: '#80c8a0',
      trickster: '#60c8c0', paladin: '#e07050', serpent: '#70c860'
    };
    const r = size / 2;
    g.save();
    g.beginPath(); g.arc(x, y, r - 1.5, 0, 6.283);
    g.fillStyle = 'rgba(13,10,26,.9)'; g.fill();
    g.lineWidth = 2;
    g.strokeStyle = GTD.RAR_COLORS[def.r]; g.stroke();
    if (def.r >= 5) { g.shadowColor = GTD.RAR_COLORS[def.r]; g.shadowBlur = 8; g.stroke(); g.shadowBlur = 0; }
    g.beginPath(); g.arc(x, y + 1, r * 0.62, 0, 6.283);
    g.fillStyle = ARCH[def.arch] || '#ccc'; g.fill();
    const gl = { knight: '♜', blade: '⚔', icequeen: '❄', dragonrider: '🜂', dwarf: '⛏', wizard: '✦', archer: '➶', necro: '☠', dancer: '❋', ninja: '✂', priest: '✚', wolf: '🜏', swordsman: '✿', monk: '☯', palm: '✊', trickster: '🜚', paladin: '♞', serpent: '🜛' }[def.arch] || '•';
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.font = 'bold ' + Math.floor(r * 0.7) + 'px system-ui';
    g.textAlign = 'center';
    g.fillText(gl, x, y + r * 0.28);
    g.restore();
  },
  heroCard: function (key, opts) {
    const def = GTD.HERO_BY_KEY[key];
    const hs = GTD_SAVE.heroes[key];
    opts = opts || {};
    const card = GTD.U.el('div', 'hcard2 rar' + def.r + (hs.unlocked ? '' : ' locked'));
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    GTD.UI.heroIcon(cv.getContext('2d'), 32, 32, def, 56);
    card.appendChild(cv);
    const lvl = hs.level || 1;
    let sub;
    if (def.mythic && def.soul) sub = def.soul + ': ' + (GTD_SAVE.soulStones[def.soul] || 0) + '/150';
    else sub = (def.atk ? GTD.U.fmt(GTD.heroAtk(def, lvl)) : GTD.t('heal')) + ' / ' + GTD.U.fmt(GTD.heroHp(def, lvl));
    card.innerHTML +=
      '<div class="hc2-name">' + GTD.heroName(def) + '</div>' +
      '<div class="hc2-attr">' + GTD.t(GTD.ATTRS[def.attr].i18n) + (def.air ? ' · ' + GTD.t('air') : '') + '</div>' +
      '<div class="hc2-lv">' + GTD.t('level') + ' ' + lvl + (hs.unlocked && def.mythic ? ' <span class="soulchip">' + sub + '</span>' : '') + '</div>' +
      (opts.extra || '');
    if (!hs.unlocked) {
      const price = def.mythic && def.soul ? '150 ' + GTD.t('soul_stones') : (def.cost ? GTD.U.fmtFull(def.cost) + ' ' + (def.cur === 'ruby' ? '🔴' : '🟣') : '');
      card.innerHTML += '<div class="hc2-price">' + price + '</div>';
    }
    return card;
  },

  /* ============================================================
     LOBBY
     ============================================================ */
  lobby: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene lobby-sc');
    sc.innerHTML =
      '<div class="lobby-bg"></div>' +
      '<div class="lobby-inner">' +
      '<div class="lobby-title">GOLD TOWER<br><span>DEFENCE M</span></div>' +
      GTD.UI.resBar().outerHTML +
      '<div class="lobby-team">' +
      '<div class="lobby-team-lab">' + GTD.t('your_team') + '</div>' +
      '<div class="lobby-team-row" id="lobbyTeam"></div>' +
      '</div>' +
      '<button class="btn gold giant" id="lobbyStart">' + GTD.t('start_game') + '</button>' +
      '<div class="lobby-menu" id="lobbyMenu"></div>' +
      '</div>';
    root.appendChild(sc);

    /* team preview */
    const row = sc.querySelector('#lobbyTeam');
    for (let i = 0; i < 5; i++) {
      const key = s.team[i];
      const slot = GTD.U.el('div', 'lobby-slot');
      if (key) {
        const def = GTD.HERO_BY_KEY[key];
        const cv = document.createElement('canvas');
        cv.width = 72; cv.height = 72;
        GTD.UI.heroIcon(cv.getContext('2d'), 36, 36, def, 62);
        slot.appendChild(cv);
        slot.appendChild(GTD.U.el('div', 'lobby-slot-name', GTD.heroName(def)));
        slot.className += ' rar' + def.r;
      } else {
        slot.innerHTML = '<div class="lobby-slot-empty">+</div>';
      }
      row.appendChild(slot);
    }

    /* menu */
    const menu = sc.querySelector('#lobbyMenu');
    const items = [
      ['team', '🛡️', 'team'],
      ['upgrade', '⬆️', 'upgrade_scene'],
      ['gacha', '🎴', 'gacha'],
      ['missions', '📜', 'missions'],
      ['mailbox', '✉️', 'mailbox'],
      ['codex', '📖', 'codex'],
      ['settings', '⚙️', 'settings'],
      ['daily', '📅', 'daily'],
      ['top', '🗼', 'top'],
      ['attendance', '🗓️', 'attendance']
    ];
    const mailUn = s.mail.filter(m => !m.claimed).length;
    const attDay = Math.min(30, new Date().getDate());
    const attAvail = !s.attendance.claimed[attDay];
    const mAvail = GTD.MISSIONS_DAILY.some((m, i) => s.missions.daily[km2(m.key)] >= m.target && !s.missions.daily.claimed[i]) ||
      GTD.MISSIONS_WEEKLY.some((m, i) => s.missions.weekly[km2(m.key)] >= m.target && !s.missions.weekly.claimed[i]) ||
      GTD.MISSIONS_ACH.some((m, i) => s.stats[m.stat] >= m.target && !s.achievements.claimed[i]);
    items.forEach(function (it) {
      const b = GTD.U.el('button', 'menu-btn');
      let badge = '';
      if (it[0] === 'mailbox' && mailUn) badge = '<span class="badge">' + mailUn + '</span>';
      if (it[0] === 'missions' && mAvail) badge = '<span class="badge">!</span>';
      if (it[0] === 'attendance' && attAvail) badge = '<span class="badge">!</span>';
      b.innerHTML = '<span class="mb-ico">' + it[1] + '</span>' + GTD.t(it[2]) + badge;
      b.addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go(it[0]); });
      menu.appendChild(b);
    });
    function km2(key) { return key === 'kills' || key === 'clears' ? key : key; }

    sc.querySelector('#lobbyStart').addEventListener('click', function () {
      GTD.Audio.sfx('click');
      GTD.App.go('stageSelect');
    });
    /* lobby music */
    GTD.Audio.setTheme(-1, false);
  },

  /* ============================================================
     STAGE SELECT
     ============================================================ */
  stageSelect: function (root) {
    const s = GTD_SAVE;
    const curRegion = s.currentStage > 1 ? GTD.regionOfStage(s.currentStage) : 0;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene select-sc');
    const head = GTD.U.el('div', 'sc-head');
    head.innerHTML = '<button class="btn backbtn" id="ssBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('stage_select') + '</div>' + GTD.UI.resBar().outerHTML;
    sc.appendChild(head);
    const tabs = GTD.U.el('div', 'region-tabs');
    const grid = GTD.U.el('div', 'stage-grid-wrap');
    sc.appendChild(tabs);
    sc.appendChild(grid);
    root.appendChild(sc);

    let selRegion = Math.min(curRegion, 9);
    function regionLocked(ri) { return s.maxStage < ri * 20 + 1; }
    function render() {
      tabs.innerHTML = '';
      for (let ri = 0; ri < 10; ri++) {
        const locked = regionLocked(ri);
        const t = GTD.U.el('button', 'region-tab' + (ri === selRegion ? ' sel' : '') + (locked ? ' locked' : ''));
        const lang = s.language === 'en' ? 1 : 0;
        t.innerHTML = '<span class="rt-num">' + (ri + 1) + '</span><span class="rt-name">' + (locked ? '🔒 ' : '') + GTD.REGION_NAMES[ri][lang] + '</span>';
        if (!locked) t.addEventListener('click', function () { GTD.Audio.sfx('click'); selRegion = ri; render(); });
        tabs.appendChild(t);
      }
      grid.innerHTML = '';
      const label = GTD.U.el('div', 'stage-region-name', GTD.t('region') + ' ' + (selRegion + 1) + ' — ' + GTD.REGION_NAMES[selRegion][s.language === 'en' ? 1 : 0]);
      grid.appendChild(label);
      const inner = GTD.U.el('div', 'stage-grid');
      for (let i = 0; i < 20; i++) {
        const stage = selRegion * 20 + i + 1;
        const locked = stage > s.maxStage;
        const stars = s.stars[stage - 1] || 0;
        const cell = GTD.U.el('button', 'stage-cell' + (locked ? ' locked' : '') + (stage === s.currentStage ? ' here' : '') + (GTD.isBossStage(stage) ? ' boss' : ''));
        cell.innerHTML =
          '<span class="sc-num">' + stage + (GTD.isBossStage(stage) ? ' ♛' : '') + '</span>' +
          '<span class="sc-stars">' + '★'.repeat(stars) + '<span class="dim">' + '★'.repeat(3 - stars) + '</span></span>';
        if (!locked) cell.addEventListener('click', function () {
          GTD.Audio.sfx('click');
          s.currentStage = stage;
          GTD.Save.storeSoon();
          GTD.App.startBattle({ mode: 'stage', stage: stage });
        });
        inner.appendChild(cell);
      }
      grid.appendChild(inner);
    }
    render();
    sc.querySelector('#ssBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  },

  /* ============================================================
     TEAM
     ============================================================ */
  team: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene team-sc');
    const head = GTD.U.el('div', 'sc-head');
    head.innerHTML = '<button class="btn backbtn" id="tBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('team') + '</div><span></span>' + GTD.UI.resBar().outerHTML;
    sc.appendChild(head);
    const body = GTD.U.el('div', 'team-body');
    const slots = GTD.U.el('div', 'team-slots');
    const list = GTD.U.el('div', 'team-list');
    const detail = GTD.U.el('div', 'team-detail');
    body.appendChild(slots);
    body.appendChild(list);
    body.appendChild(detail);
    sc.appendChild(body);
    root.appendChild(sc);

    let focusKey = s.team[0] || 'nameless';

    function renderSlots() {
      slots.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const key = s.team[i];
        const d = GTD.U.el('div', 'tslot');
        if (key) {
          const def = GTD.HERO_BY_KEY[key];
          const cv = document.createElement('canvas');
          cv.width = 64; cv.height = 64;
          GTD.UI.heroIcon(cv.getContext('2d'), 32, 32, def, 56);
          d.appendChild(cv);
          d.innerHTML += '<div class="tslot-nm">' + GTD.heroName(def) + '</div>';
          d.className += ' rar' + def.r + (key === focusKey ? ' focus' : '');
          d.addEventListener('click', function () { GTD.Audio.sfx('click'); focusKey = key; renderAll(); });
        } else {
          d.innerHTML = '<div class="tslot-empty">–</div>';
        }
        slots.appendChild(d);
      }
    }
    function renderList() {
      list.innerHTML = '';
      const sug = GTD.U.el('button', 'btn small', '✨ ' + GTD.t('suggest'));
      sug.addEventListener('click', function () {
        GTD.Audio.sfx('click');
        const owned = GTD.HEROES.filter(h => s.heroes[h.key].unlocked);
        owned.sort(function (a, b) {
          const la = s.heroes[a.key].level, lb = s.heroes[b.key].level;
          return (GTD.heroAtk(b, lb) + GTD.heroHp(b, lb) * 0.3) - (GTD.heroAtk(a, la) + GTD.heroHp(a, la) * 0.3);
        });
        s.team = owned.slice(0, 5).map(h => h.key);
        if (s.team.length) focusKey = s.team[0];
        GTD.Save.storeSoon();
        renderAll();
      });
      list.appendChild(sug);
      GTD.HEROES.forEach(h => {
        const hs = s.heroes[h.key];
        const card = GTD.UI.heroCard(h.key);
        card.className += s.team.indexOf(h.key) >= 0 ? ' in-team' : '';
        card.className += h.key === focusKey ? ' focus' : '';
        card.addEventListener('click', function () {
          GTD.Audio.sfx('click');
          focusKey = h.key;
          renderAll();
        });
        list.appendChild(card);
      });
    }
    function renderDetail() {
      const def = GTD.HERO_BY_KEY[focusKey];
      const hs = s.heroes[focusKey];
      if (!def) { detail.innerHTML = ''; return; }
      const lvl = hs.level || 1;
      const maxed = lvl >= 60;
      let costHtml = '';
      if (!maxed) {
        if (def.mythic && def.soul) {
          const have = s.soulStones[def.soul] || 0;
          costHtml = '<button class="btn gold" id="dUp" ' + (have < GTD.SOUL_PER_LEVEL ? 'disabled' : '') + '>' + GTD.t('upgrade') + ' (' + have + '/150 ' + GTD.t('soul_stones') + ')</button>';
        } else {
          const c = GTD.heroUpCost(lvl);
          costHtml = '<button class="btn gold" id="dUp" ' + (s.currencies.gold < c ? 'disabled' : '') + '>' + GTD.t('upgrade') + ' (' + GTD.U.fmtFull(c) + ' 🪙)</button>';
        }
      }
      let awakenHtml = '';
      if (GTD.AWAKEN[def.key]) {
        const aw = GTD.AWAKEN[def.key];
        const target = GTD.HERO_BY_KEY[aw.to];
        if (!s.heroes[target.key].unlocked) {
          const ok = lvl >= aw.lvl && s.currencies.gold >= aw.gold && s.currencies.magicstone >= aw.ms;
          awakenHtml = '<button class="btn red big" id="dAwk" ' + (ok ? '' : 'disabled') + '>🔥 ' + GTD.t('awaken_btn') + '</button>' +
            '<div class="detail-sub">' + GTD.t('awaken_req', { l: aw.lvl, g: GTD.U.fmtFull(aw.gold), m: aw.ms }) + '</div>';
        }
      }
      detail.innerHTML =
        '<div class="detail-card rar' + def.r + '">' +
        '<div class="detail-top">' +
        '<canvas id="dCv" width="84" height="84"></canvas>' +
        '<div class="detail-head">' +
        '<div class="detail-name">' + GTD.heroName(def) + '</div>' +
        '<div class="detail-rar" style="color:' + GTD.RAR_COLORS[def.r] + '">' + GTD.t(GTD.RAR_NAMES[def.r]) + (def.mythic ? ' · MYTHIC' : '') + '</div>' +
        '<div class="detail-attr">' + GTD.t(GTD.ATTRS[def.attr].i18n) + ' · ' + GTD.t('level') + ' ' + lvl + (def.air ? ' · ' + GTD.t('air') : '') + '</div>' +
        '</div></div>' +
        (hs.unlocked ?
          '<div class="detail-stats">' +
          (def.atk ? '<span>' + GTD.t('atk') + ': <b>' + GTD.U.fmt(GTD.heroAtk(def, lvl)) + '</b></span>' : '') +
          '<span>' + GTD.t('heal') + ': <b>' + GTD.U.fmt(GTD.heroHp(def, lvl)) + '</b></span>' +
          '<span>' + GTD.t('range') + ': <b>' + def.range + '</b></span>' +
          '<span>' + GTD.t('skill') + ': <b>' + (def.skill ? '★' : '—') + '</b></span>' +
          '</div>' +
          '<div class="detail-desc">' + GTD.t('d_' + def.key) + '</div>' +
          (hs.unlocked && (s.team.indexOf(def.key) >= 0) ? '<div class="detail-teamok">✓ ' + GTD.t('in_team') + '</div>' : (hs.unlocked ? '<div class="detail-teamok dim">○ ' + GTD.t('out_team') + '</div>' : '')) +
          '<div class="detail-actions">' +
          (s.team.indexOf(def.key) >= 0
            ? '<button class="btn" id="dTeam">− ' + GTD.t('remove_team') + '</button>'
            : '<button class="btn gold" id="dTeam">+ ' + GTD.t('add_team') + '</button>') +
          costHtml + awakenHtml +
          '</div>' :
          '<div class="detail-desc dim">' + GTD.t('hero_unk') + '</div>' +
          '<div class="detail-actions"><button class="btn gold" id="dBuy">' + GTD.t('purchase') + ' (' + (def.mythic && def.soul ? '150 ' + GTD.t('soul_stones') : GTD.U.fmtFull(def.cost) + (def.cur === 'ruby' ? ' 🔴' : ' 🟣')) + ')</button></div>'
        ) +
        '</div>';
      GTD.UI.heroIcon(detail.querySelector('#dCv').getContext('2d'), 42, 42, def, 76);
      const up = detail.querySelector('#dUp');
      if (up) up.addEventListener('click', function () {
        if (def.mythic && def.soul) {
          if (GTD.paySoul(def.soul, GTD.SOUL_PER_LEVEL)) {
            hs.level++;
            GTD.Audio.sfx('levelup');
            GTD.Save.storeSoon();
            renderAll();
          }
        } else {
          const c = GTD.heroUpCost(lvl);
          if (GTD.pay({ gold: c })) {
            hs.level++;
            GTD.Audio.sfx('levelup');
            GTD.Save.storeSoon();
            renderAll();
          }
        }
      });
      const aw = detail.querySelector('#dAwk');
      if (aw) aw.addEventListener('click', function () {
        const a = GTD.AWAKEN[def.key];
        if (lvl < a.lvl || s.currencies.gold < a.gold || s.currencies.magicstone < a.ms) return;
        GTD.UI.confirm(GTD.t('awaken_btn'), GTD.t('awaken_req', { l: a.lvl, g: GTD.U.fmtFull(a.gold), m: a.ms }) + ' ?', function () {
          s.currencies.gold -= a.gold;
          s.currencies.magicstone -= a.ms;
          s.heroes[a.to].unlocked = true;
          const ti = s.team.indexOf(def.key);
          if (ti >= 0) s.team[ti] = a.to;
          GTD.Audio.sfx('levelup');
          GTD.UI.toast(GTD.t('hero_woke', { n: GTD.heroName(GTD.HERO_BY_KEY[a.to]) }));
          GTD.Save.storeSoon();
          focusKey = a.to;
          renderAll();
        }, 'btn gold');
      });
      const buy = detail.querySelector('#dBuy');
      if (buy) buy.addEventListener('click', function () {
        if (def.mythic && def.soul) {
          if (GTD.paySoul(def.soul, def.cost)) hs.unlocked = true;
        } else if (GTD.pay({ [def.cur]: def.cost })) {
          hs.unlocked = true;
        } else { GTD.UI.toast(GTD.t('not_enough')); return; }
        GTD.Audio.sfx('coin');
        GTD.Save.storeSoon();
        renderAll();
      });
      const tm = detail.querySelector('#dTeam');
      if (tm) tm.addEventListener('click', function () {
        GTD.Audio.sfx('click');
        const idx = s.team.indexOf(def.key);
        if (idx >= 0) { s.team.splice(idx, 1); }
        else {
          if (s.team.length >= 5) { GTD.UI.toast(GTD.t('team_full')); return; }
          s.team.push(def.key);
        }
        GTD.Save.storeSoon();
        renderAll();
      });
    }
    function renderAll() { renderSlots(); renderList(); renderDetail(); GTD.UI.refreshRes(root); }
    renderAll();
    sc.querySelector('#tBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  },

  /* ============================================================
     UPGRADE (global upgrades + tower rarity cards)
     ============================================================ */
  upgrade: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene up-sc');
    const head = GTD.U.el('div', 'sc-head');
    head.innerHTML = '<button class="btn backbtn" id="uBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('upgrade_scene') + '</div><span></span>' + GTD.UI.resBar().outerHTML;
    sc.appendChild(head);
    const body = GTD.U.el('div', 'up-body');
    sc.appendChild(body);
    root.appendChild(sc);

    function render() {
      body.innerHTML = '';
      GTD.UPGRADES.forEach(u => {
        const lvl = s.upgrades[u.key];
        const maxed = lvl >= u.max;
        let eff = '';
        if (u.key === 'soldier') eff = GTD.t('up_soldier_d') + ' (+' + (lvl * 20) + '%)';
        if (u.key === 'meteor') eff = GTD.t('up_meteor_d', { d: GTD.U.fmt(GTD.meteorDamage(lvl)) });
        if (u.key === 'barracks') eff = GTD.t('up_barracks_d', { n: GTD.barracksSoldiers(lvl) });
        if (u.key === 'volunteer') eff = GTD.t('up_volunteer_d', { a: GTD.U.fmt(GTD.volunteerAtk(lvl)), h: GTD.U.fmt(GTD.volunteerHp(lvl)) });
        const row = GTD.U.el('div', 'up-row');
        row.innerHTML =
          '<div class="up-ico">' + { soldier: '🛡️', meteor: '☄️', barracks: '🏰', volunteer: '🚩' }[u.key] + '</div>' +
          '<div class="up-info"><div class="up-name">' + GTD.t('up_' + u.key) + ' — ' + GTD.t('level') + ' ' + lvl + '/' + u.max + '</div>' +
          '<div class="up-eff">' + eff + '</div></div>';
        const btn = GTD.U.el('button', 'btn gold', maxed ? GTD.t('max') : GTD.t('up_cost', { g: GTD.U.fmtFull(GTD.upCost(lvl)) }));
        if (maxed) btn.disabled = true;
        else if (s.currencies.gold < GTD.upCost(lvl)) btn.disabled = true;
        btn.addEventListener('click', function () {
          const c = GTD.upCost(lvl);
          if (s.currencies.gold < c) { GTD.UI.toast(GTD.t('not_enough')); return; }
          GTD.pay({ gold: c });
          s.upgrades[u.key]++;
          GTD.Audio.sfx('levelup');
          render();
        });
        row.appendChild(btn);
        body.appendChild(row);
      });
      /* tower rarity via cards */
      const sec = GTD.U.el('div', 'up-row sec');
      sec.innerHTML = '<div class="up-ico">🎴</div><div class="up-info"><div class="up-name">' + GTD.t('tower_rarity') + '</div><div class="up-eff">' + GTD.t('tower_rarity_d') + '</div></div>';
      body.appendChild(sec);
      GTD.TOWERS.forEach(t => {
        const st = s.towers[t.key];
        if (!st.owned) return;
        const row = GTD.U.el('div', 'up-row sub');
        const maxed = st.tier >= 5;
        row.innerHTML =
          '<div class="up-ico"><canvas width="36" height="36"></canvas></div>' +
          '<div class="up-info"><div class="up-name" style="color:' + GTD.RAR_COLORS[st.tier] + '">' + GTD.towerName(t) + ' — ' + GTD.t(GTD.RAR_NAMES[st.tier]) + '</div>' +
          '<div class="up-eff">' + GTD.t('atk') + ' ' + GTD.U.fmt(GTD.towerAtk(t, st.tier, 1, 1, false)) + ' → ' + (maxed ? GTD.t('max') : GTD.U.fmt(GTD.towerAtk(t, st.tier + 1, 1, 1, false))) + ' · 🎴 ' + st.cards + '</div></div>';
        GTD.drawTowerIcon(row.querySelector('canvas').getContext('2d'), 18, 18, t.key, st.tier);
        const cost = maxed ? 0 : GTD.CARD_COST[st.tier];
        const btn = GTD.U.el('button', 'btn small', maxed ? GTD.t('max') : GTD.t('upgrade') + ' (🎴' + cost + ')');
        if (maxed || st.cards < cost) btn.disabled = true;
        btn.addEventListener('click', function () {
          if (st.cards < cost) { GTD.UI.toast(GTD.t('not_enough')); return; }
          st.cards -= cost;
          st.tier++;
          GTD.Audio.sfx('gacha');
          render();
        });
        row.appendChild(btn);
        body.appendChild(row);
      });
      GTD.UI.refreshRes(root);
    }
    render();
    sc.querySelector('#uBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  },

  /* ============================================================
     GACHA
     ============================================================ */
  rollGachaRarity: function (rates) {
    const r = Math.random() * 100;
    let acc = 0;
    for (let i = 0; i < 6; i++) {
      acc += rates[i];
      if (r < acc) return i;
    }
    return 0;
  },
  doPull: function (kind, n) {
    const s = GTD_SAVE;
    const g = GTD.GACHA[kind];
    const cost = n === 10 ? g.c10 : g.c1 * n;
    if (s.currencies[g.cur] < cost) return null;
    GTD.pay({ [g.cur]: cost });
    const results = [];
    for (let i = 0; i < n; i++) results.push(GTD.UI.rollGachaRarity(g.rates));
    if (n === 10 && !results.some(r => r >= 2)) results[n - 1] = 2; // 10-pull guarantee
    if (s.gachaPity >= GTD.GACHA.pity) results[0] = Math.max(results[0], 4); // pity
    if (results.some(r => r >= 4)) s.gachaPity = 0;
    else s.gachaPity += n;
    const out = [];
    results.forEach(r => {
      const t = GTD.U.choice(GTD.TOWERS);
      const st = s.towers[t.key];
      if (!st.owned) {
        st.owned = true;
        st.tier = r; // first obtain: rarity = gacha result
        out.push({ tower: t, rarity: r, isNew: true, cards: 0 });
      } else {
        const cards = GTD.GACHA.dupCards[r];
        st.cards += cards;
        out.push({ tower: t, rarity: r, isNew: false, cards: cards });
      }
    });
    GTD.Save.storeSoon();
    return out;
  },
  gacha: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene gacha-sc');
    const head = GTD.U.el('div', 'sc-head');
    head.innerHTML = '<button class="btn backbtn" id="gBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('gacha') + '</div><span></span>' + GTD.UI.resBar().outerHTML;
    sc.appendChild(head);
    const tabs = GTD.U.el('div', 'gacha-tabs');
    const stage = GTD.U.el('div', 'gacha-stage');
    sc.appendChild(tabs);
    sc.appendChild(stage);
    root.appendChild(sc);
    let kind = 'normal';

    function renderTabs() {
      tabs.innerHTML = '';
      ['normal', 'premium'].forEach(k => {
        const g = GTD.GACHA[k];
        const b = GTD.U.el('button', 'gacha-tab' + (k === kind ? ' sel' : ''));
        b.innerHTML = (k === 'normal' ? '🎴 ' : '👑 ') + GTD.t(k === 'normal' ? 'normal_gacha' : 'premium_gacha') +
          '<span class="gt-cost">' + g.c1 + (k === 'normal' ? '🔴' : '💎') + ' / ' + g.c10 + '</span>';
        b.addEventListener('click', function () { GTD.Audio.sfx('click'); kind = k; renderTabs(); renderStage(); });
        tabs.appendChild(b);
      });
    }
    function renderStage() {
      const g = GTD.GACHA[kind];
      const ico = kind === 'normal' ? '🔴' : '💎';
      stage.innerHTML =
        '<div class="gacha-rates">' + GTD.t('rate') + ': ' +
        GTD.RAR_NAMES.map((rn, i) => '<span style="color:' + GTD.RAR_COLORS[i] + '">' + g.rates[i] + '%</span>').join(' · ') +
        '</div>' +
        '<div class="gacha-pity"><div class="gp-lab">' + GTD.t('pity') + ' ' + s.gachaPity + '/' + GTD.GACHA.pity + '</div><div class="gp-track"><div class="gp-fill" style="width:' + Math.min(100, s.gachaPity / GTD.GACHA.pity * 100) + '%"></div></div></div>' +
        '<div class="gacha-btns">' +
        '<button class="btn gold big" id="pull1">' + GTD.t('pull1') + ' (' + g.c1 + ' ' + ico + ')</button>' +
        '<button class="btn gold big" id="pull10">' + GTD.t('pull10') + ' (' + g.c10 + ' ' + ico + ')</button>' +
        '</div>' +
        '<div class="gacha-result" id="gResult"></div>';
      stage.querySelector('#pull1').addEventListener('click', function () { doIt(1); });
      stage.querySelector('#pull10').addEventListener('click', function () { doIt(10); });
    }
    function doIt(n) {
      const res = GTD.UI.doPull(kind, n);
      if (!res) { GTD.UI.toast(GTD.t('not_enough')); return; }
      GTD.Audio.sfx('gacha');
      const box = stage.querySelector('#gResult');
      box.innerHTML = '';
      const wrap = GTD.U.el('div', 'gresult' + (n === 10 ? ' row10' : ' row1'));
      res.forEach((r, i) => {
        const card = GTD.U.el('div', 'gcard back');
        card.innerHTML = '<div class="gc-inner"><div class="gc-front rar' + r.rarity + '"></div><div class="gc-backin"></div></div>';
        wrap.appendChild(card);
        setTimeout(function () {
          card.classList.remove('back');
          card.classList.add('flipped');
          GTD.Audio.sfx('click');
          const front = card.querySelector('.gc-front');
          front.innerHTML =
            '<div class="gc-cvw"></div>' +
            '<div class="gc-name">' + GTD.towerName(r.tower) + '</div>' +
            '<div class="gc-tier" style="color:' + GTD.RAR_COLORS[r.rarity] + '">' + GTD.t(GTD.RAR_NAMES[r.rarity]) + '</div>' +
            '<div class="gc-tag ' + (r.isNew ? 'new' : 'dup') + '">' + (r.isNew ? GTD.t('new_tower') : GTD.t('dup') + ' +' + r.cards + '🎴') + '</div>';
          const cv = document.createElement('canvas');
          cv.width = 72; cv.height = 72;
          GTD.drawTowerIcon(cv.getContext('2d'), 36, 36, r.tower.key, r.rarity);
          front.querySelector('.gc-cvw').appendChild(cv);
        }, 220 * i + 120);
        if (r.isNew) {
          setTimeout(function () { GTD.UI.toast(GTD.t('tower_unlocked', { n: GTD.towerName(r.tower) })); }, 220 * i + 400);
        }
      });
      renderTabs();
      renderStage();
      GTD.UI.refreshRes(root);
    }
    renderTabs();
    renderStage();
    sc.querySelector('#gBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  },

  /* ============================================================
     DAILY CHALLENGE
     ============================================================ */
  daily: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene daily-sc');
    const head = GTD.U.el('div', 'sc-head');
    head.innerHTML = '<button class="btn backbtn" id="dBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('daily') + '</div><span></span>' + GTD.UI.resBar().outerHTML;
    sc.appendChild(head);
    const body = GTD.U.el('div', 'daily-body');
    sc.appendChild(body);
    root.appendChild(sc);

    function render() {
      body.innerHTML = '';
      const tk = GTD.U.el('div', 'dc-tickets');
      tk.innerHTML = '<div>🎟️ ' + GTD.t('tickets') + ': <b>' + s.dailyChallenge.tickets + '</b></div>' +
        '<button class="btn small" id="dcBuy">' + GTD.t('buy_ticket') + '</button>';
      body.appendChild(tk);
      body.querySelector('#dcBuy').addEventListener('click', function () {
        if (GTD.pay({ diamond: GTD.DC.ticketCost })) {
          s.dailyChallenge.tickets++;
          GTD.Audio.sfx('coin');
          render();
        } else GTD.UI.toast(GTD.t('not_enough'));
      });
      GTD.DC.difficulties.forEach(function (d, i) {
        const locked = s.maxStage < d.need;
        const noTicket = s.dailyChallenge.tickets < d.tickets;
        const row = GTD.U.el('div', 'dc-card' + (locked ? ' locked' : ''));
        const ico = ['🌱', '⚔️', '🔥'][i];
        row.innerHTML =
          '<div class="dc-ico">' + ico + '</div>' +
          '<div class="dc-info">' +
          '<div class="dc-name">' + GTD.t(d.key) + ' — ' + GTD.t('stage') + ' ' + d.minStage + '–' + d.maxStage + '</div>' +
          '<div class="dc-sub">' + GTD.t('dc_reward', { d: d.reward }) + ' · ' + GTD.t('dc_tower', { t: d.tier }) + '</div>' +
          '<div class="dc-sub dim">' + GTD.t('tickets') + ': ' + d.tickets + ' · ' + GTD.t('required_stage') + ' ' + d.need + ' · ' + GTD.t('dc_clears') + ' ' + s.dailyChallenge.clears[d.key] + '</div>' +
          '</div>';
        const btn = GTD.U.el('button', 'btn gold', GTD.t('play'));
        if (locked || noTicket) btn.disabled = true;
        btn.addEventListener('click', function () {
          if (s.maxStage < d.need) { GTD.UI.toast(GTD.t('dc_locked')); return; }
          if (s.dailyChallenge.tickets < d.tickets) { GTD.UI.toast(GTD.t('dc_no_ticket')); return; }
          const stage = GTD.U.randInt(d.minStage, d.maxStage);
          GTD.App.startBattle({ mode: 'daily', stage: stage, diff: i });
        });
        row.appendChild(btn);
        body.appendChild(row);
      });
      GTD.UI.refreshRes(root);
    }
    render();
    sc.querySelector('#dBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  },

  /* ============================================================
     TOWER OF PROOF
     ============================================================ */
  top: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene top-sc');
    const head = GTD.U.el('div', 'sc-head');
    head.innerHTML = '<button class="btn backbtn" id="tpBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('top') + '</div><span></span>' + GTD.UI.resBar().outerHTML;
    sc.appendChild(head);
    const body = GTD.U.el('div', 'top-body');
    sc.appendChild(body);
    root.appendChild(sc);

    function render() {
      body.innerHTML = '';
      const floor = s.towerOfProof.floor;
      const conquered = floor >= 15 && s.towerOfProof.cleared.every(c => c);
      const grid = GTD.U.el('div', 'top-grid');
      for (let f = 1; f <= 15; f++) {
        const done = s.towerOfProof.cleared[f - 1];
        const cur = f === floor + 1;
        const c = GTD.U.el('div', 'top-floor' + (done ? ' done' : '') + (cur ? ' cur' : ''));
        c.innerHTML = '<span class="tf-n">' + (done ? '✓' : f) + '</span><span class="tf-name">' + GTD.t('floor') + ' ' + f + '</span>';
        grid.appendChild(c);
      }
      body.appendChild(grid);
      const play = GTD.U.el('button', 'btn gold giant',
        conquered ? '🏆 ' + GTD.t('top_conquered') : GTD.t('top_next', { f: floor + 1 }) + ' (' + GTD.U.fmtFull(GTD.TOP.entry) + ' 🪙)');
      if (conquered) play.disabled = true;
      else if (s.currencies.gold < GTD.TOP.entry) play.disabled = true;
      play.addEventListener('click', function () {
        if (floor >= 15) return;
        if (s.currencies.gold < GTD.TOP.entry) { GTD.UI.toast(GTD.t('not_enough')); return; }
        GTD.App.startBattle({ mode: 'top', floor: floor + 1 });
      });
      body.appendChild(play);
      if (conquered) body.appendChild(GTD.U.el('div', 'top-conq', '🏆 ' + GTD.t('top_conquered')));

      /* rewards */
      const rw = GTD.U.el('div', 'top-rewards');
      rw.innerHTML = '<div class="tr-title">' + GTD.t('reward') + '</div>';
      const rlist = GTD.U.el('div', 'tr-list');
      GTD.TOP.rewards.forEach(function (r, i) {
        if (!r) return;
        const row = GTD.U.el('div', 'tr-row' + (s.towerOfProof.cleared[i] ? ' done' : ''));
        const txt = r.map(x => x.cur === 'cards' ? x.n + ' 🎴' : GTD.U.fmtFull(x.n) + ' ' + (GTD.CUR_META[x.cur] ? GTD.t(GTD.CUR_META[x.cur].i18n) : x.cur)).join(' + ');
        row.innerHTML = GTD.t('floor') + ' ' + (i + 1) + ': ' + txt;
        rlist.appendChild(row);
      });
      rw.appendChild(rlist);
      body.appendChild(rw);

      /* mileage exchange */
      const ex = GTD.U.el('div', 'top-exchange');
      ex.innerHTML = '<div class="tr-title">🛣️ ' + GTD.t('mileage_exchange') + ' — ' + s.currencies.mileage + '</div>';
      const e1 = GTD.U.el('button', 'btn', GTD.t('ex_souls'));
      if (s.currencies.mileage < 100) e1.disabled = true;
      e1.addEventListener('click', function () {
        if (s.currencies.mileage < 100) { GTD.UI.toast(GTD.t('no_mileage')); return; }
        GTD.pay({ mileage: 100 });
        GTD.give({ souls3: 1 });
        GTD.Audio.sfx('coin');
        render();
      });
      const e2 = GTD.U.el('button', 'btn', GTD.t('ex_ms'));
      if (s.currencies.mileage < 300) e2.disabled = true;
      e2.addEventListener('click', function () {
        if (s.currencies.mileage < 300) { GTD.UI.toast(GTD.t('no_mileage')); return; }
        GTD.pay({ mileage: 300 });
        GTD.give({ magicstone1000: 1 });
        GTD.Audio.sfx('coin');
        render();
      });
      ex.appendChild(e1);
      ex.appendChild(e2);
      body.appendChild(ex);
      GTD.UI.refreshRes(root);
    }
    render();
    sc.querySelector('#tpBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  },

  /* ============================================================
     ATTENDANCE
     ============================================================ */
  attendance: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene att-sc');
    const head = GTD.U.el('div', 'sc-head');
    head.innerHTML = '<button class="btn backbtn" id="aBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('attendance') + ' — ' + s.attendance.month + '</div><span></span>' + GTD.UI.resBar().outerHTML;
    sc.appendChild(head);
    const grid = GTD.U.el('div', 'att-grid');
    const today = Math.min(30, new Date().getDate());
    GTD.ATTENDANCE.forEach(function (rw, i) {
      const day = i + 1;
      const claimed = !!s.attendance.claimed[day];
      const isToday = day === today;
      const c = GTD.U.el('div', 'att-day' + (claimed ? ' claimed' : '') + (isToday && !claimed ? ' today' : ''));
      const txt = rw.multi ? rw.multi.map(x => x.cur === 'soul' ? x.n + ' ' + GTD.t('soul_stones') : GTD.U.fmt(x.n) + ' ' + (GTD.CUR_META[x.cur] ? GTD.t(GTD.CUR_META[x.cur].i18n) : '')).join('+')
        : (rw.cur === 'soul' ? rw.n + ' ' + GTD.t('soul_stones') : GTD.U.fmt(rw.n) + ' ' + (GTD.CUR_META[rw.cur] ? GTD.t(GTD.CUR_META[rw.cur].i18n) : ''));
      c.innerHTML = '<div class="ad-day">' + GTD.t('day') + ' ' + day + '</div><div class="ad-rw">' + txt + '</div><div class="ad-st">' + (claimed ? '✓ ' + GTD.t('claimed') : isToday ? '!' : '') + '</div>';
      if (isToday && !claimed) {
        c.addEventListener('click', function () {
          if (s.attendance.claimed[day]) return;
          GTD.give(rw.multi ? rw.multi : { [rw.cur]: rw.n });
          s.attendance.claimed[day] = true;
          GTD.Audio.sfx('coin');
          GTD.UI.toast(GTD.t('attendance_claim', { d: day }) + ' ✓');
          render();
        });
      }
      grid.appendChild(c);
    });
    sc.appendChild(grid);
    root.appendChild(sc);

    function render() {
      grid.innerHTML = '';
      GTD.ATTENDANCE.forEach(function (rw, i) {
        const day = i + 1;
        const claimed = !!s.attendance.claimed[day];
        const isToday = day === today;
        const c = GTD.U.el('div', 'att-day' + (claimed ? ' claimed' : '') + (isToday && !claimed ? ' today' : ''));
        const txt = rw.multi ? rw.multi.map(x => x.cur === 'soul' ? x.n + ' ' + GTD.t('soul_stones') : GTD.U.fmt(x.n) + ' ' + (GTD.CUR_META[x.cur] ? GTD.t(GTD.CUR_META[x.cur].i18n) : '')).join('+')
          : (rw.cur === 'soul' ? rw.n + ' ' + GTD.t('soul_stones') : GTD.U.fmt(rw.n) + ' ' + (GTD.CUR_META[rw.cur] ? GTD.t(GTD.CUR_META[rw.cur].i18n) : ''));
        c.innerHTML = '<div class="ad-day">' + GTD.t('day') + ' ' + day + '</div><div class="ad-rw">' + txt + '</div><div class="ad-st">' + (claimed ? '✓ ' + GTD.t('claimed') : isToday ? '!' : '') + '</div>';
        if (isToday && !claimed) {
          c.addEventListener('click', function () {
            if (s.attendance.claimed[day]) return;
            GTD.give(rw.multi ? rw.multi : { [rw.cur]: rw.n });
            s.attendance.claimed[day] = true;
            GTD.Audio.sfx('coin');
            GTD.UI.toast(GTD.t('attendance_claim', { d: day }) + ' ✓');
            render();
          });
        }
        grid.appendChild(c);
      });
    }
    sc.querySelector('#aBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  },

  /* ============================================================
     MISSIONS
     ============================================================ */
  missions: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene miss-sc');
    const head = GTD.U.el('div', 'sc-head');
    head.innerHTML = '<button class="btn backbtn" id="mBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('missions') + '</div><span></span>' + GTD.UI.resBar().outerHTML;
    sc.appendChild(head);
    const tabs = GTD.U.el('div', 'miss-tabs');
    const body = GTD.U.el('div', 'miss-body');
    sc.appendChild(tabs);
    sc.appendChild(body);
    root.appendChild(sc);
    let tab = 'daily';

    function missionKey(key) { return key; }
    function render() {
      tabs.innerHTML = '';
      [['daily', GTD.t('daily_m')], ['weekly', GTD.t('weekly_m')], ['ach', GTD.t('achievement')]].forEach(function (t) {
        const b = GTD.U.el('button', 'miss-tab' + (tab === t[0] ? ' sel' : ''), t[1]);
        b.addEventListener('click', function () { GTD.Audio.sfx('click'); tab = t[0]; render(); });
        tabs.appendChild(b);
      });
      body.innerHTML = '';
      if (tab === 'daily' || tab === 'weekly') {
        const list = tab === 'daily' ? GTD.MISSIONS_DAILY : GTD.MISSIONS_WEEKLY;
        const st = tab === 'daily' ? s.missions.daily : s.missions.weekly;
        list.forEach(function (m, i) {
          const prog = st[missionKey(m.key)] || 0;
          const done = prog >= m.target;
          const claimed = !!st.claimed[i];
          const row = GTD.U.el('div', 'miss-row');
          const name = tab === 'daily'
            ? [GTD.t('m_kill500'), GTD.t('m_build50'), GTD.t('m_meteor30'), GTD.t('m_clear50')][i]
            : [GTD.t('m_kill5000'), GTD.t('m_clear100')][i];
          row.innerHTML =
            '<div class="mr-info"><div class="mr-name">' + name + '</div>' +
            '<div class="mr-track"><div class="mr-fill" style="width:' + Math.min(100, prog / m.target * 100) + '%"></div></div>' +
            '<div class="mr-prog">' + Math.min(prog, m.target) + ' / ' + m.target + ' · ' + GTD.t('reward') + ': ' + GTD.rewardText(m.reward) + '</div></div>';
          const btn = GTD.U.el('button', 'btn small ' + (claimed ? 'done' : done ? 'gold' : ''), claimed ? GTD.t('claimed') : GTD.t('claim'));
          if (!done || claimed) btn.disabled = true;
          btn.addEventListener('click', function () {
            if (claimed || !done) return;
            st.claimed[i] = true;
            GTD.give(m.reward);
            GTD.Audio.sfx('coin');
            GTD.UI.toast('✓ ' + GTD.rewardText(m.reward));
            render();
          });
          row.appendChild(btn);
          body.appendChild(row);
        });
      } else {
        GTD.MISSIONS_ACH.forEach(function (m, i) {
          const prog = s.stats[m.stat] || 0;
          const done = prog >= m.target;
          const claimed = !!s.achievements.claimed[i];
          const row = GTD.U.el('div', 'miss-row');
          const names = [GTD.t('m_a1'), GTD.t('m_a2'), GTD.t('m_a3'), GTD.t('m_a4')];
          row.innerHTML =
            '<div class="mr-info"><div class="mr-name">🏆 ' + names[i] + '</div>' +
            '<div class="mr-track"><div class="mr-fill" style="width:' + Math.min(100, prog / m.target * 100) + '%"></div></div>' +
            '<div class="mr-prog">' + Math.min(prog, m.target) + ' / ' + m.target + ' · ' + GTD.t('reward') + ': ' + GTD.rewardText(m.reward) + '</div></div>';
          const btn = GTD.U.el('button', 'btn small ' + (claimed ? 'done' : done ? 'gold' : ''), claimed ? GTD.t('claimed') : GTD.t('claim'));
          if (!done || claimed) btn.disabled = true;
          btn.addEventListener('click', function () {
            if (claimed || !done) return;
            s.achievements.claimed[i] = true;
            GTD.give(m.reward);
            GTD.Audio.sfx('coin');
            render();
          });
          row.appendChild(btn);
          body.appendChild(row);
        });
      }
      GTD.UI.refreshRes(root);
    }
    render();
    sc.querySelector('#mBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  },

  /* ============================================================
     MAILBOX
     ============================================================ */
  mailbox: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene mail-sc');
    const head = GTD.U.el('div', 'sc-head');
    const un = s.mail.filter(m => !m.claimed).length;
    head.innerHTML = '<button class="btn backbtn" id="mbBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('mailbox') + (un ? ' (' + un + ')' : '') + '</div>' +
      (un ? '<button class="btn small" id="mbAll">' + GTD.t('claim_all') + '</button>' : '<span></span>') + GTD.UI.resBar().outerHTML;
    sc.appendChild(head);
    const list = GTD.U.el('div', 'mail-list');
    sc.appendChild(list);
    root.appendChild(sc);

    function render() {
      list.innerHTML = '';
      if (!s.mail.length) list.innerHTML = '<div class="mail-empty">' + GTD.t('mail_empty') + '</div>';
      s.mail.forEach(m => {
        const row = GTD.U.el('div', 'mail-row' + (m.claimed ? ' claimed' : ''));
        row.innerHTML =
          '<div class="mr-info"><div class="mr-name">' + (m.title.startsWith('mail_') ? GTD.t(m.title) : m.title) + '</div>' +
          '<div class="mr-prog">' + GTD.rewardText(m.reward) + '</div></div>';
        if (!m.claimed) {
          const btn = GTD.U.el('button', 'btn small gold', GTD.t('claim'));
          btn.addEventListener('click', function () {
            if (m.claimed) return;
            m.claimed = true;
            GTD.give(m.reward);
            GTD.Audio.sfx('coin');
            GTD.Save.storeSoon();
            render();
            refreshHead();
          });
          row.appendChild(btn);
        }
        list.appendChild(row);
      });
      GTD.UI.refreshRes(root);
    }
    function refreshHead() {
      const un2 = s.mail.filter(m => !m.claimed).length;
      const oldAll = head.querySelector('#mbAll');
      if (oldAll) oldAll.remove();
      const span = head.querySelector('span:last-child');
      const holder = head.children[2];
      if (un2) {
        const b = GTD.U.el('button', 'btn small', GTD.t('claim_all'));
        b.id = 'mbAll';
        b.addEventListener('click', function () {
          s.mail.forEach(m => {
            if (!m.claimed) { m.claimed = true; GTD.give(m.reward); }
          });
          GTD.Audio.sfx('coin');
          GTD.Save.storeSoon();
          render();
          refreshHead();
        });
        head.insertBefore(b, holder);
      }
    }
    const all = head.querySelector('#mbAll');
    if (all) all.addEventListener('click', function () {
      s.mail.forEach(m => {
        if (!m.claimed) { m.claimed = true; GTD.give(m.reward); }
      });
      GTD.Audio.sfx('coin');
      GTD.Save.storeSoon();
      render();
      refreshHead();
    });
    render();
    sc.querySelector('#mbBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  },

  /* ============================================================
     CODEX
     ============================================================ */
  codex: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene codex-sc');
    const head = GTD.U.el('div', 'sc-head');
    head.innerHTML = '<button class="btn backbtn" id="cBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('codex') + '</div><span></span>';
    sc.appendChild(head);
    const tabs = GTD.U.el('div', 'codex-tabs');
    const body = GTD.U.el('div', 'codex-body');
    sc.appendChild(tabs);
    sc.appendChild(body);
    root.appendChild(sc);
    let tab = 'heroes';

    function render() {
      tabs.innerHTML = '';
      [['heroes', GTD.t('cx_heroes')], ['towers', GTD.t('cx_towers')], ['monsters', GTD.t('cx_monsters')]].forEach(function (t) {
        const b = GTD.U.el('button', 'codex-tab' + (tab === t[0] ? ' sel' : ''), t[1]);
        b.addEventListener('click', function () { GTD.Audio.sfx('click'); tab = t[0]; render(); });
        tabs.appendChild(b);
      });
      body.innerHTML = '';
      if (tab === 'heroes') {
        GTD.HEROES.forEach(h => {
          const hs = s.heroes[h.key];
          const d = GTD.U.el('div', 'cx-row' + (hs.unlocked ? '' : ' locked'));
          const cv = document.createElement('canvas');
          cv.width = 48; cv.height = 48;
          GTD.UI.heroIcon(cv.getContext('2d'), 24, 24, h, 44);
          d.appendChild(cv);
          d.innerHTML +=
            '<div class="cx-info">' +
            '<div class="cx-name" style="color:' + GTD.RAR_COLORS[h.r] + '">' + GTD.heroName(h) + ' <span class="dim">· ' + GTD.t(GTD.RAR_NAMES[h.r]) + '</span></div>' +
            '<div class="cx-sub">' + GTD.t(GTD.ATTRS[h.attr].i18n) + ' · ' + GTD.t('atk') + ' ' + (h.atk ? GTD.U.fmt(h.atk) : '—') + ' / ' + GTD.t('heal') + ' ' + GTD.U.fmt(h.hp) + ' · ' + (h.air ? GTD.t('air') : GTD.t('ground')) + (h.aoe ? ' · AoE ' + h.aoe : '') + (h.heal ? ' · ' + GTD.t('heal') + ' ' + Math.round(h.heal * 100) + '%' : '') + (h.proj ? ' · ' + h.proj : '') + (h.companion ? ' · ' + (h.companion === 'falcon' ? '🦅' : '🐱') : '') + (h.skill ? ' · ★' : '') + '</div>' +
            '<div class="cx-desc">' + GTD.t('d_' + h.key) + '</div>' +
            '</div>' +
            (hs.unlocked ? '<div class="cx-state">✓ ' + GTD.t('level') + ' ' + hs.level + '</div>' : '<div class="cx-state dim">' + GTD.t('locked') + '</div>');
          body.appendChild(d);
        });
      } else if (tab === 'towers') {
        GTD.TOWERS.forEach(t => {
          const st = s.towers[t.key];
          const d = GTD.U.el('div', 'cx-row' + (st.owned ? '' : ' locked'));
          const cv = document.createElement('canvas');
          cv.width = 48; cv.height = 48;
          GTD.drawTowerIcon(cv.getContext('2d'), 24, 24, t.key, st.owned ? st.tier : t.tier);
          d.appendChild(cv);
          d.innerHTML +=
            '<div class="cx-info">' +
            '<div class="cx-name" style="color:' + GTD.RAR_COLORS[st.owned ? st.tier : t.tier] + '">' + GTD.towerName(t) + '</div>' +
            '<div class="cx-sub">' + GTD.t(GTD.ATTRS[t.attr].i18n) + ' · ' + (t.atk ? GTD.t('atk') + ' ' + t.atk + ' · ' : '') + GTD.t('range') + ' ' + t.range + ' · ' + (t.mode === 'heal' ? GTD.t('heal') + ' ' + Math.round(t.heal * 100) + '%' : t.mode === 'spawner' ? GTD.t('barracks') : t.mode === 'chain' ? '×' + t.chain : (t.airOnly ? GTD.t('air') + '!' : (t.air ? GTD.t('air') : GTD.t('ground')))) + '</div>' +
            '<div class="cx-desc">' + GTD.t('td_' + t.key) + '</div>' +
            '</div>' +
            (st.owned ? '<div class="cx-state">✓ ' + GTD.t(GTD.RAR_NAMES[st.tier]) + '</div>' : '<div class="cx-state dim">' + GTD.t('locked') + '</div>');
          body.appendChild(d);
        });
      } else {
        for (let ri = 0; ri < 10; ri++) {
          const pool = GTD.buildRegionPool(ri);
          const sec = GTD.U.el('div', 'cx-region');
          sec.innerHTML = '<div class="cx-region-name">' + GTD.t('region') + ' ' + (ri + 1) + ' — ' + GTD.REGION_NAMES[ri][s.language === 'en' ? 1 : 0] + '</div>';
          pool.forEach(m => {
            const d = GTD.U.el('div', 'cx-row');
            const tags = [];
            if (m.air) tags.push(GTD.t('air'));
            if (m.hc > 0) tags.push('HC ' + m.hc);
            if (m.fast) tags.push(GTD.t('fast'));
            if (m.ranged) tags.push(GTD.t('ranged'));
            if (m.regen > 0) tags.push(GTD.t('regen'));
            if (m.elite) tags.push(GTD.t('elite'));
            if (m.boss) tags.push('👑 ' + GTD.t('boss'));
            d.innerHTML =
              '<div class="cx-info">' +
              '<div class="cx-name">' + GTD.monsterName(m) + (m.boss ? ' 👑' : '') + '</div>' +
              '<div class="cx-sub">' + GTD.t(GTD.ATTRS[m.attr].i18n) + ' · ' + GTD.t('atk') + ' ' + GTD.U.fmt(m.baseAtk) + ' / ' + GTD.t('heal') + ' ' + GTD.U.fmt(m.baseHp) + '</div>' +
              '<div class="cx-tags">' + tags.map(t => '<span class="tag">' + t + '</span>').join('') + '</div>' +
              '</div>';
            sec.appendChild(d);
          });
          body.appendChild(sec);
        }
      }
    }
    render();
    sc.querySelector('#cBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  },

  /* ============================================================
     SETTINGS
     ============================================================ */
  settings: function (root) {
    const s = GTD_SAVE;
    root.innerHTML = '';
    const sc = GTD.U.el('div', 'scene set-sc');
    const head = GTD.U.el('div', 'sc-head');
    head.innerHTML = '<button class="btn backbtn" id="sBack">← ' + GTD.t('back') + '</button><div class="sc-title">' + GTD.t('settings') + '</div><span></span>';
    sc.appendChild(head);
    const body = GTD.U.el('div', 'set-body');
    sc.appendChild(body);
    root.appendChild(sc);

    function row(label, ctl) {
      const r = GTD.U.el('div', 'set-row');
      r.innerHTML = '<div class="set-lab">' + label + '</div>';
      r.appendChild(ctl);
      body.appendChild(r);
      return r;
    }
    function toggle(lab, get, set) {
      const b = GTD.U.el('button', 'toggle' + (get() ? ' on' : ''), get() ? GTD.t('resume') === 'Resume' ? 'ON' : 'BẬT' : 'OFF');
      b.innerHTML = get() ? 'ON' : 'OFF';
      b.addEventListener('click', function () {
        set(!get());
        GTD.Audio.sfx('click');
        b.className = 'toggle' + (get() ? ' on' : '');
        b.innerHTML = get() ? 'ON' : 'OFF';
      });
      row(lab, b);
    }
    function seg(lab, values, get, set) {
      const w = GTD.U.el('div', 'seg');
      values.forEach(v => {
        const b = GTD.U.el('button', 'seg-b' + (get() === v[0] ? ' sel' : ''), v[1]);
        b.addEventListener('click', function () {
          set(v[0]);
          GTD.Audio.sfx('click');
          renderSeg();
        });
        w.appendChild(b);
      });
      function renderSeg() {
        Array.prototype.forEach.call(w.children, function (c, i) { c.className = 'seg-b' + (get() === values[i][0] ? ' sel' : ''); });
      }
      row(lab, w);
    }

    toggle(GTD.t('s_bgm'), function () { return s.settings.bgm; }, function (v) { s.settings.bgm = v; GTD.Audio.setBgmOn(v); GTD.Save.storeSoon(); });
    toggle(GTD.t('s_sfx'), function () { return s.settings.sfx; }, function (v) { s.settings.sfx = v; GTD.Audio.setSfxOn(v); GTD.Save.storeSoon(); });
    /* volume */
    const vol = document.createElement('input');
    vol.type = 'range'; vol.min = 0; vol.max = 100;
    vol.value = Math.round(s.settings.volume * 100);
    vol.addEventListener('input', function () {
      s.settings.volume = vol.value / 100;
      GTD.Audio.setVolume(s.settings.volume);
      GTD.Save.storeSoon();
    });
    row(GTD.t('s_volume'), vol);
    seg(GTD.t('s_lang'), [['vn', 'Tiếng Việt'], ['en', 'English']], function () { return s.language; }, function (v) {
      s.language = v;
      GTD.Save.storeSoon();
      GTD.App.go('settings');
    });
    seg(GTD.t('s_quality'), [['high', GTD.t('q_high')], ['low', GTD.t('q_low')]], function () { return s.settings.quality; }, function (v) { s.settings.quality = v; GTD.Save.storeSoon(); });
    seg(GTD.t('s_gspeed'), [[1, '1x'], [2, '2x'], [3, '3x']], function () { return s.settings.speed; }, function (v) { s.settings.speed = v; GTD.Save.storeSoon(); });
    toggle(GTD.t('s_dmg'), function () { return s.settings.showDamage !== false; }, function (v) { s.settings.showDamage = v; GTD.Save.storeSoon(); });

    /* export / import / reset */
    const ex = GTD.U.el('button', 'btn', '📤 ' + GTD.t('s_export'));
    ex.addEventListener('click', function () {
      const txt = GTD.Save.exportText(s);
      const ta = GTD.UI.modal(GTD.t('s_export'), '<textarea class="imp-ta" readonly rows="6">' + txt.replace(/</g, '&lt;') + '</textarea>', [
        { label: GTD.t('close'), cls: 'btn' }
      ]);
      const ta2 = ta.querySelector('textarea');
      ta2.addEventListener('click', function () { ta2.select(); });
      try {
        navigator.clipboard.writeText(txt).then(function () { GTD.UI.toast(GTD.t('export_ok')); }, function () { });
      } catch (e) { }
      const dl = document.createElement('a');
      dl.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(txt);
      dl.download = 'gtm_save.json';
      dl.click();
    });
    const exWrap = GTD.U.el('div', 'set-row');
    exWrap.innerHTML = '<div class="set-lab">' + GTD.t('s_export') + '</div>';
    exWrap.appendChild(ex);
    body.appendChild(exWrap);

    const impWrap = GTD.U.el('div', 'set-row');
    impWrap.innerHTML = '<div class="set-lab">' + GTD.t('s_import') + '</div>';
    const ta = document.createElement('textarea');
    ta.className = 'imp-ta'; ta.rows = 4; ta.placeholder = GTD.t('import_q');
    impWrap.appendChild(ta);
    body.appendChild(impWrap);
    const imp = GTD.U.el('button', 'btn', '📥 ' + GTD.t('s_import'));
    imp.addEventListener('click', function () {
      const m = GTD.Save.importText(ta.value);
      if (m) {
        GTD_SAVE = m;
        GTD.Save.storeSoon();
        GTD.Audio.setVolume(m.settings.volume);
        GTD.Audio.setBgmOn(m.settings.bgm);
        GTD.Audio.setSfxOn(m.settings.sfx);
        GTD.UI.toast(GTD.t('import_ok'));
        GTD.App.go('lobby');
      } else GTD.UI.toast(GTD.t('import_fail'));
    });
    const impBtnWrap = GTD.U.el('div', 'set-row set-row2');
    impBtnWrap.appendChild(imp);
    body.appendChild(impBtnWrap);

    const rst = GTD.U.el('button', 'btn red', '🗑️ ' + GTD.t('s_reset'));
    rst.addEventListener('click', function () {
      GTD.UI.confirm(GTD.t('s_reset'), GTD.t('reset_q'), async function () {
        await GTD.Save.wipe();
        GTD_SAVE = GTD.Save.def();
        GTD.Save.applyResets(GTD_SAVE);
        GTD.Save.storeSoon();
        GTD.Audio.setVolume(GTD_SAVE.settings.volume);
        GTD.App.go('lobby');
      }, 'btn red');
    });
    const rstWrap = GTD.U.el('div', 'set-row set-row2');
    rstWrap.appendChild(rst);
    body.appendChild(rstWrap);

    sc.querySelector('#sBack').addEventListener('click', function () { GTD.Audio.sfx('click'); GTD.App.go('lobby'); });
  }
};
