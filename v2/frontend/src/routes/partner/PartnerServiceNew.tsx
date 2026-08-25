import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sprout,
  Compass,
  Car,
  Building2,
  Camera,
  Palette,
  Home,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { createPartnerService } from "@/services/partnerService";
import {
  ProviderAvailabilitySection,
  DEFAULT_AVAILABILITY_STATE,
  validateAvailability,
  ServiceAvailabilityState,
  AvailabilityErrors,
} from "@/components/partner/ProviderAvailabilitySection";

export type ProviderFormType =
  | "farmer"
  | "guide"
  | "travel"
  | "hotel"
  | "creator"
  | "artisan"
  | "homestay";

export function PartnerServiceNewPage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ProviderFormType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Common Core Fields
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("night");
  const [location, setLocation] = useState("Madikeri, Coorg, Karnataka");
  const [description, setDescription] = useState("");
  const [primaryImage, setPrimaryImage] = useState("/images/services/coorg-plantation.jpg");

  // Availability State
  const [availability, setAvailability] = useState<ServiceAvailabilityState>(DEFAULT_AVAILABILITY_STATE);
  const [availabilityErrors, setAvailabilityErrors] = useState<AvailabilityErrors>({});

  // Provider-Specific State
  // Farmer
  const [farmSize, setFarmSize] = useState("50 Acres");
  const [crops, setCrops] = useState("Arabica Coffee, Black Pepper, Cardamom");
  const [agroActivity, setAgroActivity] = useState("Harvest Tour & Coffee Cupping");

  // Hotel / Stay
  const [roomType, setRoomType] = useState("Heritage Plantation Villa");
  const [checkInTime, setCheckInTime] = useState("12:00 PM");
  const [checkOutTime, setCheckOutTime] = useState("11:00 AM");

  // Travel / Driver
  const [vehicleType, setVehicleType] = useState("4x4 Estate Mahindra Thar (6-Seater)");
  const [routeCoverage, setRouteCoverage] = useState("Madikeri Town to Mandalpatti Peak / Abbey Falls");

  // Guide
  const [languages, setLanguages] = useState("English, Kannada, Hindi");
  const [trailDifficulty, setTrailDifficulty] = useState("Moderate");
  const [durationHours, setDurationHours] = useState("3.5 Hours");

  // Creator
  const [deliverables, setDeliverables] = useState("2x 4K Instagram Reels, 15x High-Res Retouched Stills");
  const [turnaroundDays, setTurnaroundDays] = useState("5 Business Days");

  // Artisan
  const [craftDiscipline, setCraftDiscipline] = useState("Traditional Banana Fiber Handloom");
  const [materialsProvided, setMaterialsProvided] = useState("Raw Fiber Stalks, Weaving Frame & Starter Kit");

  // Homestay
  const [mealPlan, setMealPlan] = useState("Complimentary Home-cooked Malnad Breakfast (Akki Rotti)");
  const [houseRules, setHouseRules] = useState("Eco-friendly stay, quiet hours after 10 PM, zero single-use plastics");

  const providerTypeCards = [
    { id: "farmer", title: "Farmer / Agro-Host", desc: "Farm tours, harvests, treehouse & plantation stays", icon: Sprout },
    { id: "guide", title: "Guide & Naturalist", desc: "Botanical trails, birdwatching, trekking & safari guidance", icon: Compass },
    { id: "travel", title: "Travel / Driver", desc: "Jeep safaris, station shuttles, rural 4x4 transport", icon: Car },
    { id: "hotel", title: "Eco Hotel & Resort", desc: "Nature lodges, private villas, sustainable luxury stays", icon: Building2 },
    { id: "creator", title: "Creator / Storyteller", desc: "Drone cinematography, promotional media kits & reels", icon: Camera },
    { id: "artisan", title: "Rural Artisan", desc: "Pottery, bamboo craft, woodcraft, folk weaving workshops", icon: Palette },
    { id: "homestay", title: "Homestay Host", desc: "Family-run estate homestays with regional cuisine", icon: Home },
  ];

  const handleSave = async (targetStatus: "DRAFT" | "UNDER REVIEW") => {
    if (!title || !location || !price) {
      setErrorMessage("Please fill in all required fields (Title, Location, and Price).");
      return;
    }

    // Validate availability
    const availabilityValidation = validateAvailability(availability);
    if (!availabilityValidation.isValid) {
      setAvailabilityErrors(availabilityValidation.errors);
      setErrorMessage("Please resolve the validation errors in the Availability section.");
      return;
    }
    setAvailabilityErrors({});

    setIsSubmitting(true);
    setErrorMessage(null);

    const specific_details: Record<string, any> = {
      weeklyAvailability: availability.weeklyAvailability,
      startTime: availability.startTime,
      endTime: availability.endTime,
      capacity: availability.capacity,
      availableDays: Object.keys(availability.weeklyAvailability).filter(
        (k) => availability.weeklyAvailability[k as keyof typeof availability.weeklyAvailability]
      ),
    };

    if (selectedType === "farmer") {
      specific_details.farmSize = farmSize;
      specific_details.crops = crops.split(",").map((s) => s.trim());
      specific_details.agroActivity = agroActivity;
    } else if (selectedType === "hotel") {
      specific_details.roomType = roomType;
      specific_details.checkInTime = checkInTime;
      specific_details.checkOutTime = checkOutTime;
    } else if (selectedType === "travel") {
      specific_details.vehicleType = vehicleType;
      specific_details.routeCoverage = routeCoverage;
    } else if (selectedType === "guide") {
      specific_details.languages = languages;
      specific_details.trailDifficulty = trailDifficulty;
      specific_details.durationHours = durationHours;
    } else if (selectedType === "creator") {
      specific_details.deliverables = deliverables.split(",").map((s) => s.trim());
      specific_details.turnaroundDays = turnaroundDays;
    } else if (selectedType === "artisan") {
      specific_details.craftDiscipline = craftDiscipline;
      specific_details.materialsProvided = materialsProvided;
    } else if (selectedType === "homestay") {
      specific_details.mealPlan = mealPlan;
      specific_details.houseRules = houseRules;
    }

    try {
      await createPartnerService({
        title,
        provider_type: selectedType || "farmer",
        category: selectedType === "farmer" || selectedType === "hotel" || selectedType === "homestay" ? "Stay" : "Experiences",
        category_slug: selectedType === "farmer" || selectedType === "hotel" || selectedType === "homestay" ? "stay" : "experiences",
        price: Number(price) || 2500,
        unit,
        location,
        description: description || `${title} located in ${location}`,
        max_capacity: availability.capacity || 10,
        capacity: availability.capacity || 10,
        primary_image: primaryImage,
        images: [primaryImage],
        status: targetStatus,
        specific_details,
      });
      setSubmittedStatus(targetStatus);
    } catch (err: unknown) {
      console.error("Failed to create service:", err);
      setErrorMessage("Failed to create service listing. Please verify your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      <PageHeader
        title="Add New Offering"
        subtitle="Create a new service, farm stay, or experience to publish on the NammaConnect marketplace."
      />

      {submittedStatus ? (
        <Card className="p-8 rounded-3xl border-emerald-200 bg-emerald-50/60 text-center space-y-4">
          <div className="h-14 w-14 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {submittedStatus === "DRAFT"
              ? "Draft Service Saved Successfully"
              : "Service Submitted for Moderator Review"}
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {submittedStatus === "DRAFT"
              ? `Your draft listing "${title}" has been saved. It is private and will not appear in the customer marketplace until submitted and approved.`
              : `Your listing "${title}" has entered the compliance verification queue with status UNDER REVIEW. You will be notified once published.`}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate("/partner/services")}>
              Return to Services
            </Button>
            <Button onClick={() => { setSubmittedStatus(null); setSelectedType(null); setTitle(""); setPrice(""); }}>
              Add Another Service
            </Button>
          </div>
        </Card>
      ) : !selectedType ? (
        /* Step 1: Select Provider Type */
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Step 1: Choose Your Offering Category</h2>
            <p className="text-xs text-slate-500">Each provider type loads specialized fields and compliance requirements.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providerTypeCards.map((p) => {
              const Icon = p.icon;
              return (
                <Card
                  key={p.id}
                  hover
                  onClick={() => {
                    setSelectedType(p.id as ProviderFormType);
                    setErrorMessage(null);
                  }}
                  className="p-5 rounded-3xl border-slate-200 bg-white cursor-pointer transition-all hover:border-harvest-500 hover:shadow-md group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-11 w-11 rounded-2xl bg-harvest-50 text-harvest-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-harvest-700 transition-colors">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-bold text-harvest-700 pt-2 border-t border-slate-100">
                    <span>Configure Form</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* Step 2: Provider-Specific Form */
        <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedType(null)}
                className="gap-1 text-xs font-bold text-slate-600"
              >
                <ArrowLeft className="h-4 w-4" /> Change Type
              </Button>
              <Badge variant="default" className="text-xs capitalize">
                {selectedType} Offering Form
              </Badge>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSave("UNDER REVIEW"); }} className="space-y-6">
            {/* Common Basic Fields */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Core Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Service / Stay Title"
                  placeholder="e.g. Arabica Plantation Cottage & Harvest Trail"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  label="Location (Town, District, State)"
                  placeholder="e.g. Madikeri, Coorg, Karnataka"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Price (₹ INR)"
                    type="number"
                    placeholder="3499"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <Select
                    label="Billing Unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    options={[
                      { value: "night", label: "Per Night" },
                      { value: "person", label: "Per Person" },
                      { value: "trip", label: "Per Trip" },
                      { value: "project", label: "Per Project" },
                    ]}
                  />
                </div>
              </div>

              <Input
                label="Primary Image URL"
                placeholder="https://images.unsplash.com/photo-1..."
                value={primaryImage}
                onChange={(e) => setPrimaryImage(e.target.value)}
              />

              <Textarea
                label="Detailed Description"
                placeholder="Describe your property, harvest trails, seasonal highlights, or workshop schedule..."
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* 2. Availability Section */}
            <ProviderAvailabilitySection
              value={availability}
              onChange={setAvailability}
              errors={availabilityErrors}
            />

            {/* Provider-Specific Sub-Form Section */}
            <div className="space-y-4 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-harvest-800">
                3. {selectedType.toUpperCase()} Specific Parameters
              </h3>

              {/* FARMER FORM */}
              {selectedType === "farmer" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Farm / Plantation Size"
                    placeholder="e.g. 80 Acres"
                    value={farmSize}
                    onChange={(e) => setFarmSize(e.target.value)}
                  />
                  <Input
                    label="Major Crops Grown"
                    placeholder="e.g. Robusta Coffee, Black Pepper, Nutmeg"
                    value={crops}
                    onChange={(e) => setCrops(e.target.value)}
                  />
                  <Input
                    label="Key Agro-Activity Included"
                    placeholder="e.g. Fresh Honey Extraction or Coffee Processing Walk"
                    value={agroActivity}
                    onChange={(e) => setAgroActivity(e.target.value)}
                  />
                </div>
              )}

              {/* HOTEL / STAY FORM */}
              {selectedType === "hotel" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Room / Villa Configuration"
                    placeholder="e.g. 2BHK Wooden Cottage"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                  />
                  <Input
                    label="Check-in Time"
                    placeholder="12:00 PM"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                  />
                  <Input
                    label="Check-out Time"
                    placeholder="11:00 AM"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                  />
                </div>
              )}

              {/* TRAVEL FORM */}
              {selectedType === "travel" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Vehicle Fleet & Spec"
                    placeholder="e.g. 4x4 Offroad Open Gypsy"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                  />
                  <Input
                    label="Route & Landmark Coverage"
                    placeholder="e.g. Madikeri -> Mandalpatti -> Abbey"
                    value={routeCoverage}
                    onChange={(e) => setRouteCoverage(e.target.value)}
                  />
                </div>
              )}

              {/* GUIDE FORM */}
              {selectedType === "guide" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Spoken Languages"
                    placeholder="English, Kannada"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                  />
                  <Input
                    label="Trail Difficulty"
                    placeholder="Moderate"
                    value={trailDifficulty}
                    onChange={(e) => setTrailDifficulty(e.target.value)}
                  />
                  <Input
                    label="Tour Duration"
                    placeholder="3 Hours"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                  />
                </div>
              )}

              {/* CREATOR FORM */}
              {selectedType === "creator" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Deliverables Package"
                    placeholder="2x Reels, 15x Photos"
                    value={deliverables}
                    onChange={(e) => setDeliverables(e.target.value)}
                  />
                  <Input
                    label="Turnaround Time"
                    placeholder="5 Days"
                    value={turnaroundDays}
                    onChange={(e) => setTurnaroundDays(e.target.value)}
                  />
                </div>
              )}

              {/* ARTISAN FORM */}
              {selectedType === "artisan" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Craft Specialization"
                    placeholder="e.g. Earthen Pottery & Glazing"
                    value={craftDiscipline}
                    onChange={(e) => setCraftDiscipline(e.target.value)}
                  />
                  <Input
                    label="Materials & Kit Provided"
                    placeholder="e.g. Clay, Potter's Wheel, Glaze Pigments"
                    value={materialsProvided}
                    onChange={(e) => setMaterialsProvided(e.target.value)}
                  />
                </div>
              )}

              {/* HOMESTAY FORM */}
              {selectedType === "homestay" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Included Meal Feasts"
                    placeholder="e.g. Unlimited Kodava Breakfast with Kadambuttu"
                    value={mealPlan}
                    onChange={(e) => setMealPlan(e.target.value)}
                  />
                  <Input
                    label="Key House Guidelines"
                    placeholder="e.g. Respect wildlife, zero plastic policy"
                    value={houseRules}
                    onChange={(e) => setHouseRules(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Submission Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <Button type="button" variant="outline" onClick={() => setSelectedType(null)}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleSave("DRAFT")}
                  className="font-bold gap-1.5 text-xs text-slate-700"
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span>Save as Draft</span>
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-bold gap-2 bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl shadow-sm"
                >
                  <span>Submit for Review</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
