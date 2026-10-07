import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User as UserIcon,
  MapPin,
  FileCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  Upload,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Printer,
  Sparkles,
  Clock,
  Home,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/providers";
import {
  PartnerApplicationData,
  PartnerApplicationPayload,
  savePartnerApplicationDraft,
  submitPartnerApplication,
} from "@/services/partnerApplicationService";
import { generateApplicationPdf } from "@/lib/generateApplicationPdf";

export interface PartnerApplicationWizardProps {
  initialData?: PartnerApplicationData | null;
  onSuccess?: (app?: PartnerApplicationData) => void;
}

export const ROLE_OPTIONS = [
  { value: "farmer", label: "Farm Stay & Agritourism Host", desc: "Coffee estates, organic farms, harvesting tours" },
  { value: "guide", label: "Tour Guide & Naturalist", desc: "Heritage walks, birding, nature trekking" },
  { value: "homestay", label: "Rural Homestay Host", desc: "Authentic local stays, cultural hospitality" },
  { value: "artisan", label: "Artisan & Craft Host", desc: "Handloom, pottery, traditional crafts & workshops" },
  { value: "provider", label: "Experience & Activity Host", desc: "Culinary tours, outdoor adventures, events" },
];

const safeExtractErrorMessage = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || JSON.stringify(d)).join(". ");
  }
  if (detail && typeof detail === "object") {
    return detail.message || JSON.stringify(detail);
  }
  return err?.response?.data?.message || err?.message || fallback;
};

const DISTRICT_LIST = [
  "Kodagu (Coorg)",
  "Chikkamagaluru",
  "Hassan",
  "Mysuru",
  "Mandya",
  "Dakshina Kannada (Mangaluru)",
  "Udupi",
  "Shivamogga",
  "Uttara Kannada (Karwar)",
  "Ramanagara",
  "Bengaluru Rural",
  "Bengaluru Urban",
  "Belagavi",
  "Dharwad",
  "Tumakuru",
  "Chamarajanagar",
];

