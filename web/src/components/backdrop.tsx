import type { CSSProperties, ReactNode } from "react";

import { SCORE_HUE } from "./hud";

const GLOWS = [
  { color: SCORE_HUE.reach, place: "-top-[25%] -right-[10%] size-[60vmax]", time: "18s", radius: "28%", opacity: 0.3 },
  { color: SCORE_HUE.fit, place: "-bottom-[35%] -left-[15%] size-[55vmax]", time: "22s", radius: "30%", opacity: 0.28 },
  {
    color: SCORE_HUE.love_back,
    place: "top-[20%] left-[40%] size-[42vmax]",
    time: "15s",
    radius: "34%",
    opacity: 0.22,
  },
];

export function Backdrop({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <section className={`relative isolate ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_55%,transparent)]"
      >
        {GLOWS.map(({ color, place, time, radius, opacity }, index) => (
          <div
            key={color}
            className={`orbit absolute rounded-full ${place}`}
            style={
              {
                background: `radial-gradient(closest-side, ${color}, transparent)`,
                opacity,
                "--orbit-time": time,
                "--orbit-radius": radius,
                animationDirection: index % 2 ? "reverse" : "normal",
              } as CSSProperties
            }
          />
        ))}
      </div>
      {children}
    </section>
  );
}
