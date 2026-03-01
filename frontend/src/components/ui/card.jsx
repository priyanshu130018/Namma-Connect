import { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { FiMapPin, FiStar, FiArrowRight, FiCheckCircle, FiZap, FiHeart } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { isInWishlist, toggleWishlist } from "./wishlist";

// ── Local fallback farm images (random per card based on id) ─────────────────
import img0 from "@/assets/images/img-0.jpg";
import img1 from "@/assets/images/img-1.jpg";
import img2 from "@/assets/images/img-2.jpg";
import img3 from "@/assets/images/img-3.jpg";
import img4 from "@/assets/images/img-4.jpg";
import img5 from "@/assets/images/img-5.avif";

const FARM_PHOTOS = [img0, img1, img2, img3, img4, img5];

const getFallbackPhoto = (id) => FARM_PHOTOS[(Number(id) || 0) % FARM_PHOTOS.length];

// Generate a URL-safe slug from a name + id: "Mercara Gold Estate" → "mercara-gold-estate-1"
export const slugify = (name, id) => {
  const slug = (name || "unnamed")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return `${slug}-${id}`;
};

// Parse numeric ID from a slug like "mercara-gold-estate-1" → 1
export const parseIdFromSlug = (slug) => {
  if (!slug) return null;
  const parts = slug.split("-");
  const id = parseInt(parts[parts.length - 1], 10);
  return Number.isFinite(id) ? id : null;
};

const getNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function StarRating({ rating, max = 5, size = 11 }) {
  const filled = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <FiStar
          key={i}
          size={size}
          className={i < filled ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
        />
      ))}
    </span>
  );
}

