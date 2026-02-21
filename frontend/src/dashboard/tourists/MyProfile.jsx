import { useState, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import ProfileCard from "@/components/ui/profile";
import { FiUser, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { touristAPI } from "@/services/api";

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

const FIELDS = [
  { label: "Full Name",       key: "name",    icon: <FiUser size={14} />   },
  { label: "Email",           key: "email",   icon: <FiMail size={14} />   },
  { label: "Mobile",          key: "mobile",  icon: <FiPhone size={14} />  },
  { label: "Address / City",  key: "address", icon: <FiMapPin size={14} /> },
  { label: "Preferred Crops", key: "preferences" },
];

export default function MyProfile() {
  const user = getUser();
  const [formData, setFormData] = useState({
    name: user?.name || "", email: user?.email || "",
    mobile: "", address: "", preferences: "", bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // ── Fetch real profile from backend on mount ───────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    touristAPI.getProfile(user.id)
      .then(res => {
        const d = res.data;
        setFormData({
          name:        d.name        || user?.name  || "",
          email:       user?.email   || "",
          mobile:      d.mobile      || "",
          address:     d.address     || "",
          preferences: d.preferences || "",
          bio:         d.bio         || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    await touristAPI.updateProfile(user.id, formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-20 flex flex-col items-center min-h-[calc(100vh-80px)]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-green-300 border-t-green-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <ProfileCard
              title="My Profile"
              subtitle="Keep your traveller profile up to date"
              avatarContent={user?.name?.[0]?.toUpperCase()}
              avatarGradient="from-green-500 to-teal-500"
              displayName={formData.name || user?.name}
              badgeText="Tourist"
              badgeColor="bg-green-100 text-green-700"
              accentBtn="bg-green-600 hover:bg-green-500"
              fields={FIELDS}
              textareaKey="bio"
              textareaLabel="Bio"
              textareaPlaceholder="Tell us a little about yourself..."
              formData={formData}
              onFormChange={handleChange}
              onSave={handleSave}
              saveLabel={saved ? "✓ Saved!" : "Save Changes"}
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
