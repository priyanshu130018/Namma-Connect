import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, CheckCircle2, Bookmark, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppImage } from "@/components/ui/image";
import { formatCurrency } from "@/lib/utils";
import { saveService, removeSavedService } from "@/services/savedService";
import { MarketplaceService } from "@/types";

export interface ServiceCardProps {
  service: MarketplaceService | any;
  onSaveToggle?: (id: string, saved: boolean) => void;
  isInitiallySaved?: boolean;
}

export function ServiceCard({
  service,
  onSaveToggle,
  isInitiallySaved = false,
}: ServiceCardProps) {
  const [isSaved, setIsSaved] = useState(isInitiallySaved);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !isSaved;
    setIsSaved(nextState);
    if (onSaveToggle) {
      onSaveToggle(service.id, nextState);
    } else {
      try {
        if (nextState) {
          await saveService(service.id);
        } else {
          await removeSavedService(service.id);
        }
      } catch {
        setIsSaved(!nextState);
      }
    }
  };

  const imageSrc = service.primary_image || service.imageUrl || "/images/services/fallback.jpg";
  const providerName = service.provider_name || service.providerName || "Verified Host";
  const isVerified = service.is_verified ?? service.isVerified ?? true;
  const ratingValue = Number(service.rating || 5.0);
  const reviewsCount = service.reviews_count ?? service.reviewsCount ?? 0;
  const locationName = service.location ? service.location.split(",")[0] : "Karnataka";
  const unitLabel = service.unit || "session";

  return (
    <Card hover className="group flex flex-col overflow-hidden rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all shadow-sm hover:shadow-md">
      {/* Media & Wishlist Pin */}
      <div className="relative overflow-hidden">
        <AppImage
          src={imageSrc}
          alt={service.title}
          aspectRatio="wide"
          className="group-hover:scale-105 transition-transform duration-500"
        />

        {/* Category Pill Tag */}
        <div className="absolute left-3 top-3">
          <Badge variant="secondary" className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-200 text-[11px] font-bold shadow-sm">
            {service.category}
          </Badge>
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-2xl backdrop-blur-md transition-all ${
            isSaved
              ? "bg-rose-500 text-white shadow-md"
              : "bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-rose-600 shadow-sm"
          }`}
        >
          <Bookmark className={`h-4 w-4 ${isSaved ? "fill-white" : ""}`} />
        </button>
      </div>

      {/* Content Container */}
      <div className="flex flex-1 flex-col p-5">
        {/* Rating & Location Line */}
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
          <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
            <span>{ratingValue.toFixed(2)}</span>
            <span className="text-slate-400 dark:text-slate-500 font-normal">({reviewsCount})</span>
          </div>

          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-harvest-700 dark:text-harvest-400" />
            <span className="truncate">{locationName}</span>
          </div>
        </div>

        {/* Service Title */}
        <Link to={`/app/services/${service.id}`} className="group-hover:text-harvest-700 dark:group-hover:text-harvest-400 transition-colors">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug">
            {service.title}
          </h3>
        </Link>

        {/* Provider Name with Verification Indicator */}
        <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="truncate">{providerName}</span>
          {isVerified && (
            <span title="Verified Host" className="inline-flex">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </span>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Starting from</span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                {formatCurrency(service.price)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/ {unitLabel}</span>
            </div>
          </div>

          <Link
            to={`/app/services/${service.id}`}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-harvest-50 dark:bg-harvest-950/80 px-3.5 text-xs font-bold text-harvest-800 dark:text-harvest-200 hover:bg-harvest-600 hover:text-white dark:hover:bg-harvest-600 dark:hover:text-white transition-all shadow-sm"
          >
            <span>View</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
