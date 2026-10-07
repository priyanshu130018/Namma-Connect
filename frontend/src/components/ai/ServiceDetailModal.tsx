import React from "react";
import {
  Star,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  BookmarkPlus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency, cn } from "@/lib/utils";

interface ServiceDetailModalProps {
  service: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToTrip?: (service: any) => void;
  onSelect?: (service: any) => void;
  className?: string;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  isOpen,
  onClose,
  onAddToTrip,
  onSelect,
  className,
}) => {
  if (!service) return null;

  const fallbackImage =
    "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={service.title || "Experience Details"}
      className={cn("max-w-2xl overflow-hidden p-0", className)}
    >
      <div className="space-y-4">
        {/* Hero Image */}
        <div className="relative h-56 sm:h-64 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <img
            src={service.primary_image || fallbackImage}
            alt={service.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Top category & Rating */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider shadow-sm">
              {service.category || "Rural Experience"}
            </span>

            {service.rating && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-sm">
                <Star className="h-3.5 w-3.5 fill-slate-950" />
                {service.rating} / 5.0
              </span>
            )}
          </div>

          {/* Bottom Title & Location */}
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h3 className="text-base sm:text-lg font-bold drop-shadow-md">
              {service.title}
            </h3>
            {service.district && (
              <p className="text-xs text-emerald-300 flex items-center gap-1 mt-0.5 drop-shadow-xs">
                <MapPin className="h-3.5 w-3.5" />
                <span>{service.location ? `${service.location}, ` : ""}{service.district}</span>
              </p>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 pt-0 space-y-4 text-xs sm:text-sm">
          {/* Provider / Host Info */}
          {service.provider_name && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Verified Host</span>
                  <span className="font-bold text-slate-900 dark:text-white">{service.provider_name}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                100% Verified
              </span>
            </div>
          )}

          {/* Description */}
          {service.description && (
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400">
                About this Experience
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                {service.description}
              </p>
            </div>
          )}

          {/* Amenities & Highlights */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider text-slate-400">
              Included Highlights
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Traditional Farm Tour</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Authentic Karnataka Meal</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Local Expert Host</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Free 48hr Cancellation</span>
              </div>
            </div>
          </div>

          {/* Pricing & Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Total Price
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(service.price)}
              </span>
              <span className="text-[10px] text-slate-400 ml-1">/ person</span>
            </div>

            <div className="flex items-center gap-2">
              {onAddToTrip && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onAddToTrip(service);
                    onClose();
                  }}
                  className="text-xs h-9 font-semibold gap-1.5"
                >
                  <BookmarkPlus className="h-4 w-4" />
                  <span>Save to Trip</span>
                </Button>
              )}

              {onSelect && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onSelect(service);
                    onClose();
                  }}
                  className="text-xs h-9 font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm"
                >
                  <span>Select for Itinerary</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
