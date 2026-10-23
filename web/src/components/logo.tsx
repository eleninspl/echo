// The mark from brand/, drawn in the current text colour so it prints in ink on the blue field.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ mask: "url(/logo-mark.svg) center / contain no-repeat" }}
    />
  );
}

// The logo's ring alone, the one bullet the app uses. Filled in vermilion, it marks a sweet spot,
// so the mark doesn't rest on hue alone.
export function Ring({ className = "", sweet = false }: { className?: string; sweet?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className={`inline-block shrink-0 ${className}`}>
      <circle
        cx="6"
        cy="6"
        r="4"
        fill={sweet ? "var(--vermilion)" : "none"}
        stroke="currentColor"
        strokeWidth={sweet ? 1.6 : 2.2}
      />
    </svg>
  );
}
