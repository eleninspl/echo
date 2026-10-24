import type { Metadata } from "next";
import { Suspense } from "react";

import { AnalysisView, GallerySkeleton } from "@/components/analysis-view";

export const metadata: Metadata = { title: "Guests" };

export default function AnalysisPage({ params }: PageProps<"/analyses/[id]">) {
  return (
    <Suspense fallback={<GallerySkeleton />}>
      <Analysis params={params} />
    </Suspense>
  );
}

async function Analysis({ params }: Pick<PageProps<"/analyses/[id]">, "params">) {
  const { id } = await params;
  return <AnalysisView key={id} id={id} />;
}
