import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiUser, FiMail, FiMapPin, FiPhone, FiShield, FiLink, FiCalendar,
  FiCheckCircle, FiChevronRight, FiEdit3
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { farmAPI } from "@/services/api";
import { 
  ProfileHeader, ProfileField, PremiumField, ProfileActions 
} from "@/components/ui/profile";

const getUser = () => { try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; } };

const INDIAN_STATES = [
 "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
 "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", 
 "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", 
 "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", 
 "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", 
 "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
 "Uttarakhand", "West Bengal"
];

export default function FarmerProfile() {
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
    aadhaar_no: "", 
    identity_proof: "",
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
    farmAPI.getProfile(uid)
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
          aadhaar_no: d.aadhaar_no || "",
          identity_proof: d.identity_proof || "",
        });
      })
      .catch(() => setError("Failed to load profile details"))
      .finally(() => setLoading(false));
  }, []);

   const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError("");
    const uid = user?.userId || user?.id;
    try {
      await farmAPI.updateProfile(uid, {
        ...formData,
        age: formData.age ? Number(formData.age) : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      
      const updatedUser = { ...user, name: formData.name };
      localStorage.setItem("nc_user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("storage"));
      setIsEditing(false); // Switch back to view mode
    } catch (err) {
      setError("Failed to update profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-surface font-sans selection:bg-primary/10 selection:text-primary">
      <Navbar />
      <datalist id="states">{INDIAN_STATES.map(s => <option key={s} value={s} />)}</datalist>

      <div className="pt-28 pb-20 px-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-12">
        {/* Left: Identity Card */}
        <div className="lg:w-1/3 space-y-6">
          <ProfileHeader 
            name={formData.name} 
            role="Verified Host" 
            accentColor="amber"
            stats={[
                { label: "Listings", value: "3" },
                { label: "Guests", value: "150+" }
            ]}
          />

          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
             <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6 px-1">Trust Badges</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/30 rounded-2xl">
                   <div className="flex items-center gap-3">
                      <FiShield className="text-primary" />
                      <span className="text-xs font-bold text-primary">KYC Verified</span>
                   </div>
                   <FiCheckCircle className="text-primary" />
                </div>
                <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-2xl group cursor-help transition-all hover:bg-card hover:border-border">
                   <div className="flex items-center gap-3">
                      <FiCheckCircle className="text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground">Premium Host</span>
                   </div>
                   <FiChevronRight className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
             </div>
          </div>
        </div>

        {/* Right: Personalization Form */}
        <div className="lg:w-2/3">
          <form onSubmit={handleSave} className="space-y-8">
            <motion.div 
               initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
               className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-sm space-y-10"
            >
              <div className="flex items-center justify-between border-b border-border pb-8">
                <div>
                   <h2 className="text-3xl font-semibold text-foreground tracking-tight mb-2">Farmer Profile</h2>
                   <p className="text-muted-foreground text-sm font-medium">Manage your personal and farm-related contact details.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isEditing ? 'bg-primary text-primary-foreground shadow-sm ' : 'bg-surface text-muted-foreground hover:bg-muted'}`}
                >
                   <FiEdit3 size={24} />
                </button>
              </div>

              {/* Standard Identity */}
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileField label="Full Name" value={formData.name} onChange={v => setFormData(p=>({...p, name:v}))} placeholder="Legal Name" icon={FiUser} isEditing={isEditing} accentColor="amber" required />
                    <ProfileField label="Age" type="number" value={formData.age} onChange={v => setFormData(p=>({...p, age:v}))} placeholder="Years" icon={FiCalendar} isEditing={isEditing} accentColor="amber" />
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ProfileField label="Email Address" type="email" value={formData.email} onChange={v => setFormData(p=>({...p, email:v}))} placeholder="email@domain.com" icon={FiMail} isEditing={isEditing} accentColor="amber" required />
                    <ProfileField label="Phone Contact" value={formData.mobile} onChange={v => setFormData(p=>({...p, mobile:v.replace(/\D/g,"")}))} placeholder="Mobile" icon={FiPhone} isEditing={isEditing} accentColor="amber" required />
                 </div>
              </div>

              {/* Location Data */}
              <div className="pt-10 border-t border-border">
                 <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-8 flex items-center gap-3">
                    <FiMapPin className="text-primary" /> Residential Address
                 </h3>
                 <div className="space-y-6">
                    <ProfileField label="Street / Village" value={formData.address} onChange={v => setFormData(p=>({...p, address:v}))} placeholder="Full address" icon={FiMapPin} isEditing={isEditing} accentColor="amber" />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                       <PremiumField label="City" value={formData.city} onChange={v => setFormData(p=>({...p, city:v}))} placeholder="City" isEditing={isEditing} accentColor="amber" />
                       <PremiumField label="State" value={formData.state} onChange={v => setFormData(p=>({...p, state:v}))} placeholder="Select State" list="states" isEditing={isEditing} accentColor="amber" />
                       <PremiumField label="Zip Code" value={formData.postal_code} onChange={v => setFormData(p=>({...p, postal_code:v}))} placeholder="Pincode" isEditing={isEditing} accentColor="amber" />
                    </div>
                 </div>
              </div>

              {/* Security & Proofs */}
              <div className="pt-10 border-t border-border">
                 <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.1em] mb-8 flex items-center gap-3">
                    <FiShield className="text-primary" /> Security & Identity
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <PremiumField label="Aadhaar ID" value={formData.aadhaar_no} onChange={v => setFormData(p=>({...p, aadhaar_no:v.replace(/\D/g,"").slice(0,12)}))} placeholder="12-digit number" icon={FiShield} isEditing={isEditing} accentColor="amber" />
                    <PremiumField label="Proof Document URL" value={formData.identity_proof} onChange={v => setFormData(p=>({...p, identity_proof:v}))} placeholder="Link to ID scan" icon={FiLink} isEditing={isEditing} accentColor="amber" />
                 </div>
                 <p className="text-[10px] font-bold text-muted-foreground mt-6 leading-relaxed italic border-l-2 border-primary/30 pl-4">
                   Your Aadhaar and Identity proofs are encrypted. We only share verified status with guests; documents are never exposed to the public.
                 </p>
              </div>

              <ProfileActions 
                 isEditing={isEditing} 
                 onEdit={() => setIsEditing(!isEditing)} 
                 submitting={submitting} 
                 error={error} 
                 saved={saved} 
                 accentColor="amber"
                 editLabel="Edit Identity Card"
                 saveLabel="Publish Profile Updates"
              />
            </motion.div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
