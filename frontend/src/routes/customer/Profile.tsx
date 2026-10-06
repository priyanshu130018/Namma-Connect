import React, { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Check,
  RefreshCw,
  Camera,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  requestEmailVerificationOTP,
  verifyEmailOTP,
} from "@/services/userService";
import { useAuth } from "@/app/providers";
import { User } from "@/types";

export function CustomerProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(authUser || null);
  const [isLoading, setIsLoading] = useState<boolean>(!authUser);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: authUser?.full_name || "",
    mobile: authUser?.mobile || authUser?.phone || "",
    location: authUser?.location || "Bengaluru, Karnataka",
    bio: authUser?.bio || "",
    gender: authUser?.gender || "not_specified",
    date_of_birth: authUser?.date_of_birth || "",
    tagsInput: (authUser?.tags || ["Verified", "Traveller"]).join(", "),
  });

  // Avatar Upload Modal State
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Email Verification OTP Modal State
  const [isEmailOtpModalOpen, setIsEmailOtpModalOpen] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!profile && !authUser) setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getUserProfile();
      if (data) {
        setProfile(data);
        syncEditForm(data);
      }
    } catch {
      // Gracefully fall back to authenticated context user
      if (authUser) {
        setProfile(authUser);
        syncEditForm(authUser);
      } else {
        setErrorMessage("Unable to load profile information. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const syncEditForm = (data: User) => {
    setEditForm({
      name: data.full_name || "",
      mobile: data.mobile || data.phone || "",
      location: data.location || "Bengaluru, Karnataka",
      bio: data.bio || "",
      gender: data.gender || "not_specified",
      date_of_birth: data.date_of_birth || "",
      tagsInput: (data.tags && data.tags.length > 0 ? data.tags : ["Verified", "Traveller"]).join(", "),
    });
  };

  useEffect(() => {
    if (authUser && !profile) {
      setProfile(authUser);
      syncEditForm(authUser);
      setIsLoading(false);
    }
    fetchProfile();
  }, [authUser]);


  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setFormError("Full name is required.");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const tagsArray = editForm.tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const updated = await updateUserProfile({
        full_name: editForm.name.trim(),
        mobile: editForm.mobile.trim() || undefined,
        location: editForm.location.trim() || undefined,
        bio: editForm.bio.trim() || undefined,
        gender: editForm.gender,
        date_of_birth: editForm.date_of_birth || undefined,
        tags: tagsArray.length > 0 ? tagsArray : ["Verified", "Traveller"],
      });
      setProfile(updated);
      setIsEditModalOpen(false);
      setSuccessMessage("Profile updated successfully.");
      refreshUser?.();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || err?.message || "Failed to update profile. Please check your inputs.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!avatarUrlInput.trim()) return;

    setIsUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(avatarUrlInput.trim());
      setProfile(updated);
      setIsAvatarModalOpen(false);
      setAvatarUrlInput("");
      setSuccessMessage("Avatar image updated successfully.");
      refreshUser?.();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to update avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleStartEmailVerification = async () => {
    setIsSendingOtp(true);
    setOtpError(null);
    setOtpMessage(null);
    try {
      const res = await requestEmailVerificationOTP();
      setIsEmailOtpModalOpen(true);
      setOtpMessage(res.message + (res.otp_dev ? ` (Dev OTP: ${res.otp_dev})` : ""));
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || "Failed to send verification email OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOtp.trim()) return;

    setIsVerifyingOtp(true);
    setOtpError(null);
    try {
      await verifyEmailOTP(emailOtp.trim());
      setIsEmailOtpModalOpen(false);
      setEmailOtp("");
      setSuccessMessage("Email successfully verified!");
      fetchProfile();
      refreshUser?.();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || "Invalid or expired OTP code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <PageHeader
          title="Account Profile"
          subtitle="Manage your personal info and account security preferences."
        />
        <Card className="p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex gap-4 items-center">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-4 w-32 rounded-lg" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const activeUser = profile || authUser;

  if (errorMessage && !activeUser) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <PageHeader
          title="Account Profile"
          subtitle="Manage your personal info and account security preferences."
        />
        <div className="p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center space-y-4 max-w-md mx-auto my-8">
          <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400 mx-auto" />
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">Unable to load profile</h3>
          <p className="text-xs text-rose-600 dark:text-rose-400">{errorMessage}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProfile}
            className="gap-1.5 font-bold text-xs bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 rounded-xl"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  const displayName = activeUser?.full_name || "User";
  const displayEmail = activeUser?.email || "user@example.com";
  const displayPhone = activeUser?.mobile || activeUser?.phone || "";
  const displayLocation = activeUser?.location || "Bengaluru, Karnataka";
  const displayBio = activeUser?.bio || "No bio added yet. Tell us about your travel experiences!";
  const displayGender = activeUser?.gender ? activeUser.gender.replace("_", " ") : "Not specified";
  const displayDOB = activeUser?.date_of_birth || "Not specified";
  const isEmailVerified = activeUser?.is_verified ?? false;

  // Calculate member since year
  const memberSinceYear = activeUser?.created_at
    ? new Date(activeUser.created_at).getFullYear()
    : new Date().getFullYear();

  // User tags default
  const userTags = activeUser?.tags && activeUser.tags.length > 0
    ? activeUser.tags
    : ["Verified", "Traveller"];

  // Gender fallback indicator or avatar
  const renderAvatar = () => {
    if (activeUser?.avatar_url) {
      return (
        <img
          src={activeUser.avatar_url}
          alt={displayName}

          className="h-24 w-24 rounded-full object-cover shadow-lg ring-4 ring-white dark:ring-slate-800"
        />
      );
    }

    // Gender fallback styling
    let bgGradient = "from-emerald-600 to-teal-700";
    if (profile?.gender === "female") bgGradient = "from-rose-500 to-pink-600";
    if (profile?.gender === "male") bgGradient = "from-indigo-600 to-blue-600";

    return (
      <div
        className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${bgGradient} text-3xl font-black text-white shadow-lg ring-4 ring-white dark:ring-slate-800`}
      >
        {displayName[0] ? displayName[0].toUpperCase() : "U"}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        title="Account Profile"
        subtitle="Manage your personal profile, bio, tags, and email verification status."
      />

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-xs">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── 1. Profile Header Card ── */}
      <Card className="p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar Photo with Change button */}
          <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
            {renderAvatar()}
            <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 transition-colors">
              <Camera className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          {/* User Basic Summary */}
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {displayName}
              </h2>
              {/* Member Since Badge */}
              <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                Member since {memberSinceYear}
              </Badge>
            </div>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{displayEmail}</p>

            {/* Bio */}
            <p className="text-xs text-slate-700 dark:text-slate-300 italic max-w-xl">
              "{displayBio}"
            </p>

            {/* User Tags */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
              {userTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                >
                  <ShieldCheck className="h-3 w-3" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-xl">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{displayLocation}</span>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => {
              if (profile) syncEditForm(profile);
              setIsEditModalOpen(true);
            }}
            className="rounded-2xl font-bold bg-harvest-600 hover:bg-harvest-700 text-white gap-1.5 shadow-sm"
          >
            <Edit3 className="h-4 w-4" />
            <span>Edit Profile</span>
          </Button>
        </div>
      </Card>

      {/* ── 2. Email Verification Card (If Unverified) ── */}
      {!isEmailVerified && (
        <Card className="p-5 rounded-3xl border-amber-200 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">Email Verification Required</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Verify your email address <span className="font-semibold">{displayEmail}</span> to ensure account security.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleStartEmailVerification}
            disabled={isSendingOtp}
            className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0"
          >
            {isSendingOtp ? "Sending OTP..." : "Verify Email"}
          </Button>
        </Card>
      )}

      {/* ── 3. Personal & Contact Details Table ── */}
      <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Basic Info & Contact Details</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your profile information displayed across Namma Connect.</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (profile) syncEditForm(profile);
              setIsEditModalOpen(true);
            }}
            className="rounded-xl text-xs font-bold gap-1"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
        </div>

        {/* Profile Photo */}
        <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Profile Photo</span>
          <div className="w-2/3 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">Custom avatar or gender avatar</span>
            <button
              onClick={() => setIsAvatarModalOpen(true)}
              className="text-xs font-bold text-harvest-700 dark:text-harvest-400 hover:underline flex items-center gap-1"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Change Photo</span>
            </button>
          </div>
        </div>

        {/* Name */}
        <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Full Name</span>
          <div className="w-2/3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{displayName}</span>
          </div>
        </div>

        {/* Member Since */}
        <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Member Since</span>
          <div className="w-2/3 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{memberSinceYear}</span>
          </div>
        </div>

        {/* Gender */}
        <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Gender</span>
          <div className="w-2/3 flex items-center justify-between">
            <span className="text-xs font-semibold capitalize text-slate-800 dark:text-slate-200">{displayGender}</span>
          </div>
        </div>

        {/* Date of Birth */}
        <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Date of Birth</span>
          <div className="w-2/3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{displayDOB}</span>
          </div>
        </div>

        {/* Location */}
        <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Location</span>
          <div className="w-2/3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{displayLocation}</span>
          </div>
        </div>

        {/* Email & Status */}
        <div className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <div className="flex items-center gap-2.5 sm:w-1/3">
            <Mail className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</span>
          </div>
          <div className="sm:w-2/3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{displayEmail}</span>
            {isEmailVerified ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verified</span>
              </span>
            ) : (
              <button
                onClick={handleStartEmailVerification}
                disabled={isSendingOtp}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-700 hover:bg-amber-100"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Verify Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile */}
        <div className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <div className="flex items-center gap-2.5 sm:w-1/3">
            <Phone className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</span>
          </div>
          <div className="sm:w-2/3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {displayPhone || "No mobile added"}
            </span>
          </div>
        </div>
      </Card>

      {/* ── Edit Profile Modal ── */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Personal Details"
        description="Update your display name, contact, bio, gender, and tags."
        className="max-w-md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-200 dark:border-rose-800">
              {formError}
            </div>
          )}

          <Input
            id="edit-profile-name"
            label="Full Name *"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Your full name"
            required
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Gender</label>
            <select
              value={editForm.gender}
              onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="not_specified">Not Specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <Input
            id="edit-profile-dob"
            type="date"
            label="Date of Birth"
            value={editForm.date_of_birth}
            onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
          />

          <Input
            id="edit-profile-mobile"
            label="Mobile Phone"
            value={editForm.mobile}
            onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
            placeholder="+91 98765 43210"
          />

          <Input
            id="edit-profile-location"
            label="Location"
            value={editForm.location}
            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
            placeholder="e.g. Bengaluru, Karnataka"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bio</label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              placeholder="Tell other travelers about yourself..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <Input
            id="edit-profile-tags"
            label="User Tags (comma-separated)"
            value={editForm.tagsInput}
            onChange={(e) => setEditForm({ ...editForm, tagsInput: e.target.value })}
            placeholder="Verified, Traveller, Explorer"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Avatar Upload Modal ── */}
      <Dialog
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        title="Update Profile Photo"
        description="Provide an image URL for your profile picture."
        className="max-w-md"
      >
        <form onSubmit={handleAvatarSubmit} className="space-y-4 py-2">
          <Input
            id="avatar-url-input"
            label="Image URL"
            value={avatarUrlInput}
            onChange={(e) => setAvatarUrlInput(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAvatarModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUploadingAvatar || !avatarUrlInput.trim()}
              className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white"
            >
              {isUploadingAvatar ? "Updating..." : "Update Image"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Email Verification OTP Modal ── */}
      <Dialog
        isOpen={isEmailOtpModalOpen}
        onClose={() => setIsEmailOtpModalOpen(false)}
        title="Verify Email Address"
        description="Enter the 6-digit OTP code sent to your email."
        className="max-w-md"
      >
        <form onSubmit={handleVerifyEmailOtpSubmit} className="space-y-4 py-2">
          {otpMessage && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
              {otpMessage}
            </p>
          )}
          {otpError && (
            <p className="text-xs text-rose-700 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/60 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
              {otpError}
            </p>
          )}

          <Input
            id="email-otp-input"
            label="6-Digit OTP Code"
            value={emailOtp}
            onChange={(e) => setEmailOtp(e.target.value)}
            placeholder="123456"
            maxLength={6}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEmailOtpModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isVerifyingOtp || emailOtp.length < 6}
              className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white"
            >
              {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
