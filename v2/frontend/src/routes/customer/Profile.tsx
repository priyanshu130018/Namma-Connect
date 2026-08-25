import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Globe,
  MapPin,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserProfile, updateUserProfile, submitChangeRequest } from "@/services/userService";
import { useAuth } from "@/app/providers";
import { User } from "@/types";

export function CustomerProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(authUser || null);
  const [isLoading, setIsLoading] = useState<boolean>(!authUser);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Mode State
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: authUser?.full_name || "",
    location: authUser?.location || "Bengaluru, Karnataka",
    language: authUser?.language || "English, Kannada",
  });

  // Change Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [changeRequest, setChangeRequest] = useState({
    field: "Verified Name",
    requestedValue: "",
    reason: "",
  });

  const fetchProfile = async () => {
    if (!profile) setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getUserProfile();
      setProfile(data);
      setEditForm({
        name: data.full_name || "",
        location: data.location || "Bengaluru, Karnataka",
        language: data.language || "English, Kannada",
      });
    } catch {
      if (!profile) {
        setErrorMessage("Unable to load profile information. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePersonalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updated = await updateUserProfile({
        full_name: editForm.name.trim(),
        location: editForm.location.trim(),
        language: editForm.language.trim(),
      });
      setProfile(updated);
      setIsEditingPersonal(false);
      setSuccessMessage("Profile updated.");
      refreshUser?.();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      setErrorMessage("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeRequest.requestedValue.trim() || !changeRequest.reason.trim()) return;

    setIsSubmittingRequest(true);
    try {
      await submitChangeRequest({
        field: changeRequest.field,
        requested_value: changeRequest.requestedValue.trim(),
        reason: changeRequest.reason.trim(),
      });
      setRequestSubmitted(true);
    } catch {
      setErrorMessage("Failed to submit change request. Please try again later.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <PageHeader
          title="Customer Profile"
          subtitle="Manage your personal preferences, contact details, and inspect verified KYC records."
        />
        <Card className="p-8 rounded-3xl border-slate-200 bg-white space-y-4">
          <div className="flex gap-4 items-center">
            <Skeleton className="h-20 w-20 rounded-3xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded-lg" />
            </div>
          </div>
        </Card>
        <Card className="p-8 rounded-3xl border-slate-200 bg-white space-y-4">
          <Skeleton className="h-5 w-40 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        </Card>
      </div>
    );
  }

  if (errorMessage && !profile) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <PageHeader
          title="Customer Profile"
          subtitle="Manage your personal preferences, contact details, and inspect verified KYC records."
        />
        <div className="p-8 rounded-3xl bg-rose-50 border border-rose-200 text-center space-y-4 max-w-md mx-auto my-8">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
          <h3 className="text-sm font-bold text-rose-900">Unable to load profile.</h3>
          <p className="text-xs text-rose-600">{errorMessage}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProfile}
            className="gap-1.5 font-bold text-xs bg-white text-rose-700 border-rose-300 rounded-xl"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || "User";
  const displayEmail = profile?.email || "customer@example.com";
  const displayPhone = profile?.mobile || profile?.phone || "+91 98765 43210";
  const displayLocation = profile?.location || "Bengaluru, Karnataka";
  const displayLanguage = profile?.language || "English, Kannada";
  const isVerified = profile?.is_verified ?? false;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        title="Customer Profile"
        subtitle="Manage your personal preferences, contact details, and inspect verified KYC records."
      />

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── 1. Profile Header Card ── */}
      <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-2xl font-black text-white shadow-md shadow-emerald-600/20">
            {displayName[0] ? displayName[0].toUpperCase() : "U"}
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {displayName}
              </h2>
              {isVerified ? (
                <Badge variant="default" dot className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                  Verified Customer
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                  Standard Member
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{displayEmail}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{displayLocation}</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{displayLanguage}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. Personal Information (Editable) ── */}
      <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Personal Information</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your general account and communication preferences</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditingPersonal(!isEditingPersonal)}
            className="gap-1.5 font-bold"
          >
            <Edit3 className="h-4 w-4" />
            <span>{isEditingPersonal ? "Cancel" : "Edit Profile"}</span>
          </Button>
        </div>

        {isEditingPersonal ? (
          <form onSubmit={handlePersonalSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
              <Input
                label="Location"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                required
              />
              <Input
                label="Languages Spoken"
                value={editForm.language}
                onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address (Protected)</label>
                <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 flex items-center text-xs text-slate-500 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">
                  {displayEmail}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingPersonal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="font-bold">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Full Name</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{displayName}</p>
            </div>

            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{displayEmail}</p>
            </div>

            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Location</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{displayLocation}</p>
            </div>

            <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Language Preferences</span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{displayLanguage}</p>
            </div>
          </div>
        )}
      </Card>

      {/* ── 3. Verified Information (Strictly Protected) ── */}
      <Card className="p-6 sm:p-8 rounded-3xl border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-800/60 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Verified Information</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Protected government KYC credentials (Cannot be edited directly)
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRequestSubmitted(false);
              setIsRequestModalOpen(true);
            }}
            className="border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs font-bold"
          >
            Request Change
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Verified Name</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{displayName}</p>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Matched via Aadhaar</span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Verified Phone</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{displayPhone}</p>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Verified via OTP</span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Verified Email</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{displayEmail}</p>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Secure Primary Account</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/90 border border-amber-200 p-3 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            To prevent identity fraud, changes to verified identity records require admin document review and take up to 24 hours.
          </p>
        </div>
      </Card>

      {/* ── 4. Request Change Workflow Modal ── */}
      <Dialog
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Verified Information Update"
        description="Submit a verified credential change request for administrator compliance review."
        className="max-w-lg"
      >
        {requestSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Change Request Submitted</h4>
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 text-left space-y-1 max-w-sm mx-auto">
              <p>1. Request Received ✓</p>
              <p>2. Admin Compliance Review (In Progress)</p>
              <p>3. Approval Notification via Email / SMS</p>
            </div>
            <Button
              onClick={() => setIsRequestModalOpen(false)}
              className="mt-4"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-700">Select Field to Update</label>
              <select
                value={changeRequest.field}
                onChange={(e) => setChangeRequest({ ...changeRequest, field: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900"
              >
                <option value="Verified Name">Verified Legal Name</option>
                <option value="Verified Phone">Verified Phone Number</option>
                <option value="Verified Email">Verified Email Address</option>
              </select>
            </div>

            <Input
              label="New Value"
              placeholder={`Enter new ${changeRequest.field.toLowerCase()}...`}
              required
              value={changeRequest.requestedValue}
              onChange={(e) => setChangeRequest({ ...changeRequest, requestedValue: e.target.value })}
            />

            <Input
              label="Reason for Change & Document Proof"
              placeholder="e.g. Legal name update or corrected typo on Aadhaar"
              required
              value={changeRequest.reason}
              onChange={(e) => setChangeRequest({ ...changeRequest, reason: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmittingRequest} className="font-bold gap-1.5">
                <FileText className="h-4 w-4" />
                <span>{isSubmittingRequest ? "Submitting..." : "Submit for Review"}</span>
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
