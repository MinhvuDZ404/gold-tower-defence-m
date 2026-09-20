import { useCallback, useEffect, useState } from "react";
import { stageInfo, TOTAL_STAGES } from "./game/data";
import type { BattleConfig, BattleResult } from "./game/engine";
import { Profile, loadProfile, saveProfile, buildDeck, buildHero } from "./game/save";
import Lobby from "./screens/Lobby";
import BattleScreen from "./screens/Battle";

type Screen = { kind: "title" } | { kind: "lobby" } | { kind: "battle"; stage: number; key: number; story: boolean };

export default function App() {
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [screen, setScreen] = useState<Screen>({ kind: "title" });
  useEffect(() => { saveProfile(profile); }, [profile]);

  const update = useCallback((fn: (p: Profile) => void) => {
    setProfile((prev) => { const next: Profile = JSON.parse(JSON.stringify(prev)); fn(next); return next; });
  }, []);

  const play = (stage: number) => {
    const { region } = stageInfo(stage);
    const story = !profile.seenRegionStory.includes(region.id);
    setScreen({ kind: "battle", stage, key: Date.now(), story });
  };

  const rewardFor = (stage: number, r: BattleResult) => {
    const firstClear = r.won && !profile.stageStars[stage];
    const base = Math.round((150 + stage * 50) * (r.won ? 0.5 + r.stars * 0.17 : 0.15 + r.wavesCleared * 0.01));
    return { gold: firstClear ? base + 300 + stage * 40 : base, firstClear, exp: r.won ? 150 + stage * 40 : 40 };
  };

  const onFinish = (stage: number, r: BattleResult) => {
    const rw = rewardFor(stage, r);
    update((p) => {
      p.gold += rw.gold;
      const s = p.stats;
      s.towersBuilt += r.stats.towersBuilt; s.kills += r.stats.kills; s.meteors += r.stats.meteors; s.levelUps += r.stats.levelUps; s.reinforcements += r.stats.reinforcements;
      // item đã dùng
      for (const k of Object.keys(r.stats.itemsUsed) as (keyof typeof r.stats.itemsUsed)[]) p.items[k] = Math.max(0, p.items[k] - r.stats.itemsUsed[k]);
      if (p.heroes[p.activeHero]) p.heroes[p.activeHero].exp += rw.exp;
      if (r.won) {
        if (!p.stageStars[stage]) s.stagesCleared += 1;
        p.stageStars[stage] = Math.max(p.stageStars[stage] ?? 0, r.stars);
        if (r.stars === 3) p.items.meteor += 1;
        if (stage % 5 === 0 && rw.firstClear) { p.items.bomb += 2; p.items.heart += 1; }
        if (rw.firstClear) p.items.meteor += 2;
      }
      const { region } = stageInfo(stage);
      if (!p.seenRegionStory.includes(region.id)) p.seenRegionStory.push(region.id);
    });
  };

  if (screen.kind === "title") return <Title onStart={() => setScreen({ kind: "lobby" })} isNew={!profile.seenIntro} onSeen={() => update((p) => { p.seenIntro = true; })} />;

  if (screen.kind === "battle") {
    const cfg: BattleConfig = { stage: screen.stage, deck: buildDeck(profile), hero: buildHero(profile), items: { ...profile.items }, meteorLevel: profile.meteorLevel, sound: profile.sound };
    return (
      <BattleWrapper key={screen.key} cfg={cfg} story={screen.story} stage={screen.stage}
        onExit={() => setScreen({ kind: "lobby" })}
        onFinish={(r) => onFinish(screen.stage, r)}
        onRetry={() => setScreen({ kind: "battle", stage: screen.stage, key: Date.now(), story: false })}
        onNext={() => play(screen.stage + 1)}
        rewardPreview={(r) => rewardFor(screen.stage, r)}
        canNext={screen.stage < TOTAL_STAGES}
      />
    );
  }
  return <Lobby profile={profile} update={update} onPlay={play} />;
}

