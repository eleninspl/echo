"use client";

import { useEffect, useState } from "react";

import { echo, type Health, type Show } from "@/lib/echo";

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [featured, setFeatured] = useState<{ show: Show; analysis_id: string }[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([echo.health(), echo.featured()])
      .then(([h, f]) => {
        setHealth(h);
        setFeatured(f.featured);
      })
      .catch((error: Error) => setProblem(error.message));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold">Echo</h1>
      <p className="text-zinc-600 dark:text-zinc-400">Find the guest who carries your voice to new ears.</p>
      <p className="text-sm">
        {problem
          ? `Engine not reachable: ${problem}`
          : health
            ? `Engine ok${health.mock ? " (mock data)" : ""}`
            : "Checking the engine…"}
      </p>
      <ul className="flex flex-col gap-2">
        {featured.map(({ show, analysis_id }) => (
          <li key={analysis_id} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="font-medium">{show.title}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">{show.description}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
