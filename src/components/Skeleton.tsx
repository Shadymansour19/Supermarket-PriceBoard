/** A pulsing placeholder block — the shared building block every loading
 * skeleton on the site composes from, instead of each page rolling its
 * own shimmer. No default border-radius: Tailwind's generated CSS order
 * isn't the same as class-string order, so a caller's own `rounded-*`
 * isn't guaranteed to beat one baked in here (confirmed — a `rounded-full`
 * passed in lost to a hardcoded `rounded-md` once). Every call site passes
 * its own rounding class instead. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-200 ${className}`} aria-hidden="true" />;
}
