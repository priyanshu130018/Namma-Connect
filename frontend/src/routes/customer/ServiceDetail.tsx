import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Star,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  Share2,
  Bookmark,
  Check,
  MessageSquare,
  Navigation,
  Calendar,
  Clock,
  CreditCard,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppImage } from "@/components/ui/image";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getServiceDetail, getServiceAvailability } from "@/services/marketplaceService";
import { getSavedStatus, saveService, removeSavedService } from "@/services/savedService";
import { ServiceDetailData, TimeSlot, ServiceAvailabilityData } from "@/types";
import { TomTomMap, RouteInfo } from "@/components/map/TomTomMap";
import { calculateRoute, geocodeLocation } from "@/services/locationService";
import { BookingReviewModal } from "@/components/booking/BookingReviewModal";

export function CustomerServiceDetailPage() {
  const { service_id } = useParams<{ service_id: string }>();
  const navigate = useNavigate();

  // Service Detail State
  const [detail, setDetail] = useState<ServiceDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);

  // Availability & Booking Selection State
  const [availability, setAvailability] = useState<ServiceAvailabilityData | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState<boolean>(false);
  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Map & Directions State
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [manualOrigin, setManualOrigin] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  const handleMessageHost = () => {
    if (!detail?.service) return;
    const { provider_id, title } = detail.service;
    navigate(`/app/messages?provider_id=${provider_id}&subject=${encodeURIComponent(title)}`);
  };

  const handleGetDirections = async () => {
    if (!detail?.service) return;
    const destLat = detail.service.latitude || 12.3375;
    const destLon = detail.service.longitude || 75.8069;

    if (!navigator.geolocation) {
      setShowManualInput(true);
      setRoutingError("Geolocation is not supported by your browser. Please enter your starting location.");
      return;
    }

    setIsRouting(true);
    setRoutingError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await calculateRoute(
            pos.coords.latitude,
            pos.coords.longitude,
            destLat,
            destLon
          );
          setRouteInfo({
            distanceText: res.distance_text,
            durationText: res.duration_text,
            routePoints: res.route_points,
          });
        } catch {
          setRoutingError("Unable to calculate route. Enter your starting location manually.");
          setShowManualInput(true);
        } finally {
          setIsRouting(false);
        }
      },
      () => {
        setIsRouting(false);
        setShowManualInput(true);
        setRoutingError("Location permission was denied. Enter your starting location below.");
      },
      { timeout: 8000 }
    );
  };

  const handleManualRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrigin.trim() || !detail?.service) return;

    const destLat = detail.service.latitude || 12.3375;
    const destLon = detail.service.longitude || 75.8069;

    setIsRouting(true);
    setRoutingError(null);

    try {
      const originLoc = await geocodeLocation(manualOrigin);
      const res = await calculateRoute(originLoc.lat, originLoc.lon, destLat, destLon);
      setRouteInfo({
        distanceText: res.distance_text,
        durationText: res.duration_text,
        routePoints: res.route_points,
      });
    } catch {
      setRoutingError("Unable to calculate directions for the specified starting location.");
    } finally {
      setIsRouting(false);
    }
  };

  const loadDetail = async () => {
    if (!service_id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getServiceDetail(service_id);
      setDetail(data);

      try {
        const [savedState, availData] = await Promise.all([
          getSavedStatus(service_id).catch(() => false),
          getServiceAvailability(service_id).catch(() => null),
        ]);
        setIsSaved(savedState);
        if (availData) {
          setAvailability(availData);
        }
      } catch {
        // secondary metadata is non-blocking
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          "Service not found. The listing may have been moved or archived."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAvailability = async () => {
    if (!service_id) return;
    setIsCheckingAvailability(true);
    try {
      const availData = await getServiceAvailability(service_id);
      setAvailability(availData);
    } catch {
      // non-blocking
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  useEffect(() => {
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

  // Authoritative availability calculations for selected date
  const selectedDay = availability?.days?.find((d) => d.date === selectedDate);
  const isDateBlackout = selectedDay?.status === "BLACKOUT";
  const isSoldOut = selectedDay ? (!selectedDay.is_available || selectedDay.status === "UNAVAILABLE" || isDateBlackout || selectedDay.remaining_capacity === 0) : false;
  const isDateLimited = selectedDay?.status === "LIMITED";
  const slotsForDay: TimeSlot[] = selectedDay?.time_slots || [];

  // Keep selected slot in sync with the selected date and availability data
  useEffect(() => {
    if (slotsForDay.length > 0) {
      const currentValid = slotsForDay.find((s) => s.id === selectedSlot?.id && s.is_available && s.remaining_capacity > 0);
      if (!currentValid) {
        const firstAvail = slotsForDay.find((s) => s.is_available && s.remaining_capacity > 0);
        setSelectedSlot(firstAvail || null);
      }
    } else {
      setSelectedSlot(null);
    }
  }, [selectedDate, availability]);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-3/4 rounded-xl" />
        <Skeleton className="h-4 w-1/3 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[420px]">
          <Skeleton className="md:col-span-3 h-full rounded-3xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-1/2 rounded-2xl" />
            <Skeleton className="h-1/2 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !detail || !detail.service) {
    return (
      <div className="space-y-6 pb-16">
        <Link
          to="/app/activities"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to marketplace</span>
        </Link>
        <ErrorState
          title="Service not found"
          description={errorMessage || "The requested service listing could not be found."}
          onRetry={loadDetail}
        />
      </div>
    );
  }

  const { service, reviews = [] } = detail;
  const gallery = service.images && service.images.length > 0 ? service.images : [service.primary_image || "/images/services/fallback.jpg"];
  const availableCapacity = selectedDay?.remaining_capacity ?? service.max_capacity ?? 10;

  return (
    <div className="space-y-8 pb-16">
      {/* ── 1. Top Navigation & Action Header ── */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/activities"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to marketplace</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveToggle}
            className={`rounded-xl gap-1.5 text-xs font-bold ${
              isSaved ? "text-rose-600 border-rose-200 dark:border-rose-900 bg-rose-50/50" : ""
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
            <span>{isSaved ? "Saved" : "Save Listing"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                alert("Listing URL copied to clipboard!");
              }
            }}
            className="rounded-xl gap-1.5 text-xs font-bold"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Header Title, Rating & Host Badges ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-harvest-50 dark:bg-harvest-950/60 text-harvest-800 dark:text-harvest-300 border-harvest-200 dark:border-harvest-800 font-bold text-xs uppercase tracking-wider">
            {service.category}
          </Badge>
          {service.is_verified && (
            <Badge variant="default" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-bold text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Verified Provider</span>
            </Badge>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {service.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
            <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            <span>{Number(service.rating || 5.0).toFixed(2)}</span>
            <span className="text-slate-400 font-normal">({reviews.length} reviews)</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <MapPin className="h-4 w-4 text-harvest-700 dark:text-harvest-400 shrink-0" />
            <span>{service.location}</span>
          </div>
          <span>•</span>
          <div>
            Hosted by <strong className="text-slate-800 dark:text-slate-200">{service.provider_name || "Verified Host"}</strong>
          </div>
        </div>
      </div>

      {/* ── 3. Photo Gallery ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[360px] sm:h-[420px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
        <div className="md:col-span-3 h-full relative cursor-pointer overflow-hidden">
          <AppImage
            src={gallery[selectedImageIdx] || gallery[0]}
            alt={service.title}
            aspectRatio="wide"
            className="h-full w-full object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>

        <div className="hidden md:flex flex-col gap-4 h-full">
          {gallery.slice(0, 3).map((imgUrl, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImageIdx(idx)}
              className={`flex-1 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                selectedImageIdx === idx ? "border-harvest-600 scale-[0.98]" : "border-transparent opacity-80 hover:opacity-100"
              }`}
            >
              <AppImage
                src={imgUrl}
                alt={`${service.title} thumbnail ${idx + 1}`}
                aspectRatio="wide"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details, Description, Location, Amenities, Reviews */}
        <div className="lg:col-span-7 space-y-8">
          {/* Overview & Description */}
          <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">About this Experience</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {service.description}
            </p>
          </Card>

          {/* Location & Interactive Directions */}
          <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Location & Getting There</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{service.location}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleGetDirections}
                disabled={isRouting}
                className="gap-1.5 font-bold text-xs rounded-xl"
              >
                <Navigation className={`h-3.5 w-3.5 text-harvest-700 ${isRouting ? "animate-spin" : ""}`} />
                <span>{isRouting ? "Calculating..." : "Directions (GPS)"}</span>
              </Button>
            </div>

            {routeInfo && (
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
                <div>
                  <strong>Distance:</strong> {routeInfo.distanceText} • <strong>Estimated Travel Time:</strong> {routeInfo.durationText}
                </div>
                <button onClick={() => setRouteInfo(null)} className="text-emerald-700 font-bold hover:underline">
                  Dismiss
                </button>
              </div>
            )}

            {routingError && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300">
                {routingError}
              </div>
            )}

            {showManualInput && (
              <form onSubmit={handleManualRouteSubmit} className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Starting Location</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualOrigin}
                    onChange={(e) => setManualOrigin(e.target.value)}
                    placeholder="Enter starting city or address (e.g. Majestic, Bengaluru)"
                    className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-harvest-500/20"
                  />
                  <Button type="submit" size="sm" disabled={isRouting || !manualOrigin.trim()} className="font-bold text-xs bg-harvest-600 hover:bg-harvest-700 text-white rounded-xl">
                    Calculate
                  </Button>
                </div>
              </form>
            )}

            <TomTomMap
              center={{ lat: service.latitude || 12.3375, lon: service.longitude || 75.8069 }}
              zoom={13}
              markers={[
                {
                  id: service.id,
                  lat: service.latitude || 12.3375,
                  lon: service.longitude || 75.8069,
                  title: "Service Location",
                  subtitle: service.location,
                },
              ]}
              route={routeInfo || undefined}
              privacyProtected={true}
              onDirectionsClick={handleGetDirections}
              height="340px"
            />
          </Card>

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
                <span>{Number(service.rating || 5.0).toFixed(2)} / 5.0</span>
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
                            Verified Guest
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
                No reviews published yet for this listing.
              </p>
            )}
          </Card>
        </div>

        {/* Right Column: Pricing & Booking Card */}
        <div className="lg:col-span-5 sticky top-20 space-y-4">
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card space-y-5">
            {/* Pricing Header */}
            <div>
              <span className="text-xs text-slate-400 font-medium block">Listed Rate</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                  {formatCurrency(service.price)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">/ {service.unit}</span>
              </div>
            </div>

            {/* Date & Availability Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-harvest-700" />
                  <span>Experience Date</span>
                </label>
                <button
                  type="button"
                  onClick={handleCheckAvailability}
                  disabled={isCheckingAvailability}
                  className="text-[11px] font-bold text-harvest-700 dark:text-harvest-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${isCheckingAvailability ? "animate-spin" : ""}`} />
                  <span>{isCheckingAvailability ? "Checking..." : "Check Availability"}</span>
                </button>
              </div>

              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-harvest-500/20"
              />

              {/* Real Availability Status Badge */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Availability Status:</span>
                {isSoldOut ? (
                  <Badge variant="destructive" className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-[11px] font-bold">
                    Sold Out on this date
                  </Badge>
                ) : isDateLimited ? (
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[11px] font-bold">
                    Low Availability ({availableCapacity} spots left)
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                    Available ({availableCapacity} spots left)
                  </Badge>
                )}
              </div>
            </div>

            {/* Time Slot Selection */}
            {slotsForDay.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-harvest-700" />
                  <span>Select Time Slot</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {slotsForDay.map((s) => {
                    const isAvail = s.is_available && s.remaining_capacity > 0 && !isSoldOut;
                    const isSel = selectedSlot?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!isAvail}
                        onClick={() => setSelectedSlot(s)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          !isAvail
                            ? "border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/30 text-slate-400 cursor-not-allowed opacity-60"
                            : isSel
                            ? "border-harvest-600 bg-harvest-50 dark:bg-harvest-950/40 text-harvest-950 dark:text-harvest-200 font-bold ring-2 ring-harvest-600/30"
                            : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-harvest-400"
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{s.start_time} - {s.end_time}</span>
                          {!isAvail && (
                            <span className="text-[10px] text-rose-500 font-semibold uppercase">Sold out</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {isAvail ? `${s.remaining_capacity} spots left` : "No spots remaining"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 space-y-1 text-xs text-emerald-950 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <span>Verified Direct Marketplace</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect directly with verified local hosts and agricultural producers.
              </p>
            </div>

            {/* Host Details */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Host Information</span>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{service.provider_name || "Verified Host"}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{service.location}</p>
                </div>
                {service.is_verified && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
            </div>

            {/* Action Buttons: Book Service & Message Host */}
            <div className="space-y-2.5 pt-1">
              <Button
                size="lg"
                disabled={isSoldOut || (slotsForDay.length > 0 && !selectedSlot)}
                onClick={() => setBookingModalOpen(true)}
                className="w-full font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl gap-2 shadow-md shadow-harvest-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="h-4 w-4" />
                <span>
                  {isSoldOut
                    ? "Sold Out on Selected Date"
                    : slotsForDay.length > 0 && !selectedSlot
                    ? "Select an Available Time Slot"
                    : "Reserve / Book Experience"}
                </span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleMessageHost}
                className="w-full font-semibold text-slate-700 dark:text-slate-300 rounded-xl gap-2"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Message Host / Inquire</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Interactive Booking & Payment Modal */}
      {bookingModalOpen && (
        <BookingReviewModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          service={service}
          startDate={selectedDate}
          selectedSlot={selectedSlot}
        />
      )}
    </div>
  );
}
