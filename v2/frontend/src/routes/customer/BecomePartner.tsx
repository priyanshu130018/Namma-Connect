import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Sprout,
  Compass,
  Car,
  Building2,
  Camera,
  Palette,
  Home,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Save,
  Clock,
  LocateFixed,
  AlertCircle,
  Plus,
  X,
  BadgeCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/app/providers";
import {
  getMyPartnerApplication,
  submitPartnerApplication,
  PartnerApplicationData,
} from "@/services/partnerApplicationService";

const DRAFT_STORAGE_KEY = "namma_connect_partner_draft";

interface RoleCatalogItem {
  id: string;
  name: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  serviceSuggestions: string[];
  activitySuggestions: string[];
}

const ROLE_CATALOG: RoleCatalogItem[] = [
  {
    id: "farmer",
    name: "Farmer / Agriculture Host",
    badge: "Agritourism",
    icon: Sprout,
    description: "Host travelers for plantation walks, harvest experiences, and rustic farm stays.",
    serviceSuggestions: [
      "Farm Stay Accommodation",
      "Guided Farm Tour",
      "Harvest Experience",
      "Organic Farm Visit",
      "Farm-to-Table Dining",
      "Plantation Tour",
      "Coffee Estate Tour",
      "Seed & Sapling Nursery",
    ],
    activitySuggestions: [
      "Harvesting",
      "Coffee Picking",
      "Paddy Transplanting",
      "Pottery",
      "Bullock Cart Ride",
      "Nature Walk",
      "Cooking",
      "Fishing",
      "Planting",
      "Farm Workshop",
    ],
  },
  {
    id: "hotel",
    name: "Eco Hotel / Homestay Owner",
    badge: "Hospitality",
    icon: Home,
    description: "Offer authentic rural accommodations, heritage cottages, and peaceful plantation retreats.",
    serviceSuggestions: [
      "Estate Cottage Stay",
      "Eco Homestay Suite",
      "Luxury Tent Glamping",
      "Campfire & Dining",
      "Heritage Villa",
      "Breakfast & Dinner Package",
    ],
    activitySuggestions: [
      "Coffee Roasting Workshop",
      "Night Star Gazing",
      "Estate Birding Trail",
      "Campfire Storytelling",
      "River Bathing",
    ],
  },
  {
    id: "food",
    name: "Food & Culinary Provider",
    badge: "Culinary",
    icon: Building2,
    description: "Serve authentic regional Malnad and Karnataka cuisine prepared with organic farm ingredients.",
    serviceSuggestions: [
      "Traditional Karnataka Thali",
      "Farm-to-Table Dining",
      "Organic Cooking Classes",
      "Fresh Harvest Juice Bar",
      "Woodfire Regional Feasts",
    ],
    activitySuggestions: [
      "Live Hearth Cooking",
      "Pickle & Chutney Making",
      "Traditional Spice Grinding",
      "Tasting Tours",
    ],
  },
  {
    id: "guide",
    name: "Guide & Naturalist",
    badge: "Expert Guide",
    icon: Compass,
    description: "Lead forest treks, birdwatching expeditions, cultural walks, and plantation heritage tours.",
    serviceSuggestions: [
      "Local Plantation Trail",
      "Birding & Naturalist Trek",
      "Heritage Village Walk",
      "Wildlife & Forest Walk",
      "Food & Spice Trail",
      "Photography Trail",
    ],
    activitySuggestions: [
      "Guided Bird Watching",
      "Historical Storytelling",
      "Medicinal Herb Identification",
      "Stream Trekking",
    ],
  },
  {
    id: "travel",
    name: "Travel & Rural Driver",
    badge: "Logistics",
    icon: Car,
    description: "Provide 4x4 offroad jeep safaris, local station transfers, and scenic rural transit.",
    serviceSuggestions: [
      "Station Pickup / Drop",
      "Scenic 4x4 Jeep Safari",
      "Village EV Shuttle",
      "Custom Day Rental",
      "Sightseeing Circuit Tour",
    ],
    activitySuggestions: [
      "Offroad Hill Drive",
      "Scenic Valley Tour",
      "Sunset Point Drive",
      "Hidden Waterfalls Transit",
    ],
  },
  {
    id: "creator",
    name: "Content Creator / Storyteller",
    badge: "Media Studio",
    icon: Camera,
    description: "Collaborate with rural hosts to capture photo essays, reels, 4K documentary videos, and drones.",
    serviceSuggestions: [
      "High-Res Photography",
      "4K Video Feature",
      "FPV Drone Footage",
      "Reels & Shorts Production",
      "Social Media Campaign",
      "Written Article & Photo Essay",
    ],
    activitySuggestions: [
      "Golden Hour Shoot",
      "Aerial Landscape Mapping",
      "Farm Portrait Session",
      "Audio-Visual Storytelling",
    ],
  },
  {
    id: "artisan",
    name: "Rural Artisan & Craftsman",
    badge: "Handicrafts",
    icon: Palette,
    description: "Showcase handloom weaving, earthenware pottery, bamboo crafts, and traditional folk art.",
    serviceSuggestions: [
      "Clay Pottery Workshop",
      "Natural Dye & Handloom Weaving",
      "Bamboo Agro-Crafts",
      "Woodcarving Masterclass",
      "Artisan Souvenir Shop",
    ],
    activitySuggestions: [
      "Clay Modeling",
      "Loom Weaving Demo",
      "Wood Carving Basics",
      "Folk Art Painting",
    ],
  },
];

