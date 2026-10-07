import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, BadgeCheck, ShieldCheck, ArrowRight, AlertTriangle, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyPartnerApplication, PartnerApplicationData } from "@/services/partnerApplicationService";
import { PartnerApplicationWizard } from "@/components/partner/PartnerApplicationWizard";

export function CustomerBecomePartnerPage() {
  const navigate = useNavigate();
  const [existingApp, setExistingApp] = useState<PartnerApplicationData | null>(null);
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [isWizardActive, setIsWizardActive] = useState(false);

  useEffect(() => {
    getMyPartnerApplication()
      .then((app) => setExistingApp(app))
      .finally(() => setIsLoadingApp(false));
  }, []);

  if (isLoadingApp) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  // ACTIVE PENDING APPLICATION BANNER
  if (existingApp && existingApp.status === "PENDING") {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-16 pt-6">
        <Card className="p-8 rounded-3xl border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-4 shadow-md">
          <div className="h-16 w-16 bg-amber-100 dark:bg-amber-900/60 rounded-full flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
            <Clock className="h-8 w-8" />
          </div>
          <div>
            <Badge variant="outline" className="border-amber-400 bg-amber-100 text-amber-800 font-bold mb-2">
              Application Under Verification
            </Badge>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Partner Application Pending Review
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              Your application <strong>#{existingApp.application_code}</strong> for <strong>{existingApp.business_name}</strong> is currently being reviewed by the NammaConnect verification team.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Host Category</span>
              <span className="font-bold capitalize text-slate-800 dark:text-slate-200">{existingApp.role_type}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Submitted Date</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {new Date(existingApp.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ALREADY APPROVED PARTNER BANNER
  if (existingApp && existingApp.status === "APPROVED") {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-16 pt-6">
        <Card className="p-8 rounded-3xl border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-4 shadow-md">
          <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <BadgeCheck className="h-8 w-8" />
          </div>
          <div>
            <Badge className="bg-emerald-600 text-white font-bold mb-2">
              Verified Partner
            </Badge>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Welcome to NammaConnect Partner Portal
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              Your partner account for <strong>{existingApp.business_name}</strong> is verified and active.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              onClick={() => navigate("/provider")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs"
            >
              Open Provider Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // REJECTED STATE: ALLOW USER TO REAPPLY
  if (existingApp && existingApp.status === "REJECTED" && !isWizardActive) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-16 pt-6">
        <Card className="p-8 rounded-3xl border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-center space-y-4 shadow-md">
          <div className="h-16 w-16 bg-rose-100 dark:bg-rose-900/60 rounded-full flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <Badge variant="outline" className="border-rose-400 bg-rose-100 text-rose-800 font-bold mb-2">
              Application Requires Changes
            </Badge>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Partner Application Not Approved
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              {existingApp.rejection_reason || "Your application was not approved. You may update your information and submit a new application for review."}
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              onClick={() => setIsWizardActive(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs"
            >
              Update & Resubmit Application
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // DRAFT STATE: SHOW OPTION TO RESUME
  if (existingApp && existingApp.status === "DRAFT" && !isWizardActive) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-16 pt-6 text-center">
        <Card className="p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-600 dark:text-slate-400">
            <FileText className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <Badge variant="outline" className="border-slate-300 dark:border-slate-700 font-bold mb-1">
              Saved Draft
            </Badge>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
              In-Progress Application
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You have an unfinished provider onboarding draft. Resume where you left off or start fresh.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              type="button"
              onClick={() => setIsWizardActive(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs"
            >
              Continue Application
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // CLEAN EMPTY STATE FOR NEW USERS (WHEN WIZARD IS NOT YET ACTIVE)
  if (!isWizardActive) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-16 pt-8 text-center">
        <Card className="p-10 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
          <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold mb-1">
              Partner Network
            </Badge>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Become a Partner
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              List your experiences and start hosting on Namma Connect.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => setIsWizardActive(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3 rounded-xl text-sm shadow-md transition-all gap-2"
            >
              <span>Start Provider Registration</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // WIZARD FOR NEW APPLICANTS OR EDITING DRAFT/REJECTED
  return (
    <PartnerApplicationWizard
      initialData={existingApp}
      onSuccess={(saved) => {
        if (saved) {
          setExistingApp(saved);
        }
      }}
    />
  );
}
