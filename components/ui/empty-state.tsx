import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

/**
 * État vide réutilisable pour les listes sans résultat (tournois, matchs,
 * paris…). Centré, ton World Cup discret.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 px-6 py-16 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-linear-to-br from-emerald-500/15 via-yellow-500/10 to-red-500/15">
          <Icon className="size-7 text-muted-foreground" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
