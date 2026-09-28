import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  requestPasswordChangeOTP,
  verifyPasswordChangeOTP,
  confirmPasswordChangeWithOTP,
} from "@/services/userService";
import { useAuth } from "@/app/providers";

export function ChangePasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Step 1 or Step 2 state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: OTP State
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Step 2: New Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Messages
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Request OTP
  const handleRequestOtp = async () => {
    setIsRequestingOtp(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      const res = await requestPasswordChangeOTP();
      setIsOtpSent(true);
      setInfoMessage(res.message + (res.otp_dev ? ` (Dev OTP: ${res.otp_dev})` : ""));
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || "Failed to send OTP to registered email.");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // 2. Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length < 6) {
      setErrorMessage("Please enter a valid 6-digit OTP code.");
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage(null);
    try {
      const res = await verifyPasswordChangeOTP(otp.trim());
      setOtpToken(res.otp_token);
      setStep(2);
      setInfoMessage("OTP verified successfully! Please enter your new password below.");
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || "Invalid or expired OTP code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // 3. Confirm New Password
  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsConfirming(true);
    setErrorMessage(null);
    try {
      await confirmPasswordChangeWithOTP(otpToken, newPassword);
      setSuccessMessage("Password changed successfully! Redirecting to settings...");
      setTimeout(() => {
        navigate("/setting");
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || "Failed to update password. Session may have expired.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-16">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/setting")}
          className="rounded-xl border-slate-200 dark:border-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Back to Settings</span>
        </Button>
      </div>

      <PageHeader
        title="Change Password"
        subtitle="Secure two-step password change process using email OTP verification."
      />

      {/* Progress Steps Header */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className={`flex items-center gap-2 text-xs font-bold ${step === 1 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? "bg-emerald-600 text-white" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700"}`}>
            1
          </div>
          <span>Step 1: Email OTP</span>
        </div>
        <div className="h-0.5 flex-1 bg-slate-200 dark:bg-slate-800" />
        <div className={`flex items-center gap-2 text-xs font-bold ${step === 2 ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>
          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
            2
          </div>
          <span>Step 2: New Password</span>
        </div>
      </div>

      {infoMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{infoMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <Card className="p-6 sm:p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-600" />
                <span>Verify Registered Email</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We will send a 6-digit one-time passcode to <span className="font-bold text-slate-800 dark:text-slate-200">{user?.email || "your registered email"}</span>.
              </p>
            </div>

            {!isOtpSent ? (
              <Button
                onClick={handleRequestOtp}
                disabled={isRequestingOtp}
                className="w-full h-11 rounded-2xl font-bold bg-harvest-600 hover:bg-harvest-700 text-white shadow-sm"
              >
                {isRequestingOtp ? "Sending OTP..." : "Request 6-Digit OTP Code"}
              </Button>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Input
                  id="otp-input-field"
                  label="Enter 6-Digit OTP Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  required
                  autoFocus
                />
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRequestOtp}
                    disabled={isRequestingOtp}
                    className="flex-1 h-11 rounded-2xl font-bold border-slate-200 dark:border-slate-700"
                  >
                    Resend OTP
                  </Button>
                  <Button
                    type="submit"
                    disabled={isVerifyingOtp || otp.length < 6}
                    className="flex-1 h-11 rounded-2xl font-bold bg-harvest-600 hover:bg-harvest-700 text-white"
                  >
                    {isVerifyingOtp ? "Verifying..." : "Verify & Continue"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleConfirmPasswordChange} className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-600" />
                <span>Set New Password</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a strong password with at least 6 characters.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input
                  id="new-password-field"
                  type={showPassword ? "text" : "password"}
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Input
                id="confirm-password-field"
                type={showPassword ? "text" : "password"}
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isConfirming || !newPassword || newPassword !== confirmPassword}
              className="w-full h-11 rounded-2xl font-bold bg-harvest-600 hover:bg-harvest-700 text-white shadow-sm"
            >
              {isConfirming ? "Updating Password..." : "Confirm & Update Password"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
