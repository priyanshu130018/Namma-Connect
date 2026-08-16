import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiPhone, FiCompass, FiFeather, FiCamera, FiArrowRight } from "react-icons/fi";
import { useNavigate, Link } from "@/lib/router-compat";
import { GoogleLogin } from "@react-oauth/google";
import { authAPI } from "@/services/api";
import { demoAuth, withDemoFallback } from "@/services/demoAuth";
import { userService } from "@/services/userService";
import {
  FieldError, firstError, required, email, phone10, minLength, identifier as identifierRule,
} from "@/lib/validation";

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
  const [registered, setRegistered] = useState(null); // { name, email } → role selection

  const [form, setForm] = useState({
    name: "",
    identifier: "", // login (email OR mobile)
    email: "",      // signup
    password: "",
    mobile: ""      // signup
  });
  const [touched, setTouched] = useState({});

  /* ── Field-level validation ─────────────────────────────────────── */
  const errors = tab === "login"
    ? {
        identifier: firstError(form.identifier, identifierRule()),
        password: firstError(form.password, required("Password is required")),
      }
    : {
        name: firstError(form.name, required("Full name is required"), minLength(2, "Name looks too short")),
        email: firstError(form.email, required("Email is required"), email()),
        mobile: firstError(form.mobile, required("Mobile number is required"), phone10()),
        password: firstError(form.password, required("Password is required"), minLength(6, "Password must be at least 6 characters")),
      };
  const isValid = Object.values(errors).every((e) => !e);
  const touch = (key) => setTouched((t) => ({ ...t, [key]: true }));
  const err = (key) => (touched[key] ? errors[key] : "");
  const invalidCls = (key) => (touched[key] && errors[key] ? "border-destructive" : "");

  /**
   * Reset form when switching tabs to prevent sensitive data leakage (e.g. password auto-fill)
   */
  const handleTabChange = (newTab) => {
    setTab(newTab);
    setError("");
    setTouched({});
    setForm({
      name: "",
      identifier: "",
      email: "",
      password: "",
      mobile: ""
    });
  };

  const saveAndRedirect = (token, user) => {
    userService.saveSession(token, user);

    const intent = new URLSearchParams(window.location.search).get("intent");
    if (intent === "farmer") {
      navigate("/services/farmer/register");
      return;
    } else if (intent === "creator") {
      navigate("/services/creator/register");
      return;
    }

    if (user.role === "admin")   navigate("/admin/home");
    else if (user.role === "farmer")  navigate("/farmer/home");
    else if (user.role === "creator") navigate("/creator/home");
    else navigate("/tourist/home");
  };

  /**
   * Login / Signup Submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Surface all field errors, then block submission when invalid.
    setTouched(tab === "login"
      ? { identifier: true, password: true }
      : { name: true, email: true, mobile: true, password: true });
    if (!isValid) return;

    setLoading(true);
    setError("");

    try {
      let res;

      if (tab === "login") {
        res = await withDemoFallback(
          () => authAPI.login({
            identifier: form.identifier,
            password: form.password
          }),
          () => demoAuth.login({ identifier: form.identifier })
        );
        saveAndRedirect(res.data.access_token, {
          userId: res.data.user_id,
          profileId: res.data.profile_id,
          role: res.data.role,
          name: res.data.name,
          email: res.data.email,
          mobile: res.data.mobile,
          has_farmer_profile: res.data.has_farmer_profile,
          has_creator_profile: res.data.has_creator_profile,
        });

      } else {
        const intent = new URLSearchParams(window.location.search).get("intent");
        if (intent === "farmer" || intent === "creator") {
          chooseRole(intent);
        } else {
          setRegistered({ name: form.name, email: form.email });
        }
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

  const ROLE_OPTIONS = [
    { id: "tourist", label: "Tourist", desc: "Discover farms, book stays and activities.", icon: <FiCompass size={20} /> },
    { id: "farmer", label: "Farmer", desc: "List your farm and host guests.", icon: <FiFeather size={20} /> },
    { id: "creator", label: "Creator", desc: "Collaborate with farms and grow your reach.", icon: <FiCamera size={20} /> },
  ];

  /**
   * Role picked after register → save the role on the session and go
   * straight to that role's dashboard (stays on this page until selection).
   */
  const chooseRole = async (role) => {
    try {
      setLoading(true);
      setError("");
      await withDemoFallback(
        () => authAPI.register({
          full_name: form.name,
          email: form.email,
          mobile: form.mobile.replace(/\D/g, ""),
          password: form.password,
          role: role
        }),
        () => demoAuth.register({
          full_name: form.name,
          email: form.email,
          mobile: form.mobile.replace(/\D/g, "")
        })
      );

      const res = await withDemoFallback(
        () => authAPI.login({
          identifier: form.email,
          password: form.password
        }),
        () => demoAuth.login({ identifier: form.email })
      );

      saveAndRedirect(res.data.access_token, {
        userId: res.data.user_id,
        profileId: res.data.profile_id,
        role: res.data.role,
        name: res.data.name,
        email: res.data.email,
        mobile: res.data.mobile,
        has_farmer_profile: res.data.has_farmer_profile,
        has_creator_profile: res.data.has_creator_profile,
      });

    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-semibold">
            Namma<span className="text-primary"> Connect</span>
          </Link>
          <p className="text-muted-foreground text-sm mt-1">
            Your agri-tourism journey starts here
          </p>
        </div>

        {registered ? (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-8 space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Welcome, {registered.name}!</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your account is ready. How do you want to use Namma Connect?
              </p>
            </div>
            <div className="space-y-3">
              {ROLE_OPTIONS.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => chooseRole(r.id)}
                  className="w-full flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    {r.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{r.label}</span>
                    <span className="block text-xs text-muted-foreground">{r.desc}</span>
                  </span>
                  <FiArrowRight className="shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setRegistered(null); handleTabChange("login"); }}
              className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Skip for now
            </button>
          </div>
        ) : (
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">

          {/* Tabs */}
          <div className="flex bg-muted rounded-2xl p-1 mb-8">
            {["login", "signup"].map(t => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${
                  tab === t
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {t === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {tab === "login" && (
            <div className="mb-5 p-3 bg-muted/60 border border-border rounded-xl text-muted-foreground text-xs leading-relaxed">
              <span className="font-semibold text-foreground">Demo accounts</span> (any password):{" "}
              tourist@demo.com · farmer@demo.com · creator@demo.com · admin@demo.com
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-4 bg-primary/10 border border-primary/30 rounded-xl text-primary text-sm">
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
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      onBlur={() => touch("name")}
                      className={`input-field pl-9 text-sm ${invalidCls("name")}`}
                      placeholder="Your name"
                    />
                  </div>
                  <FieldError>{err("name")}</FieldError>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email or Mobile */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                {tab === "login" ? "Email or Mobile" : "Email Address"}
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={tab === "login" ? form.identifier : form.email}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      [tab === "login" ? "identifier" : "email"]: e.target.value
                    }))
                  }
                  onBlur={() => touch(tab === "login" ? "identifier" : "email")}
                  className={`input-field pl-9 text-sm ${invalidCls(tab === "login" ? "identifier" : "email")}`}
                  placeholder={
                    tab === "login"
                      ? "Enter email or mobile"
                      : "you@example.com"
                  }
                />
              </div>
              <FieldError>{err(tab === "login" ? "identifier" : "email")}</FieldError>
            </div>

            {/* Mobile - Signup */}
            {tab === "signup" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={e => {
                      // Only allow digits, max 10
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setForm(p => ({ ...p, mobile: val }));
                    }}
                    onBlur={() => touch("mobile")}
                    className={`input-field pl-9 text-sm ${invalidCls("mobile")}`}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                <FieldError>{err("mobile")}</FieldError>
              </div>
            )}

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Password
                </label>
                {tab === "login" && (
                  <Link
                    to="/auth/change-password"
                    className="text-xs font-semibold text-primary hover:text-primary hover:underline transition-colors"
                  >
                    Forgot Password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  onBlur={() => touch("password")}
                  className={`input-field pl-9 pr-10 text-sm ${invalidCls("password")}`}
                  placeholder={tab === "signup" ? "At least 6 characters" : "••••••••"}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              <FieldError>{err("password")}</FieldError>
            </div>

            <button
              type="submit"
              disabled={loading || !isValid}
              className="btn-primary w-full py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait..." : tab === "login" ? "Log In" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-muted" />
            <span className="text-muted-foreground text-xs">or continue with</span>
            <div className="flex-1 h-px bg-muted" />
          </div>

          {/* Google Login */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (cred) => {
                try {
                  setLoading(true);
                  const res = await withDemoFallback(
                    () => authAPI.googleLogin(cred.credential),
                    () => demoAuth.googleLogin()
                  );

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

          <p className="text-center text-muted-foreground text-xs mt-6">
            By continuing, you agree to our{" "}
            <Link to="/contact" className="text-primary hover:underline">
              Terms
            </Link>{" "}
            &{" "}
            <Link to="/contact" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>

        </div>
        )}
      </motion.div>
    </div>
  );
}