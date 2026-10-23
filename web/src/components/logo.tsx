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

// The logo's ring alone, the one bullet the app uses.
export function Ring({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className={`inline-block shrink-0 ${className}`}>
      <circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}
