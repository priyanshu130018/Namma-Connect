import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiCamera, FiUser, FiMapPin, FiPhone, FiLink,
  FiFileText, FiCheckCircle, FiInstagram, FiArrowRight, FiYoutube
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import { creatorAPI } from "@/services/api";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; }
};

const Field = ({ label, name, type = "text", placeholder, icon, required, value, onChange, inputMode, maxLength, pattern }) => (
  <div>
    <label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`input-field text-sm ${icon ? "pl-10" : ""}`}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
      />
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
    name: user?.name || "", age: "", niche: "", state: "", country: "India",
    mobile: user?.mobile || "", portfolio: "", instagram: "", youtube: "",
    aadhaar_no: "", has_work_experience: false,
  });

  const upd = (k) => (e) => {
    let val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (k === "mobile" || k === "aadhaar_no") {
      val = val.replace(/\D/g, "");
    }
    setForm(p => ({ ...p, [k]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    setLoading(true); setError("");
    try {
      const res = await creatorAPI.register(user.loginId, form);
      const updated = { ...user, role: "creator", id: res.data.id };
      localStorage.setItem("ng_user", JSON.stringify(updated));
      setSuccess(true);
      setTimeout(() => navigate("/creator/home"), 1000);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally { setLoading(false); }
  };

  if (user?.role === "creator") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-10 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-sm">
          <FiCheckCircle size={50} className="text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">Already Registered</h2>
          <p className="text-slate-500 text-sm mb-6">You are already registered as a creator.</p>
          <button onClick={() => navigate("/creator/home")} className="btn-primary w-full shadow-lg shadow-purple-200 !bg-purple-600">Go to Dashboard</button>
        </div>
      </div>
    );
  }

  if (success) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="text-center bg-white rounded-3xl p-14 border border-purple-200 shadow-lg max-w-sm"
      >
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <FiCheckCircle size={40} className="text-purple-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">You're a Creator!</h2>
        <p className="text-slate-500 text-sm">Welcome to NammaGig Creators. Redirecting…</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FiCamera size={30} />
          </div>
          <span className="inline-block bg-purple-100 text-purple-700 text-xs font-bold px-4 py-1.5 rounded-full mb-3">
            🎬 Creator Registration
          </span>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Join as Creator</h1>
          <p className="text-slate-500 text-sm">Tell stories. Build your brand. Connect with farms.</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Personal Information */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
              <FiUser className="text-purple-600" /> Personal Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Full Name *" name="name" value={form.name} onChange={upd("name")} placeholder="Sana Shaikh" icon={<FiUser size={15} />} required />
              <Field
                label="Mobile Number *"
                name="mobile"
                value={form.mobile}
                onChange={upd("mobile")}
                placeholder="+91 9876543210"
                icon={<FiPhone size={15} />}
                required
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="\d{10}"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Field label="Age" name="age" value={form.age} onChange={upd("age")} type="number" placeholder="25" />
              <Field label="Niche / Content Style *" name="niche" value={form.niche} onChange={upd("niche")} placeholder="Travel Vlogger" required />
              <Field label="State *" name="state" value={form.state} onChange={upd("state")} placeholder="Maharashtra" required />
            </div>
          </div>

          {/* Section 2: Links & Portfolio */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
              <FiLink className="text-purple-600" /> Links & Portfolio
            </h2>
            <Field label="Portfolio / Website URL" name="portfolio" value={form.portfolio} onChange={upd("portfolio")} type="url" placeholder="https://myportfolio.com" icon={<FiLink size={15} />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Instagram Handle" name="instagram" value={form.instagram} onChange={upd("instagram")} placeholder="your_username" icon={<FiInstagram size={15} />} />
              <Field label="YouTube Handle" name="youtube" value={form.youtube} onChange={upd("youtube")} placeholder="@yourchannel" icon={<FiYoutube size={15} />} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <input 
                type="checkbox" 
                checked={form.has_work_experience} 
                onChange={() => setForm(p => ({ ...p, has_work_experience: !p.has_work_experience }))}
                className="w-5 h-5 rounded border-2 border-slate-300 text-purple-600 focus:ring-purple-500 transition-all cursor-pointer"
              />
              <span className="text-slate-700 text-sm">I have prior work experience in content creation</span>
            </label>
          </div>

          {/* Section 3: Identity Verification */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
              <FiFileText className="text-purple-600" /> Identity Verification
            </h2>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-sm text-purple-700 mb-4">
              🔒 Your Aadhaar is encrypted and stored securely. Used only for creator verification.
            </div>
            <Field
              label="Aadhaar Number *"
              name="aadhaar_no"
              value={form.aadhaar_no}
              onChange={upd("aadhaar_no")}
              placeholder="XXXX XXXX XXXX"
              icon={<FiFileText size={15} />}
              required
              type="tel"
              inputMode="numeric"
              maxLength={12}
              pattern="\d{12}"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-300 text-white font-bold px-8 py-4 rounded-3xl transition-all flex items-center justify-center gap-3 text-lg shadow-xl"
          >
            {loading ? (
              <span className="w-6 h-6 border-4 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>Complete Creator Setup <FiArrowRight /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
