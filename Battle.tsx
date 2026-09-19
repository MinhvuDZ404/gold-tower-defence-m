import { useEffect, useRef, useState, useCallback } from "react";
import { W, H, ATTR_INFO, GRADES, towerCost, ITEM_DEFS, ENEMY_DEFS, stageInfo, meteorDamage, ItemId } from "../game/data";
import { Battle, BattleConfig, HudSnapshot, BattleResult } from "../game/engine";

interface Props { cfg: BattleConfig; onExit: () => void; onFinish: (r: BattleResult) => void; onRetry: () => void; onNext: () => void; rewardPreview: (r: BattleResult) => { gold: number; firstClear: boolean; exp: number }; canNext: boolean }

export default function BattleScreen({ cfg, onExit, onFinish, onRetry, onNext, rewardPreview, canNext }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const battleRef = useRef<Battle | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [scale, setScale] = useState(1);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const finishedRef = useRef(false);
  const rewardRef = useRef<{ gold: number; firstClear: boolean; exp: number } | null>(null);
  const { region } = stageInfo(cfg.stage);

  useEffect(() => {
    const b = new Battle(cfg); battleRef.current = b;
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0; let last = performance.now(); let acc = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = (now - last) / 1000; last = now;
      b.update(dt); b.render(ctx);
      acc += dt; if (acc > 0.1) { acc = 0; const s = b.hud(); setHud(s); if (s.over && !finishedRef.current) { finishedRef.current = true; rewardRef.current = rewardPreview(s.over); onFinish(s.over); } }
    };
    raf = requestAnimationFrame(loop);
    const onResize = () => { if (wrapRef.current) setScale(wrapRef.current.clientWidth / W); };
    onResize(); window.addEventListener("resize", onResize);
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase(); if (tag === "input" || tag === "textarea") return;
      if (e.key === "1") b.setItemMode("reinforce");
      else if (e.key === "2") b.setItemMode("meteor");
      else if (e.key === "3") b.setHeroMove();
      else if (e.key === "4") b.setItemMode("bomb");
      else if (e.key === "7") b.useInstant("heart");
      else if (e.key === "8") b.useInstant("mineral");
      else if (e.key === "0") b.callWave();
      else if (e.code === "Space") { e.preventDefault(); b.togglePause(); }
      else if (e.key === "f" || e.key === "F") b.toggleSpeed();
      else if (e.key === "Escape") b.cancel();
      else if (e.key >= "q" && "qwerty".includes(e.key)) { const i = "qwerty".indexOf(e.key); if (i < cfg.deck.length) b.selectCard(i); }
    };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toLogical = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }, []);
  const b = battleRef.current;
  const deck = cfg.deck;
  const heroAlive = hud?.hero?.alive;
  const mode = hud?.mode ?? { kind: "none" as const };
  const selT = hud?.selectedTower ?? null; const selP = hud?.selectedPlot ?? null;
  const panelPos = (x: number, y: number) => ({ left: Math.min(Math.max(x * scale - 130, 4), W * scale - 264), top: Math.min(Math.max(y * scale - 200, 4), H * scale - 190) });

  return (
    <div className="flex min-h-screen flex-col bg-[#07070e] text-[#f5f1e6]">
      {/* ===== TOP BAR ===== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-400/15 bg-[#0e0e18] px-3 py-2">
        <button onClick={() => setConfirmExit(true)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10">◀ Sảnh</button>
        <div className="leading-tight"><p className="font-display text-sm font-black tracking-wider text-amber-300">MÀN {cfg.stage} · {region.name}</p><p className="text-[10px] text-white/40">{region.ko}</p></div>
        <div className="ml-2 flex items-center gap-1.5 rounded-lg bg-cyan-400/10 px-3 py-1.5 text-sm font-black text-cyan-300">💎 {hud?.minerals ?? 0}<span className="text-[10px] font-normal text-cyan-200/60">khoáng</span></div>
        <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-black ${(hud?.hearts ?? 10) <= 3 ? "animate-pulse bg-red-500/20 text-red-300" : "bg-red-500/10 text-red-300"}`}>❤️ {hud?.hearts ?? 10}</div>
        <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 px-3 py-1.5 text-sm font-black text-violet-300">
          ⚔️ Wave {hud?.wave ?? 0}/{hud?.totalWaves ?? 0}
          {hud && hud.wave < hud.totalWaves && (
            <button onClick={() => b?.callWave()} disabled={hud.wave > 0 && hud.enemiesLeft > 0 && hud.prepTimer > 21.9} className="rounded-md bg-amber-400 px-2 py-0.5 text-[11px] font-black text-black hover:bg-amber-300 disabled:opacity-40">
              {hud.wave === 0 ? `▶ BẮT ĐẦU (${Math.ceil(hud.prepTimer)}s)` : `⏩ Gọi sớm ${Math.ceil(hud.prepTimer)}s · +${Math.floor(hud.prepTimer * 2.5)}💎`}
            </button>
          )}
        </div>
        {hud && hud.nextWave.length > 0 && (
          <div className="hidden items-center gap-1 text-[11px] text-white/50 lg:flex">Tiếp:
            {hud.nextWave.map((n) => { const d = ENEMY_DEFS[n.type]; return <span key={n.type} className={`rounded-full border px-1.5 py-0.5 font-bold ${d.boss ? "border-red-400/60 text-red-300" : "border-white/10 text-white/70"}`}>{d.air ? "🕊" : d.armor ? "🛡" : ""}{d.name} ×{n.count}</span>; })}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="hidden text-[11px] text-white/40 md:inline">💀 {hud?.kills ?? 0}</span>
          <button onClick={() => setShowHelp(true)} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-amber-200/80 hover:bg-white/10">? Hướng dẫn</button>
          <button onClick={() => b?.toggleSpeed()} className={`rounded-lg border px-2.5 py-1.5 text-xs font-black ${hud?.speed === 2 ? "border-amber-300 bg-amber-400/20 text-amber-200" : "border-white/10 bg-white/5 text-white/70"}`}>⏩ {hud?.speed ?? 1}x <kbd className="ml-1 text-[9px] opacity-50">F</kbd></button>
          <button onClick={() => b?.togglePause()} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-black text-white/80 hover:bg-white/10">{hud?.paused ? "▶ Tiếp" : "⏸ Dừng"}<kbd className="ml-1 text-[9px] opacity-50">Space</kbd></button>
        </div>
      </div>

      {/* ===== CANVAS ===== */}
      <div className="relative mx-auto w-full max-w-[1280px] flex-1 bg-black" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", aspectRatio: `${W}/${H}`, cursor: mode.kind === "none" ? "default" : "crosshair" }}
          className="block"
          onMouseMove={(e) => { const p = toLogical(e); b?.moveTo(p.x, p.y); }}
          onMouseLeave={() => b?.leave()}
          onClick={(e) => { const p = toLogical(e); b?.click(p.x, p.y); }}
          onContextMenu={(e) => { e.preventDefault(); b?.cancel(); }}
        />
        {/* Bảng chọn tháp cho ô trống */}
        {selP && !selT && mode.kind !== "build" && hud && !hud.over && (
          <div className="absolute z-20 w-[260px] rounded-xl border border-amber-400/40 bg-[#0e0e18]/95 p-2 shadow-2xl backdrop-blur" style={panelPos(selP.x, selP.y)}>
            <p className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">Chọn tháp để xây <button onClick={() => b?.cancel()} className="text-white/40 hover:text-white">✕</button></p>
            <div className="grid grid-cols-2 gap-1.5">
              {deck.map((c, i) => { const cost = towerCost(c.def, c.grade); const ok = (hud.minerals ?? 0) >= cost; return (
                <button key={c.key} onClick={() => b?.build(selP.idx, i)} disabled={!ok} className={`flex items-center gap-1.5 rounded-lg border p-1.5 text-left ${ok ? "border-white/10 bg-white/5 hover:border-amber-400/60 hover:bg-amber-400/10" : "border-white/5 bg-white/[0.02] opacity-50"}`}>
                  <span className="text-lg">{c.def.icon}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-white">{c.def.name.replace("Tháp ", "")}</span><span className="block text-[10px]" style={{ color: GRADES[c.grade].color }}>{GRADES[c.grade].name} {ATTR_INFO[c.attr].icon}</span></span>
                  <span className={`text-[11px] font-black ${ok ? "text-cyan-300" : "text-red-400"}`}>{cost}</span>
                </button>); })}
            </div>
          </div>
        )}
        {/* Bảng tháp đã xây */}
        {selT && hud && !hud.over && (
          <div className="absolute z-20 w-[260px] rounded-xl border border-amber-400/40 bg-[#0e0e18]/95 p-3 shadow-2xl backdrop-blur" style={panelPos(selT.x, selT.y)}>
            <div className="flex items-start justify-between">
              <div><p className="text-sm font-black text-white">{selT.icon} {selT.name} <span className="text-amber-300">Lv.{selT.level}</span></p><p className="text-[10px]" style={{ color: GRADES[selT.grade].color }}>{GRADES[selT.grade].name} · {ATTR_INFO[selT.attr].icon} {ATTR_INFO[selT.attr].name}</p></div>
              <button onClick={() => b?.cancel()} className="text-white/40 hover:text-white">✕</button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px]">
              <div className="rounded bg-white/5 p-1"><p className="text-sm font-black text-white">{selT.dmg}</p><p className="text-white/40">Sát thương</p></div>
              <div className="rounded bg-white/5 p-1"><p className="text-sm font-black text-white">{selT.range}</p><p className="text-white/40">Tầm</p></div>
              <div className="rounded bg-white/5 p-1"><p className="text-sm font-black text-white">{selT.rate}/s</p><p className="text-white/40">Tốc độ</p></div>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-white/45">{deck.find((c) => c.def.name === selT.name)?.def.gradeNotes[selT.grade]}</p>
            <div className="mt-2 flex gap-1.5">
              {selT.maxed ? <span className="flex-1 rounded-lg bg-amber-400/15 py-2 text-center text-xs font-black text-amber-300">MAX Lv.5</span>
                : <button onClick={() => b?.levelUp(selT.id)} disabled={(hud.minerals ?? 0) < selT.upCost} className="btn-gold flex-1 rounded-lg py-2 text-xs font-black disabled:opacity-40">▲ Nâng cấp {selT.upCost}💎</button>}
              <button onClick={() => b?.sell(selT.id)} className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-500/20">Bán +{selT.sellValue}</button>
            </div>
          </div>
        )}
        {hud?.paused && !hud.over && <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50"><p className="font-display text-4xl font-black tracking-widest text-amber-200">TẠM DỪNG</p></div>}
        {hud?.wave === 0 && !hud.over && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center"><p className="rounded-full bg-black/70 px-4 py-1.5 text-xs font-bold text-amber-200">Giai đoạn chuẩn bị: click <b>ô cắm cờ</b> để xây tháp · quái tới sau {Math.ceil(hud.prepTimer)}s hoặc bấm BẮT ĐẦU</p></div>
        )}

        {/* ===== KẾT QUẢ ===== */}
        {hud?.over && (() => { const r = hud.over; const rw = rewardRef.current ?? rewardPreview(r); return (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="gold-card w-full max-w-md rounded-2xl p-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/40">Màn {cfg.stage} · {region.name}</p>
              <h2 className={`mt-1 font-display text-3xl font-black ${r.won ? "text-shimmer-gold" : "text-red-400"}`}>{r.won ? "BẢO VỆ THÀNH CÔNG!" : "VÀNG BỊ CƯỚP!"}</h2>
              <div className="mt-3 flex justify-center gap-2 text-4xl">{[1, 2, 3].map((i) => <span key={i} className={i <= r.stars ? "drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]" : "opacity-20 grayscale"}>⭐</span>)}</div>
              <p className="mt-1 text-xs text-white/50">{r.won ? r.stars === 3 ? "Hoàn hảo! Không mất tim nào." : `Mất ${r.heartsLost} tim — giữ ≤3 tim mất để đạt 2 sao, 0 để 3 sao.` : `Trụ được ${r.wavesCleared}/${r.totalWaves} wave. Thử đổi đội hình theo thuộc tính quái!`}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/5 p-2"><p className="text-lg font-black text-amber-300">+{rw.gold}</p><p className="text-[10px] text-white/50">Vàng {rw.firstClear && "(lần đầu ×2)"}</p></div>
                <div className="rounded-lg bg-white/5 p-2"><p className="text-lg font-black text-emerald-300">{r.stats.kills}</p><p className="text-[10px] text-white/50">Quái hạ</p></div>
                <div className="rounded-lg bg-white/5 p-2"><p className="text-lg font-black text-violet-300">+{rw.exp}</p><p className="text-[10px] text-white/50">EXP anh hùng</p></div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={onExit} className="btn-ghost-gold flex-1 rounded-xl py-2.5 text-sm font-bold text-amber-100">Về sảnh</button>
                <button onClick={onRetry} className="btn-ghost-gold flex-1 rounded-xl py-2.5 text-sm font-bold text-amber-100">Chơi lại</button>
                {r.won && canNext && <button onClick={onNext} className="btn-gold flex-1 rounded-xl py-2.5 text-sm font-black">Màn tiếp ▶</button>}
              </div>
            </div>
          </div>); })()}
      </div>

      {/* ===== BOTTOM BAR ===== */}
      <div className="border-t border-amber-400/15 bg-[#0e0e18] px-3 py-2">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-stretch gap-3">
          {/* Deck */}
          <div className="flex-1">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-400/70">Tháp mang theo (Q W E R T Y) — chọn rồi click ô cắm cờ</p>
            <div className="flex flex-wrap gap-1.5">
              {deck.map((c, i) => { const cost = towerCost(c.def, c.grade); const ok = (hud?.minerals ?? 0) >= cost; const active = mode.kind === "build" && mode.card === i; return (
                <button key={c.key} onClick={() => b?.selectCard(i)} className={`relative flex w-[118px] items-center gap-1.5 rounded-lg border p-1.5 text-left transition ${active ? "border-amber-300 bg-amber-400/20 shadow-[0_0_16px_rgba(251,191,36,0.4)]" : ok ? "border-white/10 bg-white/5 hover:border-amber-400/50" : "border-white/5 bg-white/[0.02] opacity-50"}`} style={{ borderBottomColor: GRADES[c.grade].color, borderBottomWidth: 3 }}>
                  <span className="text-xl">{c.def.icon}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-white">{c.def.name.replace("Tháp ", "")}</span><span className="block text-[10px] text-white/50">{ATTR_INFO[c.attr].icon} <span style={{ color: GRADES[c.grade].color }}>{GRADES[c.grade].name}</span></span><span className={`block text-[11px] font-black ${ok ? "text-cyan-300" : "text-red-400"}`}>💎 {cost}</span></span>
                  <kbd className="absolute right-1 top-1 rounded bg-black/50 px-1 text-[9px] text-white/50">{"QWERTY"[i]}</kbd>
                  {c.def.target !== "both" && <span className="absolute bottom-1 right-1 text-[9px] text-white/40">{c.def.target === "air" ? "chỉ bay" : "chỉ bộ"}</span>}
                </button>); })}
            </div>
          </div>
          {/* Items */}
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-400/70">Vật phẩm (phím số)</p>
            <div className="flex gap-1.5">
              <ItemBtn label="Viện binh" icon="🛡️" k="1" active={mode.kind === "item" && mode.item === "reinforce"} sub={hud && hud.reinforceCd > 0 ? `${Math.ceil(hud.reinforceCd)}s` : "sẵn sàng"} disabled={!!hud && hud.reinforceCd > 0} onClick={() => b?.setItemMode("reinforce")} />
              <ItemBtn label={ITEM_DEFS.meteor.name} icon="☄️" k="2" active={mode.kind === "item" && mode.item === "meteor"} sub={`×${hud?.items.meteor ?? 0} · ${meteorDamage(cfg.meteorLevel)}dmg`} disabled={(hud?.items.meteor ?? 0) <= 0} onClick={() => b?.setItemMode("meteor")} />
              <ItemBtn label="Hero đi" icon={hud?.hero?.icon ?? "🦸"} k="3" active={mode.kind === "heromove"} sub={hud?.hero ? heroAlive ? `${hud.hero.hp}/${hud.hero.maxHp}` : `hồi ${Math.ceil(hud.hero.respawn)}s` : "không có"} disabled={!hud?.hero || !heroAlive} onClick={() => b?.setHeroMove()} hpPct={hud?.hero ? hud.hero.hp / hud.hero.maxHp : 0} />
              <ItemBtn label={ITEM_DEFS.bomb.name} icon="💣" k="4" active={mode.kind === "item" && mode.item === "bomb"} sub={`×${hud?.items.bomb ?? 0}`} disabled={(hud?.items.bomb ?? 0) <= 0} onClick={() => b?.setItemMode("bomb")} />
              <ItemBtn label="Bó tim" icon="💖" k="7" active={false} sub={`×${hud?.items.heart ?? 0}`} disabled={(hud?.items.heart ?? 0) <= 0} onClick={() => b?.useInstant("heart")} />
              <ItemBtn label="Túi khoáng" icon="💎" k="8" active={false} sub={`×${hud?.items.mineral ?? 0}`} disabled={(hud?.items.mineral ?? 0) <= 0} onClick={() => b?.useInstant("mineral")} />
            </div>
          </div>
        </div>
      </div>

      {/* ===== HELP ===== */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div className="gold-card max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl font-black text-amber-300">CÁCH CHƠI GOLD TOWER DEFENCE</h3>
            <div className="mt-3 grid gap-3 text-sm leading-relaxed text-white/75 md:grid-cols-2">
              <div><b className="text-amber-300">🚩 Ô cắm cờ:</b> tháp chỉ xây được ở ô cố định dọc đường. Click ô → chọn tháp. Click tháp để nâng cấp (tối đa Lv.5) hoặc bán (70%).</div>
              <div><b className="text-amber-300">✊✌️✋ Kéo-Búa-Bao:</b> Búa &gt; Kéo &gt; Bao &gt; Búa. Tháp khắc quái = <b className="text-yellow-300">+40%</b> sát thương, bị khắc = <b className="text-gray-400">−40%</b>. Nhìn icon trên đầu quái để đặt tháp đúng!</div>
              <div><b className="text-amber-300">🕊 Quái bay / 🛡 Quái giáp:</b> Tháp Gai, Doanh Trại, Sát Thủ không đánh được bay; Tháp Sấm Sét chỉ đánh bay. Quái giáp trừ <b>1 đòn</b> mỗi phát bất kể sát thương → dùng tháp bắn nhanh (Phi Tiêu, Gai).</div>
              <div><b className="text-amber-300">🛡️ Lính chặn đường:</b> Doanh Trại / Sát Thủ / Viện binh đứng trên đường giữ chân quái bộ binh cho tháp bắn. Quái có sát thương sẽ đánh lại lính.</div>
              <div><b className="text-amber-300">🦸 Anh hùng:</b> phím 3 (hoặc click hero) rồi click nơi cần đến. Hero cận chiến chặn quái, hero bắn xa đứng sau. Gục thì hồi sinh sau 15s.</div>
              <div><b className="text-amber-300">☄️ Item:</b> 1 Viện binh (hồi 25s) · 2 Thiên thạch · 4 Bom + choáng · 7 +5 tim · 8 +250 khoáng · 0 gọi wave sớm (thưởng khoáng) · Space dừng · F 2x.</div>
              <div><b className="text-amber-300">⭐ Sao:</b> 3 sao = không mất tim, 2 sao = mất ≤3, 1 sao = thắng. Boss lọt thành = thua ngay!</div>
              <div><b className="text-amber-300">💎 Khoáng:</b> giết quái nhận khoáng, gọi wave sớm được thưởng. Khoáng chỉ dùng trong trận; Vàng (sảnh) dùng để Rút Tháp.</div>
            </div>
            <button onClick={() => setShowHelp(false)} className="btn-gold mt-4 w-full rounded-xl py-2.5 font-bold">Đã hiểu</button>
          </div>
        </div>
      )}
      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="gold-card w-full max-w-sm rounded-2xl p-5 text-center">
            <p className="font-bold text-white">Rời trận? Tiến trình màn này sẽ mất.</p>
            <div className="mt-4 flex gap-2"><button onClick={() => setConfirmExit(false)} className="btn-ghost-gold flex-1 rounded-xl py-2 text-sm font-bold text-amber-100">Ở lại</button><button onClick={onExit} className="flex-1 rounded-xl bg-red-500/80 py-2 text-sm font-bold text-white">Rời trận</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemBtn({ label, icon, k, sub, active, disabled, onClick, hpPct }: { label: string; icon: string; k: string; sub: string; active: boolean; disabled: boolean; onClick: () => void; hpPct?: number }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`relative w-[74px] rounded-lg border p-1.5 text-center transition ${active ? "border-amber-300 bg-amber-400/20 shadow-[0_0_14px_rgba(251,191,36,0.4)]" : disabled ? "border-white/5 bg-white/[0.02] opacity-45" : "border-white/10 bg-white/5 hover:border-amber-400/50"}`}>
      <kbd className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-black text-amber-300">{k}</kbd>
      <span className="block text-xl">{icon}</span>
      <span className="block truncate text-[10px] font-bold text-white">{label}</span>
      <span className="block truncate text-[9px] text-white/50">{sub}</span>
      {hpPct !== undefined && <span className="mt-0.5 block h-1 w-full overflow-hidden rounded bg-black/50"><span className="block h-full bg-amber-400" style={{ width: `${Math.max(0, Math.min(100, hpPct * 100))}%` }} /></span>}
    </button>
  );
}

export type { ItemId };
