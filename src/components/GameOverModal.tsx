import { useEffect, useMemo, useState } from "react";
import type { DeathInfo } from "../game/engine";
import { SKINS, SPECIES, skinToSpecies } from "../game/species";
import { spriteDataURL } from "../game/sprites";

interface Props {
  death: DeathInfo;
  prevBest: number;
  coinImg: string;
  onPlayAgain: () => void;
  onReturnMenu: () => void;
}

interface GradeSpec {
  grade: "S+" | "S" | "A" | "B" | "C" | "D";
  title: string;
  stars: number;
  ringColor: string;
  medalTop: string;
  medalBottom: string;
  letterColor: string;
  glow: string;
}

const GRADES: GradeSpec[] = [
  {
    grade: "S+",
    title: "Penguasa Samudra",
    stars: 5,
    ringColor: "#fef08a",
    medalTop: "#fff4a3",
    medalBottom: "#f59e0b",
    letterColor: "#451a03",
    glow: "rgba(250, 204, 21, 0.55)",
  },
  {
    grade: "S",
    title: "Predator Legendaris",
    stars: 5,
    ringColor: "#fde047",
    medalTop: "#fde68a",
    medalBottom: "#d97706",
    letterColor: "#451a03",
    glow: "rgba(245, 158, 11, 0.48)",
  },
  {
    grade: "A",
    title: "Pemburu Terumbu",
    stars: 4,
    ringColor: "#6ee7b7",
    medalTop: "#a7f3d0",
    medalBottom: "#059669",
    letterColor: "#022c22",
    glow: "rgba(16, 185, 129, 0.42)",
  },
  {
    grade: "B",
    title: "Penjelajah Lincah",
    stars: 3,
    ringColor: "#7dd3fc",
    medalTop: "#bae6fd",
    medalBottom: "#0284c7",
    letterColor: "#082f49",
    glow: "rgba(56, 189, 248, 0.4)",
  },
  {
    grade: "C",
    title: "Penghuni Karang",
    stars: 2,
    ringColor: "#fdba74",
    medalTop: "#fed7aa",
    medalBottom: "#c2410c",
    letterColor: "#431407",
    glow: "rgba(249, 115, 22, 0.34)",
  },
  {
    grade: "D",
    title: "Ikan Pemula",
    stars: 1,
    ringColor: "#cbd5e1",
    medalTop: "#e2e8f0",
    medalBottom: "#64748b",
    letterColor: "#0f172a",
    glow: "rgba(148, 163, 184, 0.28)",
  },
];

