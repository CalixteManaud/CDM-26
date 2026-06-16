import { cn } from "@/lib/utils";

/**
 * Bloc de chargement générique. Usage :
 *   <Skeleton className="h-6 w-32" />
 *   <Skeleton className="h-40 w-full rounded-xl" />
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-skeleton rounded-md bg-white/10", className)}
      {...props}
    />
  );
}

export { Skeleton };
