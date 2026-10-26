"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

export function useReveal<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        seen.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    seen.observe(element);
    return () => seen.disconnect();
  }, []);

  return [ref, shown];
}

export function Reveal({ className = "", children }: { className?: string; children: ReactNode }) {
  const [ref, shown] = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} data-shown={shown || undefined} className={`group ${className}`}>
      {children}
    </div>
  );
}
