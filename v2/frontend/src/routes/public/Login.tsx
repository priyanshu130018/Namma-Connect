import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Container, Section } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lock, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/app/providers";
import { GoogleLogin } from "@react-oauth/google";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnUrl = params.get("returnUrl") || params.get("next");

  const { user, isAuthenticated, login, googleLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const determineRedirect = (role?: string): string => {
    if (role === "admin") {
      return (returnUrl && returnUrl.startsWith("/admin")) ? returnUrl : "/admin";
    }
    if (returnUrl && returnUrl.startsWith("/")) {
      return returnUrl;
    }
    switch (role) {
      case "partner":
      case "farmer":
        return "/partner";
      case "creator":
        return "/partner/creator";
      case "customer":
      default:
        return "/app";
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      const target = determineRedirect(user.role);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await login({ email, password });
      const target = determineRedirect(response.user.role);
      navigate(target, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 401) {
        setErrorMessage("Invalid email/mobile or password. Please try again.");
      } else if (err.response?.status === 403) {
        setErrorMessage("Your account has been suspended. Please contact support.");
      } else if (err.response?.status === 429) {
        setErrorMessage("Too many login attempts. Please wait a moment and try again.");
      } else {
        // Safe offline/mock fallback for development
        setErrorMessage(
          err.response?.data?.detail || "Unable to sign in. Please verify your connection."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async (credentialResponse: any) => {
    if (!credentialResponse?.credential) {
      setErrorMessage("Google did not return a valid credential.");
      return;
    }
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const response = await googleLogin(credentialResponse.credential);
      const target = determineRedirect(response.user.role);
      navigate(target, { replace: true });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || "Google authentication could not be completed."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Section className="py-12 bg-slate-50 min-h-screen flex items-center">
      <Container size="sm">
        <Card className="p-8 bg-white rounded-3xl border-slate-200 text-left max-w-md mx-auto space-y-6 shadow-sm">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-harvest-50 text-harvest-700 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="h-6 w-6" />
            </div>
            <Badge variant="default">Unified Access</Badge>
            <h2 className="text-2xl font-extrabold text-slate-900">Sign In to Namma Connect</h2>
            <p className="text-xs text-slate-500">
              Access your Traveler Account, Farm Host Studio, or Creator Workspace.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              label="Email Address or Mobile"
              type="text"
              placeholder="e.g. yourname@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || isGoogleLoading}
              required
            />

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isGoogleLoading}
                required
              />
              <div className="flex justify-end pt-1">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-harvest-700 hover:text-harvest-800"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              disabled={isGoogleLoading}
              className="w-full font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl gap-2 shadow-sm"
            >
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Social Auth Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="flex-shrink mx-4 text-[10px] uppercase font-bold text-slate-400">
              Or continue with
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          {/* Google OAuth Button */}
          <GoogleLogin
            onSuccess={handleGoogleAuth}
            onError={() => {
              setErrorMessage("Google authentication failed.");
            }}
          />

          {/* Footer Registration Link */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account?{" "}
              <Link to="/register" className="font-bold text-harvest-700 hover:text-harvest-800 underline">
                Create Account
              </Link>
            </p>
          </div>
        </Card>
      </Container>
    </Section>
  );
}