export function CustomerBecomePartnerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Active Application State from Backend
  const [existingApp, setExistingApp] = useState<PartnerApplicationData | null>(null);
  const [isLoadingApp, setIsLoadingApp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-step State (1: Role, 2: Personal, 3: Professional, 4: KYC, 5: Services & Activities, 6: Review)
  const [step, setStep] = useState<number>(1);
  const [selectedType, setSelectedType] = useState<string>(searchParams.get("role") || "farmer");

  // Form Fields
  const [fullName, setFullName] = useState<string>(user?.full_name || "");
  const [email, setEmail] = useState<string>(user?.email || "");
  const [mobile, setMobile] = useState<string>(user?.mobile || "");
  const [address, setAddress] = useState<string>("");
  const [district, setDistrict] = useState<string>("Madikeri, Coorg");
  const [stateName] = useState<string>("Karnataka");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Professional Hosting Details
  const [businessName, setBusinessName] = useState<string>("");
  const [experienceYears, setExperienceYears] = useState<string>("3");
  const [aboutBio, setAboutBio] = useState<string>("");
  const [languagesSpoken, setLanguagesSpoken] = useState<string>("Kannada, English");

  // KYC
  const [idType, setIdType] = useState<string>("Aadhaar");
  const [idNumber, setIdNumber] = useState<string>("");
  const [documentFileName, setDocumentFileName] = useState<string>("");

  // Dynamic Tags
  const [services, setServices] = useState<string[]>(["Farm Stay Accommodation", "Guided Farm Tour"]);
  const [serviceInput, setServiceInput] = useState<string>("");
  const [activities, setActivities] = useState<string[]>(["Harvesting", "Coffee Picking"]);
  const [activityInput, setActivityInput] = useState<string>("");

  const [draftSavedMessage, setDraftSavedMessage] = useState<string | null>(null);

  const currentRole = ROLE_CATALOG.find((r) => r.id === selectedType) || ROLE_CATALOG[0];

  // Fetch Existing Application on Mount
  useEffect(() => {
    getMyPartnerApplication()
      .then((app) => {
        setExistingApp(app);
        if (app && app.status === "REJECTED") {
          setSelectedType(app.role_type || "farmer");
          setFullName(app.full_name || "");
          setEmail(app.email || "");
          setMobile(app.mobile || "");
          setAddress(app.address || "");
          setDistrict(app.district || "");
          setBusinessName(app.business_name || "");
          setExperienceYears(String(app.experience_years || 0));
          setAboutBio(app.bio || "");
          setLanguagesSpoken(app.languages || "Kannada, English");
          setIdType(app.id_type || "Aadhaar");
          setIdNumber(app.id_number || "");
          setServices(app.services || []);
          setActivities(app.activities || []);
        }
      })
      .finally(() => setIsLoadingApp(false));
  }, []);

  // Load local draft if no active application
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft && (!existingApp || existingApp.status === "DRAFT")) {
        const data = JSON.parse(savedDraft);
        if (data.selectedType) setSelectedType(data.selectedType);
        if (data.fullName) setFullName(data.fullName);
        if (data.email) setEmail(data.email);
        if (data.mobile) setMobile(data.mobile);
        if (data.address) setAddress(data.address);
        if (data.district) setDistrict(data.district);
        if (data.businessName) setBusinessName(data.businessName);
        if (data.experienceYears) setExperienceYears(data.experienceYears);
        if (data.aboutBio) setAboutBio(data.aboutBio);
        if (data.languagesSpoken) setLanguagesSpoken(data.languagesSpoken);
        if (data.idType) setIdType(data.idType);
        if (data.idNumber) setIdNumber(data.idNumber);
        if (Array.isArray(data.services) && data.services.length > 0) setServices(data.services);
        if (Array.isArray(data.activities) && data.activities.length > 0) setActivities(data.activities);
      }
    } catch {
      // safe fallback
    }
  }, [existingApp]);

  // Geolocation handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAddress((prev) => prev || `GPS Coordinates: (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        alert("Location access denied or unavailable. Please enter address manually.");
      },
      { timeout: 10000 }
    );
  };

  // Tag Add/Remove Helpers
  const addServiceTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !services.includes(trimmed)) {
      setServices([...services, trimmed]);
      setServiceInput("");
    }
  };

  const removeServiceTag = (tag: string) => {
    setServices(services.filter((s) => s !== tag));
  };

  const addActivityTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !activities.includes(trimmed)) {
      setActivities([...activities, trimmed]);
      setActivityInput("");
    }
  };

  const removeActivityTag = (tag: string) => {
    setActivities(activities.filter((a) => a !== tag));
  };

  const handleSaveDraft = () => {
    const draftData = {
      selectedType,
      fullName,
      email,
      mobile,
      address,
      district,
      businessName,
      experienceYears,
      aboutBio,
      languagesSpoken,
      idType,
      idNumber,
      services,
      activities,
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      setDraftSavedMessage("Draft saved locally. You can resume anytime.");
      setTimeout(() => setDraftSavedMessage(null), 3500);
    } catch {
      // safe fallback
    }
  };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      role_type: selectedType,
      full_name: fullName,
      email,
      mobile,
      address,
      district,
      state: stateName,
      latitude,
      longitude,
      business_name: businessName || `${fullName}'s ${currentRole.name}`,
      experience_years: parseInt(experienceYears, 10) || 0,
      bio: aboutBio,
      languages: languagesSpoken,
      id_type: idType,
      id_number: idNumber,
      document_url: documentFileName ? `https://cdn.nammaconnect.local/kyc/${documentFileName}` : undefined,
      services,
      activities,
    };

    try {
      const res = await submitPartnerApplication(payload);
      setExistingApp(res);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to submit partner application. Please verify details.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingApp) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATUS VIEW 1: APPROVED PARTNER
  // -------------------------------------------------------------
  if (user?.role === "partner" || user?.role === "farmer" || existingApp?.status === "APPROVED") {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <Card className="p-8 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 mb-6">
            <BadgeCheck className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Congratulations!</h1>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-4">
            Welcome to the NammaConnect Partner Family.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-8 leading-relaxed">
            Your host account for <strong>{existingApp?.business_name || "your hosting services"}</strong> has been verified. You can now manage services, view traveler reservations, and track payouts.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate("/partner")}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6"
            >
              Open Partner Portal &rarr;
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/app")}
              className="font-bold"
            >
              Back to Marketplace
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STATUS VIEW 2: PENDING VERIFICATION
  // -------------------------------------------------------------
  if (existingApp?.status === "PENDING") {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
        <Card className="p-8 border-amber-200/80 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/25 mb-4">
            <Clock className="h-8 w-8 animate-spin-slow" />
          </div>
          <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold mb-3 border border-amber-300/50">
            Application #{existingApp.application_code}
          </Badge>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Application Submitted</h1>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">Status: Pending Verification</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            Your application has been received and is under review by the NammaConnect verification team. Verification typically takes 24–48 hours.
          </p>
        </Card>

        {/* Read-only details */}
        <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 border-b pb-3 border-slate-100 dark:border-slate-800">
            Submitted Host Profile
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500">Host Role:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 capitalize mt-0.5">{existingApp.role_type}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Business / Farm Name:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{existingApp.business_name}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Applicant:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{existingApp.full_name} ({existingApp.mobile})</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Location:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{existingApp.district}, {existingApp.state}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 dark:text-slate-500">Registered Services:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {existingApp.services.map((s, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[11px] font-semibold">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 dark:text-slate-500">Registered Activities:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {existingApp.activities.map((a, idx) => (
                  <Badge key={idx} variant="outline" className="text-[11px] font-semibold">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------
  // APPLICATION WIZARD (NO APP or REJECTED REAPPLY)
  // -------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <PageHeader
        title="Become a NammaConnect Partner"
        subtitle="Join Karnataka's rural host network. Connect your farm, homestay, tour, or artisanal crafts with conscious travelers."
      />

      {/* Rejection Alert if Reapplying */}
      {existingApp?.status === "REJECTED" && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 flex gap-3.5 items-start">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-rose-900 dark:text-rose-200">Application Needs Changes</p>
            <p className="text-rose-700 dark:text-rose-300">{existingApp.rejection_reason || "Please update your verification details."}</p>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] pt-1">
              Update the required fields below and click <strong>Review &amp; Reapply</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Progress Steps Header */}
      <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between overflow-x-auto pb-2 sm:pb-0 gap-2">
          {[
            { num: 1, label: "Role" },
            { num: 2, label: "Personal" },
            { num: 3, label: "Professional" },
            { num: 4, label: "Verification" },
            { num: 5, label: "Services & Activities" },
            { num: 6, label: "Review & Submit" },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => s.num < step && setStep(s.num)}
              className={`flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                step === s.num
                  ? "bg-emerald-600 text-white shadow-sm"
                  : step > s.num
                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  : "text-slate-400 dark:text-slate-600 cursor-not-allowed"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
                {step > s.num ? "✓" : `0${s.num}`}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {errorMessage && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          {errorMessage}
        </div>
      )}

      {draftSavedMessage && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {draftSavedMessage}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 1: ROLE SELECTION */}
      {/* ------------------------------------------------------------- */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Step 01: Select Your Host Category</h2>
            <Badge variant="outline" className="font-semibold text-xs">
              Role-Specific Tailoring
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLE_CATALOG.map((role) => {
              const IconComp = role.icon;
              const isSelected = selectedType === role.id;
              return (
                <Card
                  key={role.id}
                  onClick={() => setSelectedType(role.id)}
                  className={`p-5 cursor-pointer transition-all border-2 relative select-none ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md ring-1 ring-emerald-600"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"}`}>
                      <IconComp className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {role.badge}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{role.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {role.description}
                  </p>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(2)} className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 px-6">
              Continue to Personal Details <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 2: PERSONAL & LOCATION DETAILS */}
      {/* ------------------------------------------------------------- */}
      {step === 2 && (
        <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
              {currentRole.name}
            </Badge>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Step 02: Personal &amp; Location Information</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide your verified host contact information and location.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Full Name *</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Gowda"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Mobile Number *</label>
              <Input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Email Address *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ramesh@example.com"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Address / Estate Location *</label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  {isLocating ? "Detecting..." : "Use My Current Location"}
                </button>
              </div>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Coffee Estate Road, Suntikoppa Post"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">District *</label>
              <Input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Madikeri, Kodagu"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">State</label>
              <Input value={stateName} disabled className="bg-slate-50 dark:bg-slate-800/50" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSaveDraft} className="gap-1.5">
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              <Button
                onClick={() => {
                  if (!fullName || !mobile || !email || !address) {
                    alert("Please fill all required personal fields.");
                    return;
                  }
                  setStep(3);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 px-6"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 3: PROFESSIONAL HOSTING BACKGROUND */}
      {/* ------------------------------------------------------------- */}
      {step === 3 && (
        <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
              {currentRole.name}
            </Badge>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Step 03: Professional Hosting Background</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tell travelers about your farm, retreat, or specialized craft services.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Business / Farm / Studio Name *
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Gowda Organic Coffee Estate"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Years of Experience
              </label>
              <Input
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                min="0"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Languages Spoken with Guests
              </label>
              <Input
                value={languagesSpoken}
                onChange={(e) => setLanguagesSpoken(e.target.value)}
                placeholder="e.g. Kannada, English, Hindi, Kodava"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Host Bio &amp; Story
              </label>
              <Textarea
                rows={4}
                value={aboutBio}
                onChange={(e) => setAboutBio(e.target.value)}
                placeholder="Describe your heritage, farming techniques, organic produce, or guest experience..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSaveDraft} className="gap-1.5">
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              <Button
                onClick={() => {
                  if (!businessName) {
                    alert("Please specify your business or farm name.");
                    return;
                  }
                  setStep(4);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 px-6"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 4: VERIFICATION & KYC */}
      {/* ------------------------------------------------------------- */}
      {step === 4 && (
        <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
              Security &amp; Trust
            </Badge>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Step 04: Verification &amp; KYC Documentation</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All NammaConnect partners are 100% verified to maintain traveler safety and local authenticity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Identity Document Type *</label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="Aadhaar">Aadhaar Card</option>
                <option value="PAN">PAN Card</option>
                <option value="Land_RTC">Agricultural Land Record (RTC / Pahani)</option>
                <option value="Guide_License">Tourism Guide License</option>
                <option value="Commercial_DL">Commercial Driver License</option>
                <option value="GST">GST Registration Certificate</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Document ID Number *</label>
              <Input
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="e.g. 5432-xxxx-xxxx or RTC-8976"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Upload Verification Document</label>
              <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {documentFileName ? `Uploaded: ${documentFileName}` : "Drag & drop PDF / JPG / PNG document"}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Maximum file size: 10MB</p>
                <input
                  type="file"
                  id="kyc-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setDocumentFileName(file.name);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("kyc-upload")?.click()}
                  className="mt-3 text-xs"
                >
                  Choose File
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSaveDraft} className="gap-1.5">
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              <Button
                onClick={() => {
                  if (!idNumber) {
                    alert("Please provide your Document ID Number for verification.");
                    return;
                  }
                  setStep(5);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 px-6"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 5: DYNAMIC SERVICES & ACTIVITIES (TAG INPUT) */}
      {/* ------------------------------------------------------------- */}
      {step === 5 && (
        <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
              {currentRole.name}
            </Badge>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Step 05: Offerings &amp; Experiences (Dynamic Tags)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type custom services and activities or click popular suggestions below.
            </p>
          </div>

          {/* 1. Services Section */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Services I Provide ({services.length} selected)
            </label>
            <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 min-h-[44px]">
              {services.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-xs font-bold shadow-xs border border-emerald-300/40"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeServiceTag(tag)}
                    className="hover:text-rose-600 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={serviceInput}
                onChange={(e) => setServiceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addServiceTag(serviceInput);
                  }
                }}
                placeholder="Type a custom service and press Enter..."
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addServiceTag(serviceInput)}
                className="font-bold shrink-0 gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>

            {/* Popular Suggestions */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Popular {currentRole.badge} Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {currentRole.serviceSuggestions.map((s) => {
                  const isAdded = services.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => (isAdded ? removeServiceTag(s) : addServiceTag(s))}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                        isAdded
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                      }`}
                    >
                      {isAdded ? `✓ ${s}` : `+ ${s}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Activities Section */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Activities &amp; Workshops I Provide ({activities.length} selected)
            </label>
            <div className="flex flex-wrap gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 min-h-[44px]">
              {activities.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 text-xs font-bold shadow-xs border border-teal-300/40"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeActivityTag(tag)}
                    className="hover:text-rose-600 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={activityInput}
                onChange={(e) => setActivityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addActivityTag(activityInput);
                  }
                }}
                placeholder="Type a custom activity and press Enter..."
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addActivityTag(activityInput)}
                className="font-bold shrink-0 gap-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>

            {/* Popular Activity Suggestions */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Popular Activities:
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {currentRole.activitySuggestions.map((a) => {
                  const isAdded = activities.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => (isAdded ? removeActivityTag(a) : addActivityTag(a))}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                        isAdded
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                      }`}
                    >
                      {isAdded ? `✓ ${a}` : `+ ${a}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setStep(4)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSaveDraft} className="gap-1.5">
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              <Button
                onClick={() => {
                  if (services.length === 0) {
                    alert("Please select or type at least one service.");
                    return;
                  }
                  setStep(6);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 px-6"
              >
                Review Application <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ------------------------------------------------------------- */}
      {/* STEP 6: REVIEW & SUBMIT */}
      {/* ------------------------------------------------------------- */}
      {step === 6 && (
        <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-6">
          <div>
            <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold mb-1">
              Final Review
            </Badge>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Step 06: Review &amp; Submit Application</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please verify all details before submitting to the NammaConnect verification desk.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border rounded-2xl p-4 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div>
              <span className="text-slate-400 dark:text-slate-500">Selected Host Role:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{currentRole.name}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Business / Farm Name:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{businessName}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Primary Contact:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{fullName} ({mobile})</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Email:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{email}</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 dark:text-slate-500">Location / Address:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{address}, {district}, {stateName}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Verification Document:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{idType} ({idNumber})</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Experience:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{experienceYears} Years</p>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 dark:text-slate-500">Services ({services.length}):</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {services.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-[11px] font-semibold">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 dark:text-slate-500">Activities ({activities.length}):</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {activities.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-[11px] font-semibold">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setStep(5)} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleSaveDraft} className="gap-1.5">
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              <Button
                onClick={handleSubmitApplication}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 px-8 shadow-md"
              >
                {isSubmitting ? "Submitting..." : existingApp?.status === "REJECTED" ? "Review & Reapply" : "Submit Partner Application"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
