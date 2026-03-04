\"use client\";

import { useState } from \"react\";

type Tab = \"rank\" | \"leaderboard\" | \"duel\";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>(\"rank\");
  const [coins] = useState<number>(30); // placeholder until backend is wired

  return (
    <div className=\"min-h-screen bg-zinc-950 text-white flex justify-center\">
      <main className=\"w-full max-w-[430px] flex flex-col\" style={{ minHeight: \"100dvh\" }}>
        {/* Top bar */}
        <header className=\"flex items-center justify-between px-5 pt-6 pb-4\">
          <div className=\"flex flex-col\">
            <span className=\"text-xs uppercase tracking-[0.25em] text-zinc-500\">
              LooksRank
            </span>
            <h1 className=\"text-2xl font-bold tracking-tight\">PSL Leaderboard</h1>
          </div>
          <div className=\"px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-sm font-semibold flex items-center gap-1.5\">
            <span className=\"text-yellow-300\">★</span>
            <span>{coins}</span>
          </div>
        </header>

        {/* Content */}
        <section className=\"flex-1 px-5 pb-24\">
          {activeTab === \"rank\" && <RankScreen />}
          {activeTab === \"leaderboard\" && <LeaderboardScreen />}
          {activeTab === \"duel\" && <DuelScreen />}
        </section>

        {/* Bottom nav */}
        <nav className=\"fixed bottom-0 left-0 right-0 bg-zinc-950/95 border-t border-white/10\">
          <div className=\"max-w-[430px] mx-auto flex justify-around py-3\">
            <NavButton
              label=\"Rank\"
              active={activeTab === \"rank\"}
              onClick={() => setActiveTab(\"rank\")}
            />
            <NavButton
              label=\"Leaderboard\"
              active={activeTab === \"leaderboard\"}
              onClick={() => setActiveTab(\"leaderboard\")}
            />
            <NavButton
              label=\"Duel\"
              active={activeTab === \"duel\"}
              onClick={() => setActiveTab(\"duel\")}
            />
          </div>
        </nav>
      </main>
    </div>
  );
}

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type=\"button\"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 ${
        active ? \"text-white\" : \"text-zinc-500\"
      }`}
    >
      <span
        className={`text-xs font-semibold tracking-[0.2em] uppercase ${
          active ? \"\" : \"text-zinc-500\"
        }`}
      >
        {label}
      </span>
      {active && <div className=\"w-6 h-1 rounded-full bg-white\" />}
    </button>
  );
}

function RankScreen() {
  return (
    <div className=\"flex flex-col gap-6 pb-4\">
      <div className=\"rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-white/10 px-5 py-6\">
        <p className=\"text-sm text-zinc-400 mb-3\">
          Take a selfie and see where you land on the PSL ladder. Only your best
          score per day counts for the board.
        </p>
        <div className=\"flex flex-col gap-3\">
          <input
            type=\"text\"
            placeholder=\"Display name\"
            className=\"w-full rounded-2xl bg-zinc-900 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/40\"
          />
          <div className=\"relative w-full aspect-[3/4] rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 text-sm\">
            Selfie preview
          </div>
        </div>
      </div>

      <div className=\"flex flex-col gap-3\">
        <button
          type=\"button\"
          className=\"w-full rounded-3xl bg-white text-zinc-950 font-semibold py-4 text-base active:scale-[0.98] transition-transform\"
        >
          Rank me (2 coins)
        </button>
        <button
          type=\"button\"
          className=\"w-full rounded-3xl bg-zinc-900 border border-yellow-400/40 text-yellow-300 font-semibold py-4 text-sm active:scale-[0.98] transition-transform\"
        >
          Double or nothing (beat today&apos;s best)
        </button>
      </div>

      <div className=\"mt-2 rounded-2xl bg-zinc-900/80 border border-white/5 px-4 py-3 text-xs text-zinc-400 leading-relaxed\">
        <p className=\"font-semibold text-zinc-200 mb-1\">PSL tiers</p>
        <p>
          Subhuman · Truecel · Bottomcel · Low‑Tier Normie (LTN) · Mid‑Tier Normie
          · Upper Normie · High‑Tier Normie (HTN) · Chadlite · Chad · Gigachad ·
          Demigod Chad · Legendary Chad
        </p>
      </div>
    </div>
  );
}

function LeaderboardScreen() {
  return (
    <div className=\"flex flex-col gap-4 pb-4\">
      <div className=\"flex gap-2 rounded-full bg-zinc-900 p-1 border border-white/10 w-full max-w-xs mx-auto mb-2\">
        <button className=\"flex-1 rounded-full bg-white text-xs font-semibold text-zinc-950 py-1.5\">
          Daily
        </button>
        <button className=\"flex-1 rounded-full text-xs font-semibold text-zinc-400 py-1.5\">
          Weekly
        </button>
        <button className=\"flex-1 rounded-full text-xs font-semibold text-zinc-400 py-1.5\">
          Global
        </button>
      </div>
      <div className=\"text-sm text-zinc-500 text-center mb-1\">
        Leaderboard coming soon – UI stub.
      </div>
      <div className=\"space-y-2\">
        {[1, 2, 3, 4, 5].map((rank) => (
          <div
            key={rank}
            className=\"flex items-center justify-between rounded-2xl bg-zinc-900 border border-white/5 px-4 py-3\"
          >
            <div className=\"flex items-center gap-3\">
              <span className=\"text-sm text-zinc-500 w-6\">#{rank}</span>
              <div className=\"w-10 h-10 rounded-full bg-zinc-800\" />
              <div>
                <div className=\"text-sm font-semibold\">User{rank}</div>
                <div className=\"text-xs text-zinc-500\">Legendary Chad</div>
              </div>
            </div>
            <div className=\"text-right\">
              <div className=\"text-lg font-bold\">94</div>
              <div className=\"text-[10px] text-zinc-500\">PSL 7.6</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DuelScreen() {
  return (
    <div className=\"flex flex-col gap-5 pb-4\">
      <p className=\"text-sm text-zinc-400\">
        Pass the phone and take turns snapping selfies. We&apos;ll rate both and
        crown the higher PSL.
      </p>

      <div className=\"space-y-4\">
        <DuelPlayerCard label=\"Player A\" />
        <DuelPlayerCard label=\"Player B\" />
      </div>

      <button
        type=\"button\"
        className=\"mt-2 w-full rounded-3xl bg-white text-zinc-950 font-semibold py-4 text-base active:scale-[0.98] transition-transform\"
      >
        Run duel (3 coins)
      </button>
    </div>
  );
}

function DuelPlayerCard({ label }: { label: string }) {
  return (
    <div className=\"rounded-3xl bg-zinc-900 border border-white/10 px-4 py-4 flex flex-col gap-3\">
      <div className=\"flex justify-between items-center\">
        <span className=\"text-xs uppercase tracking-[0.2em] text-zinc-500\">
          {label}
        </span>
        <input
          type=\"text\"
          placeholder=\"Name\"
          className=\"w-32 rounded-xl bg-zinc-950 border border-white/10 px-3 py-1.5 text-xs outline-none focus:border-white/40\"
        />
      </div>
      <div className=\"relative w-full aspect-[3/4] rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-center text-zinc-500 text-xs\">
        Selfie preview
      </div>
    </div>
  );
}
