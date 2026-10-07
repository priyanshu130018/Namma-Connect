import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sprout,
  Compass,
  Waves,
  TreePine,
  UtensilsCrossed,
  Landmark,
  Camera,
  Video,
  Wind,
  Film,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Save,
  Eye,
  PlusCircle,
  MapPin,
  X,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { AppImage } from "@/components/ui/image";
import { formatCurrency } from "@/lib/utils";
import { providerService, ProviderListing } from "@/services/providerService";
import { geocodeLocation } from "@/services/locationService";
import {
  ProviderAvailabilitySection,
  DEFAULT_AVAILABILITY_STATE,
  validateAvailability,
  ServiceAvailabilityState,
  AvailabilityErrors,
} from "@/components/partner/ProviderAvailabilitySection";

export interface MarketplaceCategoryDef {
  id: string;
  slug: string;
  name: string;
  shortDesc: string;
  icon: any;
  defaultPrice: number;
  defaultUnit: string;
  defaultImage: string;
}

export const OFFICIAL_CATEGORIES: MarketplaceCategoryDef[] = [
  {
    id: "farm",
    slug: "farm",
    name: "Farm Tours & Experiences",
    shortDesc: "Plantation walks, organic harvest tours, cupping & agro-workshops",
    icon: Sprout,
    defaultPrice: 1200,
    defaultUnit: "person",
    defaultImage: "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
  },
  {
    id: "adventure",
    slug: "adventure",
    name: "Adventure & Trekking",
    shortDesc: "Western Ghats mountain trails, outdoor camping & peak treks",
    icon: Compass,
    defaultPrice: 1800,
    defaultUnit: "person",
    defaultImage: "https://images.unsplash.com/photo-1551632811-561732d1e306",
  },
  {
    id: "water-sports",
    slug: "water-sports",
    name: "Water Sports & Activities",
    shortDesc: "White-water river rafting, coastal kayaking, falls & coracle boats",
    icon: Waves,
    defaultPrice: 1500,
    defaultUnit: "person",
    defaultImage: "https://images.unsplash.com/photo-1544551763-46a013bb70d5",
  },
  {
    id: "wildlife",
    slug: "wildlife",
    name: "Wildlife Tours",
    shortDesc: "Tiger reserve safaris, rainforest birding & nature sanctuary trails",
    icon: TreePine,
    defaultPrice: 2200,
    defaultUnit: "person",
    defaultImage: "https://images.unsplash.com/photo-1534567153574-2b12153a87f0",
  },
  {
    id: "food",
    slug: "food",
    name: "Food Tours & Cooking",
    shortDesc: "Malnad & Karavali traditional culinary masterclasses and spice trails",
    icon: UtensilsCrossed,
    defaultPrice: 950,
    defaultUnit: "person",
    defaultImage: "https://images.unsplash.com/photo-1556910103-1c02745aae4d",
  },
  {
    id: "cultural-historical",
    slug: "cultural-historical",
    name: "Cultural & Historical Tours",
    shortDesc: "Hoysala temples, heritage monuments & folk art cultural circuits",
    icon: Landmark,
    defaultPrice: 850,
    defaultUnit: "person",
    defaultImage: "https://images.unsplash.com/photo-1609137144813-7d9921338f24",
  },
  {
    id: "photography",
    slug: "photography",
    name: "Photography",
    shortDesc: "Guided golden-hour shoots, rural portraits & landscape photo walks",
    icon: Camera,
    defaultPrice: 3500,
    defaultUnit: "session",
    defaultImage: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32",
  },
  {
    id: "videography",
    slug: "videography",
    name: "Videography",
    shortDesc: "Cinematic 4K travel films, cultural documentaries & promo reels",
    icon: Video,
    defaultPrice: 6500,
    defaultUnit: "package",
    defaultImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119",
  },
  {
    id: "drone-aerial",
    slug: "drone-aerial",
    name: "Drone & Aerial",
    shortDesc: "DGCA-compliant 4K aerial mapping, estate flyovers & master shots",
    icon: Wind,
    defaultPrice: 4500,
    defaultUnit: "session",
    defaultImage: "https://images.unsplash.com/photo-1508614589041-895b88991e3e",
  },
  {
    id: "travel-reels",
    slug: "travel-reels",
    name: "Travel Reels",
    shortDesc: "Viral 9:16 vertical reels with trending music sync & fast turnaround",
    icon: Film,
    defaultPrice: 2500,
    defaultUnit: "reel",
    defaultImage: "https://images.unsplash.com/photo-1611162617474-5b21e879e113",
  },
];