function BattleWrapper(props: { cfg: BattleConfig; story: boolean; stage: number; onExit: () => void; onFinish: (r: BattleResult) => void; onRetry: () => void; onNext: () => void; rewardPreview: (r: BattleResult) => { gold: number; firstClear: boolean; exp: number }; canNext: boolean }) {
  const [showStory, setShowStory] = useState(props.story);
  const { region } = stageInfo(props.stage);
  if (showStory) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-[#07070e] p-4 text-[#f5f1e6]">
        <img src={region.bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070e] via-[#07070e]/70 to-transparent" />
        <div className="gold-card relative w-full max-w-xl rounded-3xl p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-amber-400/80">Vùng {region.id + 1} · {region.ko}</p>
          <h2 className="mt-2 font-display text-4xl font-black text-shimmer-gold">{region.name}</h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">{region.story}</p>
          <button onClick={() => setShowStory(false)} className="btn-gold mt-6 rounded-xl px-8 py-3 font-black uppercase tracking-wider">Vào trận ⚔️</button>
        </div>
      </div>
    );
  }
  return <BattleScreen {...props} />;
}

function Title({ onStart, isNew, onSeen }: { onStart: () => void; isNew: boolean; onSeen: () => void }) {
  const [page, setPage] = useState(0);
  const pages = [
    { t: "Thành phố vàng El Dorado", d: "Bạn là người canh giữ kho vàng huyền thoại. Nhưng tin đồn về núi vàng đã đến tai phù thủy Gullveig (굴베이그)..." },
    { t: "Gullveig phái quân cướp vàng", d: "Từ chuột, nhện trong vườn đến Nhân Sư, Ifrit — mọi sinh vật bị mê hoặc đều lao về kho vàng. Chúng đi theo con đường cố định tới Kho Vàng." },
    { t: "Xây tháp ở ô cắm cờ", d: "Tháp chỉ đặt được ở các ô cố định dọc đường. Chọn tháp khắc chế theo Kéo–Búa–Bao (+40%), mang tháp đánh bay, dùng lính chặn đường và anh hùng để giữ vàng!" },
  ];
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#07070e] p-4 text-[#f5f1e6]">
      <img src="/images/hero-fortress.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#07070e]/40 via-[#07070e]/60 to-[#07070e]" />
      <div className="relative text-center">
        <p className="text-xs font-black uppercase tracking-[0.5em] text-amber-400/80">Busidol-style Tower Defence · Web Edition</p>
        <h1 className="mt-3 font-display text-5xl font-black leading-none sm:text-7xl"><span className="text-shimmer-gold drop-shadow-[0_0_40px_rgba(245,158,11,0.4)]">GOLD TOWER</span><br /><span className="text-white">DEFENCE</span></h1>
        <p className="mt-2 font-display text-lg tracking-[0.3em] text-amber-200/70">골드타워디펜스 — 황금을 지켜라</p>
        {isNew ? (
          <div className="gold-card mx-auto mt-8 max-w-lg rounded-2xl p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Cốt truyện {page + 1}/3</p>
            <h3 className="mt-1 font-display text-2xl font-black text-amber-300">{pages[page].t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/75">{pages[page].d}</p>
            <div className="mt-4 flex gap-2">
              {page < 2 ? <button onClick={() => setPage(page + 1)} className="btn-gold flex-1 rounded-xl py-2.5 font-black">Tiếp ▶</button>
                : <button onClick={() => { onSeen(); onStart(); }} className="btn-gold flex-1 rounded-xl py-2.5 font-black">Bắt đầu bảo vệ vàng!</button>}
              <button onClick={() => { onSeen(); onStart(); }} className="btn-ghost-gold rounded-xl px-4 py-2.5 text-sm font-bold text-amber-100">Bỏ qua</button>
            </div>
          </div>
        ) : (
          <button onClick={onStart} className="btn-gold animate-pulse-glow mt-10 rounded-2xl px-12 py-4 text-xl font-black uppercase tracking-widest">▶ Chơi</button>
        )}
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2 text-[11px] text-white/50">
          {["🚩 Ô đặt tháp cố định", "✊✌️✋ Khắc chế ±40%", "🛡 Quái giáp đếm đòn", "🕊 Quái bay", "🎴 Rút tháp 5 cấp", "🦸 4 anh hùng điều khiển", "☄️ Item phím tắt 1-2-3-4-7-8-0", "🗺 4 vùng · 20 màn · 4 boss"].map((t) => <span key={t} className="rounded-full border border-white/10 bg-black/40 px-3 py-1">{t}</span>)}
        </div>
      </div>
    </div>
  );
}
