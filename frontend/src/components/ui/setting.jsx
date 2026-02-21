import { useState } from "react";
import { motion } from "framer-motion";
import { FiBell, FiLock, FiTrash2, FiGlobe } from "react-icons/fi";

/**
 * SettingPanel — generic settings UI
 *
 * Props:
 *  title          string   Page heading
 *  subtitle       string   Subheading
 *  accentColor    string   Tailwind colour token ("green" | "amber" | "purple")
 *  notifLabels    array    [{ label, key }] — notification toggle rows
 *  dangerText     string   Description for the danger zone
 *  showLanguage   bool     Show language selector (default: false)
 */
export default function SettingPanel({
  title = "Settings",
  subtitle = "Manage your account preferences",
  accentColor = "green",
  notifLabels = [
    { label: "Email Alerts", key: "email" },
    { label: "SMS Alerts",   key: "sms"   },
    { label: "Offers & Deals", key: "offers" },
  ],
  dangerText = "Permanently delete your account. This action cannot be undone.",
  showLanguage = false,
}) {
  const initNotifs = Object.fromEntries(notifLabels.map(({ key }, i) => [key, i === 0]));
  const [notifs, setNotifs] = useState(initNotifs);
  const [pw, setPw]     = useState({ current: "", new: "", confirm: "" });
  const [lang, setLang] = useState("English");

  const accent = {
    green:  { toggle: "bg-green-500",  icon: "bg-green-100 text-green-600",   btn: "btn-primary" },
    amber:  { toggle: "bg-amber-500",  icon: "bg-amber-100 text-amber-600",   btn: "btn-amber"   },
    purple: { toggle: "bg-purple-500", icon: "bg-purple-100 text-purple-600", btn: "bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all" },
  }[accentColor] ?? { toggle: "bg-green-500", icon: "bg-green-100 text-green-600", btn: "btn-primary" };

  const Toggle = ({ on, onChange }) => (
    <button onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full relative transition-all ${on ? accent.toggle : "bg-slate-200"}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
        <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.icon}`}><FiBell size={18} /></div>
          <h2 className="font-bold text-slate-900">Notifications</h2>
        </div>
        <div className="space-y-4">
          {notifLabels.map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-slate-700 text-sm">{label}</span>
              <Toggle on={notifs[key]} onChange={v => setNotifs(p => ({ ...p, [key]: v }))} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Password */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
      >
        <button className={accent.btn}>Change Password</button>
      </motion.div>

      {/* Language (optional) */}
      {showLanguage && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600"><FiGlobe size={18} /></div>
            <h2 className="font-bold text-slate-900">Language &amp; Region</h2>
          </div>
          <select value={lang} onChange={e => setLang(e.target.value)} className="input-field text-sm">
            {["English", "हिंदी", "ಕನ್ನಡ", "മലയാളം", "தமிழ்", "తెలుగు"].map(l => <option key={l}>{l}</option>)}
          </select>
        </motion.div>
      )}

      {/* Danger zone */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        className="bg-red-50 rounded-2xl p-6 border border-red-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600"><FiTrash2 size={18} /></div>
          <h2 className="font-bold text-red-700">Danger Zone</h2>
        </div>
        <p className="text-slate-500 text-sm mb-4">{dangerText}</p>
        <button className="border border-red-400 text-red-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-red-100 transition-colors">
          Delete Account
        </button>
      </motion.div>
    </div>
  );
}
