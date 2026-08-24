import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Section } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/app/providers";

export function RegisterPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      const roleStr = String(user.role);
      const target =
        roleStr === "partner" || roleStr === "farmer"
          ? "/partner"
          : roleStr === "creator"
          ? "/partner/creator"
          : roleStr === "admin"
          ? "/admin"
          : "/app";
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMessage("Please fill out all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        mobile: mobile.trim() || undefined,
        password,
      });

      // Normal registration always navigates directly to the Customer Application
      navigate("/app", { replace: true });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          "Registration failed. Please check your inputs or try signing in."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section className="py-12 bg-slate-50 min-h-screen flex items-center">
      <Container size="sm">
        <Card className="p-8 bg-white rounded-3xl border-slate-200 text-left max-w-md mx-auto space-y-6 shadow-sm">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-harvest-50 text-harvest-700 flex items-center justify-center mx-auto shadow-sm">
              <UserPlus className="h-6 w-6" />
            </div>
            <Badge variant="default">Create Account</Badge>
            <h2 className="text-2xl font-extrabold text-slate-900">Join Namma Connect</h2>
            <p className="text-xs text-slate-500">
              Create your personal account to discover authentic agricultural stays, harvest trails, and rural experiences.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="e.g. Somanna Gowda"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />

            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="+91 98765 43210"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              disabled={isLoading}
            />

            <Input
              label="Password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="w-full font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl gap-2 shadow-sm"
            >
              <span>Create Account</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Footer Sign In Link */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-harvest-700 hover:text-harvest-800 underline">
                Sign In
              </Link>
            </p>
          </div>
        </Card>
      </Container>
    </Section>
  );
}
