/* ============================================================
   GOLD TOWER DEFENCE M — APP / SCENE MANAGER / BOOT
   ============================================================ */
'use strict';
window.GTD = window.GTD || {};
window.GTD_SAVE = null;

GTD.App = {
  scene: null,
  battle: null,
  root: null,

  init: async function () {
    this.root = document.getElementById('scene-root');
    /* first user gesture unlocks audio */
    const unlock = () => {
      GTD.Audio.init();
      GTD.Audio.setBgmOn(GTD_SAVE ? GTD_SAVE.settings.bgm : true);
      GTD.Audio.setSfxOn(GTD_SAVE ? GTD_SAVE.settings.sfx : true);
      GTD.Audio.setVolume(GTD_SAVE ? GTD_SAVE.settings.volume : 0.8);
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => GTD.Audio.onVisibility());

    /* load save (IndexedDB -> localStorage -> default) */
    let save = null;
    try { save = await GTD.Save.load(); } catch (e) { save = GTD.Save.def(); }
    GTD_SAVE = save;
    GTD.Audio.setVolume(save.settings.volume);

    /* hide boot screen */
    const boot = document.getElementById('boot-screen');
    if (boot) {
      boot.classList.add('fade');
      setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 500);
    }

    GTD.Save.storeSoon();

    /* first launch -> LANGUAGE scene; returning player -> restore language & lobby */
    this.go(GTD.Save._fresh ? 'language' : 'lobby');

    /* periodic: playtime + daily reset checks */
    setInterval(() => {
      if (!GTD_SAVE) return;
      GTD_SAVE.stats.totalPlayTime++;
      GTD.Save.applyResets(GTD_SAVE);
      GTD.Save.storeSoon();
    }, 1000);
  },

  /* switch scenes in the same page (no reloads) */
  go: function (name) {
    if (this.battle) {
      try { this.battle.destroy(); } catch (e) { }
      this.battle = null;
    }
    if (this.scene && this.scene !== 'battle' && name !== 'battle') {
      const oldEl = this.root.querySelector('.scene-anim');
    }
    this.scene = name;
    this.root.classList.remove('scene-in');
    void this.root.offsetWidth;
    this.root.classList.add('scene-in');
    if (name === 'battle') return; /* startBattle fills root */
    GTD.UI[name](this.root);
  },

  /* start a battle; handles entry costs on retry */
  startBattle: function (cfg) {
    const self = this;
    const s = GTD_SAVE;
    const run = function (finalCfg) {
      self.go('battle');
      finalCfg.onRetry = function () { self.startBattle(finalCfg); };
      finalCfg.onQuit = function () { self.go('stageSelect'); };
      if (finalCfg.mode === 'stage' && finalCfg.stage < 200) {
        finalCfg.onNext = function () {
          const next = Math.min(200, finalCfg.stage + 1);
          s.currentStage = next;
          GTD.Save.storeSoon();
          self.startBattle({ mode: 'stage', stage: next });
        };
      }
      self.battle = new GTD.Battle(finalCfg, self.root);
    };

    if (cfg.mode === 'stage') {
      run(cfg);
      return;
    }
    if (cfg.mode === 'top') {
      /* entry fee 50,000 Gold — charged for every attempt, retries included */
      if (s.currencies.gold < GTD.TOP.entry) {
        GTD.UI.toast(GTD.t('not_enough'));
        this.go('top');
        return;
      }
      GTD.pay({ gold: GTD.TOP.entry });
      run(cfg);
      return;
    }
    if (cfg.mode === 'daily') {
      /* tickets — charged for every attempt, retries included */
      const d = GTD.DC.difficulties[cfg.diff];
      if (s.dailyChallenge.tickets < d.tickets) {
        GTD.UI.toast(GTD.t('dc_no_ticket'));
        this.go('daily');
        return;
      }
      s.dailyChallenge.tickets -= d.tickets;
      GTD.Save.storeSoon();
      run(cfg);
      return;
    }
    run(cfg);
  }
};

/* language scene */
GTD.UI.language = function (root) {
  root.innerHTML = '';
  const sc = GTD.U.el('div', 'scene lang-sc');
  sc.innerHTML =
    '<div class="lang-title">GOLD TOWER<br><span>DEFENCE M</span></div>' +
    '<div class="lang-sub">SELECT LANGUAGE — CHỌN NGÔN NGỮ</div>' +
    '<button class="btn gold giant lang-btn" id="langVn">Tiếng Việt</button>' +
    '<button class="btn giant lang-btn" id="langEn">English</button>';
  root.appendChild(sc);
  sc.querySelector('#langVn').addEventListener('click', function () {
    GTD.Audio.sfx('click');
    GTD_SAVE.language = 'vn';
    GTD.Save.storeSoon();
    GTD.App.go('lobby');
  });
  sc.querySelector('#langEn').addEventListener('click', function () {
    GTD.Audio.sfx('click');
    GTD_SAVE.language = 'en';
    GTD.Save.storeSoon();
    GTD.App.go('lobby');
  });
};

/* boot */
window.addEventListener('DOMContentLoaded', function () {
  GTD.App.init();
});
