export const FRAME = "mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12";

export const GRID = "grid grid-cols-4 gap-x-4 md:grid-cols-12 md:gap-x-6";

export const DISPLAY = "font-bold tracking-[-0.03em]";

export function percent(value: number | null): string {
  return value === null ? "–" : String(Math.round(value * 100));
}
