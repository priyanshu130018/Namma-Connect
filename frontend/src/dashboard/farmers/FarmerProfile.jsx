import { useState, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import ProfileCard from "@/components/ui/profile";
import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import { farmAPI } from "@/services/api";

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

const FIELDS = [
  { label: "Farm Name",               key: "name"      },
  { label: "State",                   key: "state",    icon: <FiMapPin size={14} /> },
  { label: "Area / Village",          key: "area",     icon: <FiMapPin size={14} /> },
  { label: "Phone",                   key: "mobile",   icon: <FiPhone size={14} />  },
  { label: "Email",                   key: "email",    icon: <FiMail size={14} />   },
  { label: "Farm GPS / Address",      key: "farm_location" },
  { label: "Crop Types (comma-sep.)", key: "crop_types"    },
  { label: "Farm Photo URL",          key: "farm_photo"    },
  { label: "Stay Available",          key: "stay_available"},
  { label: "Transport Available",     key: "transport_available"},
];

export default function FarmerProfile() {
  const user = getUser();
  const [formData, setFormData] = useState({
    name: "", state: "", area: "", mobile: "",
    email: user?.email || "", farm_location: "",
    crop_types: "", farm_description: "",
    farm_photo: "", stay_available: "", transport_available: "",
    activities: "",
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // ── Fetch real profile from backend on mount ───────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    farmAPI.getProfile(user.id)
      .then(res => {
        const d = res.data;
        setFormData({
          name:             d.name            || "",
          state:            d.state           || "",
          area:             d.area            || "",
          mobile:           d.mobile          || "",
          email:            d.email           || user?.email || "",
          farm_location:    d.farm_location   || "",
          crop_types:       d.crop_types      || "",
          farm_description: d.farm_description|| "",
          farm_photo:       d.farm_photo      || "",
          stay_available:   d.stay_available  || "",
          transport_available: d.transport_available || "",
          activities:       d.activities      || "",
        });
      })
      .catch(() => {}) // farm may not be registered yet
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    await farmAPI.updateFarm(user.id, formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-20 flex flex-col items-center min-h-[calc(100vh-80px)]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 pb-20 w-full flex flex-col items-center">
            <ProfileCard
              title="Farm Profile"
              subtitle="Your farm's public profile seen by tourists"
              avatarContent="🌾"
              avatarGradient="from-amber-400 to-orange-500"
              displayName={formData.name || "Your Farm"}
              badgeText="Verified Farmer"
              badgeColor="bg-amber-100 text-amber-700 font-bold"
              accentBtn="bg-amber-500 hover:bg-amber-400"
              fields={FIELDS}
              textareaKey="farm_description"
              textareaLabel="Farm Description"
              textareaPlaceholder="Describe your farm — crops grown, best season to visit..."
              formData={formData}
              onFormChange={handleChange}
              onSave={handleSave}
              saveLabel={saved ? "✓ Saved!" : "Save Changes"}
              gridCols
            />
            
            {/* Activities section */}
            <div className="w-full max-w-2xl px-6">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <label className="text-xs font-bold text-slate-500 block mb-3 uppercase tracking-wider">Activities Offered</label>
                <div className="p-1 rounded-2xl border-2 border-emerald-500">
                  <textarea 
                    rows={4} 
                    value={formData.activities} 
                    onChange={(e) => handleChange("activities", e.target.value)}
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                    placeholder="Harvest walk, Bee keeping, Tractor ride..."
                  />
                  <div className="flex justify-end p-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
