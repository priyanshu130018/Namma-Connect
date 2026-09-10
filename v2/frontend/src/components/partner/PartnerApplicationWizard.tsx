import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  Briefcase,
  Layers,
  FileCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  AlertCircle,
  Sparkles,
  Wheat,
  Home as HomeIcon,
  Utensils,
  TreePine,
  Car,
  Camera,
  Palette,
  Printer,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/providers";
import {
  PartnerApplicationData,
  PartnerApplicationPayload,
  OnboardingServiceItem,
  savePartnerApplicationDraft,
  submitPartnerApplication,
} from "@/services/partnerApplicationService";
import { generateApplicationPdf } from "@/lib/generateApplicationPdf";

export interface PartnerApplicationWizardProps {
  initialData?: PartnerApplicationData | null;
  onSuccess?: () => void;
}

export const ROLE_CATALOG = [
  { id: "farmer", title: "Farmer / Agriculture Host", icon: Wheat, desc: "Farm stays, plantation walks, harvest tours, agro-workshops" },
  { id: "hotel", title: "Hotel / Homestay Owner", icon: HomeIcon, desc: "Eco stays, estate villas, homestays, rooms, hospitality" },
  { id: "food", title: "Food & Culinary Host", icon: Utensils, desc: "Farm-to-table dining, local cuisine, traditional cooking, home dining" },
  { id: "guide", title: "Tour & Nature Guide", icon: TreePine, desc: "Trekking, birding, plantation walks, wildlife, heritage tours" },
  { id: "travel", title: "Travel & Transport", icon: Car, desc: "Jeep safaris, local cabs, airport pickups, travel rentals" },
  { id: "creator", title: "Content Creator & Studio", icon: Camera, desc: "Agri-filmmaking, drone cinematography, reels, social campaigns" },
  { id: "artisan", title: "Craft & Artisan", icon: Palette, desc: "Handicrafts, pottery, weaving workshops, artisan demonstrations" },
];

export const ROLE_SERVICE_SUGGESTIONS: Record<string, Array<{ title: string; category: string; price: number; unit: string }>> = {
  farmer: [
    { title: "Coffee Plantation Guided Walk", category: "experiences", price: 350, unit: "person" },
    { title: "Organic Harvest & Fruit Picking Experience", category: "experiences", price: 500, unit: "person" },
    { title: "Heritage Farm Stay & Cottage", category: "stay", price: 2500, unit: "night" },
    { title: "Farm-to-Table Traditional Malnad Lunch", category: "food", price: 400, unit: "person" },
  ],
  hotel: [
    { title: "Eco Homestay Double Room", category: "stay", price: 2200, unit: "night" },
    { title: "Whole Estate Villa Reservation", category: "stay", price: 6500, unit: "night" },
    { title: "Campfire & Barbecue Evening", category: "experiences", price: 800, unit: "group" },
  ],
  food: [
    { title: "Traditional Malnad Cooking Class", category: "food", price: 750, unit: "person" },
    { title: "Estate Organic Breakfast Feast", category: "food", price: 300, unit: "person" },
    { title: "Authentic Coorg Pork & Rice Dinner", category: "food", price: 550, unit: "person" },
  ],
  guide: [
    { title: "Dawn Birding & Nature Photography Trek", category: "guides-tours", price: 1200, unit: "group" },
    { title: "Peak Trail Summit Hiking Guide", category: "guides-tours", price: 1500, unit: "day" },
    { title: "Spices & Rainforest Botanical Walk", category: "guides-tours", price: 600, unit: "person" },
  ],
  travel: [
    { title: "Jeep Safari to Viewpoints & Waterfalls", category: "travel-services", price: 2800, unit: "trip" },
    { title: "Full-Day Sightseeing Taxi Driver Service", category: "travel-services", price: 3200, unit: "day" },
    { title: "Railway / Airport Station Pickup & Drop", category: "travel-services", price: 1800, unit: "trip" },
  ],
  creator: [
    { title: "Farm Experience Promotional Reel & Video Essay", category: "experiences", price: 4500, unit: "project" },
    { title: "Drone Cinematography 4K Aerial Coverage", category: "experiences", price: 6000, unit: "session" },
    { title: "Social Media & Travel Photo Shoot", category: "experiences", price: 3500, unit: "project" },
  ],
  artisan: [
    { title: "Pottery & Clay Craft Workshop", category: "experiences", price: 450, unit: "person" },
    { title: "Bamboo Handloom Weaving Demonstration", category: "experiences", price: 350, unit: "person" },
  ],
};

