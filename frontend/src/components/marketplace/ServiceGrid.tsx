import { ServiceCard } from "@/components/cards/ServiceCard";
import { ServiceCardSkeleton } from "@/components/cards/ServiceCardSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { MarketplaceService } from "@/types";
import { LucideIcon, Compass } from "lucide-react";

export interface ServiceGridProps {
  services: MarketplaceService[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onSaveToggle?: (id: string, saved: boolean) => void;
  columns?: 1 | 2 | 3 | 4;
  skeletonCount?: number;
  className?: string;
}

export function ServiceGrid({
  services,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = "No services found",
  emptyDescription = "There are no listings matching your current filters. Try changing your search keywords or clearing filters.",
  emptyIcon = Compass,
  emptyActionLabel,
  onEmptyAction,
  onSaveToggle,
  columns = 4,
  skeletonCount = 8,
  className = "",
}: ServiceGridProps) {
  if (error) {
    return (
      <ErrorState
        title="Unable to load listings"
        description={error}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (isLoading) {
    const colClass =
      columns === 4
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        : columns === 3
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        : columns === 2
        ? "grid grid-cols-1 sm:grid-cols-2 gap-6"
        : "grid grid-cols-1 gap-6";

    return (
      <div className={`${colClass} ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ServiceCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        className={className}
      />
    );
  }

  const colClass =
    columns === 4
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      : columns === 3
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      : columns === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-6"
      : "grid grid-cols-1 gap-6";

  return (
    <div className={`${colClass} ${className}`}>
      {services.map((service) => (
        <ServiceCard
          key={service.id}
          service={service}
          onSaveToggle={onSaveToggle}
        />
      ))}
    </div>
  );
}
