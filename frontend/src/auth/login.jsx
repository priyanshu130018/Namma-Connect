import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { authAPI } from "@/services/api";

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(new URLSearchParams(window.location.search).get("tab") === "signup" ? "signup" : "login");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    identifier: "", // login (email OR mobile)
    email: "",      // signup
    password: "",
    mobile: ""      // signup
  });

  const saveAndRedirect = (token, user) => {
    localStorage.setItem("ng_token", token);
    localStorage.setItem("ng_user", JSON.stringify(user));

    if (user.role === "farmer") navigate("/farmer/home");
    else if (user.role === "creator") navigate("/creator/home");
    else navigate("/home");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (tab === "login") {
        const res = await authAPI.login({
          identifier: form.identifier,
          password: form.password
        });

        saveAndRedirect(res.data.access_token, {
          id: res.data.user_id,
          loginId: res.data.login_id,
          role: res.data.role,
          name: res.data.name,
          email: res.data.email,
          mobile: res.data.mobile,
        });

      } else {
        await authAPI.register({
          name: form.name,
          email: form.email,
          mobile: form.mobile,
          password: form.password
        });

        // Show success message and switch to login
        setError({ type: "success", msg: `Welcome ${form.name}! Registration successful. Please log in to continue.` });
        setTab("login");
        setForm(p => ({ ...p, identifier: form.email, password: "" })); // Pre-fill email for login
      }

    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      {/* Background orbs */}
      <div className="orb w-96 h-96 bg-green-400 -top-32 -left-32" />
      <div className="orb w-80 h-80 bg-emerald-300 bottom-0 -right-20" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-black">NG</span>
            </div>
            <span className="font-black text-2xl text-slate-900">
              Namma<span className="text-green-600">Gig</span>
            </span>
          </Link>
          <p className="text-slate-500 text-sm">
            Your agri-tourism journey starts here
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-8">
            {["login", "signup"].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${
                  tab === t
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`mb-5 p-4 border rounded-xl text-sm ${
                error.type === "success" 
                  ? "bg-green-50 border-green-200 text-green-600" 
                  : "bg-red-50 border-red-200 text-red-600"
              }`}
            >
              {error.msg || error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Full Name - Signup Only */}
            <AnimatePresence>
              {tab === "signup" && (
                <motion.div
                  key="name"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Your name"
                      className="input-field pl-9 text-sm"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email OR Mobile (Login) | Email (Signup) */}
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                {tab === "login" ? "Email or Mobile" : "Email Address"}
              </label>

              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  required
                  value={tab === "login" ? form.identifier : form.email}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      [tab === "login" ? "identifier" : "email"]: e.target.value
                    }))
                  }
                  placeholder={tab === "login" ? "Enter email or mobile" : "you@example.com"}
                  className="input-field pl-9 text-sm"
                />
              </div>
            </div>

            {/* Mobile - Signup Only */}
            {tab === "signup" && (
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    value={form.mobile}
                    onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
                    placeholder="Your mobile"
                    className="input-field pl-9 text-sm"
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
                <Link to="/change-password" className="text-[10px] font-bold text-green-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  required
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="input-field pl-9 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
            <span className="text-slate-400 text-xs font-medium">or continue with</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google Login (UNCHANGED) */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (cred) => {
                try {
                  setLoading(true);
                  const res = await authAPI.googleLogin(cred.credential);
                  saveAndRedirect(res.data.access_token, {
                    id: res.data.user_id,
                    loginId: res.data.login_id,
                    role: res.data.role,
                    name: res.data.name,
                    email: res.data.email,
                    mobile: res.data.mobile,
                  });
                } catch (err) {
                  setError(err.response?.data?.detail || "Google sign-in failed. Please try email.");
                } finally {
                  setLoading(false);
                }
              }}
              onError={() => setError("Google sign-in failed.")}
              theme="outline"
              shape="pill"
              size="large"
              text={tab === "login" ? "signin_with" : "signup_with"}
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
