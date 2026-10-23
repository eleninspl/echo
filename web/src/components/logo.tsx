// The mark from brand/, drawn in the current text colour.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{ mask: "url(/logo-mark.svg) center / contain no-repeat" }}
    />
  );
}
