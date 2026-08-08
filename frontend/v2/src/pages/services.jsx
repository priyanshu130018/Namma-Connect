import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowRight, FiCheck, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { Link, useNavigate } from "@/lib/router-compat";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const getUser = () => { try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; } };

const roles = [
  {
    key: "farmer",
    emoji: "🌾",
    title: "Register as Farmer",
    subtitle: "List your farm and host agri-tourism experiences",
    color: "bg-primary",
    bg: "bg-card",
    border: "border-primary/30",
    accent: "text-primary",
    badgeBg: "bg-primary/10",
    path: "/services/farmer/register",
    perks: ["List unlimited farm stays", "Receive verified tourist bookings", "Professional profile page", "Direct messaging with tourists", "Revenue tracking dashboard"],
    docs: ["Aadhaar Card", "Land ownership proof", "Farm photographs", "Bank account details"],
  },
  {
    key: "creator",
    emoji: "🎬",
    title: "Register as Creator",
    subtitle: "Partner with farms to create viral agri-content",
    color: "bg-primary",
    bg: "bg-card",
    border: "border-primary/30",
    accent: "text-primary",
    badgeBg: "bg-primary/10",
    path: "/services/creator/register",
    perks: ["Access to 1,200+ verified farms", "Free or subsidised farm stays", "Creator collab marketplace", "Content analytics dashboard", "Priority booking slots"],
    docs: ["Aadhaar Card", "Portfolio / Instagram link", "Channel/page statistics screenshot", "Bank account details"],
  },
];

export default function Services() {
  const user = getUser();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(null);

  const handleRegister = (role) => {
    if (!user) { navigate("/login?tab=signup"); return; }
    navigate(role.path);
  };

  return (
    <div className="bg-card min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 bg-surface">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block bg-primary/10 text-primary text-sm font-semibold px-4 py-2 rounded-full mb-5">
              🌿 Grow with Namma Connect
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-4">
              Join Our <span className="gradient-text">Ecosystem</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Whether you own farmland or a camera — there's a place for you on Namma Connect.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Role cards */}
      <section className="section-pad bg-card">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {roles.map((role, i) => (
            <motion.div key={role.key} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
              className={`rounded-2xl border ${role.border} ${role.bg} p-8 hover:shadow-sm transition-all duration-300`}
            >
              {/* Header */}
              <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${role.color} flex items-center justify-center text-3xl mb-5 shadow-md`}>
                {role.emoji}
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-1">{role.title}</h2>
              <p className="text-muted-foreground text-sm mb-6">{role.subtitle}</p>

              {/* Perks */}
              <ul className="space-y-2 mb-6">
                {role.perks.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm text-foreground">
                    <FiCheck className={`${role.accent} mt-0.5 flex-shrink-0`} size={15} />
                    {p}
                  </li>
                ))}
              </ul>

              {/* Documents accordion */}
              <button onClick={() => setExpanded(expanded === role.key ? null : role.key)}
                className="flex items-center justify-between w-full text-sm text-muted-foreground font-semibold py-3 border-t border-border"
              >
                Documents Required
                {expanded === role.key ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
              </button>
              <AnimatePresence>
                {expanded === role.key && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-1 mt-2 mb-4"
                  >
                    {role.docs.map(d => (
                      <li key={d} className={`text-xs ${role.accent} ${role.badgeBg} px-3 py-1.5 rounded-lg font-medium`}>{d}</li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>

              <button onClick={() => handleRegister(role)}
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl ${role.color} py-3.5 font-semibold text-primary-foreground transition-colors hover:opacity-90`}
              >
                Get Started <FiArrowRight />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Info strip */}
      <section className="py-12 px-6 bg-surface">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">Log in here</Link>
            {" "} · Questions?{" "}
            <Link to="/contact" className="text-primary font-semibold hover:underline">Contact us</Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
