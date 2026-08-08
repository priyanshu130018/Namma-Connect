// ─────────────────────────────────────────────
// Creator Registration Page — Premium Split Design
// ─────────────────────────────────────────────

import { useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import {
  FiCamera, FiUser, FiMapPin, FiPhone, FiFileText,
  FiCheckCircle, FiArrowRight, FiMail, FiAlertTriangle,
  FiInstagram, FiYoutube, FiLink, FiStar, FiShield, FiZap,
} from "react-icons/fi";

import Navbar from "@/components/layout/navbar";
import { creatorAPI } from "@/services/api";

const INDIAN_STATES = [
 "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
 "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
 "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
 "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
 "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi",
 "Jammu and Kashmir","Ladakh","Puducherry","Chandigarh",
];

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; }
};

const Field = ({ label, type = "text", placeholder, icon, required, value, onChange, inputMode, maxLength, as }) => (
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
          inputMode={inputMode} maxLength={maxLength}
        />
      )}
    </div>
  </div>
);

export default function CreatorRegister() {
  const navigate = useNavigate();
  const user = getUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || user?.full_name || "", age: "",
    address: "", city: "", state: "", country: "India", postal_code: "",
    mobile: user?.mobile || "", email: user?.email || "",
    aadhaar_no: "", niche: "", portfolio: "",
    instagram: "", youtube: "", has_work_experience: false, bio: "",
    rate: "0",
  });

  const upd = (key) => (e) => {
    let val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (["mobile", "aadhaar_no", "postal_code", "rate"].includes(key)) val = val.replace(/\D/g, "");
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    if (form.aadhaar_no.length !== 12) { setError("Aadhaar number must be exactly 12 digits."); return; }
    setLoading(true); setError("");
    try {
      await creatorAPI.register(user.userId, {
        name: form.name, age: form.age ? Number(form.age) : null,
        address: form.address, city: form.city, state: form.state,
        country: form.country, postal_code: form.postal_code,
        mobile: form.mobile, email: form.email, aadhaar_no: form.aadhaar_no,
        niche: form.niche, portfolio: form.portfolio,
        instagram: form.instagram, youtube: form.youtube,
        has_work_experience: form.has_work_experience ? 1 : 0,
        bio: form.bio,
        rate: form.rate ? Number(form.rate) : 0,
      });
      localStorage.setItem("nc_user", JSON.stringify({ ...user, role: "creator", name: form.name }));
      setSuccess(true);
      setTimeout(() => navigate("/creator/home"), 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please check your information.");
    } finally { setLoading(false); }
  };

  if (user?.role === "creator") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center p-12 bg-card rounded-2xl shadow-sm max-w-sm"
        >
          <FiCheckCircle size={56} className="text-primary mx-auto mb-5" />
          <h2 className="text-2xl font-semibold mb-2">Already Registered</h2>
          <p className="text-muted-foreground text-sm mb-6">You're already onboarded as a creator.</p>
          <button onClick={() => navigate("/creator/home")} className="btn-primary w-full">Go to Dashboard</button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-primary to-primary flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-card rounded-2xl p-14 shadow-md max-w-sm"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheckCircle size={40} className="text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">You're a Creator! 🎬</h2>
          <p className="text-muted-foreground text-sm">Redirecting to your dashboard…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar minimal />

      <div className="flex flex-col lg:flex-row flex-1 pt-16">

        {/* ── Left Hero ── */}
        <motion.aside
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:w-[38%] bg-linear-to-b from-primary via-primary to-primary text-primary-foreground p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-card/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-primary/30 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-card/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm border border-white/30">
              <FiCamera size={32} />
            </div>
            <h1 className="text-4xl lg:text-5xl font-semibold leading-tight mb-4">Become a<br />Creator 🎬</h1>
            <p className="text-primary text-base leading-relaxed mb-10">
              Partner with farms, showcase your content, and build your agri-creator brand on Namma Connect.
            </p>

            {[
              { icon: <FiStar size={16} />, text: "Featured creator listing" },
              { icon: <FiZap size={16} />, text: "Direct collaboration requests" },
              { icon: <FiShield size={16} />, text: "Verified creator badge" },
              { icon: <FiInstagram size={16} />, text: "Grow your social presence" },
            ].map(({ icon, text }, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="w-8 h-8 bg-card/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/30">{icon}</div>
                <span className="text-sm font-medium text-primary">{text}</span>
              </motion.div>
            ))}
          </div>

          <div className="relative z-10">
            {(user?.name || user?.full_name) && (
              <div className="bg-card/15 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-card/20 rounded-xl flex items-center justify-center font-semibold text-lg">
                  {(user.name || user.full_name)[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-primary font-bold uppercase tracking-widest">Logged in as</p>
                  <p className="font-semibold">{user.name || user.full_name}</p>
                </div>
              </div>
            )}
          </div>
        </motion.aside>

        {/* ── Right Form ── */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex-1 overflow-y-auto py-12 px-6 lg:px-14 max-w-2xl mx-auto w-full"
        >
          <h2 className="text-2xl font-semibold text-foreground mb-1">Creator Profile</h2>
          <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-8">Tell us about you and your content</p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Personal */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Field label="Full Name *" value={form.name} onChange={upd("name")} required icon={<FiUser size={14} />} placeholder="Your full name" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="grid grid-cols-2 gap-4">
              <Field label="Email *" type="email" value={form.email} onChange={upd("email")} required icon={<FiMail size={14} />} />
              <Field label="Mobile *" value={form.mobile} onChange={upd("mobile")} required maxLength={10} inputMode="numeric" icon={<FiPhone size={14} />} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="grid grid-cols-3 gap-4">
              <Field label="City" value={form.city} onChange={upd("city")} placeholder="City" />
              <Field label="State" value={form.state} onChange={upd("state")} as="select" />
              <Field label="Country" value={form.country} onChange={upd("country")} icon={<FiMapPin size={14} />} />
            </motion.div>

            {/* Content niche */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Content & Pricing</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field label="Content Niche *" value={form.niche} onChange={upd("niche")} required placeholder="e.g. Farm Life, Travel" />
                </div>
                <Field label="Daily Rate (₹) *" value={form.rate} onChange={upd("rate")} required placeholder="0" inputMode="numeric" />
              </div>
              <div className="mt-4">
                <Field label="Portfolio URL" type="url" value={form.portfolio} onChange={upd("portfolio")} icon={<FiLink size={14} />} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="grid grid-cols-2 gap-4">
              <Field label="Instagram" value={form.instagram} onChange={upd("instagram")} icon={<FiInstagram size={14} />} placeholder="@username or URL" />
              <Field label="YouTube" value={form.youtube} onChange={upd("youtube")} icon={<FiYoutube size={14} />} placeholder="Channel URL" />
            </motion.div>

            {/* Bio */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5 uppercase tracking-widest">Bio</label>
              <textarea rows={3} value={form.bio} onChange={upd("bio")} placeholder="Tell farms what makes you special..."
                className="input-field text-sm resize-none w-full focus:border-primary/30"
              />
            </motion.div>

            {/* Work experience */}
            <motion.label initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.33 }}
              className="flex items-center gap-3 cursor-pointer bg-primary/10 border border-primary/30 px-4 py-3 rounded-2xl"
            >
              <input
                type="checkbox" checked={form.has_work_experience} onChange={upd("has_work_experience")}
                className="w-4 h-4 accent-[var(--primary)]"
              />
              <span className="text-sm font-semibold text-foreground">I have prior work experience in content creation</span>
            </motion.label>

            {/* ID */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Identity Verification</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Aadhaar Number *" value={form.aadhaar_no} onChange={upd("aadhaar_no")} required maxLength={12} inputMode="numeric" icon={<FiShield size={14} />} placeholder="12-digit" />
                <Field label="Pincode" value={form.postal_code} onChange={upd("postal_code")} maxLength={6} inputMode="numeric" placeholder="6 digits" />
              </div>
            </motion.div>

            {error && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-2xl px-4 py-3 flex items-center gap-2"
              >
                <FiAlertTriangle size={14} /> {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={loading}
              className="w-full bg-linear-to-r from-primary to-primary text-primary-foreground font-semibold py-4 rounded-2xl text-base shadow-sm  transition-all disabled:opacity-60 flex items-center justify-center gap-3 mt-2"
            >
              {loading
                ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
                : <>Complete Creator Registration <FiArrowRight size={18} /></>
              }
            </motion.button>
          </form>
        </motion.main>
      </div>
    </div>
  );
}