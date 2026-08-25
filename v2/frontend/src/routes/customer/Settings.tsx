import { useState, useEffect } from "react";
import {
  User,
  Bell,
  Globe,
  Sun,
  Moon,
  Laptop,
  Shield,
  KeyRound,
  Check,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as userService from "@/services/userService";
import { useAuth } from "@/app/providers";
import { useTheme, Theme } from "@/app/theme";
import { useTranslation, Language } from "@/i18n";
import { UserSettingsData } from "@/types";

export function CustomerSettingsPage() {
  const { user: authUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();

  const [activeTab, setActiveTab] = useState("account");
  const [settings, setSettings] = useState<UserSettingsData | null>(() => {
    if (!authUser) return null;
    return {
      user_id: authUser.id,
      email: authUser.email,
      mobile: authUser.mobile || authUser.phone || null,
      language: language,
      theme: theme,
      notifications: { email: true, sms: true, promo: false },
      privacy: { share_profile: true, personalize_location: true },
    };
  });
  const [isLoading, setIsLoading] = useState(!authUser);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Notifications State
  const [emailNotify, setEmailNotify] = useState(true);
  const [smsNotify, setSmsNotify] = useState(true);
  const [promoNotify, setPromoNotify] = useState(false);

  // Privacy State
  const [shareProfile, setShareProfile] = useState(true);
  const [locationPersonalize, setLocationPersonalize] = useState(true);

  // Security State
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [isUpdatingPw, setIsUpdatingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const fetchSettings = async () => {
    if (!settings) setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await userService.getUserSettings();
      setSettings(data);
      setEmailNotify(data.notifications?.email ?? true);
      setSmsNotify(data.notifications?.sms ?? true);
      setPromoNotify(data.notifications?.promo ?? false);
      setShareProfile(data.privacy?.share_profile ?? true);
      setLocationPersonalize(data.privacy?.personalize_location ?? true);
    } catch {
      if (!settings) {
        setErrorMessage(t("settings.saveError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const triggerFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleNotificationToggle = async (type: "email" | "sms" | "promo", val: boolean) => {
    if (type === "email") setEmailNotify(val);
    if (type === "sms") setSmsNotify(val);
    if (type === "promo") setPromoNotify(val);

    try {
      await userService.updateUserSettings({
        notifications: {
          email: type === "email" ? val : emailNotify,
          sms: type === "sms" ? val : smsNotify,
          promo: type === "promo" ? val : promoNotify,
        },
      });
      triggerFeedback("Settings updated.");
    } catch {
      setErrorMessage(t("settings.saveError"));
    }
  };

  const handlePrivacyToggle = async (type: "share" | "location", val: boolean) => {
    if (type === "share") setShareProfile(val);
    if (type === "location") setLocationPersonalize(val);

    try {
      await userService.updateUserSettings({
        privacy: {
          share_profile: type === "share" ? val : shareProfile,
          personalize_location: type === "location" ? val : locationPersonalize,
        },
      });
      triggerFeedback("Settings updated.");
    } catch {
      setErrorMessage(t("settings.saveError"));
    }
  };

  const handleThemeSelect = async (newTheme: Theme) => {
    await setTheme(newTheme);
    triggerFeedback("Settings updated.");
  };

  const handleLanguageSelect = async (newLang: Language) => {
    await setLanguage(newLang);
    triggerFeedback("Settings updated.");
  };

  const handlePasswordUpdate = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!currentPw || !newPw) return;

    setIsUpdatingPw(true);
    setPwError(null);
    try {
      await userService.changePassword({ current_password: currentPw, new_password: newPw });
      setCurrentPw("");
      setNewPw("");
      triggerFeedback("Settings updated. Password updated successfully.");
    } catch (err: any) {
      setPwError(err.response?.data?.detail || "Failed to update password. Check current password.");
    } finally {
      setIsUpdatingPw(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <PageHeader
          title={t("settings.title")}
          subtitle={t("settings.subtitle")}
        />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Card className="p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
      />

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="account" aria-label="Account" className="gap-1.5 py-2">
            <User className="h-3.5 w-3.5" />
            <span>Account</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" aria-label="Theme & Language" className="gap-1.5 py-2">
            <Sun className="h-3.5 w-3.5" />
            <span>Theme & Language</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" aria-label="Notifications & Alerts" className="gap-1.5 py-2">
            <Bell className="h-3.5 w-3.5" />
            <span>Notifications & Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" aria-label="Privacy" className="gap-1.5 py-2">
            <Shield className="h-3.5 w-3.5" />
            <span>Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="security" aria-label="Security" className="gap-1.5 py-2">
            <KeyRound className="h-3.5 w-3.5" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. Theme & Language (Preferences) */}
        <TabsContent value="appearance" className="space-y-4 pt-2">
          {/* Visual Theme Card */}
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("settings.themeLabel")}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("settings.themeDesc")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
              <div
                onClick={() => handleThemeSelect("light")}
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col items-center gap-2.5 transition-all select-none ${
                  theme === "light"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
                  <Sun className="h-5 w-5" />
                </div>
                <span>{t("common.light")}</span>
              </div>
              <div
                onClick={() => handleThemeSelect("dark")}
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col items-center gap-2.5 transition-all select-none ${
                  theme === "dark"
                    ? "border-emerald-500 bg-slate-900 dark:bg-slate-800 text-white shadow-sm ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-emerald-400">
                  <Moon className="h-5 w-5" />
                </div>
                <span>{t("common.dark")}</span>
              </div>
              <div
                onClick={() => handleThemeSelect("system")}
                className={`p-4 rounded-2xl border cursor-pointer flex flex-col items-center gap-2.5 transition-all select-none ${
                  theme === "system"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Laptop className="h-5 w-5" />
                </div>
                <span>{t("common.system")}</span>
              </div>
            </div>
          </Card>

          {/* Language Selector Card */}
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("settings.languageLabel")}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("settings.languageDesc")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold">
              <div
                onClick={() => handleLanguageSelect("en")}
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all select-none ${
                  language === "en"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-bold text-xs">English (EN)</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Default language</p>
                  </div>
                </div>
                {language === "en" && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              </div>

              <div
                onClick={() => handleLanguageSelect("kn")}
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all select-none ${
                  language === "kn"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-bold text-xs">ಕನ್ನಡ (KN)</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">ಕರ್ನಾಟಕ ರಾಜ್ಯ ಭಾಷೆ</p>
                  </div>
                </div>
                {language === "kn" && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              </div>

              <div
                onClick={() => handleLanguageSelect("hi")}
                className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all select-none ${
                  language === "hi"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-bold text-xs">हिन्दी (HI)</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">राष्ट्रभाषा हिन्दी</p>
                  </div>
                </div>
                {language === "hi" && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 2. Account */}
        <TabsContent value="account" className="space-y-4 pt-2">
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("nav.profile")}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Primary account identification details.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Account ID</span>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate">{settings?.user_id}</p>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">{t("auth.emailLabel")}</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{settings?.email}</p>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Mobile Number</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{settings?.mobile || "Not specified"}</p>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Account Status</span>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">Active ✓</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 3. Notifications */}
        <TabsContent value="notifications" className="space-y-4 pt-2">
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("settings.notificationsSection")}</h3>
            <div className="space-y-4">
              <Switch
                label="Email Booking Confirmations"
                description="Receive PDF receipts and check-in passes via email"
                checked={emailNotify}
                onCheckedChange={(val) => handleNotificationToggle("email", val)}
              />
              <Switch
                label="SMS & WhatsApp Host Alerts"
                description="Receive instant message updates from plantation hosts on check-in day"
                checked={smsNotify}
                onCheckedChange={(val) => handleNotificationToggle("sms", val)}
              />
              <Switch
                label="Seasonal Harvest Recommendations"
                description="Periodic alerts when crop harvest workshops go live"
                checked={promoNotify}
                onCheckedChange={(val) => handleNotificationToggle("promo", val)}
              />
            </div>
          </Card>
        </TabsContent>

        {/* 4. Privacy */}
        <TabsContent value="privacy" className="space-y-4 pt-2">
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("nav.privacy")}</h3>
            <div className="space-y-4">
              <Switch
                label="Host Profile Sharing"
                description="Allow farm hosts to view your verified traveler rating before accepting bookings"
                checked={shareProfile}
                onCheckedChange={(val) => handlePrivacyToggle("share", val)}
              />
              <Switch
                label="Personalized Agro-Recommendations"
                description="Use your travel destination history to highlight nearby harvest trails"
                checked={locationPersonalize}
                onCheckedChange={(val) => handlePrivacyToggle("location", val)}
              />
            </div>
          </Card>
        </TabsContent>

        {/* 5. Security */}
        <TabsContent value="security" className="space-y-4 pt-2">
          <Card className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t("settings.securitySection")}</h3>
            {pwError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{pwError}</span>
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
              <Button
                type="submit"
                size="sm"
                disabled={isUpdatingPw}
                onClick={handlePasswordUpdate}
                className="font-bold"
              >
                {isUpdatingPw ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
