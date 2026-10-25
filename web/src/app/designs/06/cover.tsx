import Image from "next/image";

import type { Show } from "@/lib/echo";

import { styles } from "./styles";
import { stockFor } from "./tokens";

export function Cover({ show, size, clipped = true }: { show: Show; size: number; clipped?: boolean }) {
  const stock = stockFor(show.title);
  const initial = show.title.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {show.image_url ? (
        <Image
          src={show.image_url}
          alt=""
          width={size}
          height={size}
          unoptimized
          className="h-full w-full rounded-[3px] object-cover shadow-[0_0_0_1px_rgb(60_40_20/0.15),0_6px_14px_-8px_rgb(60_40_20/0.6)]"
        />
      ) : (
        <span
          aria-hidden
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[3px] shadow-[0_0_0_1px_rgb(60_40_20/0.12),0_6px_14px_-8px_rgb(60_40_20/0.6)]"
          style={{ background: stock.paper, color: stock.ink }}
        >
          <span
            className="absolute inset-[5px] rounded-[2px] border border-current opacity-25"
            style={{ borderStyle: "dashed" }}
          />
          <span className={`${styles.serif} leading-none font-medium italic`} style={{ fontSize: size * 0.56 }}>
            {initial}
          </span>
        </span>
      )}
      {clipped && <PaperClip className="absolute -top-[9px] left-[14%] h-[46%] max-h-12 min-h-7" />}
    </span>
  );
}

function PaperClip({ className }: { className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 42" className={className} fill="none">
      <path
        d="M11.5 13 V33.5 a4.5 4.5 0 0 1 -9 0 V7.5 a3.6 3.6 0 0 1 7.2 0 V30.5 a1.7 1.7 0 0 1 -3.4 0 V13"
        stroke="rgb(60 50 40 / 0.35)"
        strokeWidth="2.6"
        strokeLinecap="round"
        transform="translate(0.8 1)"
      />
      <path
        d="M11.5 13 V33.5 a4.5 4.5 0 0 1 -9 0 V7.5 a3.6 3.6 0 0 1 7.2 0 V30.5 a1.7 1.7 0 0 1 -3.4 0 V13"
        stroke="#9a958d"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M2.5 30 V7.5 a3.6 3.6 0 0 1 7.2 0"
        stroke="#d9d6d0"
        strokeWidth="0.7"
        strokeLinecap="round"
        transform="translate(-0.3 0)"
      />
    </svg>
  );
}
