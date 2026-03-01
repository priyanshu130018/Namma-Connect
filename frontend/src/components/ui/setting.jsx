import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiBell, FiLock, FiTrash2, FiGlobe, FiEye, FiEyeOff, FiX, FiAlertTriangle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/services/api";

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

/**
 * SettingPanel — generic settings UI (centered, with working buttons)
 *
 * Props:
 *  title          string   Page heading
 *  subtitle       string   Subheading
 *  accentColor    string   "green" | "amber" | "purple"
 *  notifLabels    array    [{ label, key }]
 *  dangerText     string   Description for the danger zone
 *  showLanguage   bool     Show language selector
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
  const navigate = useNavigate();
  const user = getUser();

  const initNotifs = Object.fromEntries(notifLabels.map(({ key }, i) => [key, i === 0]));
  const [notifs, setNotifs] = useState(initNotifs);
  const [lang, setLang] = useState("English");

  // Change Password modal state
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm]           = useState({ current: "", newPw: "", confirm: "" });
  const [showCurr, setShowCurr]       = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [pwLoading, setPwLoading]     = useState(false);
  const [pwMsg, setPwMsg]             = useState(null); // { type: "success"|"error", text }

  // Delete Account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm]     = useState("");
  const [deleteLoading, setDeleteLoading]     = useState(false);
  const [deleteMsg, setDeleteMsg]             = useState(null);

  const accent = {
    green:  { toggle: "bg-green-500",  icon: "bg-green-100 text-green-600",   btn: "bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all" },
    amber:  { toggle: "bg-amber-500",  icon: "bg-amber-100 text-amber-600",   btn: "bg-amber-500 hover:bg-amber-400 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all" },
    purple: { toggle: "bg-purple-500", icon: "bg-purple-100 text-purple-600", btn: "bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all" },
  }[accentColor] ?? { toggle: "bg-green-500", icon: "bg-green-100 text-green-600", btn: "bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all" };

  const Toggle = ({ on, onChange }) => (
    <button onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full relative transition-all ${on ? accent.toggle : "bg-slate-200"}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );

  // ── Change Password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!pwForm.newPw || pwForm.newPw.length < 6) {
      setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    setPwLoading(true);
    try {
      if (user?.userId) {
        // Authenticated path: verify current password on backend
        await authAPI.changePasswordAuth(user.userId, {
          identifier: pwForm.current,  // treated as current password
          new_password: pwForm.newPw,
        });
      } else {
        // Fallback: use email-based reset
        await authAPI.changePassword({
          identifier: user?.email || "",
          new_password: pwForm.newPw,
        });
      }
      setPwMsg({ type: "success", text: "Password changed successfully!" });
      setPwForm({ current: "", newPw: "", confirm: "" });
      setTimeout(() => { setShowPwModal(false); setPwMsg(null); }, 2000);
    } catch (err) {
      setPwMsg({ type: "error", text: err.response?.data?.detail || "Failed to change password." });
    } finally {
      setPwLoading(false);
    }
  };

  // ── Delete Account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      setDeleteMsg({ type: "error", text: 'Type "DELETE" to confirm.' });
      return;
    }
    setDeleteLoading(true);
    try {
      await authAPI.deleteAccount(user.userId);
      localStorage.removeItem("ng_token");
      localStorage.removeItem("ng_user");
      navigate("/login");
    } catch (err) {
      setDeleteMsg({ type: "error", text: err.response?.data?.detail || "Failed to delete account." });
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {/* ── Main Settings Panel ── */}
      <div className="w-full max-w-xl mx-auto px-4 space-y-6">
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

        {/* Change Password */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.icon}`}><FiLock size={18} /></div>
            <div>
              <h2 className="font-bold text-slate-900">Security</h2>
              <p className="text-slate-400 text-xs">Manage your login credentials</p>
            </div>
          </div>
          <button onClick={() => { setShowPwModal(true); setPwMsg(null); }} className={accent.btn}>
            Change Password
          </button>
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

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="bg-red-50 rounded-2xl p-6 border border-red-200"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600"><FiTrash2 size={18} /></div>
            <h2 className="font-bold text-red-700">Danger Zone</h2>
          </div>
          <p className="text-slate-500 text-sm mb-4">{dangerText}</p>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteConfirm(""); setDeleteMsg(null); }}
            className="border border-red-400 text-red-600 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-red-100 transition-colors"
          >
            Delete Account
          </button>
        </motion.div>
      </div>

      {/* ── Change Password Modal ── */}
      <AnimatePresence>
        {showPwModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) setShowPwModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900">Change Password</h2>
                <button onClick={() => setShowPwModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <FiX size={20} />
                </button>
              </div>

              {pwMsg && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${
                  pwMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
                }`}>
                  {pwMsg.text}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurr ? "text" : "password"}
                      value={pwForm.current}
                      onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                      placeholder="Your current password"
                      className="input-field text-sm pr-10"
                    />
                    <button type="button" onClick={() => setShowCurr(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showCurr ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={pwForm.newPw}
                      onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                      placeholder="Min. 6 characters"
                      className="input-field text-sm pr-10"
                    />
                    <button type="button" onClick={() => setShowNew(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNew ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                    placeholder="Re-enter new password"
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowPwModal(false)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all text-sm">
                  Cancel
                </button>
                <button onClick={handleChangePassword} disabled={pwLoading} className={`flex-1 ${accent.btn} py-3 disabled:opacity-60`}>
                  {pwLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Account Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-red-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
                  <FiAlertTriangle size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Delete Account</h2>
                  <p className="text-red-500 text-xs font-bold">This cannot be undone!</p>
                </div>
              </div>

              <p className="text-slate-500 text-sm mb-5">
                All your data including profile, listings, and bookings will be <strong>permanently deleted</strong>. 
                Type <span className="font-black text-red-600">DELETE</span> below to confirm.
              </p>

              {deleteMsg && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${
                  deleteMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"
                }`}>
                  {deleteMsg.text}
                </div>
              )}

              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="input-field text-sm mb-4 border-red-200 focus:ring-red-200"
              />

              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirm !== "DELETE"}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteLoading ? "Deleting..." : "Delete Forever"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
