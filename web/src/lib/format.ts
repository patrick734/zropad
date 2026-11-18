import { NATIVE } from "./config";

export const short = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");

const SUB = "₀₁₂₃₄₅₆₇₈₉";
/** Tiny amounts with the run of zeros counted in subscript: 0.0₁₀318 = 0.0000000000318. */
function tiny(v: number) {
  const zeros = -Math.floor(Math.log10(Math.abs(v))) - 1;
  const digits = Math.round(Math.abs(v) * 10 ** (zeros + 4)).toString().replace(/0+$/, "") || "0";
  return `${v < 0 ? "-" : ""}0.0${String(zeros).split("").map((d) => SUB[Number(d)]).join("")}${digits}`;
}

/** A native amount for people: 4.2, 0.0125, 0.00004, 0.0₁₀318. */
export function nat(v: number | null | undefined, digits = 4) {
  if (v == null || !isFinite(v)) return "—";
  if (v === 0) return "0";
  if (Math.abs(v) < 1e-6) return tiny(v);
  if (Math.abs(v) >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (Math.abs(v) >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 3 });
  const p = Math.max(digits, -Math.floor(Math.log10(Math.abs(v))) + 2);
  return v.toFixed(Math.min(p, 10)).replace(/0+$/, "").replace(/\.$/, "");
}

export const natSym = (v: number | null | undefined, digits?: number) => `${nat(v, digits)} ${NATIVE}`;

/** Big coin amounts: 12.3M, 840K. */
export function compact(v: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v);
}

export function ago(t: number) {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - t);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function clock(secs: number) {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 ? 2 : 0)}%`;

/** A signed profit: +0.12 ETH / -0.03 ETH. */
export const pnl = (v: number) => `${v >= 0 ? "+" : "-"}${nat(Math.abs(v), 3)} ${NATIVE}`;
