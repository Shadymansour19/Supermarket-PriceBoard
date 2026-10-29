import { Skeleton } from "./Skeleton";

/** Stand-in for a single ProductCard while its page's data is still
 * loading — same rounded-xl/border/aspect-square shape, just pulsing grey
 * blocks instead of a photo, name, and price. */
function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white">
      <Skeleton className="aspect-square w-full rounded-t-xl" />
      <div className="flex flex-col gap-2 px-3 pb-3 pt-4">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-3 w-2/3 rounded-md" />
        <Skeleton className="mt-2 h-4 w-1/2 rounded-md" />
      </div>
    </div>
  );
}

/** The product grid every public listing page (catalog, deals, wholesale
 * deals, favorites) shares — same column classes as the real grid, so the
 * skeleton doesn't reflow into the actual content once it arrives. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
