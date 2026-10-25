import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

import { Logo } from "@/components/logo";

import { styles } from "./styles";

export const INK = {
  paper: "#f3ecdf",
  pink: "#ff48b0",
  blue: "#3255a4",
  overprint: "#321871",
} as const;

export const INK_VARS = {
  "--paper": INK.paper,
  "--pink": INK.pink,
  "--blue": INK.blue,
  "--overprint": INK.overprint,
} as CSSProperties;

type Tone = (x: number, y: number) => number;

const round = (value: number) => (Math.round(value * 10) / 10).toString();

export function halftone({
  width,
  height,
  step,
  angle,
  tone,
  maxRadius = step * 0.56,
}: {
  width: number;
  height: number;
  step: number;
  angle: number;
  tone: Tone;
  maxRadius?: number;
}): string {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const span = Math.ceil(Math.hypot(width, height) / step / 2) + 1;
  const centerX = width / 2;
  const centerY = height / 2;
  const dots: string[] = [];
  for (let i = -span; i <= span; i++) {
    for (let j = -span; j <= span; j++) {
      const u = i * step;
      const v = j * step;
      const x = centerX + u * cos - v * sin;
      const y = centerY + u * sin + v * cos;
      if (x < 0 || y < 0 || x > width || y > height) continue;
      const strength = tone(x, y);
      if (strength < 0.04) continue;
      const r = maxRadius * Math.sqrt(Math.min(strength, 1));
      dots.push(`M${round(x - r)} ${round(y)}a${round(r)} ${round(r)} 0 1 0 ${round(2 * r)} 0a${round(r)} ${round(r)} 0 1 0 ${round(-2 * r)} 0`);
    }
  }
  return dots.join("");
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function InkDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute" focusable="false">
      <defs>
        <filter id="d04-ink" x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="7" result="grain" />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1.7 0 0 0 1.78"
            result="mottle"
          />
          <feComposite in="SourceGraphic" in2="mottle" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3" result="warp" />
          <feDisplacementMap in="inked" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="d04-ink-text" x="-2%" y="-4%" width="104%" height="108%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="grain" />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -1.5 0 0 0 1.72"
            result="mottle"
          />
          <feComposite in="SourceGraphic" in2="mottle" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="5" result="warp" />
          <feDisplacementMap in="inked" in2="warp" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <pattern id="d04-dots-blue" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
          <circle cx="2.5" cy="2.5" r="1.3" fill={INK.blue} />
        </pattern>
        <pattern id="d04-dots-pink" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(75)">
          <circle cx="2.5" cy="2.5" r="1.45" fill={INK.pink} />
        </pattern>
        <pattern id="d04-dots-blue-fine" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
          <circle cx="1.7" cy="1.7" r="0.85" fill={INK.blue} />
        </pattern>
        <marker
          id="d04-arrowhead"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M0 0.5 L10 5 L0 9.5 L2.6 5 z" fill={INK.overprint} />
        </marker>
      </defs>
    </svg>
  );
}

export function Overprint({
  children,
  className = "",
  as: Tag = "span",
  textured = false,
}: {
  children: ReactNode;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  textured?: boolean;
}) {
  return (
    <Tag className={`${styles.overprint} ${textured ? styles.textured : ""} ${className}`}>
      <span className={styles.inkBlue}>{children}</span>
      <span aria-hidden className={styles.inkPink}>
        {children}
      </span>
    </Tag>
  );
}

export function OverprintMark({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`relative inline-block shrink-0 isolate ${className}`}>
      <Logo className="absolute inset-0 size-full text-(--blue) mix-blend-multiply" />
      <Logo className="absolute inset-0 size-full translate-x-[-6%] translate-y-[5%] text-(--pink) mix-blend-multiply" />
    </span>
  );
}

export function RegistrationMark({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={`${className}`} focusable="false">
      <g fill="none" strokeWidth="1.4" style={{ mixBlendMode: "multiply" }}>
        <g stroke={INK.blue}>
          <circle cx="20" cy="20" r="9" />
          <path d="M20 2v36M2 20h36" />
        </g>
        <g stroke={INK.pink} transform="translate(-1.4 1.1)">
          <circle cx="20" cy="20" r="9" />
          <path d="M20 2v36M2 20h36" />
        </g>
      </g>
    </svg>
  );
}

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

const COVER_LAYOUTS = [
  { pink: [38, 40, 30], blue: [64, 62, 30] },
  { pink: [50, 64, 34], blue: [62, 34, 24] },
  { pink: [66, 46, 28], blue: [36, 56, 32] },
  { pink: [44, 58, 36], blue: [70, 30, 20] },
] as const;

export function initials(title: string) {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word && !/^(the|a|an)$/i.test(word));
  return ((words[0] ?? title.trim()).charAt(0) || "?").toUpperCase();
}

export function RisoCover({
  title,
  imageUrl,
  size,
  duotone = false,
  className = "",
}: {
  title: string;
  imageUrl: string | null;
  size?: number;
  duotone?: boolean;
  className?: string;
}) {
  const dimensions = size ? { width: size, height: size } : undefined;
  if (imageUrl) {
    return (
      <span
        aria-hidden
        className={`relative block shrink-0 overflow-hidden ${duotone ? "bg-(--pink)" : "bg-(--paper)"} ${styles.coverFrame} ${className}`}
        style={dimensions}
      >
        <Image
          src={imageUrl}
          alt=""
          fill
          unoptimized
          sizes={size ? `${size}px` : "16rem"}
          className={`object-cover ${duotone ? styles.duotoneImage : ""}`}
        />
        {duotone && <span className="absolute inset-0 bg-(--blue) mix-blend-screen" />}
      </span>
    );
  }

  const seed = hash(title);
  const layout = COVER_LAYOUTS[seed % COVER_LAYOUTS.length];
  const blueScreened = ((seed >> 3) & 1) === 1;
  const tilt = ((seed >> 5) % 30) - 15;
  const [pinkX, pinkY, pinkR] = layout.pink;
  const [blueX, blueY, blueR] = layout.blue;

  return (
    <span
      aria-hidden
      className={`relative @container block shrink-0 overflow-hidden bg-(--paper) ${styles.coverFrame} ${className}`}
      style={dimensions}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" focusable="false">
        <rect width="100" height="100" fill={INK.pink} opacity="0.12" />
        <g transform={`rotate(${tilt} 50 50)`} filter="url(#d04-ink)">
          <circle cx={pinkX} cy={pinkY} r={pinkR} fill={INK.pink} style={{ mixBlendMode: "multiply" }} />
          <circle
            cx={blueX + 1.5}
            cy={blueY - 1}
            r={blueR}
            fill={blueScreened ? "url(#d04-dots-blue-fine)" : INK.blue}
            style={{ mixBlendMode: "multiply" }}
          />
        </g>
      </svg>
      <span
        className={`${styles.display} absolute inset-0 flex items-center justify-center leading-none text-(--overprint) mix-blend-multiply`}
        style={{ fontSize: "58cqw" }}
      >
        {initials(title)}
      </span>
    </span>
  );
}
