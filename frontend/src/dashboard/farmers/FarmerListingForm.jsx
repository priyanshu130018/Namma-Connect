import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSun, FiUser, FiMapPin, FiPhone, FiFileText,
  FiAlertCircle, FiCheckCircle, FiList, FiActivity, FiArrowRight, FiMail, FiCamera, FiHome, FiTruck, FiLink
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import { farmAPI } from "@/services/api";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; }
};

const Field = ({ label, name, type = "text", placeholder, icon, required, textarea, value, onChange }) => (
  <div>
    <label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
    <div className="relative">
      {icon && !textarea && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>}
      {textarea ? (
        <textarea
          required={required} rows={3}
          placeholder={placeholder} value={value} onChange={onChange}
          className="input-field text-sm resize-none"
        />
      ) : (
        <input
          type={type} required={required}
          placeholder={placeholder} value={value} onChange={onChange}
          className={`input-field text-sm ${icon ? "pl-10" : ""}`}
        />
      )}
    </div>
  </div>
);

const CheckboxField = ({ label, checked, onChange, icon, children }) => (
  <div className="space-y-4">
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <div className="relative flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 rounded-lg border-2 border-slate-300 text-amber-500 focus:ring-amber-500 transition-all cursor-pointer"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400 group-hover:text-amber-500 transition-colors">{icon}</span>
        <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
      </div>
    </label>
    <AnimatePresence>
      {checked && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="pl-8 pt-1">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default function FarmerListingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const [loading, setLoading] = useState(id && id !== "new");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "", area: "", state: "", country: "India",
    mobile: user?.mobile || "", email: user?.email || "",
    farm_location: "", farm_description: "", crop_types: "", 
    farm_photo: "", stay_available: "", transport_available: "", 
    activities: ""
  });

  const [hasStay, setHasStay] = useState(false);
  const [hasTransport, setHasTransport] = useState(false);

  useEffect(() => {
    if (id && id !== "new") {
      farmAPI.getListing(id)
        .then(res => {
          const d = res.data;
          setForm({
            name: d.name || "",
            area: d.area || "",
            state: d.state || "",
            country: "India", // Listing doesn't have country, but keep for form if needed
            mobile: d.mobile || "",
            email: d.email || "",
            farm_location: d.location || "",
            farm_description: d.description || "",
            crop_types: d.crop_types || "",
            farm_photo: d.farm_photo || "",
            stay_available: d.stay_available || "",
            transport_available: d.transport_available || "",
            activities: d.activities || ""
          });
          setHasStay(!!d.stay_available);
          setHasTransport(!!d.transport_available);
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { navigate("/login"); return; }
    setSubmitting(true); setError("");

    const listingData = {
      name: form.name,
      description: form.farm_description,
      location: form.farm_location,
      area: form.area,
      state: form.state,
      mobile: form.mobile,
      email: form.email,
      crop_types: form.crop_types,
      farm_photo: form.farm_photo,
      stay_available: hasStay ? form.stay_available : "",
      transport_available: hasTransport ? form.transport_available : "",
      activities: form.activities
    };

    try {
      if (id && id !== "new") {
        await farmAPI.updateListing(id, listingData);
      } else {
        // For new, we need full register object
        const registerData = {
          profile: {
            name: form.name,
            area: form.area,
            state: form.state,
            country: form.country,
            mobile: form.mobile,
            // bio: ... 
          },
          listing: listingData
        };
        await farmAPI.register(user.loginId, registerData);
      }
      setSuccess(true);
      setTimeout(() => navigate("/farmer/listings"), 1000);
    } catch (err) {
      setError(err.response?.data?.detail || "Action failed. Try again.");
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold mb-4 flex items-center gap-1">
             Go Back
          </button>
          <h1 className="text-3xl font-black text-slate-900">{id === "new" ? "Add New Farm" : "Edit Farm Listing"}</h1>
          <p className="text-slate-500 text-sm">Provide details about your farm and the activities you offer.</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
              <FiSun className="text-amber-500" /> Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Farm Name *" name="name" value={form.name} onChange={upd("name")} placeholder="Green Valley Farm" icon={<FiHome size={15} />} required />
              <Field label="Contact Number *" name="mobile" value={form.mobile} onChange={upd("mobile")} placeholder="+91 ..." icon={<FiPhone size={15} />} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Field label="Area / Village *" name="area" value={form.area} onChange={upd("area")} placeholder="Kushalnagar" icon={<FiMapPin size={15} />} required />
               <Field label="State *" name="state" value={form.state} onChange={upd("state")} placeholder="Karnataka" required />
            </div>
            <Field label="Specific Farm Location / Address *" name="farm_location" value={form.farm_location} onChange={upd("farm_location")} placeholder="Full address or GPS coords" icon={<FiMapPin size={15} />} required />
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
              <FiActivity className="text-emerald-600" /> Farm Details
            </h2>
            <Field label="Main Crops *" name="crop_types" value={form.crop_types} onChange={upd("crop_types")} placeholder="Coffee, Mango, Paddy" icon={<FiList size={15} />} required />
            <Field label="Farm Photo URL" name="farm_photo" value={form.farm_photo} onChange={upd("farm_photo")} placeholder="https://..." icon={<FiCamera size={15} />} />
            <Field label="Farm Description *" name="farm_description" value={form.farm_description} onChange={upd("farm_description")} textarea required placeholder="Tell tourists about your farm story..." />
            <Field label="Activities Offered *" name="activities" value={form.activities} onChange={upd("activities")} textarea required placeholder="What can guests do at your farm?" />
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-2">
              <FiTrendingUp className="text-amber-500" /> Amenities
            </h2>
            
            <CheckboxField 
              label="Stay Available" 
              checked={hasStay} 
              onChange={setHasStay}
              icon={<FiHome size={18}/>}
            >
              <Field 
                label="Stay Details" 
                name="stay_available" 
                value={form.stay_available} 
                onChange={upd("stay_available")} 
                placeholder="Describe rooms, capacity, etc." 
                required={hasStay}
              />
            </CheckboxField>

            <CheckboxField 
              label="Transport Available" 
              checked={hasTransport} 
              onChange={setHasTransport}
              icon={<FiTruck size={18}/>}
            >
              <Field 
                label="Transport Details" 
                name="transport_available" 
                value={form.transport_available} 
                onChange={upd("transport_available")} 
                placeholder="Pick-up points, vehicle type, etc." 
                required={hasTransport}
              />
            </CheckboxField>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm flex items-center gap-2">
              <FiAlertCircle /> {error}
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-white font-bold px-8 py-4 rounded-3xl transition-all flex items-center justify-center gap-3 text-lg shadow-xl shadow-amber-100"
          >
            {submitting ? (
              <span className="w-6 h-6 border-4 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>{id === "new" ? "Create Listing" : "Save Changes"} <FiArrowRight /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

import { FiTrendingUp } from "react-icons/fi";