const KARNATAKA_DISTRICTS = [
  "Kodagu (Coorg)",
  "Chikkamagaluru",
  "Uttara Kannada (Gokarna)",
  "Udupi",
  "Dakshina Kannada (Mangaluru)",
  "Mysuru",
  "Hassan",
  "Shivamogga (Shimoga)",
  "Bengaluru Urban",
  "Bengaluru Rural",
  "Chamarajanagar",
  "Belagavi",
  "Ballari (Hampi)",
  "Dharwad",
  "Vijayapura",
];

export function PartnerServiceNewPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategoryDef | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Common Core Fields
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("person");
  const [district, setDistrict] = useState("Kodagu (Coorg)");
  const [location, setLocation] = useState("Madikeri, Coorg, Karnataka");
  const [description, setDescription] = useState("");
  const [durationHours, setDurationHours] = useState("3.0");
  const [maxCapacity, setMaxCapacity] = useState("10");
  const [primaryImage, setPrimaryImage] = useState("https://images.unsplash.com/photo-1500382017468-9049fed747ef");
  const [inclusionsText, setInclusionsText] = useState("Guided experience, Welcome tea/coffee, Equipment usage");

  // Geocoding State
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string>("");
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);

  const handleGeocodeLocation = async () => {
    if (!location.trim()) return;
    setIsGeocoding(true);
    setGeocodeMessage(null);
    try {
      const geo = await geocodeLocation(location);
      setLatitude(geo.lat);
      setLongitude(geo.lon);
      setFormattedAddress(geo.formatted_address || geo.display_name);
      setGeocodeMessage(`Verified location: (${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)})`);
    } catch {
      setGeocodeMessage("Unable to verify address. Standard district coordinates will be used.");
    } finally {
      setIsGeocoding(false);
    }
  };

  // Availability State
  const [availability, setAvailability] = useState<ServiceAvailabilityState>(DEFAULT_AVAILABILITY_STATE);
  const [availabilityErrors, setAvailabilityErrors] = useState<AvailabilityErrors>({});

  // ── Dynamic Category-Specific Form State ──
  // 1. Farm
  const [farmType, setFarmType] = useState("Organic Coffee & Spice Plantation");
  const [farmSeason, setFarmSeason] = useState("Harvest Season (October - March)");
  const [farmActivities, setFarmActivities] = useState("Coffee berry picking, Black pepper drying, Estate cupping session");
  const [produceIncluded, setProduceIncluded] = useState("Fresh roast plantation coffee sample (250g)");

  // 2. Adventure
  const [trekDifficulty, setTrekDifficulty] = useState("Moderate");
  const [trailDistanceKm, setTrailDistanceKm] = useState("6.5 km");
  const [elevationGainM, setElevationGainM] = useState("450 m");
  const [fitnessLevel, setFitnessLevel] = useState("Basic fitness required; beginner-friendly with steep sections");
  const [trekGearProvided, setTrekGearProvided] = useState("Trekking poles, rain ponchos, safety first aid");

  // 3. Water Sports
  const [waterActivityType, setWaterActivityType] = useState("River White-Water Rafting & Kayak");
  const [swimmingRequired, setSwimmingRequired] = useState("No (Life jackets mandatory)");
  const [waterSafetyGear, setWaterSafetyGear] = useState("CE-approved Class V Life Jackets, Helmets, Throwbags");
  const [guideCertified, setGuideCertified] = useState("IRF Level 3 River Guide on all batches");

  // 4. Wildlife
  const [safariType, setSafariType] = useState("Open 4x4 Jeep Safari (6-Seater)");
  const [sanctuaryName, setSanctuaryName] = useState("Nagarhole National Park / Kabini Buffer Zone");
  const [bestSightingWindow, setBestSightingWindow] = useState("Dawn Safari (06:00 - 09:30 AM)");
  const [opticsProvided, setOpticsProvided] = useState("Nikon 8x42 Binoculars & Karnataka field spotting guide");

  // 5. Food
  const [cuisineStyle, setCuisineStyle] = useState("Traditional Malnad Estate Cuisine");
  const [dietaryOptions, setDietaryOptions] = useState("Pure Vegetarian & Vegan options fully accommodated");
  const [dishesPrepared, setDishesPrepared] = useState("Akki Rotti, Bamboo Shoot Curry (Kani), Malnad Filter Coffee");
  const [ingredientsIncluded, setIngredientsIncluded] = useState("All organic estate-grown spices & recipe booklet");

  // 6. Cultural
  const [dynastyEra, setDynastyEra] = useState("Hoysala Empire & Western Ganga Heritage");
  const [monumentsCovered, setMonumentsCovered] = useState("12th Century Temple complex & stone sculpture gallery");
  const [guideLanguages, setGuideLanguages] = useState("Kannada, English, Hindi");
  const [dressCode, setDressCode] = useState("Modest attire recommended; traditional wraps provided if required");

  // 7. Photography
  const [photographyGenre, setPhotographyGenre] = useState("Landscape & Rural Environmental Portraiture");
  const [gearRecommendation, setGearRecommendation] = useState("DSLR / Mirrorless with 24-70mm lens, sturdy tripod");
  const [goldenHourTiming, setGoldenHourTiming] = useState("Early Dawn (05:45 - 08:30 AM)");
  const [photosDelivered, setPhotosDelivered] = useState("20 High-Resolution Retouched RAW/JPEG deliverable files");

  // 8. Videography
  const [videoResolution, setVideoResolution] = useState("4K 60fps 10-Bit Color Profile");
  const [shootStyle, setShootStyle] = useState("Cinematic Narrative & Ambient Soundscaping");
  const [turnaroundDays, setTurnaroundDays] = useState("4 Business Days");
  const [rawFootageIncluded, setRawFootageIncluded] = useState("Yes, cloud download link for full B-roll");

  // 9. Drone
  const [droneModel, setDroneModel] = useState("DJI Mavic 3 Pro Cine (Triple-Camera)");
  const [dgcaCompliance, setDgcaCompliance] = useState("DGCA Certified Remote Pilot License (RPL) Verified");
  const [aerialDeliverables, setAerialDeliverables] = useState("6x 4K Master Cine Shots & 15 Aerial Still Images");
  const [flightZones, setFlightZones] = useState("Strictly DGCA Green Zone designated flight areas");

  // 10. Travel Reels
  const [reelFormat, setReelFormat] = useState("9:16 Vertical (Instagram Reels & YouTube Shorts)");
  const [turnaroundSpeed, setTurnaroundSpeed] = useState("24-Hour Express Same-Day Delivery");
  const [reelsCount, setReelsCount] = useState("3x Fully Edited 30-Second Viral Travel Reels");
  const [audioLicensing, setAudioLicensing] = useState("Trending copyright-cleared audio sync & dynamic captions");

  const handleSelectCategory = (cat: MarketplaceCategoryDef) => {
    setSelectedCategory(cat);
    setPrice(String(cat.defaultPrice));
    setUnit(cat.defaultUnit);
    setPrimaryImage(cat.defaultImage);
    if (!title) {
      setTitle(`${cat.name} in ${district.split(" ")[0]}`);
    }
  };

  const getSpecificDetailsPayload = (): Record<string, any> => {
    if (!selectedCategory) return {};
    const base = {
      categorySlug: selectedCategory.slug,
      weeklyAvailability: availability.weeklyAvailability,
      startTime: availability.startTime,
      endTime: availability.endTime,
      capacity: Number(maxCapacity) || availability.capacity,
    };

    switch (selectedCategory.slug) {
      case "farm":
        return { ...base, farmType, farmSeason, farmActivities, produceIncluded };
      case "adventure":
        return { ...base, trekDifficulty, trailDistanceKm, elevationGainM, fitnessLevel, trekGearProvided };
      case "water-sports":
        return { ...base, waterActivityType, swimmingRequired, waterSafetyGear, guideCertified };
      case "wildlife":
        return { ...base, safariType, sanctuaryName, bestSightingWindow, opticsProvided };
      case "food":
        return { ...base, cuisineStyle, dietaryOptions, dishesPrepared, ingredientsIncluded };
      case "cultural-historical":
        return { ...base, dynastyEra, monumentsCovered, guideLanguages, dressCode };
      case "photography":
        return { ...base, photographyGenre, gearRecommendation, goldenHourTiming, photosDelivered };
      case "videography":
        return { ...base, videoResolution, shootStyle, turnaroundDays, rawFootageIncluded };
      case "drone-aerial":
        return { ...base, droneModel, dgcaCompliance, aerialDeliverables, flightZones };
      case "travel-reels":
        return { ...base, reelFormat, turnaroundSpeed, reelsCount, audioLicensing };
      default:
        return base;
    }
  };

  const handleSaveListing = async (targetStatus: "DRAFT" | "PUBLISHED") => {
    if (!selectedCategory) {
      setErrorMessage("Please select one of the 10 marketplace categories to begin.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please provide a service title.");
      return;
    }

    // When publishing, enforce validation
    if (targetStatus === "PUBLISHED") {
      if (!location.trim() || !price || Number(price) <= 0) {
        setErrorMessage("Please fill in location and a valid price greater than zero.");
        return;
      }
      const availVal = validateAvailability(availability);
      if (!availVal.isValid) {
        setAvailabilityErrors(availVal.errors);
        setErrorMessage("Please resolve errors in the Availability Schedule section.");
        return;
      }
      setAvailabilityErrors({});
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const inclusions = inclusionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: Partial<ProviderListing> = {
      title: title.trim(),
      description: description.trim() || `${title} offered in ${location}, Karnataka.`,
      category: selectedCategory.name,
      category_slug: selectedCategory.slug,
      location: location.trim(),
      district: district.split(" ")[0],
      state: "Karnataka",
      price: Number(price) || selectedCategory.defaultPrice,
      unit,
      max_capacity: Number(maxCapacity) || availability.capacity || 10,
      duration_hours: Number(durationHours) || 3.0,
      primary_image: primaryImage,
      images: [primaryImage],
      inclusions,
      amenities: [selectedCategory.name, district.split(" ")[0]],
      status: targetStatus,
      ...({ specific_details: getSpecificDetailsPayload() } as any),
      ...(latitude && longitude ? { latitude, longitude, formatted_address: formattedAddress } : {}),
    };

    try {
      const created = await providerService.createListing(payload);

      // If published, also batch-save initial availability schedule
      if (targetStatus === "PUBLISHED" && created.id) {
        try {
          const today = new Date();
          const upcomingDates: string[] = [];
          for (let i = 1; i <= 14; i++) {
            const nextD = new Date(today);
            nextD.setDate(today.getDate() + i);
            const dayKey = nextD
              .toLocaleDateString("en-US", { weekday: "long" })
              .toLowerCase();
            if (
              availability.weeklyAvailability[
                dayKey as keyof typeof availability.weeklyAvailability
              ]
            ) {
              upcomingDates.push(nextD.toISOString().split("T")[0]);
            }
          }

          if (upcomingDates.length > 0) {
            await providerService.setListingAvailability(created.id, {
              dates: upcomingDates,
              start_time: availability.startTime,
              end_time: availability.endTime,
              slot_label: `${availability.startTime} - ${availability.endTime}`,
              capacity: Number(maxCapacity) || availability.capacity,
            });
          }
        } catch (availErr) {
          console.warn("Initial availability slot creation warning:", availErr);
        }
      }

      setSubmittedStatus(created.status || targetStatus);
    } catch (err: any) {
      console.error("Listing creation failed:", err);
      setErrorMessage(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to save service listing. Please check your inputs."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnotherService = () => {
    setSubmittedStatus(null);
    setSelectedCategory(null);
    setTitle("");
    setPrice("");
    setDescription("");
    // Retain common district and location for convenience
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <PageHeader
        title="Add New Marketplace Offering"
        subtitle="List your agricultural tours, adventure trails, rural cooking, or creative media services across Karnataka."
      />

      {/* ── Success Banner ── */}
      {submittedStatus ? (
        <Card className="p-8 rounded-3xl border-emerald-200 bg-emerald-50/70 text-center space-y-4">
          <div className="h-14 w-14 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {submittedStatus === "PUBLISHED"
              ? "Service Published to Marketplace!"
              : submittedStatus === "DRAFT"
              ? "Draft Saved Successfully"
              : "Listing Submitted for Verification"}
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">
            {submittedStatus === "PUBLISHED"
              ? `Your listing "${title}" is now LIVE on Namma Connect Explore. Travelers can discover and book slots immediately.`
              : submittedStatus === "DRAFT"
              ? `Your draft listing "${title}" has been saved. You can resume editing and publish whenever you are ready.`
              : `Your listing "${title}" has been submitted for moderation with status PENDING. Verification will complete shortly.`}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate("/provider/services")}>
              Return to Catalog
            </Button>
            <Button
              onClick={handleResetForAnotherService}
              className="bg-harvest-600 hover:bg-harvest-700 text-white font-bold gap-1.5"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Another Service</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Error Message */}
          {errorMessage && (
            <Card className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </Card>
          )}

          {/* ── Step 1: 10 Marketplace Category Picker ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-harvest-600 text-white text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <span>Select Marketplace Category</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Choose from the 10 official Namma Connect marketplace activity categories.
                </p>
              </div>
              {selectedCategory && (
                <Badge className="bg-harvest-100 text-harvest-800 font-bold text-xs">
                  {selectedCategory.name}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {OFFICIAL_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory?.slug === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between group ${
                      isSelected
                        ? "border-harvest-600 bg-harvest-50/70 shadow-sm ring-2 ring-harvest-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="space-y-2">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-harvest-600 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-harvest-100 group-hover:text-harvest-700"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {cat.name}
                      </h4>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {cat.shortDesc}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Step 2: Core Details & Dynamic Category Form ── */}
          {selectedCategory && (
            <section className="space-y-6 pt-2">
              <div className="flex items-center justify-between border-t border-slate-200 pt-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-harvest-600 text-white text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <span>Service Details & Parameters</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Category-tailored parameters for <strong>{selectedCategory.name}</strong>.
                  </p>
                </div>
              </div>

              <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-6">
                {/* Title & Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Listing Title *</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Organic Arabica Coffee Harvesting & Estate Walk"
                      className="rounded-xl font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Price (INR) *</label>
                      <Input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="1200"
                        className="rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Unit</label>
                      <Select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        options={[
                          { label: "per person", value: "person" },
                          { label: "per group", value: "group" },
                          { label: "per session", value: "session" },
                          { label: "per reel", value: "reel" },
                          { label: "per package", value: "package" },
                          { label: "per hour", value: "hour" },
                          { label: "per day", value: "day" },
                        ]}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Location & District */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Karnataka District *</label>
                    <Select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      options={KARNATAKA_DISTRICTS.map((d) => ({ label: d, value: d }))}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Location Address / Area *</label>
                    <div className="flex gap-2">
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Madikeri, Coorg, Karnataka"
                        className="rounded-xl"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGeocodeLocation}
                        disabled={isGeocoding}
                        className="shrink-0 rounded-xl text-xs font-bold gap-1"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{isGeocoding ? "Verifying..." : "Verify Map"}</span>
                      </Button>
                    </div>
                    {geocodeMessage && (
                      <p className="text-[11px] text-slate-500 font-medium">{geocodeMessage}</p>
                    )}
                  </div>
                </div>

                {/* Capacity & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Max Capacity (Guests/Batch)</label>
                    <Input
                      type="number"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(e.target.value)}
                      placeholder="10"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Duration (Hours)</label>
                    <Input
                      type="number"
                      step="0.5"
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                      placeholder="3.0"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Description & Media */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Service Description</label>
                  <Textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the experience itinerary, what makes your offering unique, and what travelers should expect."
                    className="rounded-2xl"
                  />
                </div>

                {/* Image URL & Inclusions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Primary Cover Image URL</label>
                    <Input
                      value={primaryImage}
                      onChange={(e) => setPrimaryImage(e.target.value)}
                      placeholder="https://..."
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Inclusions (Comma separated)</label>
                    <Input
                      value={inclusionsText}
                      onChange={(e) => setInclusionsText(e.target.value)}
                      placeholder="Guided tour, Tasting, Safety gear"
                      className="rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* ── Dynamic Category-Specific Form Section ── */}
                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <Sparkles className="h-4 w-4 text-harvest-600" />
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      {selectedCategory.name} Specific Parameters
                    </h4>
                  </div>

                  {/* 1. Farm */}
                  {selectedCategory.slug === "farm" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Plantation / Farm Type</label>
                        <Input value={farmType} onChange={(e) => setFarmType(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Peak Season</label>
                        <Input value={farmSeason} onChange={(e) => setFarmSeason(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Farm Activities Included</label>
                        <Input value={farmActivities} onChange={(e) => setFarmActivities(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Farm Produce Deliverable</label>
                        <Input value={produceIncluded} onChange={(e) => setProduceIncluded(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                    </div>
                  )}

                  {/* 2. Adventure */}
                  {selectedCategory.slug === "adventure" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Trek Difficulty Level</label>
                        <Select
                          value={trekDifficulty}
                          onChange={(e) => setTrekDifficulty(e.target.value)}
                          options={[{ label: "Easy", value: "Easy" }, { label: "Moderate", value: "Moderate" }, { label: "Challenging", value: "Challenging" }]}
                          className="rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Trail Distance</label>
                        <Input value={trailDistanceKm} onChange={(e) => setTrailDistanceKm(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Elevation Gain</label>
                        <Input value={elevationGainM} onChange={(e) => setElevationGainM(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Fitness Requirement</label>
                        <Input value={fitnessLevel} onChange={(e) => setFitnessLevel(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Gear Provided</label>
                        <Input value={trekGearProvided} onChange={(e) => setTrekGearProvided(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                    </div>
                  )}

                  {/* 3. Water Sports */}
                  {selectedCategory.slug === "water-sports" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Water Activity Type</label>
                        <Input value={waterActivityType} onChange={(e) => setWaterActivityType(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Swimming Requirement</label>
                        <Input value={swimmingRequired} onChange={(e) => setSwimmingRequired(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Safety Equipment</label>
                        <Input value={waterSafetyGear} onChange={(e) => setWaterSafetyGear(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Instructor Certification</label>
                        <Input value={guideCertified} onChange={(e) => setGuideCertified(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                    </div>
                  )}

                  {/* 4. Wildlife */}
                  {selectedCategory.slug === "wildlife" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Safari Vehicle / Mode</label>
                        <Input value={safariType} onChange={(e) => setSafariType(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Sanctuary / Park Zone</label>
                        <Input value={sanctuaryName} onChange={(e) => setSanctuaryName(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Best Sighting Window</label>
                        <Input value={bestSightingWindow} onChange={(e) => setBestSightingWindow(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Optics Provided</label>
                        <Input value={opticsProvided} onChange={(e) => setOpticsProvided(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                    </div>
                  )}

                  {/* 5. Food */}
                  {selectedCategory.slug === "food" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Cuisine Style</label>
                        <Input value={cuisineStyle} onChange={(e) => setCuisineStyle(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Dietary Accommodations</label>
                        <Input value={dietaryOptions} onChange={(e) => setDietaryOptions(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Dishes Prepared</label>
                        <Input value={dishesPrepared} onChange={(e) => setDishesPrepared(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Ingredients Provided</label>
                        <Input value={ingredientsIncluded} onChange={(e) => setIngredientsIncluded(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                    </div>
                  )}

                  {/* 6. Cultural */}
                  {selectedCategory.slug === "cultural-historical" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Dynasty / Heritage Era</label>
                        <Input value={dynastyEra} onChange={(e) => setDynastyEra(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Monuments Covered</label>
                        <Input value={monumentsCovered} onChange={(e) => setMonumentsCovered(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Languages Spoken</label>
                        <Input value={guideLanguages} onChange={(e) => setGuideLanguages(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Dress Code Requirements</label>
                        <Input value={dressCode} onChange={(e) => setDressCode(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                    </div>
                  )}

                  {/* 7. Photography */}
                  {selectedCategory.slug === "photography" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Photography Genre</label>
                        <Input value={photographyGenre} onChange={(e) => setPhotographyGenre(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Golden Hour Timing</label>
                        <Input value={goldenHourTiming} onChange={(e) => setGoldenHourTiming(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Gear Recommendation</label>
                        <Input value={gearRecommendation} onChange={(e) => setGearRecommendation(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Deliverables</label>
                        <Input value={photosDelivered} onChange={(e) => setPhotosDelivered(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                    </div>
                  )}

                  {/* 8. Videography */}
                  {selectedCategory.slug === "videography" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Video Format & Specs</label>
                        <Input value={videoResolution} onChange={(e) => setVideoResolution(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Shoot Style</label>
                        <Input value={shootStyle} onChange={(e) => setShootStyle(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Turnaround Days</label>
                        <Input value={turnaroundDays} onChange={(e) => setTurnaroundDays(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Raw Footage Delivery</label>
                        <Input value={rawFootageIncluded} onChange={(e) => setRawFootageIncluded(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                    </div>
                  )}

                  {/* 9. Drone */}
                  {selectedCategory.slug === "drone-aerial" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Drone Model</label>
                        <Input value={droneModel} onChange={(e) => setDroneModel(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">DGCA Compliance</label>
                        <Input value={dgcaCompliance} onChange={(e) => setDgcaCompliance(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Aerial Deliverables</label>
                        <Input value={aerialDeliverables} onChange={(e) => setAerialDeliverables(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Permitted Flight Zones</label>
                        <Input value={flightZones} onChange={(e) => setFlightZones(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                    </div>
                  )}

                  {/* 10. Travel Reels */}
                  {selectedCategory.slug === "travel-reels" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Reel Aspect Ratio</label>
                        <Input value={reelFormat} onChange={(e) => setReelFormat(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Delivery Speed</label>
                        <Input value={turnaroundSpeed} onChange={(e) => setTurnaroundSpeed(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Reels Delivered</label>
                        <Input value={reelsCount} onChange={(e) => setReelsCount(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Music & Captions Sync</label>
                        <Input value={audioLicensing} onChange={(e) => setAudioLicensing(e.target.value)} className="rounded-xl bg-white" />
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* ── Step 3: Authoritative Availability Schedule ── */}
              <div className="border-t border-slate-200 pt-6">
                <div className="mb-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-harvest-600 text-white text-xs font-black flex items-center justify-center">
                      3
                    </span>
                    <span>Availability Schedule & Time Slots</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define active weekly booking days, daily hours, and maximum guest slots.
                  </p>
                </div>

                <ProviderAvailabilitySection
                  value={availability}
                  onChange={setAvailability}
                  errors={availabilityErrors}
                />
              </div>

              {/* ── Submission & Action Bar ── */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPreviewOpen(true)}
                  className="rounded-xl font-bold text-xs gap-1.5"
                >
                  <Eye className="h-4 w-4 text-slate-600" />
                  <span>Preview Customer View</span>
                </Button>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSaveListing("DRAFT")}
                    disabled={isSubmitting}
                    className="rounded-xl font-bold text-xs gap-1.5 border-slate-300"
                  >
                    <Save className="h-4 w-4 text-slate-600" />
                    <span>Save Draft</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSaveListing("PUBLISHED")}
                    disabled={isSubmitting}
                    className="rounded-xl font-bold text-xs gap-1.5 bg-harvest-600 hover:bg-harvest-700 text-white shadow-sm"
                  >
                    <span>{isSubmitting ? "Publishing..." : "Submit & Publish"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* ── Customer Preview Modal ── */}
          {isPreviewOpen && selectedCategory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-harvest-600" />
                    <span className="text-xs font-bold text-slate-900">Explore Marketplace Preview</span>
                  </div>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-slate-100">
                    <AppImage
                      src={primaryImage}
                      alt={title || "Preview"}
                      aspectRatio="auto"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <Badge className="bg-white/95 text-slate-800 text-[10px] font-bold shadow-sm">
                        {selectedCategory.name}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-slate-900">
                        {formatCurrency(Number(price) || selectedCategory.defaultPrice)}
                        <span className="text-xs font-normal text-slate-500"> / {unit}</span>
                      </span>
                      <span className="text-xs font-bold text-amber-600">★ New Listing</span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                      {title || "Untitled Experience"}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-harvest-600" />
                      <span>{location || "Karnataka"}</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {description || "Experience the best of Karnataka's agricultural and rural destinations."}
                  </p>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Duration: <strong>{durationHours} hrs</strong></span>
                    <span>Max Capacity: <strong>{maxCapacity} guests</strong></span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <Button size="sm" onClick={() => setIsPreviewOpen(false)}>
                    Close Preview
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