function evaluateRun(death: DeathInfo, prevBest: number) {
  const huntPct = Math.min(100, Math.round((death.eaten / 85) * 70 + Math.min(30, death.botsEaten * 10)));
  const comboPct = Math.min(100, Math.round((death.maxCombo / 16) * 75 + Math.min(25, death.schoolSweeps * 12.5)));
  const explorePct = Math.min(100, Math.round((death.maxDepth / 6500) * 55 + ((death.stageNum - 1) / 4) * 45));
  const rankBonus = death.bestRank <= 1 ? 45 : death.bestRank <= 3 ? 36 : death.bestRank <= 10 ? 24 : 10;
  const survivePct = Math.min(100, Math.round((death.time / 120) * 55 + rankBonus));

  const scorePoints = Math.min(36, Math.round(Math.log10(Math.max(10, death.score + 10)) * 7.8));
  const totalRating = Math.min(
    100,
    Math.round(scorePoints + huntPct * 0.2 + comboPct * 0.16 + explorePct * 0.14 + survivePct * 0.14)
  );

  let spec = GRADES[5];
  if (totalRating >= 88 && death.score >= 12000) spec = GRADES[0];
  else if (totalRating >= 75) spec = GRADES[1];
  else if (totalRating >= 58) spec = GRADES[2];
  else if (totalRating >= 40) spec = GRADES[3];
  else if (totalRating >= 24) spec = GRADES[4];

  const isNewBest = death.score > prevBest && death.score > 0;

  const highlights: string[] = [];
  if (isNewBest) highlights.push("Rekor Skor Baru!");
  if (death.bestRank === 1) highlights.push("Puncak Peringkat #1");
  else if (death.bestRank <= 3) highlights.push(`Masuk Top #${death.bestRank}`);
  if (death.maxDepth >= 5000) highlights.push("Menembus Palung Abisal");
  else if (death.maxDepth >= 3000) highlights.push("Menjelajah Zona Malam");
  if (death.maxCombo >= 14) highlights.push(`Frenzy Beruntun x${death.maxCombo}`);
  if (death.schoolSweeps >= 1) highlights.push(`Sapu Bersih x${death.schoolSweeps}`);
  if (death.botsEaten >= 1) highlights.push(`Kalahkan ${death.botsEaten} Rival`);

  let verdict = "";
  let tip = "";
  if (spec.grade === "S+" || spec.grade === "S") {
    verdict = `Luar biasa! Kamu mendominasi rantai makanan hingga Tahap ${death.stageNum} dengan ${death.eaten} mangsa dan kombo x${death.maxCombo}.`;
    tip = "Gunakan koinmu untuk menyempurnakan level upgrade atau mengoleksi ikan langka.";
  } else if (spec.grade === "A") {
    verdict = `Perburuan tajam! Aksi sedotmu konsisten hingga kedalaman ${death.maxDepth} m di ${death.deepestZone}.`;
    tip = "Incar kawanan emas & peti mutiara untuk memperpanjang rantai Frenzy hingga x14+.";
  } else if (spec.grade === "B") {
    verdict = `Petualangan yang seru! Kamu berhasil bertahan ${death.time} detik dan tumbuh hingga massa ${death.maxMass}.`;
    tip = "Simpan energi Boost (Klik Kanan / Shift) untuk menghindar saat predator besar mendekat.";
  } else {
    verdict = `Langkah awal yang baik di terumbu karang — kamu mengumpulkan +${death.coins} koin untuk memperkuat ikanmu.`;
    tip = `Waspadai tanda bahaya "!" di dekat ikan besar, dan sedot kawanan kecil untuk naik ukuran cepat.`;
  }
  if (death.killerSpId === "bomb") {
    tip = "Jaga jarak dari Bom Ranjau Laut berduri yang lampunya berkedip merah — ledakannya mematikan dalam sekali sentuh.";
  }

  return {
    spec,
    totalRating,
    isNewBest,
    highlights: highlights.slice(0, 3),
    verdict,
    tip,
    aspects: [
      { label: "Agresivitas Berburu", pct: huntPct, bar: "linear-gradient(90deg, #f97316, #facc15)" },
      { label: "Rantai Kombo Frenzy", pct: comboPct, bar: "linear-gradient(90deg, #eab308, #fde047)" },
      { label: "Jelajah Kedalaman", pct: explorePct, bar: "linear-gradient(90deg, #0ea5e9, #67e8f9)" },
      { label: "Ketahanan Bertahan", pct: survivePct, bar: "linear-gradient(90deg, #10b981, #6ee7b7)" },
    ],
  };
}

