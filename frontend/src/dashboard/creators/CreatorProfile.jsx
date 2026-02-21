import { useState, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import ProfileCard from "@/components/ui/profile";
import { FiInstagram, FiYoutube, FiLink, FiMapPin } from "react-icons/fi";
import { creatorAPI } from "@/services/api";

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

const FIELDS = [
  { label: "Display Name",        key: "name"      },
  { label: "Content Niche",       key: "niche"     },
  { label: "State",               key: "state", icon: <FiMapPin size={14} />    },
  { label: "Instagram Handle",    key: "instagram", icon: <FiInstagram size={14} /> },
  { label: "YouTube Channel",     key: "youtube",   icon: <FiYoutube size={14} />   },
  { label: "Portfolio / Website", key: "portfolio", icon: <FiLink size={14} />      },
];

export default function CreatorProfile() {
  const user = getUser();
  const [formData, setFormData] = useState({
    name: user?.name || "", niche: "", state: "",
    instagram: "", youtube: "", portfolio: "", bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // ── Fetch real profile from backend on mount ───────────────────────────────
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    creatorAPI.getProfile(user.id)
      .then(res => {
        const d = res.data;
        setFormData({
          name:      d.name      || user?.name || "",
          niche:     d.niche     || "",
          state:     d.state     || "",
          instagram: d.instagram || "",
          youtube:   d.youtube   || "",
          portfolio: d.portfolio || "",
          bio:       d.bio       || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    await creatorAPI.updateProfile(user.id, formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-20 flex justify-center min-h-[calc(100vh-80px)]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : (
          <ProfileCard
            title="Creator Profile"
            subtitle="Your public creator page seen by farms & tourists"
            avatarContent={user?.name?.[0]?.toUpperCase()}
            avatarGradient="from-purple-500 to-violet-600"
            displayName={formData.name || user?.name}
            badgeText="Content Creator"
            badgeColor="bg-purple-100 text-purple-700"
            accentBtn="bg-purple-600 hover:bg-purple-500"
            fields={FIELDS}
            textareaKey="bio"
            textareaLabel="Bio"
            textareaPlaceholder="Tell farms & tourists about yourself..."
            formData={formData}
            onFormChange={handleChange}
            onSave={handleSave}
            saveLabel={saved ? "✓ Saved!" : "Save Changes"}
            gridCols
          />
        )}
      </div>
      <Footer />
    </div>
  );
}
