import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { FiAlertTriangle, FiInbox, FiRefreshCw, FiX } from "react-icons/fi";
import { cn } from "@/lib/utils";

/* ── Badge ─────────────────────────────────────────────────────────────── */

const TONES = {
  neutral: "bg-muted text-muted-foreground",
  role: "bg-role-soft text-role",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-tourist-soft text-tourist",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  confirmed: "success",
  completed: "success",
  approved: "success",
  active: "success",
  paid: "success",
  verified: "success",
  published: "success",
  pending: "warning",
  processing: "warning",
  review: "warning",
  draft: "warning",
  cancelled: "danger",
  rejected: "danger",
  failed: "danger",
  suspended: "danger",
  open: "info",
};

export function StatusBadge({ status }: { status: string }) {
  const key = String(status).toLowerCase();
  return (
    <Badge tone={STATUS_TONE[key] ?? "neutral"}>
      <span className="size-1.5 rounded-full bg-current" />
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

/* ── Avatar ────────────────────────────────────────────────────────────── */

const AV_SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-base" };

export function Avatar({
  name = "",
  src,
  size = "md",
  className,
}: {
  name?: string;
  src?: string;
  size?: keyof typeof AV_SIZES;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-role-soft font-semibold text-role",
        AV_SIZES[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" loading="lazy" />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

/* ── Skeleton ──────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="surface-card space-y-3 p-4">
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <FiInbox size={20} />}
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ── Error state ───────────────────────────────────────────────────────── */

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "surface-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <FiAlertTriangle size={20} />
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <FiRefreshCw size={14} /> Try again
        </button>
      ) : null}
    </div>
  );
}

/* ── Modal ─────────────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const max = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl" }[size];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : "Dialog"}
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={cn(
              "surface-card relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-b-none sm:rounded-b-xl",
              max,
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div className="min-w-0">
                {title ? (
                  <h2 className="text-base font-semibold text-foreground">{title}</h2>
                ) : null}
                {description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="p-5">{children}</div>
            {footer ? (
              <div className="flex justify-end gap-2 border-t border-border p-5">{footer}</div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ── Drawer ────────────────────────────────────────────────────────────── */

export function Drawer({
  open,
  onClose,
  title,
  side = "right",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  side?: "left" | "right";
  children?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/40" onClick={onClose} aria-hidden />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: side === "right" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "right" ? "100%" : "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "absolute top-0 flex h-full w-[86%] max-w-sm flex-col border-border bg-card shadow-lg",
              side === "right" ? "right-0 border-l" : "left-0 border-r",
            )}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: string; label: ReactNode; count?: number }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "scrollbar-hide flex gap-1 overflow-x-auto rounded-lg bg-muted p-1",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === t.value
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
          {typeof t.count === "number" ? (
            <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* ── Table ─────────────────────────────────────────────────────────────── */

export type Column<T> = {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  empty,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  caption?: string;
}) {
  if (!rows.length) {
    return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  }
  return (
    <div className="surface-card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={(row["id"] as string) ?? i}
                className="border-b border-border last:border-0 hover:bg-muted/40"
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 text-foreground", c.className)}>
                    {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Lightweight charts (no extra dependency) ──────────────────────────── */

export function BarChart({
  data,
  valuePrefix = "",
  className,
}: {
  data: { label: string; value: number }[];
  valuePrefix?: string;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("flex h-48 items-end gap-2", className)}>
      {data.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground">
            {valuePrefix}
            {d.value}
          </span>
          <div
            className="w-full rounded-t-md bg-role/80 transition-all hover:bg-role"
            style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }}
            title={`${d.label}: ${valuePrefix}${d.value}`}
          />
          <span className="w-full truncate text-center text-[10px] text-muted-foreground">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LineChart({
  data,
  className,
}: {
  data: { label: string; value: number }[];
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const pts = data
    .map((d, i) => `${(i / Math.max(data.length - 1, 1)) * 100},${100 - (d.value / max) * 90}`)
    .join(" ");
  return (
    <div className={cn("space-y-2", className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label="Trend chart">
        <polyline
          points={`0,100 ${pts} 100,100`}
          fill="var(--color-role)"
          opacity="0.12"
        />
        <polyline
          points={pts}
          fill="none"
          stroke="var(--color-role)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

const DONUT_COLORS = [
  "var(--color-role)",
  "var(--color-tourist)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-farmer)",
];

export function DonutChart({
  data,
  centerValue,
  centerLabel,
  className,
}: {
  data: { label: string; value: number }[];
  centerValue?: string;
  centerLabel?: string;
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 40;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className={cn("flex flex-wrap items-center gap-6", className)}>
      <div className="relative size-44 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label="Distribution chart">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--color-muted)" strokeWidth="13" />
          {data.map((d, i) => {
            const dash = (d.value / total) * C;
            const el = (
              <circle
                key={d.label}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth="13"
                strokeDasharray={`${Math.max(dash - 1.5, 0)} ${C - dash + 1.5}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        {centerValue ? (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-xl font-bold text-foreground">{centerValue}</p>
              {centerLabel ? <p className="text-[11px] text-muted-foreground">{centerLabel}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
            />
            <span className="flex-1 truncate text-foreground">{d.label}</span>
            <span className="font-medium text-muted-foreground">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Progress ──────────────────────────────────────────────────────────── */

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-role transition-all"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

/* ── Simple confirm hook helper ────────────────────────────────────────── */

export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return {
    open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    toggle: () => setOpen((v) => !v),
  };
}
