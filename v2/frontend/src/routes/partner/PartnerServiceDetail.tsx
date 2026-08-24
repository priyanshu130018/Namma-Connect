import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  Eye,
  ShieldCheck,
  Building,
  RefreshCw,
  Send,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getPartnerServiceById,
  updatePartnerService,
  submitPartnerServiceForReview,
} from "@/services/partnerService";
import { MarketplaceService } from "@/types";
import {
  ProviderAvailabilitySection,
  DEFAULT_AVAILABILITY_STATE,
  DEFAULT_WEEKLY_AVAILABILITY,
  validateAvailability,
  ServiceAvailabilityState,
  AvailabilityErrors,
  WeeklyAvailability,
} from "@/components/partner/ProviderAvailabilitySection";

export function PartnerServiceDetailPage() {
  const { service_id } = useParams<{ service_id: string }>();

  const [service, setService] = useState<MarketplaceService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form local state
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("night");
  const [description, setDescription] = useState("");

  // Availability State
  const [availability, setAvailability] = useState<ServiceAvailabilityState>(DEFAULT_AVAILABILITY_STATE);
  const [availabilityErrors, setAvailabilityErrors] = useState<AvailabilityErrors>({});

  const loadService = useCallback(async () => {
    if (!service_id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getPartnerServiceById(service_id);
      setService(data);
      setTitle(data.title);
      setLocation(data.location);
      setPrice(String(data.price));
      setUnit(data.unit);
      setDescription(data.description);

      // Load existing availability data if present
      let loadedWeeklyAvailability: WeeklyAvailability = { ...DEFAULT_WEEKLY_AVAILABILITY };
      if (data.specific_details?.weeklyAvailability) {
        loadedWeeklyAvailability = {
          ...DEFAULT_WEEKLY_AVAILABILITY,
          ...data.specific_details.weeklyAvailability,
        };
      } else if (Array.isArray(data.specific_details?.availableDays)) {
        const daysLower = data.specific_details.availableDays.map((d: string) => d.toLowerCase());
        loadedWeeklyAvailability = {
          monday: daysLower.includes("monday"),
          tuesday: daysLower.includes("tuesday"),
          wednesday: daysLower.includes("wednesday"),
          thursday: daysLower.includes("thursday"),
          friday: daysLower.includes("friday"),
          saturday: daysLower.includes("saturday"),
          sunday: daysLower.includes("sunday"),
        };
      }

      const loadedStartTime = data.specific_details?.startTime || "09:00";
      const loadedEndTime = data.specific_details?.endTime || "18:00";
      const loadedCapacity = Number(data.max_capacity ?? data.specific_details?.capacity ?? 10);

      setAvailability({
        weeklyAvailability: loadedWeeklyAvailability,
        startTime: loadedStartTime,
        endTime: loadedEndTime,
        capacity: loadedCapacity,
      });
    } catch (err: unknown) {
      console.error("Failed to load partner service detail:", err);
      setErrorMessage("Unable to load service details. The service might not exist or you lack authorization.");
    } finally {
      setIsLoading(false);
    }
  }, [service_id]);

  useEffect(() => {
    loadService();
  }, [loadService]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service_id) return;

    // Validate availability
    const availabilityValidation = validateAvailability(availability);
    if (!availabilityValidation.isValid) {
      setAvailabilityErrors(availabilityValidation.errors);
      setErrorMessage("Please resolve the validation errors in the Availability section.");
      return;
    }
    setAvailabilityErrors({});

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await updatePartnerService(service_id, {
        title,
        location,
        price: Number(price),
        unit,
        max_capacity: availability.capacity,
        description,
        specific_details: {
          ...(service?.specific_details || {}),
          weeklyAvailability: availability.weeklyAvailability,
          startTime: availability.startTime,
          endTime: availability.endTime,
          capacity: availability.capacity,
          availableDays: Object.keys(availability.weeklyAvailability).filter(
            (k) => availability.weeklyAvailability[k as keyof typeof availability.weeklyAvailability]
          ),
        },
      });
      setService(updated);
      setSuccessMessage("Service details and availability updated successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to update service:", err);
      setErrorMessage("Failed to save changes. Please verify required fields.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!service_id) return;
    setIsSubmittingReview(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await submitPartnerServiceForReview(service_id);
      setService(updated);
      setSuccessMessage("Listing submitted for administrative compliance review (UNDER REVIEW).");
    } catch (err: unknown) {
      console.error("Failed to submit service for review:", err);
      setErrorMessage("Failed to submit for review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PUBLISHED":
        return <Badge variant="default" dot className="bg-emerald-50 text-emerald-800 border-emerald-200">Published</Badge>;
      case "APPROVED":
        return <Badge variant="default" dot className="bg-teal-50 text-teal-800 border-teal-200">Approved</Badge>;
      case "UNDER REVIEW":
      case "PENDING_REVIEW":
        return <Badge variant="warning" dot className="bg-amber-50 text-amber-800 border-amber-200">Under Review</Badge>;
      case "REJECTED":
      case "CHANGES REQUIRED":
        return <Badge variant="destructive" dot className="bg-rose-50 text-rose-800 border-rose-200">Changes Required</Badge>;
      case "DRAFT":
      default:
        return <Badge variant="outline" className="border-slate-300 text-slate-700 bg-slate-50">Draft</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-32" />
        <div className="h-20 bg-slate-200 rounded-3xl" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  if (errorMessage && !service) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <Link
          to="/partner/services"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Services
        </Link>
        <Card className="p-8 rounded-3xl border-rose-200 bg-rose-50/60 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Service Access Error</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{errorMessage}</p>
          <Button variant="outline" onClick={loadService} className="font-bold gap-2 mx-auto">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!service) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <Link
        to="/partner/services"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Services
      </Link>

      <PageHeader
        title={service.title}
        subtitle="Manage listing details, active capacity, and review compliance feedback."
        actions={
          <div className="flex items-center gap-2">
            {service.status === "PUBLISHED" && (
              <Link to={`/app/services/${service.id}`} target="_blank">
                <Button size="sm" variant="outline" className="gap-1.5 font-bold">
                  <Eye className="h-4 w-4 text-harvest-700" />
                  <span>View Public Page</span>
                </Button>
              </Link>
            )}
            {(service.status === "DRAFT" || service.status === "REJECTED") && (
              <Button
                size="sm"
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className="gap-1.5 font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                <Send className="h-4 w-4" />
                <span>Submit for Review</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Review Status Banner */}
      <div className="rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-harvest-50 text-harvest-700 flex items-center justify-center font-bold">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Service Status:</span>
              {getStatusBadge(service.status)}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Provider Category: <strong>{service.provider_type || "Partner"}</strong>
            </p>
          </div>
        </div>

        {service.status === "REJECTED" && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Moderator requested revisions. Update details below and resubmit.</span>
          </div>
        )}
      </div>

      {successMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-5">
          <h3 className="text-sm font-bold text-slate-900">Editable Listing Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Listing Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <Input
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Price (₹ INR)"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <Input
                label="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              />
            </div>
          </div>

          <Textarea
            label="Service Description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Card>

        {/* 2. Availability Section */}
        <ProviderAvailabilitySection
          value={availability}
          onChange={setAvailability}
          errors={availabilityErrors}
        />

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="sm"
            disabled={isSaving}
            className="font-bold gap-2 bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl shadow-sm px-5 py-2.5"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Saving Changes..." : "Save Changes"}</span>
          </Button>
        </div>

        {/* Protected KYC Section */}
        <Card className="p-6 rounded-3xl border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Protected Verification Credentials</h4>
          </div>
          <p className="text-xs text-slate-500">
            Land title deed, host Aadhaar KYC, and bank payout account are locked to prevent unauthorized alterations. To modify, visit <Link to="/partner/profile" className="text-harvest-700 font-bold underline">Partner Profile → Request Change</Link>.
          </p>
        </Card>
      </form>
    </div>
  );
}
