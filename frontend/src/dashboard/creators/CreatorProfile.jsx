import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiUser, FiMail, FiMapPin, FiPhone, FiShield, FiLink, FiCalendar,
  FiInstagram, FiYoutube, FiGlobe, FiCheckCircle, FiChevronRight, FiEdit3
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { creatorAPI } from "@/services/api";
import { 
  ProfileHeader, ProfileField, PremiumField, ProfileBio, ProfileActions 
} from "@/components/ui/profile";

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

export default function CreatorProfile() {
  const user = getUser();
  const [formData, setFormData] = useState({
    name: user?.name || user?.full_name || "",
    age: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    postal_code: "",
    mobile: user?.mobile || "",
    email: user?.email || "",
    niche: "",
    instagram: "",
    youtube: "",
    portfolio: "",
    aadhaar_no: "",
    has_work_experience: false,
    bio: "",
    rate: "0"
  });

   const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

   useEffect(() => {
    const uid = user?.userId || user?.id;
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    creatorAPI.getProfile(uid)
      .then(res => {
        const d = res.data;
        setFormData({
          name: d.name || user?.name || user?.full_name || "",
          age: d.age ? String(d.age) : "",
          address: d.address || "",
          city: d.city || "",
          state: d.state || "",
          country: d.country || "India",
          postal_code: d.postal_code || "",
          mobile: d.mobile || user?.mobile || "",
          email: d.email || user?.email || "",
          niche: d.niche || "",
          instagram: d.instagram || "",
          youtube: d.youtube || "",
          portfolio: d.portfolio || "",
          aadhaar_no: d.aadhaar_no || "",
          has_work_experience: Boolean(d.has_work_experience),
          bio: d.bio || "",
          rate: d.rate ? String(d.rate) : "0"
        });
      })
      .catch(() => setError("Failed to synchronize creator data"))
      .finally(() => setLoading(false));
  }, []);

   const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError("");
    const uid = user?.userId || user?.id;
    try {
      await creatorAPI.updateProfile(uid, {
        ...formData,
        age: formData.age ? Number(formData.age) : null,
        has_work_experience: formData.has_work_experience ? 1 : 0,
        rate: formData.rate ? Number(formData.rate) : 0
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      const updatedUser = { ...user, name: formData.name };
      localStorage.setItem("ng_user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("storage"));
      setIsEditing(false); // Switch back to view mode
    } catch (err) {
      setError("Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-purple-100 selection:text-purple-900">
      <Navbar />

      <div className="pt-28 pb-20 px-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
        {/* Left: Identity Card */}
        <div className="lg:w-1/3 space-y-6">
          <ProfileHeader 
            name={formData.name} 
            role="Verified Artist" 
            accentColor="purple"
            stats={[
                { label: "Portfolio", value: "12" },
                { label: "Rank", value: "PRO" }
            ]}
          />

          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-1">Engagement</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <FiInstagram className="text-purple-600" />
                      <span className="text-xs font-bold text-purple-900">Social Sync</span>
                   </div>
                   <FiCheckCircle className="text-purple-500" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group cursor-help transition-all hover:bg-white hover:border-slate-200">
                   <div className="flex items-center gap-3">
                      <FiCheckCircle className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-500">Expert Guide</span>
                   </div>
                   <FiChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </div>
             </div>
          </div>
        </div>

        {/* Right: Personalization Form */}
        <div className="lg:w-2/3">
          <form onSubmit={handleSave} className="space-y-8">
            <motion.div
               initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
               className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-200 shadow-sm space-y-10"
            >
              <div className="flex items-center justify-between border-b border-slate-50 pb-8">
                <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Creator Identity</h2>
                   <p className="text-slate-400 text-sm font-medium">Manage your creative niche and social connections.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isEditing ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                   <FiEdit3 size={24} />
                </button>
              </div>

              {/* Basic Logic */}
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileField label="Full Name" value={formData.name} onChange={v => setFormData(p=>({...p, name:v}))} placeholder="Legal Name" icon={FiUser} isEditing={isEditing} accentColor="purple" required />
                    <ProfileField label="Content Niche" value={formData.niche} onChange={v => setFormData(p=>({...p, niche:v}))} placeholder="e.g. Photography, Yoga" icon={FiEdit3} isEditing={isEditing} accentColor="purple" />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileField label="Email Public" type="email" value={formData.email} onChange={v => setFormData(p=>({...p, email:v}))} placeholder="email@domain.com" icon={FiMail} isEditing={isEditing} accentColor="purple" required />
                    <ProfileField label="Mobile Contact" value={formData.mobile} onChange={v => setFormData(p=>({...p, mobile:v.replace(/\D/g,"")}))} placeholder="Mobile" icon={FiPhone} isEditing={isEditing} accentColor="purple" required />
                 </div>

                 <ProfileBio label="Identity Bio" value={formData.bio} onChange={v => setFormData(p=>({...p, bio:v}))} placeholder="Tell us about yourself..." isEditing={isEditing} accentColor="purple" />
              </div>

               {/* Pricing & Business */}
              <div className="pt-10 border-t border-slate-100">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] mb-8 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100/50">
                       <FiCalendar size={14} />
                    </div>
                    Collaboration Pricing
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="md:col-span-2">
                       <ProfileField
                          label="Your Daily Rate (₹)"
                          value={formData.rate}
                          onChange={v => setFormData(p=>({...p, rate:v.replace(/\D/g,"")}))}
                          placeholder="0"
                          icon={FiCalendar}
                          isEditing={isEditing}
                          accentColor="purple"
                          required
                       />
                       <p className="text-[10px] text-slate-400 font-bold mt-3 ml-1 italic tracking-tight">
                         Recommended: Starts at ₹1,500/day for micro-creators.
                       </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg shadow-purple-500/20 relative overflow-hidden group">
                       <p className="text-[9px] font-black uppercase tracking-widest text-purple-200 mb-1 relative z-10">Monthly Potential</p>
                       <p className="text-xl font-black relative z-10">₹{(Number(formData.rate || 0) * 12).toLocaleString()}</p>
                       <p className="text-[8px] text-purple-300 relative z-10 mt-1">Based on 12 stays/mo</p>
                       <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 blur-xl rounded-full group-hover:scale-150 transition-transform duration-500" />
                    </div>
                 </div>
              </div>

              {/* Social Channels */}
              <div className="pt-10 border-t border-slate-100">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] mb-8 flex items-center gap-3">
                    <FiGlobe className="text-purple-500" /> Digital Presence
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PremiumField label="Instagram" value={formData.instagram} onChange={v => setFormData(p=>({...p, instagram:v}))} placeholder="@handle" icon={FiInstagram} isEditing={isEditing} accentColor="purple" />
                    <PremiumField label="YouTube" value={formData.youtube} onChange={v => setFormData(p=>({...p, youtube:v}))} placeholder="Channel" icon={FiYoutube} isEditing={isEditing} accentColor="purple" />
                    <PremiumField label="Portfolio" value={formData.portfolio} onChange={v => setFormData(p=>({...p, portfolio:v}))} placeholder="URL" icon={FiLink} isEditing={isEditing} accentColor="purple" />
                 </div>
              </div>

              {/* Location Data */}
              <div className="pt-10 border-t border-slate-100">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] mb-8 flex items-center gap-3">
                    <FiMapPin className="text-purple-500" /> Current Location
                 </h3>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <PremiumField label="City" value={formData.city} onChange={v => setFormData(p=>({...p, city:v}))} placeholder="City" isEditing={isEditing} accentColor="purple" />
                    <PremiumField label="State" value={formData.state} onChange={v => setFormData(p=>({...p, state:v}))} placeholder="State" isEditing={isEditing} accentColor="purple" />
                    <PremiumField label="Zip" value={formData.postal_code} onChange={v => setFormData(p=>({...p, postal_code:v}))} placeholder="Pincode" isEditing={isEditing} accentColor="purple" />
                 </div>
              </div>

              {/* Security */}
              <div className="pt-10 border-t border-slate-100">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.1em] mb-8 flex items-center gap-3">
                    <FiShield className="text-purple-500" /> Security & Trust
                 </h3>
                 <div className="bg-slate-50 rounded-[30px] p-8 border border-slate-100/50">
                    <PremiumField label="Aadhaar ID Number" value={formData.aadhaar_no} onChange={v => setFormData(p=>({...p, aadhaar_no:v.replace(/\D/g,"").slice(0,12)}))} placeholder="12-digit number" icon={FiShield} isEditing={isEditing} accentColor="purple" />
                    <p className="text-[10px] font-bold text-slate-400 mt-4 leading-relaxed italic">
                       Verified IDs unlock higher trust scores and premium collaborations.
                    </p>
                 </div>
              </div>

              <ProfileActions 
                 isEditing={isEditing} 
                 onEdit={() => setIsEditing(!isEditing)} 
                 submitting={submitting} 
                 error={error} 
                 saved={saved} 
                 accentColor="purple"
                 editLabel="Edit Creative Identity"
                 saveLabel="Publish Profile Changes"
              />
            </motion.div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
