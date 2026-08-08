import { cn } from "@/lib/utils";

/** Centered, max-width page container with consistent responsive padding. */
export function PageWrapper({
  children,
  className,
  size = "default",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "narrow" | "default" | "wide" | "full";
  as?: React.ElementType;
}) {
  const max = {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
    full: "max-w-none",
  }[size];

  return (
    <Tag className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", max, className)}>
      {children}
    </Tag>
  );
}

/** Standard page header: title, optional description and trailing actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export default PageWrapper;
