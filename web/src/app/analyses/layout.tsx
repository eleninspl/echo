import type { Metadata } from "next";
import { Suspense } from "react";

import { AnalysisShell, ConsoleSkeleton } from "@/components/analysis-view";

export const metadata: Metadata = { title: null };

export default function AnalysesLayout({ children }: LayoutProps<"/analyses">) {
  return (
    <Suspense fallback={<ConsoleSkeleton />}>
      <AnalysisShell>{children}</AnalysisShell>
    </Suspense>
  );
}