export default function ItemCard({ item, type = "farm" }) {
  const navigate = useNavigate();
  const isFarm = type === "farm";

  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    setWishlisted(isInWishlist(item?.id, type));
    const handler = () => setWishlisted(isInWishlist(item?.id, type));
    window.addEventListener("wishlist-change", handler);
    return () => window.removeEventListener("wishlist-change", handler);
  }, [item?.id, type]);

  const handleWishlist = (e) => {
    e.stopPropagation();
    toggleWishlist(item, type);
    setWishlisted(isInWishlist(item?.id, type));
  };

  const rating    = getNumber(item?.rating ?? item?.avg_rating ?? item?.average_rating ?? item?.review_rating);
  const reviews   = getNumber(item?.reviews ?? item?.review_count ?? item?.total_reviews ?? item?.customer_reviews);
  const matchScore = getNumber(item?.matchScore ?? item?.match_score);
  const price     = getNumber(item?.price ?? item?.price_per_night);
  const tripCount = getNumber(item?.experience ?? item?.trip_count ?? item?.completed_trips);

  const areaText  = item?.area || "";
  const stateText = item?.state || item?.location || "India";
  const isTopRated = reviews >= 10 || rating >= 4.5;

  // For farms: use real photo if available, else random local image
  const farmPhotoSrc = isFarm
    ? (item?.farm_photo || getFallbackPhoto(item?.id))
    : null;

  const handleClick = () => {
    if (!item?.id) return;
    const name = item?.name || item?.farm_name || "listing";
    const slug = slugify(name, item.id);
    navigate(`/${isFarm ? "farmercard" : "creatorcard"}/${slug}`);
  };

  return (
    <Motion.div
      whileHover={{ y: -6, boxShadow: "0 12px 24px rgba(0,0,0,0.05)" }}
      className="bg-white rounded-[28px] border border-slate-200 p-5 transition-all duration-300 group flex flex-col h-full cursor-pointer relative"
      onClick={handleClick}
    >
      {/* Wishlist heart button */}
      <button
        onClick={handleWishlist}
        className={`absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm border ${
          wishlisted
            ? "bg-red-50 border-red-200 text-red-500"
            : "bg-white/80 border-slate-200 text-slate-200 hover:text-red-400 hover:border-red-200"
        }`}
      >
        <FiHeart size={13} className={wishlisted ? "fill-red-500 text-red-500" : ""} />
      </button>

      {/* Name & Type */}
      <div className="mb-3 pr-8">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-black text-slate-900 text-base leading-tight truncate group-hover:text-amber-500 transition-colors">
            {item?.name || item?.farm_name}
          </h3>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {item?.is_verified && <FiCheckCircle className="text-blue-500" size={12} />}
          </div>
        </div>
        <p className={`text-[9px] font-black uppercase tracking-widest ${isFarm ? "text-amber-500" : "text-purple-500"}`}>
          {isFarm ? "Farm Experience" : item?.niche || "Creator"}
        </p>
      </div>

      {/* Photo */}
      <div className="relative aspect-[16/10] rounded-[22px] overflow-hidden mb-4 bg-slate-100 border border-slate-50 shadow-inner">
        {isFarm ? (
          <img
            src={farmPhotoSrc}
            alt={item?.name || "Farm"}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex flex-col items-center justify-center gap-2">
            <span className="text-white text-5xl font-black drop-shadow">
              {item?.name?.[0] || "C"}
            </span>
            {item?.niche && (
              <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest px-3">
                {item.niche}
              </span>
            )}
          </div>
        )}

        {matchScore > 0 && (
          <div className="absolute top-3 right-3 bg-amber-500 text-white px-3 py-1 rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-1.5 border border-amber-400">
            <FiZap size={10} className="fill-current" />
            <span className="text-[10px] font-black tracking-tight">{matchScore}% Match</span>
          </div>
        )}

        {isTopRated && !matchScore && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-amber-600 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <FiStar size={10} className="fill-amber-400 text-amber-400" />
            <span className="text-[9px] font-black">Top Rated</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-auto space-y-3">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
          <FiMapPin size={12} className={isFarm ? "text-amber-500" : "text-purple-500"} />
          <span className="truncate">
            {areaText ? `${areaText}, ` : ""}
            {stateText}
          </span>
        </div>

        <div className="bg-slate-50 rounded-2xl px-3 py-2.5">
          {reviews > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <StarRating rating={rating} />
                  <span className="text-xs font-black text-slate-700">
                    {rating > 0 ? rating.toFixed(1) : ""}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {reviews} review{reviews !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <StarRating rating={0} />
              <span className="text-[10px] font-bold text-slate-400">No reviews yet</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
              {isFarm ? "Rate per day" : "Experiences"}
            </span>
            <span className="font-black text-slate-900">
              {isFarm
                ? price > 0 ? `₹${price.toLocaleString()}` : "Contact"
                : tripCount > 0 ? `${tripCount} Trips` : "View Profile"}
            </span>
          </div>

          <div className={`w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:border-0 transition-all ${
            isFarm ? "group-hover:bg-amber-500 group-hover:text-white" : "group-hover:bg-purple-500 group-hover:text-white"
          }`}>
            <FiArrowRight size={18} />
          </div>
        </div>
      </div>
    </Motion.div>
  );
}

/**
 * DetailLayout — Shared structural wrapper for FarmerCard and CreatorCard
 */
export function DetailLayout({
  backUrl,
  backText = "Back to Search",
  title,
  subtitle,
  heroEmoji = "✨",
  heroPhoto,
  sidebar,
  children,
  accentColor = "amber",
}) {
  const navigate = useNavigate();

  const accent = {
    amber:  "text-amber-500 bg-amber-50 border-amber-200",
    purple: "text-purple-500 bg-purple-50 border-purple-200",
    green:  "text-emerald-500 bg-emerald-50 border-emerald-200",
  }[accentColor] || "text-amber-500 bg-amber-50 border-amber-200";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => (backUrl ? navigate(backUrl) : navigate(-1))}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-sm mb-8 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300 shadow-sm transition-all">
              <FiArrowRight className="rotate-180" size={14} />
            </div>
            {backText}
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* ── Main Content (Left) ── */}
            <div className="lg:col-span-2 space-y-8">
              <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="text-6xl drop-shadow-sm">{heroEmoji}</div>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${accent}`}>
                    Verified Listing
                  </div>
                </div>

                <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] mb-6 tracking-tight">
                  {title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-slate-500 mb-8 font-medium">
                  {subtitle}
                </div>

                {/* Main Image */}
                <div className="aspect-[16/9] rounded-[40px] overflow-hidden bg-slate-200 border-4 border-white shadow-2xl relative group">
                  {heroPhoto ? (
                    <img
                      src={heroPhoto}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 opacity-50">
                      <span className="text-8xl">{heroEmoji}</span>
                    </div>
                  )}
                </div>
              </Motion.div>

              {/* Children (Description, Amenities, etc.) */}
              <div className="pt-4">{children}</div>
            </div>

            {/* ── Sidebar (Right) ── */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">
                {sidebar}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
