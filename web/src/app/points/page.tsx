"use client";

import { Trophy } from "lucide-react";
import { useAccount } from "wagmi";
import { usePoints } from "@/lib/api";
import { short } from "@/lib/format";
import { TOKEN } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";
import { Empty, Rows } from "@/components/column";

const RULES: [string, string][] = [
  ["Buy", "1,000 points per 1 native coin you buy"],
  ["Early buyer", "Double points as one of a coin's first 50 buyers"],
  ["Launch", "50 points per coin you launch"],
  ["Graduation", "500 to the creator, 100 to each early buyer, when a coin graduates"],
  ["Jackpot", "200 points per jackpot you win"],
];

export default function Points() {
  const { data } = usePoints();
  const me = useAccount().address?.toLowerCase();
  const myRank = data?.findIndex((r) => r.who === me) ?? -1;

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_300px]">
      <div className="space-y-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><Trophy className="size-5 text-gold" /> Points</h1>
          <p className="mt-1 text-sm text-muted-foreground">Season one: everyone trading and launching on Elypad, ranked. Points track your activity ahead of ${TOKEN}, Elypad&apos;s platform token.</p>
        </div>
        {myRank >= 0 && data && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
            You&apos;re <span className="font-semibold">#{myRank + 1}</span> with <span className="num font-semibold text-primary">{data[myRank].points.toLocaleString()}</span> points.
          </div>
        )}
        <div className="panel overflow-hidden">
          {!data ? (
            <Rows />
          ) : data.length ? (
            data.map((r, i) => (
              <div key={r.who} className={cn("flex items-center gap-3 border-b border-border/60 px-4 py-2.5 last:border-0", r.who === me && "bg-primary/5")}>
                <span className={cn("num w-6 text-right text-xs", i < 3 ? "font-semibold text-gold" : "text-muted-foreground")}>{i + 1}</span>
                <Avatar seed={r.who} className="size-7" />
                <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{r.who === me ? "you" : short(r.who)}</span>
                <span className="num text-[13px] font-semibold text-up">{r.points.toLocaleString()}</span>
              </div>
            ))
          ) : (
            <Empty>No points yet. Launch or buy a coin to get on the board.</Empty>
          )}
        </div>
      </div>
      <aside className="panel h-fit space-y-3 p-4 lg:sticky lg:top-28">
        <p className="label">How to earn</p>
        {RULES.map(([k, v]) => (
          <div key={k}>
            <p className="text-[13px] font-semibold">{k}</p>
            <p className="text-xs text-muted-foreground">{v}</p>
          </div>
        ))}
      </aside>
    </div>
  );
}
