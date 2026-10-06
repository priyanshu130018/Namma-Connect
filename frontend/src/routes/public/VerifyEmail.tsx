import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Container, Section } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2, MailCheck, ArrowRight } from "lucide-react";
import { verifyEmail, resendVerification } from "@/services/authService";
import { useAuth } from "@/app/providers";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMessage("Verification token is missing. Please check the link in your email.");
      return;
    }

    let isMounted = true;
    const performVerification = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        await verifyEmail(token);
        if (isMounted) {
          setIsSuccess(true);
          if (refreshUser) {
            await refreshUser();
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(
            err.response?.data?.detail || "Verification failed or the token has expired. Please request a new link."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    performVerification();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async () => {
    setIsResending(true);
    setResendStatus(null);
    try {
      await resendVerification(user?.email);
      setResendStatus("A fresh verification email has been dispatched. Please check your inbox.");
    } catch (err: any) {
      setResendStatus(err.response?.data?.detail || "Failed to resend verification email. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Section className="py-16 bg-slate-50 min-h-[80vh] flex items-center justify-center">
      <Container size="sm">
        <Card className="p-8 bg-white rounded-3xl border-slate-200 text-center max-w-md mx-auto space-y-6 shadow-sm">
          {isLoading && (
            <div className="space-y-4 py-8">
              <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">Verifying your account...</h2>
              <p className="text-xs text-slate-500">
                Please wait while we confirm your email address.
              </p>
            </div>
          )}

          {!isLoading && isSuccess && (
            <div className="space-y-5 py-4">
              <div className="h-16 w-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">Email Verified!</h2>
                <p className="text-sm text-slate-600">
                  Your NammaConnect account has been successfully verified. You now have full access to explore, book, and enjoy authentic experiences across Karnataka.
                </p>
              </div>
              <div className="pt-4 space-y-2">
                <Button
                  onClick={() => navigate("/app")}
                  className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm gap-2"
                >
                  Continue to Home <ArrowRight className="h-4 w-4" />
                </Button>
                <Link to="/app/explore" className="block text-xs font-semibold text-emerald-700 hover:underline pt-2">
                  Explore Farm Stays & Experiences
                </Link>
              </div>
            </div>
          )}

          {!isLoading && !isSuccess && (
            <div className="space-y-5 py-4">
              <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-9 w-9" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-slate-900">Verification Failed</h2>
                <p className="text-xs text-slate-600">
                  {errorMessage || "The verification token was invalid or has expired."}
                </p>
              </div>

              {resendStatus && (
                <div className="p-3 text-xs rounded-xl bg-slate-100 text-slate-700 font-medium">
                  {resendStatus}
                </div>
              )}

              <div className="pt-2 space-y-3">
                <Button
                  onClick={handleResend}
                  isLoading={isResending}
                  variant="outline"
                  className="w-full font-bold border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl gap-2"
                >
                  <MailCheck className="h-4 w-4" /> Resend Verification Email
                </Button>
                <Link to="/login" className="block text-xs font-semibold text-slate-500 hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </Card>
      </Container>
    </Section>
  );
}
