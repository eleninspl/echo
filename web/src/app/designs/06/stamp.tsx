import type { CSSProperties, ReactNode } from "react";

import { styles } from "./styles";

export function Stamp({
  children,
  sub,
  angle = -6,
  className = "",
  thunk = false,
  order = 0,
}: {
  children: ReactNode;
  sub?: ReactNode;
  angle?: number;
  className?: string;
  thunk?: boolean;
  order?: number;
}) {
  return (
    <span
      className={`${styles.stamp} ${thunk ? styles.thunk : ""} ${className}`}
      style={{ "--angle": `${angle}deg`, "--order": order } as CSSProperties}
    >
      <span>{children}</span>
      {sub && <span className={styles.stampSub}>{sub}</span>}
    </span>
  );
}

export function InkFilter() {
  return (
    <svg aria-hidden width="0" height="0" className="pointer-events-none absolute" focusable="false">
      <filter id="d06-ink" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="grain" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="grain"
          scale="1.7"
          xChannelSelector="R"
          yChannelSelector="G"
          result="rough"
        />
        <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="11" result="speck" />
        <feColorMatrix
          in="speck"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.6 0 0 0 2.3"
          result="wear"
        />
        <feComposite in="rough" in2="wear" operator="in" />
      </filter>
    </svg>
  );
}
