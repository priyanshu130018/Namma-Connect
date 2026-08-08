import { useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { FiLock, FiEye, FiEyeOff, FiArrowRight, FiCheckCircle, FiAlertCircle, FiShield, FiUser } from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import { authAPI } from "@/services/api";
import { demoAuth, withDemoFallback } from "@/services/demoAuth";

const getUser = () => {
    try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; }
};

export default function ChangePassword() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [step, setStep] = useState(1); // 1 = identify, 2 = OTP, 3 = new password
  const [otp, setOtp] = useState("");
  const [sentTo, setSentTo] = useState("");

  const [form, setForm] = useState({
    identifier: "",
    new_password: "",
    confirm_password: ""
  });

  // Step 1 — request a verification code (mocked, no backend call)
  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!form.identifier.trim()) return;
    setError("");
    setLoading(true);
    setTimeout(() => {
      setSentTo(form.identifier.trim());
      setStep(2);
      setLoading(false);
    }, 600);
  };

  // Step 2 — verify the code (mock: any 6 digits)
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otp.replace(/\D/g, "").length !== 6) {
      setError("Enter the 6-digit code we sent you.");
      return;
    }
    setError("");
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await withDemoFallback(
        () => authAPI.changePassword({
          identifier: form.identifier,
          new_password: form.new_password
        }),
        () => demoAuth.changePassword()
      );
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update password. Please check your email/mobile.");
    } finally {
      setLoading(false);
    }
  };

  const toggleShow = (key) => setShowPw(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="min-h-screen bg-surface">
      <Navbar minimal />
      
      <div className="pt-32 pb-20 flex flex-col items-center px-4">
        {/* Brand Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm ">
            <FiShield className="text-primary-foreground" size={32} />
          </div>
          <h1 className="text-3xl font-semibold text-foreground">Security</h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">Reset your account password</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[400px] bg-card rounded-2xl p-8 border border-border shadow-sm"
        >
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Password Updated!</h2>
              <p className="text-muted-foreground text-sm">Your password has been changed successfully. Please login with your new password.</p>
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(n => (
                  <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">Email or Mobile Number</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    required
                    type="text"
                    value={form.identifier}
                    onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
                    placeholder="example@mail.com"
                    className="input-field pl-9 text-sm"
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">We&apos;ll send a 6-digit verification code to this account.</p>
              </div>
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs flex items-center gap-2">
                  <FiAlertCircle className="flex-shrink-0" /> {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base disabled:opacity-60">
                {loading ? "Sending code..." : <>Send code <FiArrowRight /></>}
              </button>
              <button type="button" onClick={() => navigate("/login")} className="w-full text-muted-foreground text-xs font-bold py-2 hover:text-foreground transition-colors">
                Back to login
              </button>
            </form>
          ) : step === 2 ? (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(n => (
                  <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">Verification code</label>
                <input
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="input-field text-center text-lg tracking-[0.5em]"
                />
                <p className="mt-2 text-xs text-muted-foreground">Code sent to <span className="font-medium text-foreground">{sentTo}</span>. Demo mode: any 6 digits work.</p>
              </div>
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs flex items-center gap-2">
                  <FiAlertCircle className="flex-shrink-0" /> {error}
                </div>
              )}
              <button type="submit" className="btn-primary w-full py-3.5 text-base">Verify code <FiArrowRight /></button>
              <button type="button" onClick={() => { setStep(1); setOtp(""); setError(""); }} className="w-full text-muted-foreground text-xs font-bold py-2 hover:text-foreground transition-colors">
                Use a different account
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(n => (
                  <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>

              {/* New Password */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      required
                      type={showPw.next ? "text" : "password"}
                      value={form.new_password}
                      onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
                      placeholder="••••••••"
                      className="input-field pl-9 pr-10 text-sm"
                    />
                    <button type="button" onClick={() => toggleShow("next")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw.next ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input
                      required
                      type={showPw.confirm ? "text" : "password"}
                      value={form.confirm_password}
                      onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                      placeholder="••••••••"
                      className="input-field pl-9 pr-10 text-sm"
                    />
                    <button type="button" onClick={() => toggleShow("confirm")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw.confirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs flex items-center gap-2"
                >
                  <FiAlertCircle className="flex-shrink-0" /> {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-3 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Update Password <FiArrowRight /></>
                )}
              </button>
              
              <button 
                type="button" 
                onClick={() => { setStep(2); setError(""); }}
                className="w-full text-muted-foreground text-xs font-bold py-2 hover:text-muted-foreground transition-colors"
                disabled={loading}
              >
                Back
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
