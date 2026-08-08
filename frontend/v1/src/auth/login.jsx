import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone } from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authAPI } from "@/services/api";

export default function Login() {
  const navigate = useNavigate();

  const [tab, setTab] = useState(
    new URLSearchParams(window.location.search).get("tab") === "signup"
      ? "signup"
      : "login"
  );

  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    identifier: "", // login (email OR mobile)
    email: "",      // signup
    password: "",
    mobile: ""      // signup
  });

  /**
   * Reset form when switching tabs to prevent sensitive data leakage (e.g. password auto-fill)
   */
  const handleTabChange = (newTab) => {
    setTab(newTab);
    setError("");
    setForm({
      name: "",
      identifier: "",
      email: "",
      password: "",
      mobile: ""
    });
  };

  /**
   * Save token & user → Redirect based on role
   */
  const saveAndRedirect = (token, user) => {
    localStorage.setItem("ng_token", token);
    localStorage.setItem("ng_user", JSON.stringify(user));

    if (user.role === "admin")   navigate("/admin/home");
    else if (user.role === "farmer")  navigate("/farmer/home");
    else if (user.role === "creator") navigate("/creator/home");
    else navigate("/home");
  };

  /**
   * Login / Signup Submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let res;

      if (tab === "login") {
        res = await authAPI.login({
          identifier: form.identifier,
          password: form.password
        });
        saveAndRedirect(res.data.access_token, {
          userId: res.data.user_id,
          profileId: res.data.profile_id,
          role: res.data.role,
          name: res.data.name,
          email: res.data.email,
          mobile: res.data.mobile,
        });
      } else {
        // Validate mobile before calling API
        if (form.mobile.replace(/\D/g, "").length !== 10) {
          setError("Mobile number must be exactly 10 digits.");
          setLoading(false);
          return;
        }
        await authAPI.register({
          full_name: form.name,
          email: form.email,
          mobile: form.mobile.replace(/\D/g, ""),
          password: form.password
        });
        setSuccessMessage(`${form.name} can login now.`);
        handleTabChange("login"); // Switch to login tab
      }

    } catch (err) {
      const detail = err.response?.data?.detail;

      if (err.response?.status === 401) {
        setError(detail || "Invalid email or password");
      } else if (err.response?.status === 404) {
        setError(detail || "User not found");
      } else if (err.response?.status === 400) {
        setError(detail || "Registration failed. Please check your details.");
      } else if (err.response?.status === 422) {
        const errors = err.response?.data?.detail;
        if (Array.isArray(errors)) {
          setError(errors.map(e => e.msg).join(", "));
        } else {
          setError(detail || "Invalid input.");
        }
      } else {
        setError(detail || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-black">
            Namma<span className="text-green-600">Gig</span>
          </Link>
          <p className="text-slate-500 text-sm mt-1">
            Your agri-tourism journey starts here
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-8">
            {["login", "signup"].map(t => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${
                  tab === t
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                {t === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name - Signup Only */}
            <AnimatePresence>
              {tab === "signup" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="input-field pl-9 text-sm"
                      placeholder="Your name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email or Mobile */}
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                {tab === "login" ? "Email or Mobile" : "Email Address"}
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  value={tab === "login" ? form.identifier : form.email}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      [tab === "login" ? "identifier" : "email"]: e.target.value
                    }))
                  }
                  className="input-field pl-9 text-sm"
                  placeholder={
                    tab === "login"
                      ? "Enter email or mobile"
                      : "you@example.com"
                  }
                />
              </div>
            </div>

            {/* Mobile - Signup */}
            {tab === "signup" && (
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="tel"
                    value={form.mobile}
                    onChange={e => {
                      // Only allow digits, max 10
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm(p => ({ ...p, mobile: val }));
                    }}
                    className="input-field pl-9 text-sm"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    inputMode="numeric"
                    pattern="\d{10}"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-500">
                  Password
                </label>
                {tab === "login" && (
                  <Link
                    to="/change-password"
                    className="text-xs font-semibold text-green-600 hover:text-green-700 hover:underline transition-colors"
                  >
                    Forgot Password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="input-field pl-9 pr-10 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base disabled:opacity-60"
            >
              {loading ? "Please wait..." : tab === "login" ? "Log In" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-xs">or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google Login */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (cred) => {
                try {
                  setLoading(true);
                  const res = await authAPI.googleLogin(cred.credential);

                  saveAndRedirect(res.data.access_token, {
                    userId: res.data.user_id,
                    profileId: res.data.profile_id,
                    role: res.data.role,
                    name: res.data.name,
                    email: res.data.email,
                    mobile: res.data.mobile,
                  });

                } catch (err) {
                  setError("Google sign-in failed.");
                } finally {
                  setLoading(false);
                }
              }}
              onError={() => setError("Google sign-in failed.")}
              theme="outline"
              shape="pill"
              size="large"
            />
          </div>

          <p className="text-center text-slate-400 text-xs mt-6">
            By continuing, you agree to our{" "}
            <Link to="/contact" className="text-green-600 hover:underline">
              Terms
            </Link>{" "}
            &{" "}
            <Link to="/contact" className="text-green-600 hover:underline">
              Privacy Policy
            </Link>
          </p>

        </div>
      </motion.div>
    </div>
  );
}