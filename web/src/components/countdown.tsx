"use client";

import { useEffect, useState } from "react";
import { clock } from "@/lib/format";

/** A live countdown to a unix time. Turns red in the last minute. */
export function Countdown({ to, className = "" }: { to: number; className?: string }) {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), 250);
    return () => clearInterval(t);
  }, []);
  const left = to - now;
  return <span className={`num ${left < 60 ? "text-down" : ""} ${className}`}>{left <= 0 ? "00:00" : clock(left)}</span>;
}
