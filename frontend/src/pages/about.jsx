import { motion } from "framer-motion";
import { FiArrowRight, FiHeart, FiTarget, FiEye, FiUsers, FiMapPin, FiCamera, FiCalendar } from "react-icons/fi";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const fadeUp = { hidden: { opacity: 0, y: 25 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

const values = [
  { icon: <FiHeart size={22} />, title: "Community First", desc: "Every decision we make centers on the wellbeing of farmers, tourists, and creators.", color: "bg-rose-100 text-rose-600" },
  { icon: <FiTarget size={22} />, title: "Authentic Experiences", desc: "We verify every farm listing to ensure genuine, safe agri-tourism experiences.", color: "bg-amber-100 text-amber-600" },
  { icon: <FiEye size={22} />, title: "Radical Transparency", desc: "No hidden fees, no fake reviews. Full transparency end to end.", color: "bg-blue-100 text-blue-600" },
  { icon: <FiUsers size={22} />, title: "Inclusive Growth", desc: "We uplift rural economies by connecting small farmers with urban travellers.", color: "bg-green-100 text-green-600" },
];

const timeline = [
  { year: "2025", title: "The Idea", desc: "Founded after a chance weekend at a coffee estate in Coorg. We saw the gap." },
  { year: "2025", title: "First 100 Farms", desc: "Launched in Karnataka with 100 verified farm listings and 2,000 tourists." },
  { year: "2025", title: "Creators Join", desc: "Opened the Creator program — 300+ creators joined in the first month." },
  { year: "2025", title: "All India", desc: "Now live in 18 states with 1,200+ farms and 45,000+ happy tourists." },
];

const team = [
  { name: "Priyanshu Verma", role: "Co-Founder & CEO", emoji: "🧑‍🌾" },
  { name: "Saket Kumar", role: "Co-Founder & CTO", emoji: "👩‍💻" },
  { name: "Sahana G Bhat", role: "Head of Operations", emoji: "🧑‍💼" },
  { name: "Vishal Malik", role: "Head of Creator Relations", emoji: "🎬" },
];

export default function About() {
  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-green-600 to-emerald-700 relative overflow-hidden">
        <div className="orb w-96 h-96 bg-white top-0 -right-32" style={{ opacity: 0.08 }} />
        <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-4xl mx-auto text-center relative z-10">
          <motion.span variants={fadeUp} className="inline-block bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full mb-5">
            🌿 Our Story
          </motion.span>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl font-black text-white mb-5">
            Built for India's <br /> Farming Heartland
          </motion.h1>
          <motion.p variants={fadeUp} className="text-green-100 text-xl leading-relaxed max-w-2xl mx-auto">
            NammaGig was born from a belief that the best travel experiences grow from the ground — literally.
          </motion.p>
        </motion.div>
      </section>

      {/* Mission & Vision */}
      <section className="section-pad bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          {[
            { label: "Our Mission", icon: <FiTarget className="text-green-600" size={24} />, text: "To bridge the gap between urban travellers and rural farmers by making agri-tourism accessible, affordable, and authentic for every Indian." },
            { label: "Our Vision", icon: <FiEye className="text-emerald-600" size={24} />, text: "A future where every Indian farm is a destination — and every farmer is an entrepreneur powered by tourism and content creation." },
          ].map(v => (
            <motion.div key={v.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-slate-50 rounded-3xl p-8 border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-4">{v.icon}<h3 className="font-black text-slate-900 text-xl">{v.label}</h3></div>
              <p className="text-slate-600 leading-relaxed">{v.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="section-pad bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="section-heading text-center mb-3">What We Stand For</h2>
          <p className="section-sub text-center mb-12">Our values guide every decision.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
              >
                <div className={`w-12 h-12 rounded-xl ${v.color} flex items-center justify-center mb-4`}>{v.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{v.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-pad bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="section-heading text-center mb-3">How NammaGig Works</h2>
          <p className="section-sub text-center mb-12">A simple ecosystem with a big impact.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: <FiMapPin size={20} />, title: "Tourists Browse", desc: "Discover verified farms by location, crop type, and activities.", color: "bg-blue-50 text-blue-600 border-blue-200" },
              { icon: <FiCalendar size={20} />, title: "Farmers Host", desc: "List experiences, receive bookings, earn from rural tourism.", color: "bg-amber-50 text-amber-600 border-amber-200" },
              { icon: <FiCamera size={20} />, title: "Creators Capture", desc: "Partner with farms, create content, build audiences together.", color: "bg-purple-50 text-purple-600 border-purple-200" },
            ].map((item) => (
              <motion.div key={item.title} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className={`rounded-2xl p-6 border ${item.color} text-center`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${item.color}`}>{item.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-pad bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="section-heading text-center mb-12">Our Journey</h2>
          <div className="space-y-6">
            {timeline.map((t, i) => (
              <motion.div key={t.year} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="flex gap-6 items-start"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center text-white font-black text-sm">{t.year}</div>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 flex-1 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-1">{t.title}</h3>
                  <p className="text-slate-500 text-sm">{t.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section-pad bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="section-heading mb-12">Meet the Team</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {team.map((m, i) => (
              <motion.div key={m.name} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-200"
              >
                <span className="text-5xl block mb-3">{m.emoji}</span>
                <p className="font-bold text-slate-900 text-sm">{m.name}</p>
                <p className="text-slate-500 text-xs mt-1">{m.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-pad bg-green-600">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">Be Part of the Story</h2>
          <p className="text-green-100 mb-8">Join 45,000+ travellers exploring India one farm at a time.</p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-8 py-4 rounded-xl hover:bg-green-50 transition-all hover:-translate-y-1 shadow-lg">
            Get Started <FiArrowRight />
          </Link>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
