"use client";

import { useEffect, useState } from "react";
import { setSound, soundOn } from "@/lib/sound";

export function SoundToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(soundOn()), []);
  return (
    <button className="btn btn-ghost px-3" title={on ? "Sound on" : "Sound off"} onClick={() => (setSound(!on), setOn(!on))}>
      {on ? "🔊" : "🔈"}
    </button>
  );
}
