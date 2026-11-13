"use client";

import { useAccount } from "wagmi";
import { usePoints } from "@/lib/api";
import { short } from "@/lib/format";

const RULES: [string, string][] = [
  ["Buy", "1,000 points per 1 native coin you buy"],
  ["Early buyer", "Double points as one of a coin's first 50 buyers"],
  ["Launch", "50 points per coin you launch"],
  ["Graduation", "500 to the creator, 100 to each early buyer, when a coin graduates"],
  ["Jackpot", "200 points per jackpot you win"],
];

export default function Points() {
  const { data } = usePoints();
  const { address } = useAccount();
  const me = address?.toLowerCase();
  const myRank = data?.findIndex((r) => r.who === me) ?? -1;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1fr_320px]">
      <div className="panel p-6">
        <h1 className="text-3xl font-black">Points</h1>
        <p className="mb-5 text-muted">The leaderboard for everyone building Zropad's first season.</p>
        {myRank >= 0 && data && (
          <div className="mb-4 rounded-xl border border-lime/40 bg-lime/10 p-3 text-sm">
            You&apos;re <b>#{myRank + 1}</b> with <b className="num">{data[myRank].points.toLocaleString()}</b> points.
          </div>
        )}
        <ol className="space-y-1">
          {(data ?? []).map((r, i) => (
            <li key={r.who} className={`flex items-center justify-between rounded-lg px-3 py-2 ${r.who === me ? "bg-lime/10" : i % 2 ? "" : "bg-white/[0.03]"}`}>
              <span>
                <span className="mr-3 inline-block w-8 text-muted">{i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}</span>
                {r.who === me ? <b className="text-lime">you</b> : short(r.who)}
              </span>
              <span className="num font-bold">{r.points.toLocaleString()}</span>
            </li>
          ))}
        </ol>
        {data && !data.length && <div className="py-10 text-center text-muted">No points yet. Launch or buy a coin to get on the board.</div>}
      </div>
      <aside className="panel h-fit space-y-3 p-5">
        <div className="text-xs font-bold tracking-widest text-muted">HOW TO EARN</div>
        {RULES.map(([k, v]) => (
          <div key={k}>
            <div className="font-semibold">{k}</div>
            <div className="text-sm text-muted">{v}</div>
          </div>
        ))}
      </aside>
    </div>
  );
}
