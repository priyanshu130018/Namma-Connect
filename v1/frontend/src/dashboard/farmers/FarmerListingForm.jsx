import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  FiSun, FiMapPin, FiPhone, FiMail, FiAlertCircle, FiList,
  FiActivity, FiArrowRight, FiCamera, FiHome, FiTruck,
  FiDollarSign, FiCheckCircle, FiChevronLeft
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { farmAPI } from "@/services/api";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("ng_user") || "null"); }
  catch { return null; }
};

// ── Premium Field Component ───────────────────────────────────────────────────
const PremiumField = ({ label, type = "text", placeholder, icon, required, textarea, value, onChange, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">{label} {required && "*"}</label>
    <div className="relative group">
      {icon && !textarea && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors">{icon}</span>
      )}
      {textarea ? (
        <textarea
          required={required}
          rows={4}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-5 py-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all resize-none placeholder:text-slate-300 shadow-sm"
          {...props}
        />
      ) : (
        <input
          type={type}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full bg-slate-50 border border-slate-200 rounded-[20px] py-4 text-sm font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 shadow-sm ${icon ? "pl-12 pr-5" : "px-5"}`}
          {...props}
        />
      )}
    </div>
  </div>
);

export default function FarmerListingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const userId = user?.userId || user?.id;
  const isEdit = id && id !== "new";

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [form, setForm] = useState({
    farm_name: "", description: "", address: "", city: "", state: "",
    mobile: user?.mobile || "", email: user?.email || "",
    crop_types: "", farm_photo: "", stay_available: false, stay_details: "",
    transport_available: false, activities: "", price_per_night: "", is_active: true,
  });

  useEffect(() => {
    if (!isEdit) return;
    farmAPI.getListing(id)
      .then(res => {
        const d = res.data;
        setForm({
          farm_name: d.farm_name || "",
          description: d.description || "",
          address: d.address || "",
          city: d.city || "",
          state: d.state || "",
          mobile: d.mobile || "",
          email: d.email || "",
          crop_types: d.crop_types || "",
          farm_photo: d.farm_photo || "",
          stay_available: !!d.stay_available && d.stay_available !== "false" && d.stay_available !== "0",
          stay_details: (d.stay_available && d.stay_available !== "1" && d.stay_available !== "true") ? d.stay_available : "",
          transport_available: !!d.transport_available && d.transport_available !== "false" && d.transport_available !== "0",
          activities: d.activities || "",
          price_per_night: d.price_per_night != null ? String(d.price_per_night) : "",
          is_active: d.is_active ?? true,
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !userId) { setError("Session expired."); return; }
    if (form.price_per_night && isNaN(Number(form.price_per_night))) { setError("Invalid price."); return; }

    setSubmitting(true); setError("");

    const payload = {
      ...form,
      farm_name: form.farm_name.trim(),
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      mobile: form.mobile.trim() || null,
      email: form.email.trim() || null,
      crop_types: form.crop_types.trim() || null,
      farm_photo: form.farm_photo.trim() || null,
      stay_available: form.stay_available ? (form.stay_details?.trim() || "Yes") : null,
      transport_available: form.transport_available ? "Yes" : null,
      activities: form.activities.trim() || null,
      price_per_night: form.price_per_night ? Number(form.price_per_night) : null,
    };

    try {
      if (isEdit) await farmAPI.updateListing(id, payload);
      else await farmAPI.createListing(userId, payload);
      setSuccess(true);
      setTimeout(() => navigate("/farmer/listings"), 1000);
    } catch (err) { setError(err.response?.data?.detail || "Update failed."); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />

      <div className="pt-24 pb-20 px-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
        {/* Left: Banner & Info */}
        <div className="lg:w-1/3 lg:sticky lg:top-28 lg:h-fit">
           <div className="bg-slate-900 rounded-[40px] p-8 md:p-10 text-white overflow-hidden relative shadow-2xl">
              <button 
                onClick={() => navigate(-1)} 
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-10 hover:bg-white hover:text-slate-900 transition-all"
              >
                <FiChevronLeft size={20} />
              </button>

              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                   Propety Registry
                </div>
                <h1 className="text-4xl font-black leading-tight tracking-tight">
                  {isEdit ? "Refine Your \nExperience" : "Register Your \nFarm Stay"}
                </h1>
                <p className="text-slate-400 font-medium text-base leading-relaxed">
                  Join our network of premium farm stays and reach thousands of travelers seeking authentic agritourism.
                </p>

                <div className="pt-8 space-y-4">
                   <div className="flex items-center gap-3 text-sm font-bold opacity-60">
                     <div className="w-2 h-2 rounded-full bg-amber-500" /> Professional Dashboard
                   </div>
                   <div className="flex items-center gap-3 text-sm font-bold opacity-60">
                     <div className="w-2 h-2 rounded-full bg-amber-500" /> Real-time Availability
                   </div>
                   <div className="flex items-center gap-3 text-sm font-bold opacity-60">
                     <div className="w-2 h-2 rounded-full bg-amber-500" /> Secure Payments
                   </div>
                </div>
              </div>

              {/* Decorative spheres */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 blur-[80px] translate-y-1/2 -translate-x-1/2 rounded-full" />
           </div>
        </div>

        {/* Right: Actual Form */}
        <div className="lg:w-2/3">
          <form onSubmit={handleSubmit} className="space-y-8 pb-12">
            
            {/* Success/Error Banner */}
            <AnimatePresence>
              {error && (
                <Motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-black flex items-center gap-3 shadow-sm">
                  <FiAlertCircle size={16} /> {error}
                </Motion.div>
              )}
              {success && (
                <Motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-sm font-black text-center shadow-lg">
                  ✅ Successfully {isEdit ? "updated" : "published"}! Syncing dashboard...
                </Motion.div>
              )}
            </AnimatePresence>

            {/* Section 1: Identity */}
            <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-200 shadow-sm space-y-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                 <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500"><FiSun size={20} /></div>
                 Basic Identity
              </h2>

              <PremiumField 
                label="Farm Display Name" value={form.farm_name} onChange={upd("farm_name")} 
                placeholder="e.g. Whispering Woods Retreat" icon={<FiHome size={18} />} required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PremiumField 
                  label="Contact Phone" value={form.mobile} icon={<FiPhone size={18} />} 
                  placeholder="10-digit mobile" inputMode="numeric" maxLength={10} 
                  onChange={e => setForm(p=>({...p, mobile: e.target.value.replace(/\D/g,"")}))} 
                />
                <PremiumField 
                  label="Business Email" type="email" value={form.email} onChange={upd("email")}
                  placeholder="hello@yourfarm.com" icon={<FiMail size={18} />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Farm Cover Image</label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                  <div className="md:col-span-3">
                    <PremiumField 
                      value={form.farm_photo} onChange={upd("farm_photo")}
                      placeholder="Paste image URL here (HTTPS preferred)" icon={<FiCamera size={18} />}
                    />
                  </div>
                  <div className="aspect-square rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 overflow-hidden relative group">
                    {form.farm_photo ? (
                      <img src={form.farm_photo} className="w-full h-full object-cover" onError={e=>e.target.src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=20&w=200"} />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300"><FiCamera size={24} /></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Geo-location */}
            <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-200 shadow-sm space-y-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                 <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600"><FiMapPin size={20} /></div>
                 Location Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <PremiumField label="City / Tehsil" value={form.city} onChange={upd("city")} placeholder="e.g. Chikmagalur" required />
                 <PremiumField label="State / Province" value={form.state} onChange={upd("state")} placeholder="e.g. Karnataka" required />
              </div>
              <PremiumField label="Full Physical Address" value={form.address} onChange={upd("address")} placeholder="Village name, Landmarks, Pincode" required icon={<FiMapPin size={18} />} />
            </div>

            {/* Section 3: The Offering */}
            <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-200 shadow-sm space-y-8">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                 <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><FiActivity size={20} /></div>
                 Farm Experience
              </h2>
              <PremiumField label="Key Crops / Produce" value={form.crop_types} onChange={upd("crop_types")} placeholder="e.g. Cardamom, Pepper, Arecanut" icon={<FiList size={18} />} required />
              <PremiumField label="Detailed Description" value={form.description} onChange={upd("description")} textarea placeholder="Walk us through a day at your farm..." required />
              <PremiumField label="Guest Activities" value={form.activities} onChange={upd("activities")} textarea placeholder="Fruit picking, Bonfire, Nature walk..." required />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="bg-slate-50 border border-slate-100 rounded-[30px] p-6 space-y-4">
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Base Pricing</p>
                     <PremiumField type="number" value={form.price_per_night} onChange={upd("price_per_night")} placeholder="Price / Day" icon={<FiDollarSign size={18} />} step="1" min="0" />
                   </div>
                   <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic">* Displayed price is per adult per night inclusive of base meals.</p>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Included Amenities</p>
                  <div className="space-y-3">
                    {/* Stay Checkbox */}
                    <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${form.stay_available ? "bg-amber-50 border-amber-200 shadow-md" : "bg-white border-slate-100 hover:border-slate-200"}`}>
                       <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.stay_available ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-400"}`}><FiHome size={14} /></div>
                         <span className={`text-xs font-black uppercase tracking-wider ${form.stay_available ? "text-amber-800" : "text-slate-400"}`}>Stay Available</span>
                       </div>
                       <input type="checkbox" className="hidden" checked={form.stay_available} onChange={e => setForm(p=>({...p, stay_available: e.target.checked}))} />
                       <div className={`w-10 h-5 rounded-full relative transition-colors ${form.stay_available ? "bg-amber-500" : "bg-slate-200"}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${form.stay_available ? "left-6" : "left-1"}`} />
                       </div>
                    </label>

                    {/* Conditional Stay Details */}
                    <AnimatePresence>
                      {form.stay_available && (
                        <Motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: "auto", opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2">
                            <PremiumField 
                              label="About the Stay" 
                              value={form.stay_details} 
                              onChange={e => setForm(p => ({ ...p, stay_details: e.target.value }))} 
                              textarea 
                              placeholder="Describe the rooms, environment, and rules (e.g. 2 private rooms with shared bath, pet friendly)..." 
                              rows={3}
                            />
                          </div>
                        </Motion.div>
                      )}
                    </AnimatePresence>

                    {/* Transport Checkbox */}
                    <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${form.transport_available ? "bg-blue-50 border-blue-200 shadow-md" : "bg-white border-slate-100 hover:border-slate-200"}`}>
                       <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.transport_available ? "bg-blue-500 text-white" : "bg-slate-50 text-slate-400"}`}><FiTruck size={14} /></div>
                         <span className={`text-xs font-black uppercase tracking-wider ${form.transport_available ? "text-blue-800" : "text-slate-400"}`}>Pickup Service</span>
                       </div>
                       <input type="checkbox" className="hidden" checked={form.transport_available} onChange={e => setForm(p=>({...p, transport_available: e.target.checked}))} />
                       <div className={`w-10 h-5 rounded-full relative transition-colors ${form.transport_available ? "bg-blue-500" : "bg-slate-200"}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${form.transport_available ? "left-6" : "left-1"}`} />
                       </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Actions */}
            <div className="bg-slate-50 border border-white rounded-[40px] p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 sticky bottom-6 z-20 backdrop-blur-xl">
               <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className={`w-14 h-7 rounded-full relative transition-colors ${form.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
                  >
                     <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all ${form.is_active ? "left-8" : "left-1"}`} />
                  </button>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                    Listing Status: <span className={form.is_active ? "text-emerald-600" : "text-slate-400"}>{form.is_active ? "Live" : "Draft"}</span>
                  </p>
               </div>
               
               <button
                 type="submit"
                 disabled={submitting}
                 className="w-full md:w-auto bg-amber-500 hover:bg-slate-900 text-white font-black px-12 py-5 rounded-[22px] transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-50"
               >
                 {submitting ? "Processing..." : isEdit ? "Sync All Changes" : "Publish Experience"}
                 {!submitting && <FiCheckCircle size={20} />}
               </button>
            </div>

          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
