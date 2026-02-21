import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiSun, FiUser, FiMapPin, FiPhone, FiFileText,
  FiAlertCircle, FiCheckCircle, FiList, FiActivity, FiArrowRight, FiMail, FiCamera, FiHome, FiTruck, FiLink
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import { farmAPI } from "@/services/api";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; }
};

const Field = ({ label, name, type = "text", placeholder, icon, required, textarea, value, onChange, inputMode, maxLength, pattern }) => (
  <div>
    <label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
    <div className="relative">
      {icon && !textarea && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
      {textarea ? (
        <textarea
          required={required}
          rows={3}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="input-field text-sm resize-none"
        />
      ) : (
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
      )}
    </div>
  </div>
);

export default function FarmerRegister() {
  const navigate = useNavigate();
  const user = getUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || "",
    age: "",
    area: "",
    state: "",
    country: "India",
    mobile: user?.mobile || "",
    email: user?.email || "",
    aadhaar_no: "",
    farm_location: "",
    farm_description: "",
    crop_types: "",
    farm_photo: "",
    stay_available: "",
    transport_available: "",
    activities: "",
    identity_proof: "",
  });

  const upd = (k) => (e) => {
    let val = e.target.value;
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
      const payload = {
        profile: {
          name: form.name,
          age: form.age || null,
          area: form.area,
          state: form.state,
          country: form.country || "India",
          mobile: form.mobile,
          aadhaar_no: form.aadhaar_no,
        },
        listing: {
          name: form.name,
          description: form.farm_description,
          location: form.farm_location,
          area: form.area,
          state: form.state,
          mobile: form.mobile,
          email: form.email || null,
          crop_types: form.crop_types,
          farm_photo: form.farm_photo || null,
          stay_available: form.stay_available || null,
          transport_available: form.transport_available || null,
          activities: form.activities,
        },
      };

      const res = await farmAPI.register(user.loginId, payload);
      const updated = { ...user, role: "farmer", id: res.data.id };
      localStorage.setItem("ng_user", JSON.stringify(updated));
      setSuccess(true);
      setTimeout(() => navigate("/farmer/home"), 1000);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Try again.");
    } finally { setLoading(false); }
  };

  if (user?.role === "farmer") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-10 bg-white rounded-3xl border border-slate-200 shadow-sm max-w-sm">
          <FiCheckCircle size={50} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">Already Registered</h2>
          <p className="text-slate-500 text-sm mb-6">You are already registered as a farmer.</p>
          <button onClick={() => navigate("/farmer/home")} className="btn-primary w-full">Go to Dashboard</button>
        </div>
      </div>
    );
  }

  if (success) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="text-center bg-white rounded-3xl p-14 border border-green-200 shadow-lg max-w-sm"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <FiCheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Registration Successful!</h2>
        <p className="text-slate-500 text-sm">Your farm is now listed. Redirecting to your dashboard…</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <FiSun size={30} />
          </div>
          <span className="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-4 py-1.5 rounded-full mb-3">
            🌾 Farmer Registration
          </span>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Register Your Farm</h1>
          <p className="text-slate-500 text-sm">List your farm and start hosting tourists on NammaGig</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Personal Information */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
              <FiUser className="text-amber-500" /> Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field
                label="Full Name *"
                name="name"
                value={form.name}
                onChange={upd("name")}
                placeholder="Raju Krishna"
                icon={<FiUser size={15} />}
                required
              />
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
              <Field label="Age" name="age" value={form.age} onChange={upd("age")} type="number" placeholder="35" />
              <div className="md:col-span-2">
                <Field label="Email Address" name="email" value={form.email} onChange={upd("email")} type="email" placeholder="you@example.com" icon={<FiMail size={15} />} />
              </div>
            </div>
          </div>

          {/* Section 2: Farm Details */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
              <FiMapPin className="text-emerald-600" /> Farm & Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Area / Village *" name="area" value={form.area} onChange={upd("area")} placeholder="Kushalnagar" icon={<FiMapPin size={15} />} required />
              <Field label="State *" name="state" value={form.state} onChange={upd("state")} placeholder="Karnataka" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Farm GPS / Full Address *" name="farm_location" value={form.farm_location} onChange={upd("farm_location")} placeholder="12.4567, 75.6789 or full address" icon={<FiMapPin size={15} />} required />
              <Field label="Main Crops *" name="crop_types" value={form.crop_types} onChange={upd("crop_types")} placeholder="Coffee, Cardamom, Pepper" icon={<FiList size={15} />} required />
            </div>
            <Field label="Farm Photo URL (Optional)" name="farm_photo" value={form.farm_photo} onChange={upd("farm_photo")} placeholder="https://..." icon={<FiCamera size={15} />} />
            <Field label="Farm Description *" name="farm_description" value={form.farm_description} onChange={upd("farm_description")} textarea required
              placeholder="Describe your farm — crops grown, best season to visit..." />
          </div>

          {/* Section 3: Amenities & Activities */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
              <FiActivity className="text-emerald-600" /> Amenities & Activities
            </h2>
            <Field label="Stay Details (Optional)" name="stay_available" value={form.stay_available} onChange={upd("stay_available")} placeholder="e.g. 2 Guest rooms with attached bath" icon={<FiHome size={15} />} />
            <Field label="Transport (Optional)" name="transport_available" value={form.transport_available} onChange={upd("transport_available")} placeholder="e.g. Pickup from nearby station" icon={<FiTruck size={15} />} />
            <Field label="Activities Offered *" name="activities" value={form.activities} onChange={upd("activities")} textarea required
              placeholder="e.g. Harvest walk, Bee keeping, Tractor ride, Bird watching..." />
          </div>

          {/* Section 4: Verification */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
              <FiFileText className="text-emerald-600" /> Identity Verification
            </h2>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700 flex items-start gap-2 mb-4">
              <FiAlertCircle className="flex-shrink-0 mt-0.5" size={15} />
              <span>Your Aadhaar number is encrypted and used only for identity verification.</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <Field label="Identity Proof URL / Link (Optional)" name="identity_proof" value={form.identity_proof} onChange={upd("identity_proof")} placeholder="Aadhaar photo or certificate drive link" icon={<FiLink size={15} />} />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-white font-bold px-8 py-4 rounded-3xl transition-all flex items-center justify-center gap-3 text-lg shadow-xl"
          >
            {loading ? (
              <span className="w-6 h-6 border-4 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>Complete Registration <FiArrowRight /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
