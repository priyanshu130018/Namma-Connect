// ─────────────────────────────────────────────
// Farmer Registration Page — Premium Split Design
// ─────────────────────────────────────────────

import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  FiSun, FiUser, FiMapPin, FiPhone, FiFileText,
  FiCheckCircle, FiArrowRight, FiMail, FiAlertTriangle, FiX,
  FiHome, FiCalendar, FiShield, FiStar,
} from "react-icons/fi";

import Navbar from "@/components/layout/navbar";
import { farmAPI } from "@/services/api";

function Toast({ message, type = "success", onClose, duration = 4000 }) {
  useEffect(() => {
    if (!onClose) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <AnimatePresence>
      <Motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.95 }}
        transition={{ type: "spring", damping: 22, stiffness: 320 }}
        className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-md text-primary-foreground text-sm font-bold max-w-sm ${
          type === "error" ? "bg-destructive" : "bg-primary"
        }`}
      >
        {type === "error"
          ? <FiAlertTriangle size={16} className="flex-shrink-0" />
          : <FiCheckCircle size={16} className="flex-shrink-0" />}
        <span className="flex-1">{message}</span>
        {onClose && <button onClick={onClose} className="text-primary-foreground/60 hover:text-primary-foreground ml-1"><FiX size={14} /></button>}
      </Motion.div>
    </AnimatePresence>
  );
}

const INDIAN_STATES = [
 "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
 "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
 "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
 "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
 "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
 "Andaman and Nicobar Islands","Chandigarh","Delhi","Jammu and Kashmir",
 "Ladakh","Lakshadweep","Puducherry"
];

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; }
};

const Field = ({ label, type = "text", placeholder, icon, required, value, onChange, inputMode, maxLength, pattern, as }) => (
  <div>
    <label className="text-xs font-bold text-muted-foreground block mb-1.5 uppercase tracking-widest">{label}</label>
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary">{icon}</span>}
      {as === "select" ? (
        <select value={value} onChange={onChange} className={`input-field text-sm ${icon ? "pl-10" : ""} bg-card`}>
          <option value="">Select state…</option>
          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ) : (
        <input
          type={type} required={required} placeholder={placeholder} value={value} onChange={onChange}
          className={`input-field text-sm ${icon ? "pl-10" : ""} focus:border-primary/30`}
          inputMode={inputMode} maxLength={maxLength} pattern={pattern}
        />
      )}
    </div>
  </div>
);

export default function FarmerRegister() {
  const navigate = useNavigate();
  const user = getUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const sessionName = user?.name || user?.full_name || "";

  const [form, setForm] = useState({
    name: sessionName, age: "", address: "", city: "",
    state: "", country: "India", postal_code: "",
    mobile: user?.mobile || "", email: user?.email || "",
    aadhaar_no: "", identity_proof: "",
  });

  const upd = (key) => (e) => {
    let val = e.target.value;
    if (["mobile", "aadhaar_no", "postal_code"].includes(key)) val = val.replace(/\D/g, "");
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (form.aadhaar_no.length !== 12) { setError("Aadhaar number must be exactly 12 digits."); return; }
    setLoading(true); setError("");
    try {
      await farmAPI.register(user.userId, {
        profile: {
          name: form.name, age: form.age ? Number(form.age) : null,
          address: form.address, city: form.city, state: form.state,
          country: form.country, postal_code: form.postal_code,
          mobile: form.mobile, email: form.email,
          aadhaar_no: form.aadhaar_no, identity_proof: form.identity_proof,
        }
      });
      localStorage.setItem("nc_user", JSON.stringify({ ...user, role: "farmer", name: form.name }));
      setShowToast(true);
      setTimeout(() => navigate("/farmer/home"), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  if (user?.role === "farmer") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center p-12 bg-card rounded-2xl shadow-sm max-w-sm"
        >
          <FiCheckCircle size={56} className="text-primary mx-auto mb-5" />
          <h2 className="text-2xl font-semibold mb-2">Already Registered</h2>
          <p className="text-muted-foreground text-sm mb-6">You're already onboarded as a farmer.</p>
          <button onClick={() => navigate("/farmer/home")} className="btn-primary w-full">Go to Dashboard</button>
        </Motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar minimal />

      <div className="flex flex-col lg:flex-row flex-1 pt-16">

        {/* ── Left Hero ── */}
        <Motion.aside
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:w-[38%] bg-linear-to-b from-primary via-primary to-primary text-primary-foreground p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-card/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-card/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm border border-white/30">
              <FiSun size={32} />
            </div>
            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight mb-4">Join as a<br />Farmer 🌾</h1>
            <p className="text-primary text-base leading-relaxed mb-10">
              Connect with creators, tourists, and agri-enthusiasts. Share your farm story and earn from your land.
            </p>

            {[
              { icon: <FiStar size={16} />, text: "List your farm stay for free" },
              { icon: <FiShield size={16} />, text: "Verified farmer badge" },
              { icon: <FiHome size={16} />, text: "Set your own prices & rules" },
              { icon: <FiCalendar size={16} />, text: "Manage bookings easily" },
            ].map(({ icon, text }, i) => (
              <Motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="w-8 h-8 bg-card/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/30">{icon}</div>
                <span className="text-sm font-medium text-primary">{text}</span>
              </Motion.div>
            ))}
          </div>

          <div className="relative z-10">
            {sessionName && (
              <div className="bg-card/15 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-card/20 rounded-xl flex items-center justify-center font-semibold text-lg">
                  {sessionName[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-primary font-bold uppercase tracking-widest">Logged in as</p>
                  <p className="font-semibold">{sessionName}</p>
                </div>
              </div>
            )}
          </div>
        </Motion.aside>

        {/* ── Right Form ── */}
        <Motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex-1 overflow-y-auto py-12 px-6 lg:px-14 max-w-2xl mx-auto w-full"
        >
          <h2 className="text-2xl font-semibold text-foreground mb-1">Personal Details</h2>
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-8">Complete your profile to get started</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Field label="Full Name *" value={form.name} onChange={upd("name")} required icon={<FiUser size={14} />} placeholder="Your full name" />
            </Motion.div>

            <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-4">
              <Field label="Email *" type="email" value={form.email} onChange={upd("email")} required icon={<FiMail size={14} />} />
              <Field label="Mobile *" value={form.mobile} onChange={upd("mobile")} required maxLength={10} inputMode="numeric" icon={<FiPhone size={14} />} />
            </Motion.div>

            <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 gap-4">
              <Field label="Age" type="number" value={form.age} onChange={upd("age")} placeholder="Years" icon={<FiCalendar size={14} />} />
              <Field label="Country" value={form.country} onChange={upd("country")} icon={<FiMapPin size={14} />} />
            </Motion.div>

            <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }}>
              <Field label="Street Address" value={form.address} onChange={upd("address")} icon={<FiHome size={14} />} placeholder="Street / village" />
            </Motion.div>

            <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="grid grid-cols-3 gap-4">
              <Field label="City" value={form.city} onChange={upd("city")} placeholder="City" />
              <Field label="State" value={form.state} onChange={upd("state")} as="select" />
              <Field label="Pincode" value={form.postal_code} onChange={upd("postal_code")} maxLength={6} inputMode="numeric" placeholder="6 digits" />
            </Motion.div>

            <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Identity Verification</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Aadhaar Number *" value={form.aadhaar_no} onChange={upd("aadhaar_no")} required maxLength={12} inputMode="numeric" icon={<FiShield size={14} />} placeholder="12-digit" />
                <Field label="Identity Proof URL" value={form.identity_proof} onChange={upd("identity_proof")} icon={<FiFileText size={14} />} placeholder="https://..." />
              </div>
            </Motion.div>

            {error && (
              <Motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-2xl px-4 py-3 flex items-center gap-2"
              >
                <FiAlertTriangle size={14} /> {error}
              </Motion.div>
            )}

            <Motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={loading}
              className="w-full bg-linear-to-r from-primary to-primary text-primary-foreground font-semibold py-4 rounded-2xl text-base shadow-sm  transition-all disabled:opacity-60 flex items-center justify-center gap-3 mt-2"
            >
              {loading
                ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
                : <>Complete Farmer Registration <FiArrowRight size={18} /></>
              }
            </Motion.button>
          </form>
        </Motion.main>
      </div>

      {showToast && (
        <Toast
          message="🌾 Farmer registration successful! Welcome to Namma Connect."
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}