function formatDuration(sec: number) {
  if (sec < 60) return `${sec} detik`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}d`;
}

export default function GameOverModal({ death, prevBest, coinImg, onPlayAgain, onReturnMenu }: Props) {
  const evalData = useMemo(() => evaluateRun(death, prevBest), [death, prevBest]);

  const playerThumb = useMemo(() => {
    const sk = SKINS.find((s) => s.id === death.playerSkinId) || SKINS[0];
    return spriteDataURL(skinToSpecies(sk), 170, 0);
  }, [death.playerSkinId]);

  const killedByBomb = death.killerSpId === "bomb";

  const killerThumb = useMemo(() => {
    if (killedByBomb) return "";
    const sk = SKINS.find((s) => s.id === death.killerSpId);
    const sp = sk ? skinToSpecies(sk) : SPECIES.find((s) => s.id === death.killerSpId) || SPECIES[SPECIES.length - 1];
    return spriteDataURL(sp, 92, 0);
  }, [death.killerSpId, killedByBomb]);

  const [displayScore, setDisplayScore] = useState(0);
  const [displayCoins, setDisplayCoins] = useState(0);

  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplayScore(death.score);
      setDisplayCoins(death.coins);
      return;
    }
    let raf = 0;
    const duration = 640;
    const t0 = performance.now();
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / duration);
      const ease = 1 - Math.pow(1 - u, 3);
      setDisplayScore(Math.round(death.score * ease));
      setDisplayCoins(Math.round(death.coins * ease));
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [death.score, death.coins]);

  const { spec } = evalData;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <div className="artistic-wood-board gameover-board-in relative w-full max-w-[820px] my-auto p-4 sm:p-6 flex flex-col gap-4">
        {/* Nautical Brass Screws */}
        <div className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full bg-[#e3ab4b] border border-[#3b1d06] shadow-sm flex items-center justify-center text-[7px] text-[#4d2808]">✕</div>
        <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full bg-[#e3ab4b] border border-[#3b1d06] shadow-sm flex items-center justify-center text-[7px] text-[#4d2808]">✕</div>
        <div className="absolute bottom-2.5 left-2.5 w-3 h-3 rounded-full bg-[#e3ab4b] border border-[#3b1d06] shadow-sm flex items-center justify-center text-[7px] text-[#4d2808]">✕</div>
        <div className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full bg-[#e3ab4b] border border-[#3b1d06] shadow-sm flex items-center justify-center text-[7px] text-[#4d2808]">✕</div>

        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/15 px-2">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-amber-300">
              Laporan Evaluasi Perburuan
            </div>
            <h2 id="gameover-title" className="text-2xl sm:text-[28px] font-extrabold text-white text-outline leading-tight">
              {death.playerName} · {spec.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center ff-carved-slot px-3.5 py-2">
            <img src={coinImg} alt="Koin" className="w-6 h-6 shrink-0" />
            <div className="leading-none">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/75">Hadiah Koin</div>
              <div className="text-lg font-extrabold text-yellow-300 tabular-nums mt-0.5">
                +{displayCoins.toLocaleString("en-US")}
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Evaluation Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* LEFT COLUMN: Lagoon Showcase, Rank Medal Crest & Killer Report */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="wood-lagoon-porthole relative p-4 flex flex-col items-center justify-between gap-3 flex-1 overflow-hidden">
              {/* Subtle caustic pedestal glow */}
              <div className="absolute top-3 right-3 z-10 gameover-medal-in">
                <div
                  className="relative w-20 h-20 flex items-center justify-center"
                  style={{ filter: `drop-shadow(0 6px 14px ${spec.glow})` }}
                >
                  <svg viewBox="0 0 88 88" className="w-full h-full">
                    <defs>
                      <linearGradient id="medalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={spec.medalTop} />
                        <stop offset="100%" stopColor={spec.medalBottom} />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="44,3 54,13 68,10 73,23 85,30 81,44 85,58 73,65 68,78 54,75 44,85 34,75 20,78 15,65 3,58 7,44 3,30 15,23 20,10 34,13"
                      fill="url(#medalGrad)"
                      stroke="#2b1304"
                      strokeWidth="2.8"
                      strokeLinejoin="round"
                    />
                    <circle cx="44" cy="44" r="28" fill="none" stroke={spec.ringColor} strokeWidth="2" opacity="0.85" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                    <span
                      className="font-extrabold tracking-tight"
                      style={{
                        fontSize: spec.grade.length > 1 ? "25px" : "29px",
                        color: spec.letterColor,
                      }}
                    >
                      {spec.grade}
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-85" style={{ color: spec.letterColor }}>
                      {evalData.totalRating}/100
                    </span>
                  </div>
                </div>
              </div>

              {/* Player fish swimming in lagoon porthole */}
              <div className="w-full flex items-center justify-start pt-2 pl-1">
                <div className="bob relative w-40 h-24 flex items-center justify-center">
                  <img
                    src={playerThumb}
                    alt={death.playerName}
                    className="max-h-full max-w-full object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.65)]"
                  />
                </div>
              </div>

              {/* 5-Star Performance Bar + Verdict */}
              <div className="w-full flex flex-col items-center gap-1.5 pt-1 border-t border-cyan-200/20">
                <div className="flex items-center gap-1.5" aria-label={`Nilai ${spec.stars} dari 5 bintang`}>
                  {Array.from({ length: 5 }).map((_, i) => {
                    const lit = i < spec.stars;
                    return (
                      <svg
                        key={i}
                        viewBox="0 0 24 24"
                        className={`w-6 h-6 ${lit ? "gameover-star-in" : ""}`}
                        style={{ animationDelay: `${0.16 + i * 0.07}s` }}
                      >
                        <path
                          d="M12 2.4l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.1l-5.8 3.1 1.1-6.4L2.6 9.2l6.5-.9L12 2.4z"
                          fill={lit ? "#fde047" : "rgba(15, 23, 42, 0.55)"}
                          stroke={lit ? "#451a03" : "rgba(148, 163, 184, 0.35)"}
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                      </svg>
                    );
                  })}
                </div>
                <p className="text-[12.5px] leading-snug text-cyan-50 text-center font-medium">
                  {evalData.verdict}
                </p>
              </div>
            </div>

            {/* Killer Incident Card */}
            <div className="artistic-inset px-3.5 py-2.5 flex items-center gap-3">
              <div className="w-14 h-10 rounded-lg bg-[#1c0d04] border border-rose-400/30 flex items-center justify-center p-1 shrink-0">
                {killedByBomb ? (
                  <svg viewBox="0 0 40 40" className="w-9 h-9 drop-shadow-[0_0_6px_rgba(248,113,113,0.6)]">
                    <g stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="20" y1="3" x2="20" y2="37" />
                      <line x1="3" y1="20" x2="37" y2="20" />
                      <line x1="8" y1="8" x2="32" y2="32" />
                      <line x1="32" y1="8" x2="8" y2="32" />
                    </g>
                    <circle cx="20" cy="20" r="11" fill="#334155" stroke="#0f172a" strokeWidth="2" />
                    <circle cx="16.5" cy="16.5" r="3.5" fill="#64748b" opacity="0.7" />
                    <circle cx="20" cy="19" r="3.2" fill="#ef4444" />
                    <circle cx="20" cy="19" r="1.4" fill="#fef08a" />
                  </svg>
                ) : (
                  <img src={killerThumb} alt={death.killer} className="max-h-full max-w-full object-contain" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-rose-300">
                  Akhir Perjalanan
                </div>
                <div className="text-[14.5px] font-extrabold text-white truncate">
                  {killedByBomb ? "Meledak Terkena Bom Ranjau Laut" : `Dimakan oleh ${death.killer}`}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Score Tally, Evaluation Bars, Stats Grid & Tactical Tip */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-3">
            {/* Hero Score Block */}
            <div className="artistic-inset p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-200/80">
                  <span>Skor Akhir</span>
                  {evalData.isNewBest && (
                    <span className="text-yellow-300 font-extrabold">· Rekor Baru!</span>
                  )}
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-yellow-300 text-outline tabular-nums leading-none mt-1">
                  {displayScore.toLocaleString("en-US")}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200/75">
                  Rekor Terbaik
                </div>
                <div className="text-lg font-extrabold text-amber-50 tabular-nums mt-0.5">
                  {Math.max(prevBest, death.score).toLocaleString("en-US")}
                </div>
              </div>
            </div>

            {/* 4-Dimension Performance Evaluation Bars */}
            <div className="artistic-inset p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-extrabold uppercase tracking-wider text-amber-200">
                  Rincian Penilaian
                </span>
                {evalData.highlights.length > 0 && (
                  <span className="text-[11.5px] font-bold text-cyan-200 truncate max-w-[65%]">
                    {evalData.highlights.join(" · ")}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {evalData.aspects.map((asp) => (
                  <div key={asp.label} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between text-[11.5px]">
                      <span className="font-bold text-amber-50/95">{asp.label}</span>
                      <span className="font-extrabold text-yellow-300 tabular-nums">{asp.pct}%</span>
                    </div>
                    <div className="ff-bar-slot h-2.5 overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${Math.max(6, asp.pct)}%`, background: asp.bar }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6-Stat Ocean Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="ff-carved-slot px-3 py-2 text-left">
                <div className="text-[10.5px] font-bold uppercase text-amber-200/75">Ikan Dimakan</div>
                <div className="text-[16px] font-extrabold text-white tabular-nums mt-0.5">
                  {death.eaten}
                  {death.botsEaten > 0 && (
                    <span className="text-[11px] font-bold text-emerald-300 ml-1.5">({death.botsEaten} rival)</span>
                  )}
                </div>
              </div>

              <div className="ff-carved-slot px-3 py-2 text-left">
                <div className="text-[10.5px] font-bold uppercase text-amber-200/75">Kombo Tertinggi</div>
                <div className="text-[16px] font-extrabold text-yellow-300 tabular-nums mt-0.5">
                  x{death.maxCombo}
                </div>
              </div>

              <div className="ff-carved-slot px-3 py-2 text-left">
                <div className="text-[10.5px] font-bold uppercase text-amber-200/75">Tahap &amp; Massa</div>
                <div className="text-[15px] font-extrabold text-white tabular-nums mt-0.5">
                  Tahap {death.stageNum} <span className="text-amber-200/70 text-[12px]">· {death.maxMass}</span>
                </div>
              </div>

              <div className="ff-carved-slot px-3 py-2 text-left">
                <div className="text-[10.5px] font-bold uppercase text-amber-200/75">Kedalaman Maks</div>
                <div className="text-[15px] font-extrabold text-cyan-200 tabular-nums mt-0.5 truncate" title={death.deepestZone}>
                  {death.maxDepth} m <span className="text-[11px] font-semibold text-cyan-100/80">· {death.deepestZone}</span>
                </div>
              </div>

              <div className="ff-carved-slot px-3 py-2 text-left">
                <div className="text-[10.5px] font-bold uppercase text-amber-200/75">Peringkat Puncak</div>
                <div className="text-[16px] font-extrabold text-emerald-300 tabular-nums mt-0.5">
                  #{death.bestRank}
                </div>
              </div>

              <div className="ff-carved-slot px-3 py-2 text-left">
                <div className="text-[10.5px] font-bold uppercase text-amber-200/75">Waktu Bertahan</div>
                <div className="text-[15px] font-extrabold text-sky-100 tabular-nums mt-0.5">
                  {formatDuration(death.time)}
                </div>
              </div>
            </div>

            {/* Tactical Advice Line */}
            <div className="text-[12px] text-amber-100/90 bg-[#221106]/85 border border-amber-500/20 rounded-xl px-3.5 py-2 leading-snug">
              <span className="font-extrabold text-yellow-300">Saran Taktis: </span>
              {evalData.tip}
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
          <button
            onClick={onReturnMenu}
            className="ui-btn px-6 py-3 min-h-[48px] text-[15px] text-amber-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
            style={{ background: "linear-gradient(180deg, #8c5b2f 0%, #5c3614 100%)" }}
          >
            MENU &amp; TOKO KOIN
          </button>

          <button
            onClick={onPlayAgain}
            className="ui-btn ui-sheen relative overflow-hidden flex-1 px-6 py-3 min-h-[48px] text-[18px] text-white tracking-wide whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
            style={{ background: "linear-gradient(180deg, #4be880 0%, #1ba248 100%)" }}
          >
            <span className="relative drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">▶ MAIN LAGI SEKARANG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
