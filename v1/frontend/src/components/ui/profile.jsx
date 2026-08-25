import { motion } from "framer-motion";
import { FiUser, FiEdit3, FiCheckCircle, FiShield, FiChevronRight, FiAlertCircle } from "react-icons/fi";

/**
 * ProfileHeader: The Identity Card section
 */
export function ProfileHeader({ name, role, stats = [], isEditing, onEdit, accentColor = "green" }) {
  const gradient = accentColor === "green" ? "from-green-400 to-emerald-600" : 
                   accentColor === "amber" ? "from-amber-400 to-orange-600" : 
                   "from-purple-400 to-indigo-600";
  
  const badgeBg = accentColor === "green" ? "bg-green-400/10 border-green-400/20 text-green-400" : 
                  accentColor === "amber" ? "bg-amber-400/10 border-amber-400/20 text-amber-400" : 
                  "bg-purple-400/10 border-purple-400/20 text-purple-400";

  return (
    <div className="bg-slate-900 rounded-[40px] p-10 text-white overflow-hidden relative shadow-2xl shadow-slate-900/40">
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className={`w-24 h-24 rounded-[32px] bg-gradient-to-br ${gradient} p-1 mb-6 shadow-xl rotate-3 transition-transform hover:rotate-0`}>
          <div className="w-full h-full rounded-[28px] bg-slate-900 flex items-center justify-center text-4xl font-black">
            {name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-tight mb-2 leading-tight">
          {name || "User"}
        </h1>
        <p className={`text-[10px] font-black uppercase tracking-[2px] mb-8 px-4 py-1.5 rounded-full border ${badgeBg}`}>
          {role || "Member"}
        </p>
        
        <div className="w-full grid grid-cols-2 gap-4 mt-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-4 text-center">
               <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{s.label}</p>
               <p className="text-xl font-black">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`absolute top-0 right-0 w-32 h-32 opacity-20 blur-3xl rounded-full ${accentColor === 'green' ? 'bg-green-500' : accentColor === 'amber' ? 'bg-amber-500' : 'bg-purple-500'}`} />
      <div className={`absolute bottom-0 left-0 w-48 h-48 opacity-10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2 ${accentColor === 'green' ? 'bg-emerald-500' : accentColor === 'amber' ? 'bg-orange-500' : 'bg-indigo-500'}`} />
    </div>
  );
}

/**
 * ProfileField: Standard input/view field
 */
export function ProfileField({ label, icon: Icon, value, onChange, placeholder, isEditing, type = "text", required = false, accentColor = "green", list }) {
  const focusRing = accentColor === "green" ? "focus:ring-green-500/10 focus:border-green-500" : 
                    accentColor === "amber" ? "focus:ring-amber-500/10 focus:border-amber-500" : 
                    "focus:ring-purple-500/10 focus:border-purple-500";
  
  const iconColor = accentColor === "green" ? "group-focus-within:text-green-500" : 
                    accentColor === "amber" ? "group-focus-within:text-amber-500" : 
                    "group-focus-within:text-purple-500";

  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} {required && "*"}</label>
      <div className="relative group">
        {Icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors ${isEditing ? iconColor : ""}`}>
            <Icon size={16} />
          </div>
        )}
        {isEditing ? (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            list={list}
            className={`w-full bg-slate-50 border border-slate-200 rounded-[20px] py-4 pr-5 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-300 shadow-sm ${Icon ? "pl-12" : "pl-5"} ${focusRing} focus:bg-white`}
          />
        ) : (
          <div className={`w-full bg-slate-50 border border-transparent rounded-[20px] py-4 pr-5 text-sm font-bold text-slate-700 ${Icon ? "pl-12" : "pl-5"}`}>
            {value || "—"}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PremiumField: Smaller label variation
 */
export function PremiumField({ label, value, onChange, placeholder, Icon, isEditing, accentColor="green", ...props }) {
    const focusRing = accentColor === "green" ? "focus:ring-green-500/10 focus:border-green-500" : 
                      accentColor === "amber" ? "focus:ring-amber-500/10 focus:border-amber-500" : 
                      "focus:ring-purple-500/10 focus:border-purple-500";
    
    const iconColor = accentColor === "green" ? "group-focus-within:text-green-500" : 
                      accentColor === "amber" ? "group-focus-within:text-amber-500" : 
                      "group-focus-within:text-purple-500";

    return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        {Icon && <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors ${isEditing ? iconColor : ""}`}><Icon size={14} /></span>}
        {isEditing ? (
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-3.5 text-[13px] font-bold text-slate-900 outline-none transition-all placeholder:text-slate-200 ${Icon ? "pl-11" : "px-4"} ${focusRing} focus:bg-white`}
            {...props}
          />
        ) : (
          <div className={`w-full bg-slate-50/50 border border-transparent rounded-2xl py-3.5 text-[13px] font-bold text-slate-700 ${Icon ? "pl-11" : "px-4"}`}>
            {value || "—"}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ProfileBio: Textarea/View toggle
 */
export function ProfileBio({ label, value, onChange, placeholder, isEditing, accentColor="green" }) {
    const focusRing = accentColor === "green" ? "focus:ring-green-500/10 focus:border-green-500" : 
                      accentColor === "amber" ? "focus:ring-amber-500/10 focus:border-amber-500" : 
                      "focus:ring-purple-500/10 focus:border-purple-500";

    return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      {isEditing ? (
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-slate-50 border border-slate-200 rounded-[30px] p-8 text-sm font-medium outline-none transition-all resize-none placeholder:text-slate-300 shadow-sm leading-relaxed ${focusRing} focus:bg-white`}
          rows={5}
        />
      ) : (
        <div className="bg-slate-50 border border-transparent rounded-[30px] p-8 text-sm font-medium text-slate-600 leading-relaxed min-h-[140px]">
          {value || "No information provided yet."}
        </div>
      )}
    </div>
  );
}

/**
 * ProfileActions: Edit/Save toggle
 */
export function ProfileActions({ isEditing, onEdit, submitting, error, saved, accentColor="green", editLabel="Edit Profile", saveLabel="Save Changes" }) {
  const btnColor = accentColor === "green" ? "text-green-400" : 
                   accentColor === "amber" ? "text-amber-400" : 
                   "text-purple-400";

  return (
    <div className="pt-12 flex flex-col items-center gap-6 w-full">
      {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-black flex items-center gap-2"><FiAlertCircle /> {error}</div>}
      
      {saved && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-emerald-600 text-sm font-black flex items-center gap-2 mb-2">
          <FiCheckCircle size={20} /> Success! Profile updated.
        </motion.div>
      )}

      {isEditing ? (
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <button
            type="submit"
            disabled={submitting}
            className="flex-[2] bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-[24px] text-base transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Processing..." : saveLabel}
            {!submitting && <FiCheckCircle size={18} className={btnColor} />}
          </button>
          
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-400 font-black py-5 rounded-[24px] text-base transition-all border border-slate-100 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700 font-black py-6 rounded-[28px] text-lg transition-all shadow-sm flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <FiEdit3 size={20} /> {editLabel}
        </button>
      )}
    </div>
  );
}
