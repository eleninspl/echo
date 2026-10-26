import type { ReactNode } from "react";

import { Console } from "@/components/analysis-view";

export default function GuestsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Console />
      {children}
    </>
  );
}
