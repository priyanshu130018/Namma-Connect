import { cn } from "@/lib/utils";

/** Consistent card surface used across every page and dashboard. */
export function Card({
  className,
  hover,
  padded = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-card",
        padded && "p-6",
        hover && "card-hover",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

/** Compact metric tile for dashboards. */
export function StatCard({
  label,
  value,
  icon,
  hint,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex items-start gap-4", className)}>
      {icon ? (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-role-soft text-role">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </Card>
  );
}

export default Card;
