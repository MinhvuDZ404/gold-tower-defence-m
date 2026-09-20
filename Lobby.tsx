import { useMemo, useState } from "react";
import {
  ATTRS, ATTR_INFO, GRADES, GRADE_ODDS, DRAW_COST, DRAW10_COST, TOWER_LIST, TOWER_DEFS, parseKey, towerCost, REGIONS, TOTAL_STAGES, stageInfo,
  ENEMY_DEFS, waveCount, HEROES, heroLevel, ITEM_DEFS, ItemId, METEOR_UPGRADE_BASE, meteorDamage, MISSIONS, MAX_TOWER_META_LEVEL,
} from "../game/data";
import { Profile, unlockedStage, totalStars, hasSetBonus, drawTower, DrawResult, missionProgress, claimableCount, resetProfile, defaultProfile } from "../game/save";

type Tab = "campaign" | "draw" | "towers" | "heroes" | "shop" | "missions";
interface Props { profile: Profile; update: (fn: (p: Profile) => void) => void; onPlay: (stage: number) => void }

export default function Lobby({ profile: p, update, onPlay }: Props) {
  const [tab, setTab] = useState<Tab>("campaign");
  const [stage, setStage] = useState(unlockedStage(p));
  const [draws, setDraws] = useState<DrawResult[] | null>(null);
  const [revealed, setRevealed] = useState(0);
  const unlocked = unlockedStage(p);
  const stars = totalStars(p);
  const claimable = claimableCount(p);

  const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = [
    { id: "campaign", label: "Chiến Dịch", icon: "🗺️" },
    { id: "draw", label: "Rút Tháp", icon: "🎴" },
    { id: "towers", label: "Đội Hình", icon: "🏰" },
    { id: "heroes", label: "Anh Hùng", icon: "🦸" },
    { id: "shop", label: "Cửa Hàng", icon: "🛒" },
    { id: "missions", label: "Nhiệm Vụ", icon: "📜", badge: claimable },
  ];

  const doDraw = (n: 1 | 10) => {
    const cost = n === 1 ? DRAW_COST : DRAW10_COST; if (p.gold < cost) return;
    const clone: Profile = JSON.parse(JSON.stringify(p));
    clone.gold -= cost;
    const results: DrawResult[] = [];
    for (let i = 0; i < n; i++) results.push(drawTower(clone, n === 10 && i === 9 ? 2 : 0));
    update((pp) => { pp.gold = clone.gold; pp.towers = clone.towers; pp.stats.draws = clone.stats.draws; });
    setDraws(results); setRevealed(0);
    results.forEach((_, i) => setTimeout(() => setRevealed(i + 1), 250 + i * 220));
  };

  return (
    <div className="relative min-h-screen bg-[#07070e] text-[#f5f1e6]">
      <div className="absolute inset-0"><img src="/images/hero-fortress.jpg" alt="" className="h-full w-full object-cover opacity-30" /><div className="absolute inset-0 bg-gradient-to-b from-[#07070e]/60 via-[#07070e]/85 to-[#07070e]" /></div>
      <div className="relative mx-auto max-w-7xl px-3 py-3 sm:px-5">
        {/* HEADER */}
        <header className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/20 bg-[#0e0e18]/85 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-2xl shadow-[0_0_25px_rgba(245,158,11,0.45)]">👑</span>
            <div className="leading-tight"><p className="font-display text-base font-black tracking-widest text-amber-300">GOLD TOWER DEFENCE</p><p className="text-[10px] uppercase tracking-[0.25em] text-white/45">골드타워디펜스 · Bảo vệ kho vàng El Dorado</p></div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-amber-400/10 px-3 py-1.5 text-sm font-black text-amber-300">🪙 {p.gold.toLocaleString()} <span className="text-[10px] font-normal text-amber-200/60">vàng</span></span>
            <span className="rounded-lg bg-yellow-400/10 px-3 py-1.5 text-sm font-black text-yellow-200">⭐ {stars}/{TOTAL_STAGES * 3}</span>
            <span className="rounded-lg bg-violet-400/10 px-3 py-1.5 text-sm font-black text-violet-300">🏰 {Object.keys(p.towers).length} tháp</span>
            <button onClick={() => update((pp) => { pp.sound = !pp.sound; })} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm">{p.sound ? "🔊" : "🔇"}</button>
            <button onClick={() => { if (confirm("Xóa toàn bộ tiến trình và chơi lại từ đầu?")) { resetProfile(); update((pp) => Object.assign(pp, defaultProfile())); } }} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/50 hover:text-red-300">Reset</button>
          </div>
        </header>

        {/* TABS */}
        <nav className="mt-3 flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold transition ${tab === t.id ? "btn-gold" : "border border-white/10 bg-[#0e0e18]/80 text-white/70 hover:bg-white/10"}`}>
              <span>{t.icon}</span>{t.label}
              {!!t.badge && <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">{t.badge}</span>}
            </button>
          ))}
        </nav>

        <main className="mt-3">
          {/* ================= CHIẾN DỊCH ================= */}
          {tab === "campaign" && (
            <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
              <div className="space-y-3">
                {REGIONS.map((r) => (
                  <div key={r.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e18]/85">
                    <div className="relative h-24">
                      <img src={r.bg} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-[#0e0e18] via-[#0e0e18]/70 to-transparent" />
                      <div className="absolute inset-0 flex items-center px-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400/80">Vùng {r.id + 1} · {r.ko}</p><p className="font-display text-xl font-black text-white">{r.name}</p><p className="text-[11px] text-white/60">Boss: <b className="text-red-300">{ENEMY_DEFS[r.boss].name}</b> · Quái: {r.roster.map((e) => ENEMY_DEFS[e].name).join(", ")}</p></div></div>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3">
                      {[1, 2, 3, 4, 5].map((i) => { const s = r.id * 5 + i; const locked = s > unlocked; const st = p.stageStars[s] ?? 0; const isBoss = i === 5; return (
                        <button key={s} disabled={locked} onClick={() => setStage(s)} className={`relative flex h-16 w-[72px] flex-col items-center justify-center rounded-xl border text-sm font-black transition ${locked ? "border-white/5 bg-white/[0.02] text-white/25" : stage === s ? "border-amber-300 bg-amber-400/20 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.4)]" : "border-white/10 bg-white/5 text-white hover:border-amber-400/50"}`}>
                          <span>{locked ? "🔒" : isBoss ? "👑" : ""} {s}</span>
                          <span className="mt-0.5 text-[10px] tracking-tighter">{[1, 2, 3].map((k) => <span key={k} className={k <= st ? "" : "opacity-20 grayscale"}>⭐</span>)}</span>
                          {isBoss && !locked && <span className="absolute -top-1.5 rounded-full bg-red-500 px-1.5 text-[8px] text-white">BOSS</span>}
                        </button>); })}
                    </div>
                  </div>
                ))}
              </div>
              <StagePanel stage={stage} p={p} onPlay={onPlay} />
            </div>
          )}

          {/* ================= RÚT THÁP ================= */}
          {tab === "draw" && (
            <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
              <div className="rounded-2xl border border-amber-400/20 bg-[#0e0e18]/85 p-5">
                <h2 className="font-display text-xl font-black text-amber-300">🎴 RÚT THÁP (타워 뽑기)</h2>
                <p className="mt-1 text-sm text-white/60">Rút ngẫu nhiên 1 loại tháp × 1 thuộc tính × cấp độ. Trùng tháp cấp thấp hơn → <b className="text-white">+1 cấp sao (+5% sát thương)</b>. Cấp cao hơn → thay cấp. Rút 10 lần <b className="text-blue-300">chắc chắn ≥1 Hiếm</b>.</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">{GRADES.map((g, i) => <span key={g.name} className="rounded-full border px-2.5 py-1 font-bold" style={{ borderColor: g.color + "66", color: g.color }}>{g.name} ({g.ko}) ×{g.mult} · {(GRADE_ODDS[i] * 100).toFixed(0)}%</span>)}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => doDraw(1)} disabled={p.gold < DRAW_COST} className="btn-gold rounded-xl px-6 py-3 font-black disabled:opacity-40">Rút 1 · 🪙 {DRAW_COST}</button>
                  <button onClick={() => doDraw(10)} disabled={p.gold < DRAW10_COST} className="btn-gold rounded-xl px-6 py-3 font-black disabled:opacity-40">Rút 10 · 🪙 {DRAW10_COST} <span className="text-[10px] font-bold opacity-70">(tiết kiệm 400)</span></button>
                  {p.gold < DRAW_COST && <span className="self-center text-xs text-red-300">Thiếu vàng — thắng màn / làm nhiệm vụ để kiếm thêm.</span>}
                </div>
                <div className="mt-5 min-h-[180px] rounded-xl border border-dashed border-white/10 bg-black/30 p-3">
                  {!draws && <p className="py-14 text-center text-sm text-white/30">Kết quả rút sẽ hiện ở đây</p>}
                  {draws && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {draws.map((d, i) => { const def = TOWER_DEFS[d.type]; const g = GRADES[d.grade]; const show = i < revealed; return (
                        <div key={i} className={`relative overflow-hidden rounded-xl border-2 p-2 text-center transition-all duration-500 ${show ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} style={{ borderColor: g.color, background: `linear-gradient(160deg, ${g.color}22, #0e0e18)`, boxShadow: d.grade >= 3 ? `0 0 24px ${g.color}88` : undefined }}>
                          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: g.color }}>{g.name}</p>
                          <p className="my-1 text-3xl">{def.icon}</p>
                          <p className="text-[11px] font-bold text-white">{def.name.replace("Tháp ", "")}</p>
                          <p className="text-[11px]">{ATTR_INFO[d.attr].icon} {ATTR_INFO[d.attr].name}</p>
                          <p className={`mt-1 rounded px-1 text-[9px] font-bold ${d.outcome === "new" ? "bg-emerald-500/20 text-emerald-300" : d.outcome === "upgrade" ? "bg-amber-500/20 text-amber-300" : d.outcome === "level" ? "bg-violet-500/20 text-violet-300" : "bg-white/10 text-white/50"}`}>{d.outcome === "new" ? "MỚI!" : d.outcome === "upgrade" ? "LÊN CẤP!" : d.outcome === "level" ? "+1 SAO" : "ĐÃ MAX"}</p>
                        </div>); })}
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0e0e18]/85 p-4 text-sm">
                <h3 className="font-bold text-amber-200">8 loại tháp trong game</h3>
                <ul className="mt-2 space-y-1.5 text-[12px] text-white/65">{TOWER_LIST.map((t) => <li key={t.type} className="flex gap-2"><span className="text-base">{t.icon}</span><span><b className="text-white">{t.name}</b> <span className="text-white/40">({t.ko})</span> — {t.desc}</span></li>)}</ul>
                <div className="mt-3 rounded-lg bg-amber-400/10 p-2.5 text-[11px] text-amber-100/80">💡 Bộ 3 thuộc tính: sở hữu đủ ✊✌️✋ của cùng 1 loại tháp → loại đó được <b>×1.2 sát thương</b> khi ra trận.</div>
              </div>
            </div>
          )}

          {/* ================= ĐỘI HÌNH ================= */}
          {tab === "towers" && <TowersTab p={p} update={update} />}

          {/* ================= ANH HÙNG ================= */}
          {tab === "heroes" && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {HEROES.map((h) => { const owned = !!p.heroes[h.id]; const lv = owned ? heroLevel(p.heroes[h.id].exp) : 1; const active = p.activeHero === h.id; const m = 1 + (lv - 1) * 0.06; return (
                <div key={h.id} className={`rounded-2xl border p-4 ${active ? "border-amber-300 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.25)]" : "border-white/10 bg-[#0e0e18]/85"}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl" style={{ background: `linear-gradient(135deg, ${h.color}, ${h.color2})` }}>{h.icon}</span>
                    <div><p className="font-display text-lg font-black text-white">{h.name} <span className="text-xs font-normal text-white/40">{h.ko}</span></p><p className="text-[11px] text-amber-200/80">{h.title} · {ATTR_INFO[h.attr].icon} {ATTR_INFO[h.attr].name}</p></div>
                  </div>
                  <p className="mt-2 min-h-[36px] text-[12px] text-white/60">{h.desc}</p>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
                    <div className="rounded bg-white/5 p-1"><p className="font-black text-white">{Math.round(h.hp * m)}</p><p className="text-white/40">HP</p></div>
                    <div className="rounded bg-white/5 p-1"><p className="font-black text-white">{Math.round(h.dmg * m)}</p><p className="text-white/40">Đòn</p></div>
                    <div className="rounded bg-white/5 p-1"><p className="font-black text-white">{h.melee ? "Cận" : h.range}</p><p className="text-white/40">Tầm</p></div>
                    <div className="rounded bg-white/5 p-1"><p className="font-black text-white">{h.air ? "✓" : "✗"}</p><p className="text-white/40">Đánh bay</p></div>
                  </div>
                  {owned ? (<>
                    <p className="mt-2 text-[11px] text-white/50">Cấp {lv} · EXP {p.heroes[h.id].exp % 800}/800 <span className="ml-1 inline-block h-1.5 w-24 overflow-hidden rounded bg-white/10 align-middle"><span className="block h-full bg-violet-400" style={{ width: `${((p.heroes[h.id].exp % 800) / 800) * 100}%` }} /></span></p>
                    <button onClick={() => update((pp) => { pp.activeHero = h.id; })} disabled={active} className={`mt-2 w-full rounded-xl py-2 text-sm font-black ${active ? "bg-amber-400/20 text-amber-300" : "btn-gold"}`}>{active ? "✓ Đang xuất trận" : "Chọn ra trận"}</button>
                  </>) : (
                    <button onClick={() => update((pp) => { if (pp.gold >= h.cost) { pp.gold -= h.cost; pp.heroes[h.id] = { exp: 0 }; } })} disabled={p.gold < h.cost} className="btn-gold mt-3 w-full rounded-xl py-2 text-sm font-black disabled:opacity-40">Mở khóa · 🪙 {h.cost}</button>
                  )}
                </div>); })}
            </div>
          )}

          {/* ================= CỬA HÀNG ================= */}
          {tab === "shop" && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {(Object.keys(ITEM_DEFS) as ItemId[]).map((id) => { const it = ITEM_DEFS[id]; return (
                <div key={id} className="rounded-2xl border border-white/10 bg-[#0e0e18]/85 p-4">
                  <div className="flex items-center gap-3"><span className="text-4xl">{it.icon}</span><div><p className="font-bold text-white">{it.name} <kbd className="rounded bg-black/50 px-1 text-[10px] text-amber-300">{it.key}</kbd></p><p className="text-[10px] text-white/40">{it.ko}</p></div></div>
                  <p className="mt-2 min-h-[36px] text-[12px] text-white/60">{it.desc}</p>
                  <p className="mt-1 text-sm font-black text-cyan-300">Đang có: ×{p.items[id]}</p>
                  <button onClick={() => update((pp) => { if (pp.gold >= it.price) { pp.gold -= it.price; pp.items[id]++; } })} disabled={p.gold < it.price} className="btn-gold mt-2 w-full rounded-xl py-2 text-sm font-black disabled:opacity-40">Mua · 🪙 {it.price}</button>
                </div>); })}
              <div className="rounded-2xl border border-orange-400/30 bg-[#0e0e18]/85 p-4">
                <div className="flex items-center gap-3"><span className="text-4xl">☄️</span><div><p className="font-bold text-white">Nâng cấp Thiên Thạch</p><p className="text-[10px] text-white/40">메테오 업그레이드</p></div></div>
                <p className="mt-2 text-[12px] text-white/60">Sát thương hiện tại: <b className="text-orange-300">{meteorDamage(p.meteorLevel)}</b> → sau nâng: <b className="text-orange-300">{meteorDamage(p.meteorLevel + 1)}</b> (+300 mỗi cấp, đúng bản gốc)</p>
                <p className="mt-1 text-sm font-black text-orange-300">Cấp {p.meteorLevel}</p>
                <button onClick={() => update((pp) => { const c = METEOR_UPGRADE_BASE * (pp.meteorLevel + 1); if (pp.gold >= c) { pp.gold -= c; pp.meteorLevel++; } })} disabled={p.gold < METEOR_UPGRADE_BASE * (p.meteorLevel + 1)} className="btn-gold mt-2 w-full rounded-xl py-2 text-sm font-black disabled:opacity-40">Nâng · 🪙 {METEOR_UPGRADE_BASE * (p.meteorLevel + 1)}</button>
              </div>
            </div>
          )}

          {/* ================= NHIỆM VỤ ================= */}
          {tab === "missions" && (
            <div className="grid gap-2 md:grid-cols-2">
              {MISSIONS.map((m) => { const pr = missionProgress(p, m.id); const pct = Math.min(100, (pr.value / m.target) * 100); return (
                <div key={m.id} className={`flex items-center gap-3 rounded-2xl border p-4 ${pr.claimed ? "border-white/5 bg-white/[0.02] opacity-60" : pr.done ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10 bg-[#0e0e18]/85"}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white">{m.name}</p>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-600" style={{ width: `${pct}%` }} /></div>
                    <p className="mt-1 text-[11px] text-white/50">{Math.min(pr.value, m.target)}/{m.target} · Thưởng 🪙 {m.gold}</p>
                  </div>
                  <button onClick={() => update((pp) => { if (!pp.claimed.includes(m.id)) { pp.claimed.push(m.id); pp.gold += m.gold; } })} disabled={!pr.done || pr.claimed} className={`rounded-xl px-4 py-2 text-sm font-black ${pr.claimed ? "bg-white/5 text-white/30" : pr.done ? "btn-gold" : "bg-white/5 text-white/30"}`}>{pr.claimed ? "Đã nhận" : "Nhận"}</button>
                </div>); })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------------- BẢNG CHI TIẾT MÀN ---------------- */
function StagePanel({ stage, p, onPlay }: { stage: number; p: Profile; onPlay: (s: number) => void }) {
  const { region, idx } = stageInfo(stage);
  const waves = waveCount(stage);
  const enemies = useMemo(() => { const list = region.roster.map((t) => ENEMY_DEFS[t]); if (idx === 4 || idx === 2) list.push(ENEMY_DEFS[region.boss]); return list; }, [region, idx]);
  const deck = p.deck.filter((k) => p.towers[k]);
  const hero = HEROES.find((h) => h.id === p.activeHero);
  const st = p.stageStars[stage] ?? 0;
  return (
    <div className="h-fit rounded-2xl border border-amber-400/30 bg-[#0e0e18]/90 p-4 lg:sticky lg:top-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400/80">{region.ko} · {idx === 4 ? "TRẬN BOSS" : idx === 2 ? "Có tinh anh" : "Màn thường"}</p>
      <h3 className="font-display text-2xl font-black text-white">Màn {stage}: {region.name}</h3>
      <p className="mt-1 text-[12px] text-white/55">{waves} wave · {[1, 2, 3].map((k) => <span key={k} className={k <= st ? "" : "opacity-25 grayscale"}>⭐</span>)} · Khoáng đầu: 💎 {320 + stage * 15}</p>
      <p className="mt-2 rounded-lg bg-white/5 p-2.5 text-[12px] italic leading-relaxed text-white/65">“{region.story}”</p>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Quái xuất hiện</p>
      <div className="mt-1 space-y-1">
        {enemies.map((e) => (
          <div key={e.type} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-[11px]">
            <span className="h-4 w-4 rounded-full border border-black/40" style={{ background: `radial-gradient(circle at 30% 30%, ${e.color}, ${e.color2})` }} />
            <span className={`font-bold ${e.boss ? "text-red-300" : "text-white"}`}>{e.name}</span>
            <span className="text-white/40">{e.ko}</span>
            <span className="ml-auto flex gap-1">{e.air && <span className="rounded bg-sky-500/20 px-1 text-sky-300">🕊 bay</span>}{e.armor && <span className="rounded bg-stone-500/30 px-1 text-stone-200">🛡 giáp {e.hp}</span>}{e.boss && <span className="rounded bg-red-500/20 px-1 text-red-300">BOSS</span>}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-white/40">Thuộc tính ✊✌️✋ của quái đổi theo từng wave — mang tháp đủ 3 thuộc tính để luôn có lợi thế +40%.</p>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Đội hình hiện tại ({deck.length}/6)</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {deck.map((k) => { const { type, attr } = parseKey(k); const o = p.towers[k]; return <span key={k} className="flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[11px]" style={{ borderColor: GRADES[o.grade].color + "88" }}>{TOWER_DEFS[type].icon}{ATTR_INFO[attr].icon}</span>; })}
        {hero && <span className="flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-400/10 px-1.5 py-1 text-[11px]">{hero.icon} {hero.name}</span>}
      </div>
      <button onClick={() => onPlay(stage)} disabled={deck.length === 0} className="btn-gold animate-pulse-glow mt-4 w-full rounded-xl py-3 text-base font-black uppercase tracking-wider disabled:opacity-40">⚔️ Xuất trận</button>
      {deck.length === 0 && <p className="mt-1 text-center text-[11px] text-red-300">Cần ít nhất 1 tháp trong Đội Hình</p>}
    </div>
  );
}

/* ---------------- TAB ĐỘI HÌNH ---------------- */
function TowersTab({ p, update }: { p: Profile; update: (fn: (p: Profile) => void) => void }) {
  const owned = Object.entries(p.towers).map(([key, o]) => ({ key, ...parseKey(key), ...o })).sort((a, b) => b.grade - a.grade || a.type.localeCompare(b.type));
  const toggle = (key: string) => update((pp) => { if (pp.deck.includes(key)) pp.deck = pp.deck.filter((k) => k !== key); else if (pp.deck.length < 6) pp.deck.push(key); });
  return (
    <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
      <div className="h-fit rounded-2xl border border-amber-400/30 bg-[#0e0e18]/90 p-4 lg:sticky lg:top-3">
        <h3 className="font-display text-lg font-black text-amber-300">ĐỘI HÌNH RA TRẬN ({p.deck.length}/6)</h3>
        <p className="mt-1 text-[12px] text-white/55">Chọn tối đa 6 tháp. Nên mang đủ 3 thuộc tính + tháp đánh bay + tháp chặn đường.</p>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => { const k = p.deck[i]; if (!k || !p.towers[k]) return <div key={i} className="flex h-16 items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-white/30">Trống</div>; const { type, attr } = parseKey(k); const o = p.towers[k]; const def = TOWER_DEFS[type]; return (
            <button key={i} onClick={() => toggle(k)} className="flex h-16 items-center gap-2 rounded-xl border bg-white/5 px-2 text-left hover:bg-red-500/10" style={{ borderColor: GRADES[o.grade].color }}>
              <span className="text-2xl">{def.icon}</span><span className="min-w-0"><span className="block truncate text-[11px] font-bold text-white">{def.name.replace("Tháp ", "")}</span><span className="block text-[10px]" style={{ color: GRADES[o.grade].color }}>{GRADES[o.grade].name} {ATTR_INFO[attr].icon} ★{o.level}</span></span>
            </button>); })}
        </div>
        <div className="mt-3 space-y-1 text-[11px] text-white/60">
          {(["both", "air"] as const).map((t) => { const has = p.deck.some((k) => p.towers[k] && (TOWER_DEFS[parseKey(k).type].target === t || (t === "air" && TOWER_DEFS[parseKey(k).type].target === "both"))); return <p key={t} className={has ? "text-emerald-300" : "text-red-300"}>{has ? "✓" : "✗"} {t === "air" ? "Có tháp đánh được quái bay" : "Có tháp đánh mọi loại"}</p>; })}
          {ATTRS.map((a) => { const has = p.deck.some((k) => p.towers[k] && parseKey(k).attr === a); return <p key={a} className={has ? "text-emerald-300" : "text-amber-300/70"}>{has ? "✓" : "○"} Có tháp thuộc tính {ATTR_INFO[a].icon} {ATTR_INFO[a].name}</p>; })}
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-display text-lg font-black text-white">KHO THÁP ({owned.length}) <span className="text-xs font-normal text-white/40">— click để thêm/bỏ khỏi đội hình</span></h3>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {owned.map((o) => { const def = TOWER_DEFS[o.type]; const inDeck = p.deck.includes(o.key); const set = hasSetBonus(p, o.type); const g = GRADES[o.grade]; return (
            <button key={o.key} onClick={() => toggle(o.key)} className={`relative flex gap-3 rounded-2xl border p-3 text-left transition ${inDeck ? "bg-amber-400/10 shadow-[0_0_14px_rgba(251,191,36,0.25)]" : "bg-[#0e0e18]/85 hover:bg-white/5"}`} style={{ borderColor: inDeck ? "#fde047" : g.color + "66" }}>
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl" style={{ background: `linear-gradient(160deg, ${g.color}33, #000)`, border: `1px solid ${g.color}` }}>{def.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">{def.name} <span className="text-[10px] font-normal text-white/40">{def.ko}</span></span>
                <span className="block text-[11px]"><span style={{ color: g.color }}>{g.name}</span> · {ATTR_INFO[o.attr].icon} {ATTR_INFO[o.attr].name} · ★{o.level}/{MAX_TOWER_META_LEVEL}</span>
                <span className="mt-1 block text-[10px] text-white/50">Giá 💎 {towerCost(def, o.grade)} · Sát thương ×{(g.mult * (1 + (o.level - 1) * 0.05) * (set ? 1.2 : 1)).toFixed(2)} · {def.target === "air" ? "chỉ bay" : def.target === "ground" ? "chỉ bộ binh" : "bộ + bay"}</span>
                <span className="mt-0.5 block text-[10px] text-white/45">{def.gradeNotes[o.grade]}</span>
                {set && <span className="mt-1 inline-block rounded bg-amber-400/20 px-1.5 text-[9px] font-black text-amber-300">BỘ 3 THUỘC TÍNH ×1.2</span>}
              </span>
              {inDeck && <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-1.5 text-[9px] font-black text-black">RA TRẬN</span>}
            </button>); })}
        </div>
      </div>
    </div>
  );
}
