import { useState } from "react";
import {
  User,
  Bell,
  Globe,
  KeyRound,
  Check,
  CreditCard,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function PartnerSettingsPage() {
  const [activeTab, setActiveTab] = useState("account");

  // Notifications
  const [guestArrivalSms, setGuestArrivalSms] = useState(true);
  const [payoutEmail, setPayoutEmail] = useState(true);
  const [collabAlerts, setCollabAlerts] = useState(true);

  // Security
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaved(true);
    setCurrentPw("");
    setNewPw("");
    setTimeout(() => setPwSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        title="Host & Partner Settings"
        subtitle="Configure operational alerts, notification channels, payout schedules, and security credentials."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1.5 gap-1">
          <TabsTrigger value="account" className="gap-1.5 py-2">
            <User className="h-3.5 w-3.5" />
            <span>Account</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 py-2">
            <Bell className="h-3.5 w-3.5" />
            <span>Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="payouts" className="gap-1.5 py-2">
            <CreditCard className="h-3.5 w-3.5" />
            <span>Payouts</span>
          </TabsTrigger>
          <TabsTrigger value="language" className="gap-1.5 py-2">
            <Globe className="h-3.5 w-3.5" />
            <span>Language</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 py-2">
            <KeyRound className="h-3.5 w-3.5" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Account */}
        <TabsContent value="account" className="space-y-4 pt-2">
          <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Partner Account Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Partner ID</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">ptnr-kodagu-0012</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Provider Role</span>
                <p className="font-bold text-harvest-900 mt-0.5">Farmer & Plantation Host</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 2. Notifications */}
        <TabsContent value="notifications" className="space-y-4 pt-2">
          <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-5">
            <h3 className="text-sm font-bold text-slate-900">Operational Alerts & Notifications</h3>
            <div className="space-y-4">
              <Switch
                label="Instant SMS Check-in Alerts"
                description="Receive WhatsApp & SMS notifications when a confirmed guest checks into your property"
                checked={guestArrivalSms}
                onCheckedChange={setGuestArrivalSms}
              />
              <Switch
                label="Daily Bank Settlement Advices"
                description="Receive itemized tax invoice receipts for daily released bank payouts"
                checked={payoutEmail}
                onCheckedChange={setPayoutEmail}
              />
              <Switch
                label="Creator Collaboration Inquiries"
                description="Notify when a verified filmmaker or agro-photographer pitches a storytelling proposal"
                checked={collabAlerts}
                onCheckedChange={setCollabAlerts}
              />
            </div>
          </Card>
        </TabsContent>

        {/* 3. Payouts */}
        <TabsContent value="payouts" className="space-y-4 pt-2">
          <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Payout Preferences</h3>
            <p className="text-xs text-slate-500">
              Payouts are automatically settled to your verified bank account (SBI •••• 4092) within 24 hours after traveler check-in.
            </p>
            <div className="rounded-2xl border border-harvest-200 bg-harvest-50/50 p-4 text-xs space-y-2">
              <div className="flex justify-between text-slate-700">
                <span>Settlement Frequency:</span>
                <strong className="text-slate-900">Daily Automated (T+1)</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Bank Currency:</span>
                <strong className="text-slate-900">INR (₹)</strong>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 4. Language & Theme */}
        <TabsContent value="language" className="space-y-4 pt-2">
          <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Portal Display Language</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
              {["English (Default)", "ಕನ್ನಡ (Kannada)", "हिंदी (Hindi)", "മലയാളം (Malayalam)", "தமிழ் (Tamil)"].map(
                (lang, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer ${
                      i === 0 ? "border-harvest-500 bg-harvest-50 text-harvest-950" : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span>{lang}</span>
                    {i === 0 && <Check className="h-4 w-4 text-harvest-700" />}
                  </div>
                )
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 5. Security */}
        <TabsContent value="security" className="space-y-4 pt-2">
          <Card className="p-6 rounded-3xl border-slate-200 bg-white space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Partner Security Credentials</h3>
            {pwSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Password successfully updated.</span>
              </div>
            )}
            <form onSubmit={handlePasswordUpdate} className="space-y-3 max-w-sm">
              <Input
                label="Current Password"
                type="password"
                required
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
              <Input
                label="New Password"
                type="password"
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
              <Button type="submit" size="sm" className="font-bold bg-harvest-600 hover:bg-harvest-700 text-white">
                Update Security Password
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
