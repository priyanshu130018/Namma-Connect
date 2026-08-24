import React, { useState } from "react";
import {
  ShieldCheck,
  MapPin,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Sprout,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/app/providers";

export function PartnerProfilePage() {
  const { user } = useAuth();
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const [providerInfo, setProviderInfo] = useState({
    name: user?.full_name || "Somanna (Kodagu Organics)",
    email: user?.email || "partner@kodaguorganics.in",
    phone: "+91 94481 23456",
    estateName: "Kodagu Heritage Plantation",
    location: "Madikeri, Coorg, Karnataka - 571201",
    bio: "Generational coffee grower and biodiverse agro-culturist dedicated to shade-grown Arabica and sustainable honey harvesting.",
  });

  const [changeRequest, setChangeRequest] = useState({
    field: "Land Title Deed",
    requestedValue: "",
    reason: "",
  });

  const handlePersonalSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingPersonal(false);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmitted(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        title="Host & Property Profile"
        subtitle="Manage public host bio, operational contacts, and inspect verified KYC land ownership credentials."
      />

      {/* 1. Header Card */}
      <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 bg-white">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-harvest-600 to-amber-700 text-2xl font-black text-white shadow-md shadow-harvest-600/20">
            <Sprout className="h-10 w-10" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {providerInfo.name}
              </h2>
              <Badge variant="default" dot className="bg-emerald-50 text-emerald-800 border-emerald-200">
                Verified Agricultural Host
              </Badge>
            </div>
            <p className="text-xs text-slate-500">{providerInfo.estateName} • {providerInfo.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-1 pt-2 text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-harvest-700 shrink-0" />
              <span>{providerInfo.location}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Editable General Information */}
      <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 bg-white space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Operational & Host Details</h3>
            <p className="text-xs text-slate-500">Contact information visible to confirmed travelers</p>
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
                label="Host Contact Name"
                value={providerInfo.name}
                onChange={(e) => setProviderInfo({ ...providerInfo, name: e.target.value })}
                required
              />
              <Input
                label="Estate / Facility Name"
                value={providerInfo.estateName}
                onChange={(e) => setProviderInfo({ ...providerInfo, estateName: e.target.value })}
                required
              />
              <Input
                label="Operational Phone Number"
                value={providerInfo.phone}
                onChange={(e) => setProviderInfo({ ...providerInfo, phone: e.target.value })}
                required
              />
              <Input
                label="Physical Address & Pincode"
                value={providerInfo.location}
                onChange={(e) => setProviderInfo({ ...providerInfo, location: e.target.value })}
                required
              />
            </div>
            <Textarea
              label="Host Bio & Heritage Story"
              rows={3}
              value={providerInfo.bio}
              onChange={(e) => setProviderInfo({ ...providerInfo, bio: e.target.value })}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingPersonal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white">
                Save Details
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Host Name</span>
                <p className="text-sm font-bold text-slate-900">{providerInfo.name}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Estate Name</span>
                <p className="text-sm font-bold text-slate-900">{providerInfo.estateName}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Helpline Phone</span>
                <p className="text-xs font-mono font-bold text-slate-900">{providerInfo.phone}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Address</span>
                <p className="text-xs font-semibold text-slate-900">{providerInfo.location}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Host Story</span>
              <p className="text-xs text-slate-600 leading-relaxed">{providerInfo.bio}</p>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Protected Verified Information (Strict Boundary) */}
      <Card className="p-6 sm:p-8 rounded-3xl border-harvest-200 bg-harvest-50/40 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-harvest-200/60 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-harvest-700 text-white flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Protected Legal & KYC Credentials</h3>
              <p className="text-xs text-slate-600">
                Government KYC records & Land Deeds (Cannot be overwritten directly by frontend)
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
            className="border-harvest-300 bg-white text-harvest-900 hover:bg-harvest-50 text-xs font-bold"
          >
            Request Change
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 border border-harvest-200 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Land Title Deed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-slate-900">Survey #104/2B (120 Acres)</p>
            <span className="text-[10px] text-emerald-700 font-medium">Verified by District Revenue</span>
          </div>

          <div className="rounded-2xl bg-white p-4 border border-harvest-200 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Farmer Aadhaar KYC</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-slate-900">•••• •••• 8812</p>
            <span className="text-[10px] text-emerald-700 font-medium">UIDAI Matched</span>
          </div>

          <div className="rounded-2xl bg-white p-4 border border-harvest-200 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400">Bank Payout Account</span>
              <CreditCard className="h-4 w-4 text-harvest-700" />
            </div>
            <p className="text-xs font-mono font-bold text-slate-900">SBI •••• 4092 (SBIN0001234)</p>
            <span className="text-[10px] text-emerald-700 font-medium">Penny-Drop Verified</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/90 border border-amber-200 p-3 text-xs text-amber-900">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            To prevent fraud and preserve consumer trust, bank account and land title modifications require compliance officer review.
          </p>
        </div>
      </Card>

      {/* 4. Request Change Workflow Modal */}
      <Dialog
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Verified Credential Change"
        description="Submit updated land deed or banking details for compliance administrator verification."
        className="max-w-lg"
      >
        {requestSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Change Request Submitted</h4>
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 text-left space-y-1 max-w-sm mx-auto">
              <p>1. Change Request Dispatched ✓</p>
              <p>2. Admin Compliance Review (Queue #2)</p>
              <p>3. Notification via Registered SMS & Email</p>
            </div>
            <Button onClick={() => setIsRequestModalOpen(false)} className="mt-4">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-700">Select Credential to Update</label>
              <select
                value={changeRequest.field}
                onChange={(e) => setChangeRequest({ ...changeRequest, field: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900"
              >
                <option value="Land Title Deed">Land Title Deed / Survey Number</option>
                <option value="Bank Payout Account">Bank Account / IFSC Details</option>
                <option value="Farmer Aadhaar KYC">Farmer Aadhaar / PAN Proof</option>
              </select>
            </div>

            <Input
              label="New Value / Document Reference"
              placeholder={`Enter new ${changeRequest.field.toLowerCase()}...`}
              required
              value={changeRequest.requestedValue}
              onChange={(e) => setChangeRequest({ ...changeRequest, requestedValue: e.target.value })}
            />

            <Input
              label="Reason for Modification"
              placeholder="e.g. Switched to new primary cooperative bank account"
              required
              value={changeRequest.reason}
              onChange={(e) => setChangeRequest({ ...changeRequest, reason: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-bold gap-1.5 bg-harvest-600 hover:bg-harvest-700 text-white">
                <FileText className="h-4 w-4" />
                <span>Submit for Review</span>
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
