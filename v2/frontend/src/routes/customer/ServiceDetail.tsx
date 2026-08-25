import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Star,
  MapPin,
  CheckCircle2,
  Users,
  ShieldCheck,
  Sprout,
  ArrowLeft,
  Share2,
  Bookmark,
  Check,
  AlertCircle,
  Clock,
  ChevronRight,
  Calendar as CalendarIcon,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppImage } from "@/components/ui/image";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getServiceDetail, getServiceAvailability } from "@/services/marketplaceService";
import { getSavedStatus, saveService, removeSavedService } from "@/services/savedService";
import { ServiceDetailData, ServiceAvailabilityData, TimeSlot } from "@/types";
import { AvailabilityCalendar } from "@/components/availability/AvailabilityCalendar";
import { TimeSlotSelector } from "@/components/availability/TimeSlotSelector";
import { BookingReviewModal } from "@/components/booking/BookingReviewModal";

export function CustomerServiceDetailPage() {
  const { service_id } = useParams<{ service_id: string }>();

  // Service Detail State
  const [detail, setDetail] = useState<ServiceDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);

  // Availability Workflow State
  const [showAvailability, setShowAvailability] = useState<boolean>(false);
  const [availabilityData, setAvailabilityData] = useState<ServiceAvailabilityData | null>(null);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Selected schedule state
  const [selectedStartDate, setSelectedStartDate] = useState<string>("");
  const [selectedEndDate, setSelectedEndDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!service_id) return;

    const loadDetail = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [data, savedState] = await Promise.all([
          getServiceDetail(service_id),
          getSavedStatus(service_id).catch(() => false),
        ]);
        setDetail(data);
        setIsSaved(savedState);
      } catch (err: any) {
        setErrorMessage(
          err.response?.data?.detail ||
            "Unable to load service details. The listing may have been moved or archived."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadDetail();
  }, [service_id]);

  const handleSaveToggle = async () => {
    if (!service_id) return;
    const nextState = !isSaved;
    setIsSaved(nextState);
    try {
      if (nextState) {
        await saveService(service_id);
      } else {
        await removeSavedService(service_id);
      }
    } catch {
      setIsSaved(!nextState);
    }
  };

  const loadAvailability = async () => {
    if (!service_id) return;
    setIsAvailabilityLoading(true);
    setAvailabilityError(null);
    try {
      const data = await getServiceAvailability(service_id);
      setAvailabilityData(data);

      // Auto-select first available date if none selected
      const firstAvail = data.days.find((d) => d.is_available);
      if (firstAvail && !selectedStartDate) {
        setSelectedStartDate(firstAvail.date);
        if (firstAvail.time_slots && firstAvail.time_slots.length > 0) {
          const firstSlot = firstAvail.time_slots.find((s) => s.is_available);
          if (firstSlot) setSelectedSlot(firstSlot);
        }
      }
    } catch (err: any) {
      setAvailabilityError(
        err.response?.data?.detail ||
          "Unable to fetch live availability calendar. Please try again."
      );
    } finally {
      setIsAvailabilityLoading(false);
    }
  };

  const handleOpenAvailability = () => {
    setShowAvailability(true);
    if (!availabilityData) {
      loadAvailability();
    }
  };

  // Find day object for the currently selected date to extract time slots
  const currentDayAvailability = useMemo(() => {
    if (!availabilityData || !selectedStartDate) return null;
    return availabilityData.days.find((d) => d.date === selectedStartDate) || null;
  }, [availabilityData, selectedStartDate]);

  const handleSelectDate = (dateStr: string) => {
    setSelectedStartDate(dateStr);
    setSelectedEndDate("");

    // Update slots for new date
    if (availabilityData) {
      const day = availabilityData.days.find((d) => d.date === dateStr);
      if (day && day.time_slots && day.time_slots.length > 0) {
        const availSlot = day.time_slots.find((s) => s.is_available);
        setSelectedSlot(availSlot || null);
      } else {
        setSelectedSlot(null);
      }
    }
  };

  const handleSelectDateRange = (startDate: string, endDate: string) => {
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-9 w-3/4 rounded-xl" />
          <Skeleton className="h-4 w-1/3 rounded-md" />
        </div>
        <Skeleton className="aspect-[16/8] w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !detail) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Service Not Found</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{errorMessage}</p>
        <Link to="/app/explore">
          <Button variant="outline" className="mt-2 font-bold">
            Back to Marketplace Catalog
          </Button>
        </Link>
      </div>
    );
  }

  const { service, reviews } = detail;
  const images = service.images && service.images.length > 0 ? service.images : [service.primary_image];
  const activeImage = images[selectedImageIdx] || service.primary_image;

  const isStay = service.category_slug === "stay";
  const requiresTimeSlot = availabilityData?.booking_model === "time_slot";
  const isValidSelection =
    selectedStartDate &&
    (!isStay || selectedEndDate) &&
    (!requiresTimeSlot || selectedSlot);

  return (
    <div className="space-y-8 pb-16">
      {/* ── 1. Top Navigation & Actions ── */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/explore"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveToggle}
            aria-label={isSaved ? "Remove saved service" : "Save service"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
            aria-label="Share listing"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── 2. Main Title & Badges ── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" className="text-xs bg-harvest-600 text-white">
            {service.category}
          </Badge>
          <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
            <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            <span>{Number(service.rating).toFixed(2)}</span>
            <span className="text-slate-400 font-normal">({service.reviews_count} verified reviews)</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          {service.title}
        </h1>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
          <MapPin className="h-4 w-4 text-harvest-700 shrink-0" />
          <span>{service.location}</span>
        </div>
      </div>

      {/* ── 3. Media Gallery ── */}
      <div className="space-y-3">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm max-h-[480px]">
          <AppImage
            src={activeImage}
            alt={service.title}
            aspectRatio="wide"
            className="w-full object-cover"
          />
        </div>

        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImageIdx(idx)}
                className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                  selectedImageIdx === idx
                    ? "border-harvest-600 shadow-sm scale-105"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={img} alt={`${service.title} ${idx + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Main Content Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details & Host Bio */}
        <div className="lg:col-span-7 space-y-6">
          {/* Host Profile Card */}
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-harvest-100 dark:bg-harvest-950/80 text-harvest-800 dark:text-harvest-300 flex items-center justify-center font-black text-lg shadow-sm">
                {service.provider_name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{service.provider_name}</h3>
                  {service.is_verified && (
                    <span title="Verified Agricultural Host">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{service.provider_type}</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Aadhaar & Land Verified</span>
            </div>
          </Card>

          {/* About Experience */}
          <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">About This Agricultural Experience</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {service.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              {service.duration_hours && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Clock className="h-4 w-4 text-harvest-700 dark:text-harvest-400" />
                  <span>Duration: {service.duration_hours}h</span>
                </div>
              )}
              {service.max_capacity && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Users className="h-4 w-4 text-harvest-700 dark:text-harvest-400" />
                  <span>Max Capacity: {service.max_capacity} guests</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Sprout className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>100% Organic Farm</span>
              </div>
            </div>
          </Card>

          {/* Inclusions & Highlights */}
          {service.inclusions && service.inclusions.length > 0 && (
            <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">What's Included in This Experience</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {service.inclusions.map((inc, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{inc}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Amenities & Farm Features */}
          {service.amenities && service.amenities.length > 0 && (
            <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Property & Estate Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {service.amenities.map((amenity, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <Check className="h-3.5 w-3.5 text-harvest-700 dark:text-harvest-400" />
                    {amenity}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Verified Customer Reviews */}
          <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Verified Customer Reviews</h3>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                <span>{Number(service.rating).toFixed(2)} / 5.0</span>
              </div>
            </div>

            {reviews.length > 0 ? (
              <div className="space-y-4 pt-2">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{rev.user_name}</span>
                        {rev.is_verified !== false && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded-full">
                            Verified Booking
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.round(rev.rating)
                                ? "fill-amber-400 text-amber-500"
                                : "text-slate-200 dark:text-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{rev.comment}</p>
                    {rev.created_at && (
                      <p className="text-[10px] text-slate-400 font-medium">
                        {formatDate(rev.created_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                No reviews published yet for this new farm listing.
              </p>
            )}
          </Card>
        </div>

        {/* Right Column: Pricing & Availability Workspace */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-6">
            {/* Pricing Header */}
            <div>
              <span className="text-xs text-slate-400 font-medium block">Starting Price</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {formatCurrency(service.price)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ {service.unit}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-harvest-50/70 border border-harvest-100 space-y-1 text-xs text-harvest-950">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="h-4 w-4 text-harvest-700" />
                <span>Authoritative Backend Pricing</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Direct bank settlement ensures 95% reaches the host family.
              </p>
            </div>

            {/* Step 1: Trigger Check Availability if not already opened */}
            {!showAvailability && (
              <Button
                size="lg"
                onClick={handleOpenAvailability}
                className="w-full font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl gap-2 shadow-md"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>Check Availability</span>
              </Button>
            )}

            {/* Step 2: Interactive Availability Calendar & Slot Matrix */}
            {showAvailability && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Live Schedule Matrix
                  </span>
                  <button
                    onClick={loadAvailability}
                    disabled={isAvailabilityLoading}
                    title="Refresh availability"
                    className="p-1 text-slate-400 hover:text-harvest-700 transition-colors"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isAvailabilityLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Availability Error Banner */}
                {availabilityError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                    <p>{availabilityError}</p>
                    <Button size="sm" variant="outline" onClick={loadAvailability}>
                      Retry
                    </Button>
                  </div>
                )}

                {/* Calendar Component */}
                {availabilityData && (
                  <AvailabilityCalendar
                    days={availabilityData.days}
                    bookingModel={availabilityData.booking_model}
                    selectedDate={selectedStartDate}
                    selectedEndDate={selectedEndDate}
                    onSelectDate={handleSelectDate}
                    onSelectDateRange={handleSelectDateRange}
                    isLoading={isAvailabilityLoading}
                  />
                )}

                {/* Time Slots Selector (For Experiences, Tours, Workshops) */}
                {requiresTimeSlot && currentDayAvailability && (
                  <TimeSlotSelector
                    slots={currentDayAvailability.time_slots}
                    selectedSlotId={selectedSlot?.id}
                    onSelectSlot={(slot) => {
                      setSelectedSlot(slot);
                    }}
                    isLoading={isAvailabilityLoading}
                  />
                )}

                {/* Selected Schedule Summary */}
                {selectedStartDate && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs text-slate-700">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Selected Schedule:</span>
                      <span className="text-emerald-700 font-bold">Valid & Available</span>
                    </div>
                    <div>
                      <strong>Date:</strong> {selectedStartDate}
                      {selectedEndDate && ` to ${selectedEndDate}`}
                    </div>
                    {selectedSlot && (
                      <div>
                        <strong>Slot:</strong> {selectedSlot.start_time} – {selectedSlot.end_time} ({selectedSlot.remaining_capacity} spots remaining)
                      </div>
                    )}
                  </div>
                )}

                {/* Stage 3: Continue to Booking Review Action */}
                <Button
                  size="lg"
                  disabled={!isValidSelection || isAvailabilityLoading}
                  onClick={() => setIsReviewModalOpen(true)}
                  className="w-full font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl gap-2 shadow-md disabled:opacity-50"
                >
                  <span>Continue to Booking</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── 5. Booking Review & Confirmation Modal ── */}
      <BookingReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        service={service}
        startDate={selectedStartDate}
        endDate={selectedEndDate}
        selectedSlot={selectedSlot}
      />
    </div>
  );
}
