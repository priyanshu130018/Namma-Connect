import { motion } from "framer-motion";
import { FiUser, FiEdit3, FiCheckCircle, FiShield, FiChevronRight, FiAlertCircle } from "react-icons/fi";

/**
 * ProfileHeader: The Identity Card section
 */
export function ProfileHeader({ name, role, stats = [], isEditing, onEdit, accentColor = "green" }) {
  const gradient = accentColor === "green" ? "from-primary to-primary" : 
                   accentColor === "amber" ? "from-primary to-primary" : 
 "from-primary to-primary";
  
  const badgeBg = accentColor === "green" ? "bg-primary/10 border-primary/30/20 text-primary" : 
                  accentColor === "amber" ? "bg-primary/10 border-primary/30/20 text-primary" : 
 "bg-primary/10 border-primary/30/20 text-primary";

  return (
    <div className="bg-foreground rounded-2xl p-10 text-primary-foreground overflow-hidden relative shadow-md">
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className={`w-24 h-24 rounded-2xl bg-linear-to-br ${gradient} p-1 mb-6 shadow-sm rotate-3 transition-transform hover:rotate-0`}>
          <div className="w-full h-full rounded-[28px] bg-foreground flex items-center justify-center text-4xl font-semibold">
            {name?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2 leading-tight">
          {name || "User"}
        </h1>
        <p className={`text-[10px] font-semibold uppercase tracking-[2px] mb-8 px-4 py-1.5 rounded-full border ${badgeBg}`}>
          {role || "Member"}
        </p>
        
        <div className="w-full grid grid-cols-2 gap-4 mt-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-card/5 border border-white/10 rounded-2xl p-4 text-center">
               <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{s.label}</p>
               <p className="text-xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={`absolute top-0 right-0 w-32 h-32 opacity-20 blur-3xl rounded-full ${accentColor === 'green' ? 'bg-primary' : accentColor === 'amber' ? 'bg-primary' : 'bg-primary'}`} />
      <div className={`absolute bottom-0 left-0 w-48 h-48 opacity-10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/2 ${accentColor === 'green' ? 'bg-primary' : accentColor === 'amber' ? 'bg-primary' : 'bg-primary'}`} />
    </div>
  );
}

/**
 * ProfileField: Standard input/view field
 */
export function ProfileField({ label, icon: Icon, value, onChange, placeholder, isEditing, type = "text", required = false, accentColor = "green", list }) {
  const focusRing = accentColor === "green" ? "focus:ring-primary/10 focus:border-primary/30" : 
                    accentColor === "amber" ? "focus:ring-primary/10 focus:border-primary/30" : 
 "focus:ring-primary/10 focus:border-primary/30";
  
  const iconColor = accentColor === "green" ? "group-focus-within:text-primary" : 
                    accentColor === "amber" ? "group-focus-within:text-primary" : 
 "group-focus-within:text-primary";

  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">{label} {required && "*"}</label>
      <div className="relative group">
        {Icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors ${isEditing ? iconColor : ""}`}>
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
            className={`w-full bg-surface border border-border rounded-[20px] py-4 pr-5 text-sm font-bold text-foreground outline-none transition-all placeholder:text-muted-foreground shadow-sm ${Icon ? "pl-12" : "pl-5"} ${focusRing} focus:bg-card`}
          />
        ) : (
          <div className={`w-full bg-surface border border-transparent rounded-[20px] py-4 pr-5 text-sm font-bold text-foreground ${Icon ? "pl-12" : "pl-5"}`}>
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
    const focusRing = accentColor === "green" ? "focus:ring-primary/10 focus:border-primary/30" : 
                      accentColor === "amber" ? "focus:ring-primary/10 focus:border-primary/30" : 
 "focus:ring-primary/10 focus:border-primary/30";
    
    const iconColor = accentColor === "green" ? "group-focus-within:text-primary" : 
                      accentColor === "amber" ? "group-focus-within:text-primary" : 
 "group-focus-within:text-primary";

    return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        {Icon && <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors ${isEditing ? iconColor : ""}`}><Icon size={14} /></span>}
        {isEditing ? (
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-surface/50 border border-border rounded-2xl py-3.5 text-[13px] font-bold text-foreground outline-none transition-all placeholder:text-muted-foreground ${Icon ? "pl-11" : "px-4"} ${focusRing} focus:bg-card`}
            {...props}
          />
        ) : (
          <div className={`w-full bg-surface/50 border border-transparent rounded-2xl py-3.5 text-[13px] font-bold text-foreground ${Icon ? "pl-11" : "px-4"}`}>
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
    const focusRing = accentColor === "green" ? "focus:ring-primary/10 focus:border-primary/30" : 
                      accentColor === "amber" ? "focus:ring-primary/10 focus:border-primary/30" : 
 "focus:ring-primary/10 focus:border-primary/30";

    return (
    <div className="space-y-2">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">{label}</label>
      {isEditing ? (
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-surface border border-border rounded-[30px] p-8 text-sm font-medium outline-none transition-all resize-none placeholder:text-muted-foreground shadow-sm leading-relaxed ${focusRing} focus:bg-card`}
          rows={5}
        />
      ) : (
        <div className="bg-surface border border-transparent rounded-[30px] p-8 text-sm font-medium text-muted-foreground leading-relaxed min-h-[140px]">
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
  const btnColor = accentColor === "green" ? "text-primary" : 
                   accentColor === "amber" ? "text-primary" : 
 "text-primary";

  return (
    <div className="pt-12 flex flex-col items-center gap-6 w-full">
      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-destructive text-xs font-semibold flex items-center gap-2"><FiAlertCircle /> {error}</div>}
      
      {saved && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-primary text-sm font-semibold flex items-center gap-2 mb-2">
          <FiCheckCircle size={20} /> Success! Profile updated.
        </motion.div>
      )}

      {isEditing ? (
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <button
            type="submit"
            disabled={submitting}
            className="flex-[2] bg-foreground hover:bg-foreground text-primary-foreground font-semibold py-5 rounded-[24px] text-base transition-all shadow-md flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Processing..." : saveLabel}
            {!submitting && <FiCheckCircle size={18} className={btnColor} />}
          </button>
          
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 bg-surface hover:bg-muted text-muted-foreground font-semibold py-5 rounded-[24px] text-base transition-all border border-border flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="w-full bg-card border-2 border-border hover:border-border hover:bg-surface text-foreground font-semibold py-6 rounded-[28px] text-lg transition-all shadow-sm flex items-center justify-center gap-3 active:scale-[0.98]"
        >
          <FiEdit3 size={20} /> {editLabel}
        </button>
      )}
    </div>
  );
}
