import type { ReactNode } from "react";

import { styles } from "./styles";

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p
      className={`${styles.typed} flex items-center gap-3 text-[0.8rem] font-bold tracking-[0.1em] text-(--d-ink-soft) uppercase`}
    >
      <span aria-hidden className="h-[2px] w-7 shrink-0 bg-(--d-red)" />
      {children}
    </p>
  );
}
