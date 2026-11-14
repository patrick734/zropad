"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { setSound, soundOn } from "@/lib/sound";
import { buttonClass } from "./ui/button";

/** Turns the trade sounds on or off (off until you choose). */
export function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(soundOn()), []);
  return (
    <button className={buttonClass({ variant: "ghost", size: "icon-sm", className: "size-9" })} title={on ? "Sounds on" : "Sounds off"} aria-label={on ? "Turn sounds off" : "Turn sounds on"} onClick={() => (setSound(!on), setOn(!on))}>
      {on ? <Volume2 className="size-4 text-primary" /> : <VolumeX className="size-4" />}
    </button>
  );
}
