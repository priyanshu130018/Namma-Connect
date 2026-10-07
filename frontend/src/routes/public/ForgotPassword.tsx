import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Container, Section } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, CheckCircle2, ArrowLeft } from "lucide-react";
import { forgotPassword } from "@/services/authService";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await forgotPassword(email);
    } catch {
      // Safe fallback - always show generic response to prevent account enumeration
    } finally {
      setIsLoading(false);
      setIsSubmitted(true);
    }
  };

  return (
    <Section className="py-12 bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center">
      <Container size="sm">
        <Card className="p-8 bg-white dark:bg-slate-900 rounded-3xl border-slate-200 dark:border-slate-800 text-left max-w-md mx-auto space-y-6 shadow-sm">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-harvest-50 dark:bg-harvest-950/60 text-harvest-700 dark:text-harvest-400 flex items-center justify-center mx-auto shadow-sm">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Reset Your Password</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your registered email address and we'll send a secure password reset link.
            </p>
          </div>

          {isSubmitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Instructions Dispatched</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  If an account exists for <strong className="text-slate-900 dark:text-slate-100">{email}</strong>, a secure reset link has been sent to your inbox.
                </p>
              </div>
              <Link to="/login" className="block pt-2">
                <Button className="w-full font-bold bg-harvest-600 hover:bg-harvest-700 text-white">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Registered Email Address"
                type="email"
                placeholder="e.g. name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />

              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="w-full font-bold bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl shadow-sm"
              >
                Send Password Reset Link
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </Card>
      </Container>
    </Section>
  );
}
