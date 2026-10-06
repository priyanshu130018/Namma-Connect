import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Container, Section } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { resetPassword } from "@/services/authService";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMessage("Reset token is missing or invalid. Please request a new link.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await resetPassword(token, newPassword);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || "Unable to reset password. The link may have expired."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Section className="py-12 bg-slate-50 min-h-screen flex items-center">
      <Container size="sm">
        <Card className="p-8 bg-white rounded-3xl border-slate-200 text-left max-w-md mx-auto space-y-6 shadow-sm">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-harvest-50 text-harvest-700 flex items-center justify-center mx-auto shadow-sm">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Set New Password</h2>
            <p className="text-xs text-slate-500">
              Create a new secure password for your Namma Connect account.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Password Updated</h4>
                <p className="text-xs text-slate-600">
                  Your password has been changed successfully. You can now sign in with your new password.
                </p>
              </div>
              <Link to="/login" className="block pt-2">
                <Button className="w-full font-bold bg-harvest-600 hover:bg-harvest-700 text-white">
                  Proceed to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />

              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="w-full font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl shadow-sm"
              >
                Update Password
              </Button>
            </form>
          )}
        </Card>
      </Container>
    </Section>
  );
}
