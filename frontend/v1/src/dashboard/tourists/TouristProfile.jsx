import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiUser, FiMail, FiMapPin, FiPhone, FiShield, FiGlobe,
  FiCheckCircle, FiChevronRight, FiEdit3
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { touristAPI } from "@/services/api";
import { 
  ProfileHeader, ProfileField, PremiumField, ProfileBio, ProfileActions 
} from "@/components/ui/profile";

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

export default function TouristProfile() {
  const user = getUser();
  const [formData, setFormData] = useState({
    name: user?.name || "", 
    email: user?.email || "",
    mobile: user?.mobile || "", 
    address: "", 
    city: "",
    state: "",
    postal_code: "",
    aadhaar_no: "",
    bio: "",
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
    touristAPI.getProfile(uid)
      .then(res => {
        const d = res.data;
        setFormData({
          name:        d.name        || user?.name  || "",
          email:       user?.email   || "",
          mobile:      d.mobile      || user?.mobile || "",
          address:     d.address     || "",
          city:        d.city        || "",
          state:       d.state       || "",
          postal_code: d.postal_code || "",
          aadhaar_no:  d.aadhaar_no  || "",
          bio:         d.bio         || "",
        });
      })
      .catch(() => setError("Failed to load profile data"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError("");
    const uid = user?.userId || user?.id;
    try {
      await touristAPI.updateProfile(uid, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      const updatedUser = { ...user, name: formData.name };
      localStorage.setItem("ng_user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("storage"));
      setIsEditing(false);
    } catch (err) {
      setError("Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-100 selection:text-green-900">
      <Navbar />

      <div className="pt-28 pb-20 px-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
        {/* Left: Identity Card */}
        <div className="lg:w-1/3 space-y-6">
          <ProfileHeader 
            name={formData.name} 
            role="Explorer Elite" 
            accentColor="green"
            stats={[
                { label: "Bookings", value: "12" },
                { label: "Rank", value: "#42" }
            ]}
          />

          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-1">Verification Status</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <FiShield className="text-green-600" />
                      <span className="text-xs font-bold text-green-900">ID Verified</span>
                   </div>
                   <FiCheckCircle className="text-green-500" />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group cursor-help transition-all hover:bg-white hover:border-slate-200">
                   <div className="flex items-center gap-3">
                      <FiGlobe className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-500">Global Citizen</span>
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
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">My Information</h2>
                   <p className="text-slate-400 text-sm font-medium">This is used for your bookings and identity verification.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isEditing ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                >
                   <FiEdit3 size={24} />
                </button>
              </div>

              {/* Identity Fields */}
              <div className="space-y-6">
                 <ProfileField label="Full Name" value={formData.name} onChange={v => setFormData(p=>({...p, name:v}))} placeholder="Your legal name" icon={FiUser} isEditing={isEditing} required />
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileField label="Personal Email" type="email" value={formData.email} onChange={v => setFormData(p=>({...p, email:v}))} placeholder="example@mail.com" icon={FiMail} isEditing={isEditing} required />
                    <ProfileField label="Mobile Contact" value={formData.mobile} onChange={v => setFormData(p=>({...p, mobile:v.replace(/\D/g,"").slice(0,10)}))} placeholder="10-digit number" icon={FiPhone} isEditing={isEditing} />
                 </div>

                 <ProfileBio label="About Me (Bio)" value={formData.bio} onChange={v => setFormData(p=>({...p, bio:v}))} placeholder="Tell us about yourself..." isEditing={isEditing} />
              </div>

              <div className="pt-10 border-t border-slate-100">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <FiMapPin className="text-green-500" /> Location Details
                 </h3>
                 <div className="space-y-6">
                    <PremiumField label="Residential Address" value={formData.address} onChange={v => setFormData(p=>({...p, address:v}))} placeholder="Street, Apartment, Landmark" Icon={FiMapPin} isEditing={isEditing} />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                       <PremiumField label="City" value={formData.city} onChange={v => setFormData(p=>({...p, city:v}))} placeholder="City" isEditing={isEditing} />
                       <PremiumField label="State" value={formData.state} onChange={v => setFormData(p=>({...p, state:v}))} placeholder="State" isEditing={isEditing} />
                       <PremiumField label="Zip Code" value={formData.postal_code} onChange={v => setFormData(p=>({...p, postal_code:v}))} placeholder="Postal" isEditing={isEditing} />
                    </div>
                 </div>
              </div>

              <div className="pt-10 border-t border-slate-100">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <FiShield className="text-green-500" /> Security & ID
                 </h3>
                 <div className="bg-slate-50 rounded-[30px] p-8 border border-slate-100/50">
                    <PremiumField label="Aadhaar ID Number" value={formData.aadhaar_no} onChange={v => setFormData(p=>({...p, aadhaar_no:v.replace(/\D/g,"").slice(0,12)}))} placeholder="12-digit number" Icon={FiShield} isEditing={isEditing} />
                    <p className="text-[9px] font-bold text-slate-400 mt-4 leading-relaxed italic px-2">
                       * Your identification data is encrypted and only shared with verified hosts once a booking is confirmed for safety and compliance.
                    </p>
                 </div>
              </div>

              <ProfileActions 
                 isEditing={isEditing} 
                 onEdit={() => setIsEditing(!isEditing)} 
                 submitting={submitting} 
                 error={error} 
                 saved={saved} 
                 accentColor="green"
                 editLabel="Edit Personal Profile"
                 saveLabel="Commit Changes"
              />
            </motion.div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}


