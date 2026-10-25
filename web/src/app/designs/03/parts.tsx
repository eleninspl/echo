import Image from "next/image";

import type { Label, Show } from "@/lib/echo";

import { s } from "./styles";

export const LABEL_NAME: Record<Label, string> = {
  sweet_spot: "Sweet spot",
  safe: "Safe",
  far: "Far",
  long_shot: "Long shot",
  balanced: "Balanced",
};

export function reading(value: number | null | undefined) {
  if (value === null || value === undefined) return "--";
  return String(Math.round(value * 100)).padStart(2, "0");
}

export function Screw({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`${s.screw} block size-3.5 ${className}`} />;
}

export function Screws() {
  return (
    <>
      <Screw className="absolute top-3 left-3 rotate-[20deg]" />
      <Screw className="absolute top-3 right-3 -rotate-[35deg]" />
      <Screw className="absolute bottom-3 left-3 rotate-[70deg]" />
      <Screw className="absolute right-3 bottom-3 rotate-[5deg]" />
    </>
  );
}

export function Led({ on, onScreen = false, className = "size-2" }: { on: boolean; onScreen?: boolean; className?: string }) {
  return <span aria-hidden className={`${s.led} ${on ? s.ledOn : onScreen ? s.ledScreenOff : ""} shrink-0 ${className}`} />;
}

export function Cover({ show, size }: { show: Show; size: number }) {
  if (show.image_url) {
    return (
      <Image
        src={show.image_url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-[6px] object-cover shadow-[0_0_0_1px_var(--screen-line)]"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${s.dotGrid} ${s.dot} relative flex shrink-0 items-center justify-center rounded-[6px] bg-(--screen-hi) font-black text-(--lcd) uppercase shadow-[0_0_0_1px_var(--screen-line)]`}
      style={{ width: size, height: size, fontSize: size * 0.62, lineHeight: 1 }}
    >
      {show.title.trim().charAt(0)}
      <span className={`${s.led} ${s.ledOn} absolute top-[12%] right-[12%] size-1`} />
    </span>
  );
}

export function LedBar({
  value,
  name,
  segments = 10,
  className = "",
}: {
  value: number | null;
  name: string;
  segments?: number;
  className?: string;
}) {
  const lit = value === null ? 0 : Math.round(Math.min(Math.max(value, 0), 1) * segments);
  return (
    <span className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className={`${s.label} flex items-baseline justify-between gap-2 text-[0.625rem] text-(--lcd-dim)`}>
        <span className="truncate">{name}</span>
        <span className={`${s.mono} tracking-normal text-(--lcd)`}>{reading(value)}</span>
      </span>
      <span aria-hidden className="flex h-2 gap-[2px]">
        {Array.from({ length: segments }, (_, index) => (
          <span
            key={index}
            className={`flex-1 rounded-[1px] ${index < lit ? "bg-(--lcd)" : "bg-(--screen-line)"}`}
          />
        ))}
      </span>
    </span>
  );
}
