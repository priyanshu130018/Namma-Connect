import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyPartnerApplication, PartnerApplicationData } from "@/services/partnerApplicationService";
import { PartnerApplicationWizard } from "@/components/partner/PartnerApplicationWizard";

export function CustomerBecomePartnerPage() {
  const navigate = useNavigate();
  const [existingApp, setExistingApp] = useState<PartnerApplicationData | null>(null);
  const [isLoadingApp, setIsLoadingApp] = useState(true);

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
        </Card>
      </div>
    );
  }

  // WIZARD FOR NEW APPLICANTS OR DRAFT/REJECTED REAPPLICANTS
  return <PartnerApplicationWizard initialData={existingApp} onSuccess={() => navigate("/app")} />;
}
