import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Globe,
  Sun,
  Moon,
  Laptop,
  Check,
  Shield,
  Key,
  Smartphone,
  Eye,
  Lock,
  LogOut,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useTheme, Theme } from "@/app/theme";
import { useTranslation, Language } from "@/i18n";
import { useAuth } from "@/app/providers";

export function CustomerSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const triggerFeedback = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleThemeSelect = async (newTheme: Theme) => {
    await setTheme(newTheme);
    triggerFeedback("Theme preference updated.");
  };

  const handleLanguageSelect = async (newLang: Language) => {
    await setLanguage(newLang);
    triggerFeedback("Language preference updated.");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleDeleteAccountConfirm = async () => {
    setIsDeleting(true);
    setTimeout(async () => {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      await logout();
      navigate("/login");
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage your account security, app appearance, privacy, and account options."
      />

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* ── SECTION 1: SECURITY ── */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">1. Security</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Password management and active login sessions.</p>
            </div>
          </div>

          {/* Change Password Link */}
          <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-3">
              <Key className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Change Password</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Update password via two-step email OTP verification</p>
              </div>
            </div>
            <Link to="/setting/change-password">
              <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold gap-1">
                <span>Change</span>
              </Button>
            </Link>
          </div>

          {/* Login Session */}
          <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Login Session</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Currently active on this web browser</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Active Now
            </span>
          </div>
        </Card>

        {/* ── SECTION 2: APP ── */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">2. App</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Interface appearance theme and language preference.</p>
            </div>
          </div>

          {/* Appearance (Theme) */}
          <div className="p-6 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{t("settings.themeLabel")}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("settings.themeDesc")}</p>
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600">
                  <Sun className="h-4 w-4" />
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-emerald-400">
                  <Moon className="h-4 w-4" />
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Laptop className="h-4 w-4" />
                </div>
                <span>{t("common.system")}</span>
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <div className="p-6 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{t("settings.languageLabel")}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("settings.languageDesc")}</p>
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
                <div className="flex items-center gap-2.5">
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
                <div className="flex items-center gap-2.5">
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
                <div className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-bold text-xs">हिन्दी (HI)</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">राष्ट्रभाषा हिन्दी</p>
                  </div>
                </div>
                {language === "hi" && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
              </div>
            </div>
          </div>
        </Card>

        {/* ── SECTION 3: PRIVACY ── */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">3. Privacy</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Profile visibility and data preferences.</p>
            </div>
          </div>

          {/* Profile Visibility */}
          <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Profile Visibility</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Allow other Namma Connect users to view your public profile</p>
              </div>
            </div>
            <button
              onClick={() => {
                setProfileVisibility(!profileVisibility);
                triggerFeedback(`Profile visibility turned ${!profileVisibility ? "ON" : "OFF"}.`);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                profileVisibility ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  profileVisibility ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Data & Privacy */}
          <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Data & Privacy</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Personalized recommendations and analytical cookies</p>
              </div>
            </div>
            <button
              onClick={() => {
                setDataSharing(!dataSharing);
                triggerFeedback(`Personalized recommendations turned ${!dataSharing ? "ON" : "OFF"}.`);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                dataSharing ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  dataSharing ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </Card>

        {/* ── SECTION 4: ACCOUNT ── */}
        <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          <div className="p-6 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">4. Account</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Session termination and account deletion options.</p>
            </div>
          </div>

          {/* Log Out */}
          <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="flex items-center gap-3">
              <LogOut className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Log Out</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Signed in as {user?.email}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleLogout}
              className="rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 gap-1 border-slate-300 dark:border-slate-700"
            >
              <span>Log Out</span>
            </Button>
          </div>

          {/* Delete Account */}
          <div className="p-5 sm:px-6 flex items-center justify-between hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors">
            <div className="flex items-center gap-3">
              <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="text-xs font-bold text-rose-900 dark:text-rose-300">Delete Account</p>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">Permanently erase your account data and saved items</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1 shadow-xs"
            >
              <span>Delete</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Delete Account Modal */}
      <Dialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Account Confirmation"
        description="Are you sure you want to delete your account?"
        className="max-w-md"
      >
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-100">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>This action cannot be undone.</span>
            </div>
            <p>
              Deleting your account will remove all your profile information, saved services, bookings, and active sessions permanently.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeleting}
              onClick={handleDeleteAccountConfirm}
              className="font-bold bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
