import { useState } from "react";
import { AlertCircle, CheckCircle2, Mail, Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendVerification } from "@/services/authService";
import { useAuth } from "@/app/providers";

interface AccountVerificationStatusProps {
  onVerifyPhoneClick?: () => void;
}

export function AccountVerificationStatus({ onVerifyPhoneClick }: AccountVerificationStatusProps) {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!user) return null;

  const isEmailVerified = Boolean(user.is_verified);
  const isPhoneVerified = Boolean(user.phone_verified);

  // If both verified, do not display banner
  if (isEmailVerified && isPhoneVerified) {
    return null;
  }

  const handleResendEmail = async () => {
    setIsResending(true);
    setFeedback(null);
    try {
      await resendVerification(user.email);
      setFeedback("Verification link sent! Please check your inbox and spam folder.");
    } catch (err: any) {
      setFeedback(err.response?.data?.detail || "Failed to dispatch verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm mb-6 transition-all text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-800 shrink-0 mt-0.5">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Account Verification Required
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              To book experiences, confirm farm stays, or access secure host checkouts, please verify your email or mobile phone.
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-2.5">
              {/* Email Status */}
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-slate-700 font-semibold">{user.email}:</span>
                {isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full text-[11px] font-bold">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                    Pending
                  </span>
                )}
              </div>

              {/* Mobile Status */}
              {user.mobile && (
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-slate-700 font-semibold">{user.mobile}:</span>
                  {isPhoneVerified ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full text-[11px] font-bold">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                      Pending
                    </span>
                  )}
                </div>
              )}
            </div>

            {feedback && (
              <p className="text-xs font-semibold text-emerald-800 mt-2 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
                {feedback}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          {!isEmailVerified && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResendEmail}
              isLoading={isResending}
              className="rounded-xl border-amber-300 bg-white text-amber-900 hover:bg-amber-100 text-xs font-bold gap-1.5 shadow-sm"
            >
              <RefreshCw className="h-3 w-3" /> Resend Verification Email
            </Button>
          )}

          {!isPhoneVerified && onVerifyPhoneClick && (
            <Button
              size="sm"
              onClick={onVerifyPhoneClick}
              className="rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-sm"
            >
              Verify Mobile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