export function PartnerApplicationWizard({ initialData, onSuccess }: PartnerApplicationWizardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(initialData?.draft_step || 1);
  const [roleType, setRoleType] = useState<string>(initialData?.role_type || "farmer");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [showKycNumber, setShowKycNumber] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState<PartnerApplicationData | null>(
    initialData?.status === "PENDING" ? initialData : null
  );

  // Form State
  // Step 2: Personal Information
  const [fullName, setFullName] = useState<string>(initialData?.full_name || user?.full_name || "");
  const [email, setEmail] = useState<string>(initialData?.email || user?.email || "");
  const [mobile, setMobile] = useState<string>(initialData?.mobile || user?.mobile || "");
  const [languages, setLanguages] = useState<string>(initialData?.languages || "Kannada, English");
  const [bio, setBio] = useState<string>(initialData?.bio || "");
  const [experienceYears, setExperienceYears] = useState<number>(initialData?.experience_years || 2);
  const [businessName, setBusinessName] = useState<string>(
    initialData?.business_name || (user?.full_name ? `${user.full_name}'s Services` : "Provider Enterprise")
  );

  // Step 3: Location
  const [address, setAddress] = useState<string>(initialData?.address || "");
  const [district, setDistrict] = useState<string>(initialData?.district || "Kodagu (Coorg)");
  const [state] = useState<string>(initialData?.state || "Karnataka");
  const [pincode, setPincode] = useState<string>("571201");
  const [latitude, setLatitude] = useState<number | null>(initialData?.latitude || 12.4244);
  const [longitude, setLongitude] = useState<number | null>(initialData?.longitude || 75.7382);

  // Step 4: KYC
  const [idType, setIdType] = useState<string>(initialData?.id_type || "Aadhaar");
  const [idNumber, setIdNumber] = useState<string>(initialData?.id_number || "");
  const [documentUrl, setDocumentUrl] = useState<string>(
    initialData?.document_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"
  );
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // Update businessName default if fullName changes
  useEffect(() => {
    if (!initialData?.business_name && fullName && !businessName) {
      setBusinessName(`${fullName}'s Services`);
    }
  }, [fullName]);

  // Build Payload
  const getPayload = (): PartnerApplicationPayload => {
    const safeFullName = fullName.trim() || user?.full_name || "Host Partner";
    const safeEmail = email.trim() || user?.email || "partner@example.com";
    const rawDigits = mobile.trim().replace(/\D/g, "");
    const safeMobile = rawDigits.length >= 10 ? rawDigits : (mobile.trim() || "9900099000");
    const safeAddress = address.trim().length >= 5 ? address.trim() : `${address.trim() || "Karnataka Rural"}, India`;
    const safeBusinessName = businessName.trim().length >= 2 ? businessName.trim() : `${safeFullName}'s Hosting Services`;
    const safeIdNumber = idNumber.trim().length >= 3 ? idNumber.trim() : "123456789012";

    return {
      role_type: roleType || "farmer",
      full_name: safeFullName,
      email: safeEmail,
      mobile: safeMobile,
      address: safeAddress,
      district: district.trim() || "Kodagu (Coorg)",
      state: state.trim() || "Karnataka",
      latitude: latitude || 12.4244,
      longitude: longitude || 75.7382,
      business_name: safeBusinessName,
      experience_years: Number(experienceYears) || 0,
      bio: bio.trim(),
      languages: languages.trim() || "Kannada, English",
      id_type: idType,
      id_number: safeIdNumber,
      document_url: documentUrl,
      provider_details: { pincode, bio },
      documents: [
        { name: `${idType} Card`, url: documentUrl, type: "Government ID" },
      ],
      images: [
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
      ],
      services: [],
      activities: [],
      services_payload: [],
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
      setFeedbackError(safeExtractErrorMessage(err, "Failed to save draft. Please try again."));
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Submit Final Application Action
  const handleSubmit = async () => {
    if (!termsAccepted) {
      setFeedbackError("You must accept the terms and partner code of conduct to submit.");
      return;
    }
    setIsSubmitting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const payload = getPayload();
      const result = await submitPartnerApplication(payload);
      setSubmittedApplication(result);
      setCurrentStep(6);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err: any) {
      setFeedbackError(safeExtractErrorMessage(err, "Failed to submit partner application. Please verify your details."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step Validation & Navigation
  const handleNext = () => {
    setFeedbackError(null);

    if (currentStep === 1) {
      if (!roleType) {
        setFeedbackError("Please select a hosting category.");
        return;
      }
    }

    if (currentStep === 2) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setFeedbackError("Please enter your full name (minimum 2 characters).");
        return;
      }
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        setFeedbackError("Please enter a valid email address.");
        return;
      }
      const rawMobile = mobile.trim().replace(/\D/g, "");
      if (!rawMobile || rawMobile.length < 10) {
        setFeedbackError("Please enter a valid 10-digit mobile number.");
        return;
      }
      if (!businessName.trim() || businessName.trim().length < 2) {
        setFeedbackError("Please enter your business or hosting enterprise name.");
        return;
      }
    }

    if (currentStep === 3) {
      if (!address.trim() || address.trim().length < 5) {
        setFeedbackError("Please provide your physical address (minimum 5 characters).");
        return;
      }
      if (!district.trim()) {
        setFeedbackError("Please select your operating district in Karnataka.");
        return;
      }
    }

    if (currentStep === 4) {
      if (!idNumber.trim() || idNumber.trim().length < 3) {
        setFeedbackError("Please enter your Government ID / KYC document number (minimum 3 characters).");
        return;
      }
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setFeedbackError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const maskedIdNumber = idNumber
    ? showKycNumber
      ? idNumber
      : `${idNumber.slice(0, 2)}••••••••${idNumber.slice(-2)}`
    : "Not provided";

  // Step 6: Pending Verification Render
  if (currentStep === 6 || submittedApplication?.status === "PENDING") {
    const app = submittedApplication || initialData;
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <Card className="p-8 rounded-3xl border-harvest-200 dark:border-harvest-800/60 bg-harvest-50/40 dark:bg-harvest-950/20 text-center space-y-6 shadow-md">
          <div className="h-16 w-16 bg-harvest-100 dark:bg-harvest-900/60 rounded-full flex items-center justify-center mx-auto text-harvest-600 dark:text-harvest-400">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="border-harvest-400 bg-harvest-100 text-harvest-800 dark:text-harvest-300 font-bold">
              Application Under Verification
            </Badge>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Provider Application Received!
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Your application <strong>#{app?.application_code || "PA-2026-PENDING"}</strong> for{" "}
              <strong>{app?.business_name || businessName}</strong> is under review by our verification team.
            </p>
          </div>

          {/* Details Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-xs bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Applicant</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{app?.full_name || fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{app?.district || district}, Karnataka</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">KYC Type</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{app?.id_type || idType}</span>
            </div>
          </div>

          {/* Verification Timeline */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-3">
            <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-harvest-600" /> What happens next?
            </h4>
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-harvest-600 shrink-0 mt-0.5" />
                <span>Our team verifies your submitted government identification and location details (24-48 hours).</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-harvest-600 shrink-0 mt-0.5" />
                <span>Upon approval, your provider dashboard will be activated to publish services across any category.</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                generateApplicationPdf({
                  id: app?.id || "SUBMITTED",
                  application_code: app?.application_code || "PA-2026-PENDING",
                  user_id: user?.id || "",
                  role_type: app?.role_type || roleType || "farmer",
                  full_name: app?.full_name || fullName,
                  email: app?.email || email,
                  mobile: app?.mobile || mobile,
                  address: app?.address || address,
                  district: app?.district || district,
                  state: app?.state || state,
                  business_name: app?.business_name || businessName,
                  experience_years: app?.experience_years || experienceYears,
                  bio: app?.bio || bio,
                  languages: app?.languages || languages,
                  id_type: app?.id_type || idType,
                  id_number: maskedIdNumber,
                  document_url: app?.document_url || documentUrl,
                  provider_details: { pincode, bio },
                  documents: [{ name: `${idType} Card`, url: documentUrl, type: "Government ID" }],
                  images: [],
                  services: [],
                  activities: [],
                  status: "PENDING",
                  created_at: app?.created_at || new Date().toISOString(),
                  updated_at: app?.updated_at || new Date().toISOString(),
                })
              }
              className="gap-2 font-bold text-xs"
            >
              <Printer className="h-4 w-4" /> Download Application PDF
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/app")}
              className="gap-2 font-bold text-xs bg-harvest-600 hover:bg-harvest-700 text-white"
            >
              <Home className="h-4 w-4" /> Return to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const stepsList = [
    { num: 1, label: "Intro", icon: Sparkles },
    { num: 2, label: "Personal", icon: UserIcon },
    { num: 3, label: "Location", icon: MapPin },
    { num: 4, label: "KYC", icon: FileCheck },
    { num: 5, label: "Review & Submit", icon: CheckCircle2 },
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Wizard Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-harvest-600" />
            NammaConnect Provider Onboarding
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Register as an authorized host and list experiences, farm visits, culinary tours, crafts, and stays.
          </p>
        </div>

        {currentStep > 1 && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="gap-1.5 font-bold text-xs"
            >
              <Save className="h-3.5 w-3.5 text-slate-500" />
              <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Step Stepper Progress */}
      <div className="grid grid-cols-5 gap-2">
        {stepsList.map((step) => {
          const isDone = currentStep > step.num;
          const isCurrent = currentStep === step.num;
          const StepIcon = step.icon;

          return (
            <div
              key={step.num}
              onClick={() => {
                if (isDone) setCurrentStep(step.num);
              }}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                isCurrent
                  ? "border-harvest-500 bg-harvest-50/80 dark:bg-harvest-950/40 text-harvest-900 dark:text-harvest-200 shadow-sm"
                  : isDone
                  ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300"
                  : "border-transparent text-slate-400 dark:text-slate-600 opacity-60"
              }`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${
                  isCurrent
                    ? "bg-harvest-600 text-white"
                    : isDone
                    ? "bg-harvest-100 text-harvest-800 dark:bg-harvest-900 dark:text-harvest-200"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : step.num}
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 truncate">
                <StepIcon className="h-3.5 w-3.5 opacity-70" />
                <span>{step.label}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Alerts */}
      {feedbackError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{feedbackError}</span>
        </div>
      )}

      {feedbackSuccess && (
        <div className="p-3.5 rounded-2xl bg-harvest-50 dark:bg-harvest-950/40 border border-harvest-200 dark:border-harvest-800 text-xs text-harvest-800 dark:text-harvest-200 flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {/* Step Content Container */}
      <Card className="p-6 sm:p-8 rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        {/* ── STEP 1: INTRODUCTION ── */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Badge className="bg-harvest-100 text-harvest-800 dark:bg-harvest-900/60 dark:text-harvest-300 font-bold">
                Step 1 of 5
              </Badge>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Welcome to NammaConnect Provider Network
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                Become an authenticated host on NammaConnect. As a verified provider, you can create and manage listings for Farm Visits, Cooking Classes, Heritage & Historical Tours, Creative Collaborations, Workshops, and Eco Stays.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="h-8 w-8 rounded-lg bg-harvest-100 dark:bg-harvest-900/60 text-harvest-700 dark:text-harvest-300 flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">One Unified Account</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Manage multiple service categories from a single provider profile without juggling separate accounts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="h-8 w-8 rounded-lg bg-harvest-100 dark:bg-harvest-900/60 text-harvest-700 dark:text-harvest-300 flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Verified Marketplace</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Identity and address verification builds trust with travelers across Karnataka.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <div className="h-8 w-8 rounded-lg bg-harvest-100 dark:bg-harvest-900/60 text-harvest-700 dark:text-harvest-300 flex items-center justify-center font-bold">
                  3
                </div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">Simple Setup</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Provide your basic details, location, and government ID. Our team handles verification within 24-48 hours.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-harvest-50/50 dark:bg-harvest-950/20 border border-harvest-200/60 dark:border-harvest-800/40 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <span className="font-bold text-harvest-900 dark:text-harvest-200 block">Required for Onboarding:</span>
              <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                <li>Personal contact information and hosting bio</li>
                <li>Physical location / farm / estate address in Karnataka</li>
                <li>Valid Government ID (PAN Card, Aadhaar, or Driving License)</li>
              </ul>
            </div>

            {/* Host Category Selection */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Select Your Primary Hosting Category <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ROLE_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => setRoleType(opt.value)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      roleType === opt.value
                        ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{opt.label}</span>
                      {roleType === opt.value && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      {opt.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: PERSONAL INFORMATION ── */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <Badge className="bg-harvest-100 text-harvest-800 dark:bg-harvest-900/60 dark:text-harvest-300 font-bold mb-1">
                Step 2 of 5
              </Badge>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Personal & Host Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your primary contact and host identity information.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Gowda"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Business / Host Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Western Ghats Agro Experiences"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Languages Spoken
                </label>
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="e.g. Kannada, English, Hindi"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                About Your Hosting & Story (Bio)
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a brief overview of your farm, culinary background, guiding specialty, or creative craft..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
              />
            </div>
          </div>
        )}

        {/* ── STEP 3: LOCATION INFORMATION ── */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <Badge className="bg-harvest-100 text-harvest-800 dark:bg-harvest-900/60 dark:text-harvest-300 font-bold mb-1">
                Step 3 of 5
              </Badge>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Operating Location & Address
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Provide the physical location where you conduct services, workshops, or host guests.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Street Address / Estate Name / Landmark <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Sunset Coffee Estate, Madikeri Road"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    District <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                  >
                    {DISTRICT_LIST.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    disabled
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="e.g. 571201"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Latitude Coordinates (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude || ""}
                    onChange={(e) => setLatitude(e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 12.4244"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Longitude Coordinates (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude || ""}
                    onChange={(e) => setLongitude(e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 75.7382"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: KYC VERIFICATION ── */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <Badge className="bg-harvest-100 text-harvest-800 dark:bg-harvest-900/60 dark:text-harvest-300 font-bold mb-1">
                Step 4 of 5
              </Badge>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                KYC & Legal Verification
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your government identification to complete host authorization.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Document ID Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                >
                  <option value="Aadhaar">Aadhaar Card (UIDAI)</option>
                  <option value="PAN">PAN Card (Income Tax Dept)</option>
                  <option value="Gov_ID">Other Government ID / Driving License</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Document Number <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKycNumber(!showKycNumber)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    {showKycNumber ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showKycNumber ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <input
                  type={showKycNumber ? "text" : "password"}
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder={idType === "Aadhaar" ? "12-digit Aadhaar Number" : "Document ID Number"}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-harvest-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Document Upload / Proof File
              </label>
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/40 dark:bg-slate-950/40">
                <Upload className="h-6 w-6 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  Upload clear scanned copy or photo of your {idType}
                </p>
                <p className="text-[11px] text-slate-400">Supported formats: JPG, PNG, PDF (Max 5MB)</p>
                <input
                  type="text"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="Document URL / Verification Asset Path"
                  className="w-full max-w-md mx-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11px] text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-harvest-200/60 dark:border-harvest-800/60 bg-harvest-50/40 dark:bg-harvest-950/20 space-y-2">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="termsConsent"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-harvest-600 focus:ring-harvest-500"
                />
                <label htmlFor="termsConsent" className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed cursor-pointer font-medium">
                  I certify that all details provided in this onboarding application are authentic. I consent to identity verification under NammaConnect host standards and agree to terms of service.
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: REVIEW & SUBMIT ── */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Badge className="bg-harvest-100 text-harvest-800 dark:bg-harvest-900/60 dark:text-harvest-300 font-bold mb-1">
                  Step 5 of 5
                </Badge>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  Review & Submit Application
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review your information before submitting for administrative verification.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  generateApplicationPdf({
                    id: "DRAFT",
                    application_code: "PA-2026-DRAFT",
                    user_id: user?.id || "",
                    role_type: roleType || "farmer",
                    full_name: fullName,
                    email: email,
                    mobile: mobile,
                    address: address,
                    district: district,
                    state: state,
                    business_name: businessName,
                    experience_years: experienceYears,
                    bio: bio,
                    languages: languages,
                    id_type: idType,
                    id_number: maskedIdNumber,
                    document_url: documentUrl,
                    provider_details: { pincode, bio },
                    documents: [{ name: `${idType} Card`, url: documentUrl, type: "Government ID" }],
                    images: [],
                    services: [],
                    activities: [],
                    status: "DRAFT",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                }
                className="gap-1.5 font-bold text-xs"
              >
                <Printer className="h-4 w-4" /> Print / PDF Summary
              </Button>
            </div>

            {/* Structured Summaries */}
            <div className="space-y-3">
              {/* Personal Information Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-extrabold uppercase tracking-wider text-xs text-slate-800 dark:text-slate-200">
                    01. Personal & Contact Information
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs text-harvest-700 dark:text-harvest-400 font-bold h-auto p-1"
                  >
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Hosting Category:</span>
                    <strong className="capitalize">{ROLE_OPTIONS.find(r => r.value === roleType)?.label || roleType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Full Name:</span>
                    <strong>{fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Business Name:</span>
                    <strong>{businessName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Email & Phone:</span>
                    <strong>{email} | {mobile}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Experience & Languages:</span>
                    <strong>{experienceYears} Years | {languages}</strong>
                  </div>
                </div>
              </div>

              {/* Location Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-extrabold uppercase tracking-wider text-xs text-slate-800 dark:text-slate-200">
                    02. Operating Location
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(3)}
                    className="text-xs text-harvest-700 dark:text-harvest-400 font-bold h-auto p-1"
                  >
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Street / Estate:</span>
                    <strong>{address}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">District & State:</span>
                    <strong>{district}, {state} (PIN: {pincode})</strong>
                  </div>
                </div>
              </div>

              {/* KYC Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="font-extrabold uppercase tracking-wider text-xs text-slate-800 dark:text-slate-200">
                    03. KYC & Verification
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(4)}
                    className="text-xs text-harvest-700 dark:text-harvest-400 font-bold h-auto p-1"
                  >
                    Edit
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">ID Document:</span>
                    <strong>{idType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Masked ID Number:</span>
                    <strong>{maskedIdNumber}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms checkbox if not checked */}
            {!termsAccepted && (
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Please return to Step 4 to accept terms and conditions before submitting.</span>
              </div>
            )}
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5 mt-6">
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
              className="bg-harvest-600 hover:bg-harvest-700 text-white font-bold gap-1 text-xs px-5 shadow-sm"
            >
              {currentStep === 1 ? "Begin Onboarding" : "Next"} <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !termsAccepted}
              className="bg-harvest-600 hover:bg-harvest-700 text-white font-extrabold gap-2 px-6 text-xs shadow-md"
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
