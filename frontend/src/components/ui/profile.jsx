import { useState } from "react";
import { motion } from "framer-motion";
import { FiEdit2, FiSave } from "react-icons/fi";

/**
 * ProfileCard — generic editable profile UI
 *
 * Props:
 *  title       string       Page heading  ("Farm Profile" / "My Profile" / "Creator Profile")
 *  subtitle    string       Subheading text
 *  avatarContent ReactNode  Emoji or letter shown inside the avatar square
 *  avatarGradient string    Tailwind gradient classes for the avatar
 *  displayName  string      Name shown under the avatar
 *  badgeText    string      Role badge text
 *  badgeColor   string      Tailwind classes for the badge  ("bg-green-100 text-green-700" etc.)
 *  accentBtn    string      Tailwind classes for the primary button
 *  fields      array        [{ label, key, icon?, type?, placeholder? }]
 *  textareaKey  string      Key in formData that maps to the textarea (bio / description)
 *  textareaLabel string     Label for the textarea field
 *  textareaPlaceholder string
 *  formData    object       Controlled form state from parent
 *  onFormChange fn(key,val) called when any field changes
 *  onSave      async fn()   called when Save is clicked; parent owns the API call
 *  gridCols    bool         If true, renders fields in a 2-col grid (default: stack)
 */
export default function ProfileCard({
  title, subtitle,
  avatarContent, avatarGradient = "from-green-500 to-teal-500",
  displayName, badgeText, badgeColor = "bg-green-100 text-green-700",
  accentBtn = "bg-green-600 hover:bg-green-500",
  fields = [],
  textareaKey, textareaLabel, textareaPlaceholder,
  formData, onFormChange, onSave,
  gridCols = false,
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (onSave) await onSave();
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </motion.div>

      {saved && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm"
        >✅ Profile saved!</motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm"
      >
        {/* Avatar + name */}
        <div className="flex items-center gap-5 mb-8">
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-3xl font-black text-white flex-shrink-0`}>
            {avatarContent}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">{displayName}</h2>
            <span className={`text-xs px-3 py-1 rounded-full font-bold ${badgeColor}`}>{badgeText}</span>
          </div>
        </div>

        {/* Fields */}
        <div className={`${gridCols ? "grid sm:grid-cols-2 gap-4" : "space-y-4"} mb-4`}>
          {fields.map(({ label, key, icon, type = "text", placeholder = "" }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">{label}</label>
              <div className="relative">
                {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{icon}</span>}
                <input
                  type={type}
                  disabled={!editing}
                  value={formData[key] ?? ""}
                  placeholder={placeholder}
                  onChange={e => onFormChange(key, e.target.value)}
                  className={`input-field text-sm ${icon ? "pl-9" : ""} ${!editing ? "opacity-60 cursor-default" : ""}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Textarea */}
        {textareaKey && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-500 block mb-1.5">{textareaLabel}</label>
            <textarea
              disabled={!editing} rows={3}
              value={formData[textareaKey] ?? ""}
              placeholder={textareaPlaceholder}
              onChange={e => onFormChange(textareaKey, e.target.value)}
              className={`input-field resize-none text-sm ${!editing ? "opacity-60 cursor-default" : ""}`}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className={`${accentBtn} text-white font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm shadow-md`}
            >
              <FiEdit2 size={14} /> Edit Profile
            </button>
          ) : (
            <>
              <button onClick={() => setEditing(false)} className="btn-outline text-sm py-2.5">Cancel</button>
              <button onClick={handleSave} disabled={loading}
                className={`${accentBtn} text-white font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm shadow-md disabled:opacity-60`}
              >
                {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <FiSave size={14} />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