export function PartnerApplicationWizard({ initialData, onSuccess }: PartnerApplicationWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(initialData?.draft_step || 1);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Form State
  const [roleType, setRoleType] = useState<string>(initialData?.role_type || "farmer");

  // Step 1: Personal
  const [fullName, setFullName] = useState<string>(initialData?.full_name || user?.full_name || "");
  const [email, setEmail] = useState<string>(initialData?.email || user?.email || "");
  const [mobile, setMobile] = useState<string>(initialData?.mobile || user?.mobile || "");
  const [preferredName, setPreferredName] = useState<string>("");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [languages, setLanguages] = useState<string>(initialData?.languages || "Kannada, English");
  const [address, setAddress] = useState<string>(initialData?.address || "");
  const [district, setDistrict] = useState<string>(initialData?.district || "Kodagu (Coorg)");
  const [state, setState] = useState<string>(initialData?.state || "Karnataka");
  const [latitude, setLatitude] = useState<number | null>(initialData?.latitude || 12.4244);
  const [longitude, setLongitude] = useState<number | null>(initialData?.longitude || 75.7382);
  const [bio, setBio] = useState<string>(initialData?.bio || "");
  const [experienceYears, setExperienceYears] = useState<number>(initialData?.experience_years || 2);

  // Step 2: Role-Specific Work Information (provider_details)
  const [businessName, setBusinessName] = useState<string>(initialData?.business_name || "");
  const [providerDetails, setProviderDetails] = useState<Record<string, any>>(initialData?.provider_details || {});

  // Step 3: Services (Multi-service)
  const [servicesPayload, setServicesPayload] = useState<OnboardingServiceItem[]>([]);
  const [skippedServices, setSkippedServices] = useState<boolean>(false);

  // Single Service Draft State
  const [newSrvTitle, setNewSrvTitle] = useState("");
  const [newSrvDesc, setNewSrvDesc] = useState("");
  const [newSrvCategory, setNewSrvCategory] = useState("experiences");
  const [newSrvPrice, setNewSrvPrice] = useState<number>(500);
  const [newSrvUnit, setNewSrvUnit] = useState("person");
  const [newSrvCapacity, setNewSrvCapacity] = useState<number>(10);
  const [newSrvDuration] = useState<number>(2.0);

  // Step 4: Documents & Images
  const [idType, setIdType] = useState<string>(initialData?.id_type || "Aadhaar");
  const [idNumber, setIdNumber] = useState<string>(initialData?.id_number || "");
  const [documentUrl, setDocumentUrl] = useState<string>(initialData?.document_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe");
  const [images, setImages] = useState<string[]>(initialData?.images || [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
    "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f",
  ]);

  // Step 5: Review Terms
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // Set default provider details on role change
  useEffect(() => {
    if (!initialData?.provider_details || Object.keys(initialData.provider_details).length === 0) {
      if (roleType === "farmer") {
        setProviderDetails({ farm_name: businessName || "Green Estate", land_area: 10, land_unit: "acres", crops: ["Coffee", "Pepper", "Cardamom"], farming_method: "Organic" });
      } else if (roleType === "hotel") {
        setProviderDetails({ property_name: businessName || "Valley Homestay", total_rooms: 4, check_in_time: "12:00 PM", check_out_time: "11:00 AM", amenities: ["Wifi", "Campfire", "Parking"] });
      } else if (roleType === "food") {
        setProviderDetails({ food_business: businessName || "Traditional Kitchen", cuisine: "Malnad & Coorg", capacity: 20, fssai_license: "21224000000000" });
      } else if (roleType === "guide") {
        setProviderDetails({ guide_type: "Nature & Trekking", expertise: "Birding, Botany, Altitude Trails", safety_certified: true });
      } else if (roleType === "travel") {
        setProviderDetails({ vehicle_type: "4x4 Jeep & SUV", vehicle_number: "KA-12-M-8899", commercial_license: "DL-2024-9988", permit_type: "All India Tourist Permit" });
      } else if (roleType === "creator") {
        setProviderDetails({ creator_type: "Filmmaker & Drone Operator", equipment: "Sony A7SIII, DJI Mavic 3", portfolio_url: "https://instagram.com/namma_creator", audience_reach: "50K+" });
      } else if (roleType === "artisan") {
        setProviderDetails({ craft_type: "Terracotta & Pottery", workshop_name: "Coorg Clay Crafts", product_catalog: ["Pots", "Vases", "Decor"] });
      }
    }
  }, [roleType]);

  // Auto-populate default service suggestions if empty
  const applySuggestion = (s: { title: string; category: string; price: number; unit: string }) => {
    setServicesPayload((prev) => [
      ...prev,
      {
        title: s.title,
        description: `${s.title} provided by ${businessName || fullName}.`,
        category: s.category,
        price: s.price,
        unit: s.unit,
        max_capacity: 10,
        duration_hours: 2.0,
        images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef"],
      },
    ]);
  };

  const handleAddCustomService = () => {
    if (!newSrvTitle.trim()) return;
    setServicesPayload((prev) => [
      ...prev,
      {
        title: newSrvTitle.trim(),
        description: newSrvDesc.trim() || `${newSrvTitle.trim()} provided by ${businessName || fullName}.`,
        category: newSrvCategory,
        price: Number(newSrvPrice) || 500,
        unit: newSrvUnit,
        max_capacity: Number(newSrvCapacity) || 10,
        duration_hours: Number(newSrvDuration) || 2.0,
        images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef"],
      },
    ]);
    setNewSrvTitle("");
    setNewSrvDesc("");
  };

  const handleRemoveService = (idx: number) => {
    setServicesPayload((prev) => prev.filter((_, i) => i !== idx));
  };

  // Build Payload
  const getPayload = (): PartnerApplicationPayload => {
    return {
      role_type: roleType,
      full_name: fullName.trim() || "Applicant",
      email: email.trim() || user?.email || "partner@example.com",
      mobile: mobile.trim() || "9900099000",
      address: address.trim() || "Estate Road",
      district: district.trim() || "Kodagu (Coorg)",
      state: state.trim() || "Karnataka",
      latitude: latitude || 12.4244,
      longitude: longitude || 75.7382,
      business_name: businessName.trim() || `${fullName}'s ${roleType.toUpperCase()} Enterprise`,
      experience_years: Number(experienceYears) || 0,
      bio: bio.trim(),
      languages: languages.trim(),
      id_type: idType,
      id_number: idNumber.trim() || "000000000000",
      document_url: documentUrl,
      provider_details: providerDetails,
      documents: [
        { name: `${idType} Card`, url: documentUrl, type: "Government ID" },
      ],
      images: images,
      services: servicesPayload.map((s) => s.title),
      activities: servicesPayload.filter((s) => s.category === "experiences").map((s) => s.title),
      services_payload: skippedServices ? [] : servicesPayload,
      draft_step: currentStep,
    };
  };

  // Save Draft Action
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      const draftRes = await savePartnerApplicationDraft(getPayload());
      setFeedbackSuccess(`Draft saved successfully at Step ${currentStep} (${draftRes.application_code}).`);
    } catch (err: any) {
      console.error("Failed to save draft:", err);
      setFeedbackError(err?.response?.data?.message || "Failed to save draft to server.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Step Validation
  const validateCurrentStep = (): boolean => {
    setFeedbackError(null);
    if (currentStep === 1) {
      if (!fullName.trim()) { setFeedbackError("Please enter your Full Name."); return false; }
      if (!email.trim()) { setFeedbackError("Please enter your Email Address."); return false; }
      if (!mobile.trim() || mobile.trim().length < 10) { setFeedbackError("Please enter a valid Mobile Number (min 10 digits)."); return false; }
      if (!address.trim()) { setFeedbackError("Please enter your Address."); return false; }
      if (!district.trim()) { setFeedbackError("Please enter your District."); return false; }
      return true;
    }
    if (currentStep === 2) {
      if (!businessName.trim()) { setFeedbackError("Please enter your Business / Property / Studio Name."); return false; }
      return true;
    }
    if (currentStep === 3) {
      // Services can be skipped or populated
      return true;
    }
    if (currentStep === 4) {
      if (!idNumber.trim()) { setFeedbackError("Please enter your Government Identification Number."); return false; }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(5, prev + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Submit Action
  const handleSubmit = async () => {
    if (!termsAccepted) {
      setFeedbackError("Please accept the partner registration terms and verification declaration.");
      return;
    }
    setIsSubmitting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      const res = await submitPartnerApplication(getPayload());
      setFeedbackSuccess(`Application #${res.application_code} submitted successfully! Redirecting...`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else navigate("/app");
      }, 1500);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setFeedbackError(err?.response?.data?.message || "Failed to submit partner application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Become a NammaConnect Partner</span>
            <Badge className="bg-emerald-600 text-white font-bold text-xs">V2 Onboarding</Badge>
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Progressive 5-step role-aware registration for hosts, farmers, stay owners, drivers & creators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="gap-1.5 font-bold text-xs"
          >
            <Save className={`h-3.5 w-3.5 ${isSavingDraft ? "animate-spin" : ""}`} />
            <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { step: 1, label: "01 Personal", icon: UserIcon },
            { step: 2, label: "02 Work", icon: Briefcase },
            { step: 3, label: "03 Services", icon: Layers },
            { step: 4, label: "04 Documents", icon: FileCheck },
            { step: 5, label: "05 Review", icon: CheckCircle2 },
          ].map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <div
                key={s.step}
                onClick={() => {
                  if (isCompleted) setCurrentStep(s.step);
                }}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-extrabold border border-emerald-300 dark:border-emerald-800"
                    : isCompleted
                    ? "text-emerald-700 dark:text-emerald-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                    : "text-slate-400 dark:text-slate-600 font-semibold"
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold"
                      : isCompleted
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] md:text-xs truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {feedbackError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{feedbackError}</span>
          </div>
          <button type="button" onClick={() => setFeedbackError(null)}>
            <X className="h-4 w-4 text-rose-500" />
          </button>
        </div>
      )}

      {feedbackSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-900 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
          <button type="button" onClick={() => setFeedbackSuccess(null)}>
            <X className="h-4 w-4 text-emerald-500" />
          </button>
        </div>
      )}

      {/* Step Body Cards */}
      <Card className="p-6 md:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
        {/* ── STEP 1: PERSONAL INFORMATION ── */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-emerald-600" />
                <span>Section 01: Personal Information</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Provide your primary contact, address, location coordinates, and bio credentials.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priyanshu Sharma"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Preferred Name / Alias</label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="e.g. Priyanshu Host"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Mobile Number *</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@example.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">WhatsApp Number</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Languages Spoken</label>
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="Kannada, English, Hindi"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Address Line *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Estate Road, Village / Taluk"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">District *</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Kodagu (Coorg), Chikmagalur, Mysore"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">State *</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Karnataka"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Latitude / Longitude (TomTom Map Picker)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={latitude || 12.4244}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="w-1/2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 font-medium"
                    placeholder="Lat"
                  />
                  <input
                    type="number"
                    step="any"
                    value={longitude || 75.7382}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    className="w-1/2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 font-medium"
                    placeholder="Lng"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Years of Experience</label>
                <input
                  type="number"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Bio & Introduction</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a brief introduction about your background, property, or storytelling expertise..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: ROLE & WORK INFORMATION ── */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-emerald-600" />
                <span>Section 02: Role Selection & Work Details</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select your primary partner role first. Only relevant fields for your role will be displayed and validated.
              </p>
            </div>

            {/* Role Catalog Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {ROLE_CATALOG.map((r) => {
                const RoleIcon = r.icon;
                const isSelected = roleType === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setRoleType(r.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 ring-2 ring-emerald-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <RoleIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-extrabold ${isSelected ? "text-emerald-900 dark:text-emerald-200" : "text-slate-900 dark:text-slate-100"}`}>
                        {r.title}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{r.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Business / Property Name */}
            <div className="space-y-1 text-xs pt-2">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Business / Enterprise / Studio / Homestay Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Coffee Valley Estate, Sunset Homestay, Studio Crafts"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Dynamic Role-Specific Fields Container */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] text-emerald-800 dark:text-emerald-400">
                {roleType.toUpperCase()} SPECIFIC DETAILS
              </h3>

              {roleType === "farmer" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold">Farm / Plantation Name</label>
                    <input
                      type="text"
                      value={providerDetails.farm_name || ""}
                      onChange={(e) => setProviderDetails({ ...providerDetails, farm_name: e.target.value })}
                      placeholder="e.g. Silver Oak Estate"
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold">Land Area & Unit</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        value={providerDetails.land_area || 10}
                        onChange={(e) => setProviderDetails({ ...providerDetails, land_area: parseFloat(e.target.value) })}
                        className="w-1/2 rounded-xl border p-2"
                      />
                      <select
                        value={providerDetails.land_unit || "acres"}
                        onChange={(e) => setProviderDetails({ ...providerDetails, land_unit: e.target.value })}
                        className="w-1/2 rounded-xl border p-2 bg-white dark:bg-slate-900"
                      >
                        <option value="acres">Acres</option>
                        <option value="hectares">Hectares</option>
                        <option value="guntas">Guntas</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold">Primary Crops</label>
                    <input
                      type="text"
                      value={Array.isArray(providerDetails.crops) ? providerDetails.crops.join(", ") : providerDetails.crops || "Coffee, Pepper"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, crops: e.target.value.split(",").map((s) => s.trim()) })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold">Farming Method</label>
                    <select
                      value={providerDetails.farming_method || "Organic"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, farming_method: e.target.value })}
                      className="w-full rounded-xl border p-2 mt-1 bg-white dark:bg-slate-900"
                    >
                      <option value="Organic">Organic & Sustainable</option>
                      <option value="Natural">Zero Budget Natural Farming</option>
                      <option value="Conventional">Conventional / Traditional</option>
                    </select>
                  </div>
                </div>
              )}

              {roleType === "hotel" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold">Total Guest Rooms / Units</label>
                    <input
                      type="number"
                      value={providerDetails.total_rooms || 4}
                      onChange={(e) => setProviderDetails({ ...providerDetails, total_rooms: parseInt(e.target.value) })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold">Check-in / Check-out Schedule</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={providerDetails.check_in_time || "12:00 PM"}
                        onChange={(e) => setProviderDetails({ ...providerDetails, check_in_time: e.target.value })}
                        className="w-1/2 rounded-xl border p-2"
                      />
                      <input
                        type="text"
                        value={providerDetails.check_out_time || "11:00 AM"}
                        onChange={(e) => setProviderDetails({ ...providerDetails, check_out_time: e.target.value })}
                        className="w-1/2 rounded-xl border p-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {roleType === "food" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold">Cuisine Specialty</label>
                    <input
                      type="text"
                      value={providerDetails.cuisine || "Malnad Traditional & Coorg"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, cuisine: e.target.value })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold">FSSAI Registration / License</label>
                    <input
                      type="text"
                      value={providerDetails.fssai_license || "21224000000000"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, fssai_license: e.target.value })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                </div>
              )}

              {roleType === "guide" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold">Guide Expertise</label>
                    <input
                      type="text"
                      value={providerDetails.expertise || "Trekking, Birding, Botany"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, expertise: e.target.value })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold">Safety / First Aid Certified</label>
                    <select
                      value={providerDetails.safety_certified ? "yes" : "no"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, safety_certified: e.target.value === "yes" })}
                      className="w-full rounded-xl border p-2 mt-1 bg-white dark:bg-slate-900"
                    >
                      <option value="yes">Yes - Wilderness & First Aid Certified</option>
                      <option value="no">In Progress / Experienced</option>
                    </select>
                  </div>
                </div>
              )}

              {roleType === "travel" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold">Vehicle Type & Model</label>
                    <input
                      type="text"
                      value={providerDetails.vehicle_type || "4x4 Jeep / Mahindra Thar"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, vehicle_type: e.target.value })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold">Commercial Driving License / Badge</label>
                    <input
                      type="text"
                      value={providerDetails.commercial_license || "DL-2024-8899"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, commercial_license: e.target.value })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                </div>
              )}

              {roleType === "creator" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold">Production Equipment</label>
                    <input
                      type="text"
                      value={providerDetails.equipment || "Sony A7SIII 4K, DJI Mavic 3 Cine"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, equipment: e.target.value })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold">Portfolio Link / Social Handle</label>
                    <input
                      type="text"
                      value={providerDetails.portfolio_url || "https://instagram.com/namma_creator"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, portfolio_url: e.target.value })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                </div>
              )}

              {roleType === "artisan" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold">Craft Category</label>
                    <input
                      type="text"
                      value={providerDetails.craft_type || "Pottery & Terracotta"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, craft_type: e.target.value })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="font-bold">Workshop Name</label>
                    <input
                      type="text"
                      value={providerDetails.workshop_name || "Coorg Clay Crafts"}
                      onChange={(e) => setProviderDetails({ ...providerDetails, workshop_name: e.target.value })}
                      className="w-full rounded-xl border p-2 mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: SERVICE LISTING ── */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-600" />
                  <span>Section 03: Service Listings</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Specify services provided during onboarding, or skip to add services later from your dashboard.
                </p>
              </div>
              <Button
                type="button"
                variant={skippedServices ? "default" : "outline"}
                size="sm"
                onClick={() => setSkippedServices(!skippedServices)}
                className="text-xs font-bold"
              >
                {skippedServices ? "Include Services" : "Skip for Now"}
              </Button>
            </div>

            {skippedServices ? (
              <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-2">
                <Sparkles className="h-6 w-6 text-amber-600 mx-auto" />
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">Services Skipped During Initial Onboarding</h3>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 max-w-md mx-auto">
                  You can submit your partner application now without services. Once approved, you can create and manage your services directly from your Partner Dashboard.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Role Suggestions */}
                {ROLE_SERVICE_SUGGESTIONS[roleType] && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Suggested Services for {roleType.toUpperCase()}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_SERVICE_SUGGESTIONS[roleType].map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applySuggestion(s)}
                          className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-all"
                        >
                          <Plus className="h-3 w-3 text-emerald-600" />
                          <span>{s.title} ({s.price} INR)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Custom Service Box */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Plus className="h-4 w-4 text-emerald-600" />
                    <span>Add New Service Listing</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700">Service Name *</label>
                      <input
                        type="text"
                        value={newSrvTitle}
                        onChange={(e) => setNewSrvTitle(e.target.value)}
                        placeholder="e.g. Guided Coffee Estate Walk"
                        className="w-full rounded-xl border p-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Category</label>
                      <select
                        value={newSrvCategory}
                        onChange={(e) => setNewSrvCategory(e.target.value)}
                        className="w-full rounded-xl border p-2 mt-1 bg-white dark:bg-slate-900"
                      >
                        <option value="experiences">Experiences</option>
                        <option value="stay">Homestay & Accommodation</option>
                        <option value="food">Food & Dining</option>
                        <option value="guides-tours">Guides & Tours</option>
                        <option value="travel-services">Travel & Transport</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Starting Price (INR)</label>
                      <input
                        type="number"
                        value={newSrvPrice}
                        onChange={(e) => setNewSrvPrice(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border p-2 mt-1"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Price Unit</label>
                      <select
                        value={newSrvUnit}
                        onChange={(e) => setNewSrvUnit(e.target.value)}
                        className="w-full rounded-xl border p-2 mt-1 bg-white dark:bg-slate-900"
                      >
                        <option value="person">per person</option>
                        <option value="night">per night</option>
                        <option value="group">per group</option>
                        <option value="trip">per trip</option>
                        <option value="day">per day</option>
                        <option value="project">per project</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Max Capacity</label>
                      <input
                        type="number"
                        value={newSrvCapacity}
                        onChange={(e) => setNewSrvCapacity(parseInt(e.target.value) || 1)}
                        className="w-full rounded-xl border p-2 mt-1"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomService}
                    disabled={!newSrvTitle.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add Service to Application
                  </Button>
                </div>

                {/* Added Services List */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Services Attached to Application ({servicesPayload.length}):
                  </h3>
                  {servicesPayload.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No services added yet. Select a suggestion above or use the form.</p>
                  ) : (
                    <div className="space-y-2">
                      {servicesPayload.map((srv, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-slate-100">{srv.title}</span>
                            <span className="ml-2 text-[10px] text-slate-500 font-mono">({srv.category})</span>
                            <p className="text-[11px] text-emerald-800 dark:text-emerald-400 font-bold mt-0.5">
                              ₹{srv.price} / {srv.unit} • Max capacity: {srv.max_capacity}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveService(idx)}
                            className="text-rose-600 hover:bg-rose-50 p-2 h-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: DOCUMENTS & IMAGES ── */}
        {currentStep === 4 && (
          <div className="space-y-6 text-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-600" />
                <span>Section 04: Documents & Identity Verification</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Upload your government identification and property/business photographs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Government ID Type *</label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Land_RTC">Land RTC / Pahani</option>
                  <option value="Guide_License">Official Tourism Guide License</option>
                  <option value="Commercial_DL">Commercial Driver License</option>
                  <option value="FSSAI">FSSAI Food Safety Certificate</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">ID Number / Certificate Reference *</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. 1234-5678-9012"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Document File URL / Upload Link</label>
                <input
                  type="text"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or uploaded document link"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Photo Gallery Uploader */}
            <div className="space-y-3 pt-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Property / Business Gallery Images ({images.length})
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden h-24 border border-slate-200 dark:border-slate-800 group">
                    <img src={img} alt="Uploaded" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-rose-600 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setImages([...images, "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09"])}
                  className="h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                >
                  <Upload className="h-5 w-5 mb-1" />
                  <span className="text-[10px] font-bold">+ Upload Image</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: REVIEW & FINAL SUBMISSION ── */}
        {currentStep === 5 && (
          <div className="space-y-6 text-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Section 05: Application Review & Final Submission</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review your application details. You can edit any section before submitting for official verification.
              </p>
            </div>

            {/* Application PDF Print Launcher */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 dark:text-emerald-200 block">Download Printable Application Summary</span>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-400">Generate an official PDF copy of your submitted credentials.</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => generateApplicationPdf({
                  id: "DRAFT-PDF",
                  application_code: "PA-2026-DRAFT",
                  user_id: user?.id || "",
                  role_type: roleType,
                  full_name: fullName,
                  email: email,
                  mobile: mobile,
                  address: address,
                  district: district,
                  state: state,
                  business_name: businessName,
                  experience_years: experienceYears,
                  id_type: idType,
                  id_number: idNumber,
                  provider_details: providerDetails,
                  documents: [{ name: idType, url: documentUrl, type: "Government ID" }],
                  services: servicesPayload.map((s) => s.title),
                  activities: [],
                  status: "DRAFT",
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })}
                className="gap-1.5 font-bold text-xs"
              >
                <Printer className="h-4 w-4" /> Print / PDF
              </Button>
            </div>

            {/* Section Summaries */}
            <div className="space-y-4">
              {/* Personal Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">01. Personal Information</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="text-xs text-emerald-600 font-bold h-auto p-1">Edit</Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-slate-400 block">Full Name:</span> <strong>{fullName}</strong></div>
                  <div><span className="text-slate-400 block">Contact:</span> <strong>{email} | {mobile}</strong></div>
                  <div><span className="text-slate-400 block">Address:</span> <strong>{address}, {district}, {state}</strong></div>
                  <div><span className="text-slate-400 block">Experience & Languages:</span> <strong>{experienceYears} Yrs | {languages}</strong></div>
                </div>
              </div>

              {/* Work Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">02. Registered Role & Work Details</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="text-xs text-emerald-600 font-bold h-auto p-1">Edit</Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-slate-400 block">Registered Role:</span> <strong className="text-emerald-700 uppercase font-bold">{roleType}</strong></div>
                  <div><span className="text-slate-400 block">Business / Studio Name:</span> <strong>{businessName}</strong></div>
                </div>
              </div>

              {/* Services Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">03. Initial Service Listings ({servicesPayload.length})</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCurrentStep(3)} className="text-xs text-emerald-600 font-bold h-auto p-1">Edit</Button>
                </div>
                {skippedServices || servicesPayload.length === 0 ? (
                  <p className="text-slate-400 italic">No services attached during initial application (Skipped).</p>
                ) : (
                  <div className="space-y-1">
                    {servicesPayload.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span>• <strong>{s.title}</strong> ({s.category})</span>
                        <span className="font-bold text-emerald-700">₹{s.price} / {s.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Documents Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">04. Documents & Credentials</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCurrentStep(4)} className="text-xs text-emerald-600 font-bold h-auto p-1">Edit</Button>
                </div>
                <div className="text-[11px]">
                  <span className="text-slate-400 block">ID Reference:</span> <strong>{idType} - {idNumber}</strong>
                </div>
              </div>
            </div>

            {/* Terms Declaration */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="terms" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed cursor-pointer">
                I hereby declare that all submitted personal, legal, business, and service details are accurate. I agree to NammaConnect Partner Terms of Service and Verification Policies.
              </label>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-1 font-bold text-xs"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>

          {currentStep < 5 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 text-xs"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !termsAccepted}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold gap-2 px-6 text-xs shadow-md"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? "Submitting Application..." : "Submit Application for Verification"}</span>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
