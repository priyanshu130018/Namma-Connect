import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight, FiStar, FiUsers, FiMapPin, FiPlay,
  FiCamera, FiTruck, FiHeart, FiFeather, FiSearch
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import heroImg from "@/assets/images/img-0.jpg";
import { searchAPI } from "@/services/api";

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { show: { transition: { staggerChildren: 0.12 } } };

const services = [
  { icon: <FiMapPin size={28} />, title: "Farm Stays", desc: "Spend nights surrounded by paddy fields, coffee estates, and mango groves.", color: "bg-green-100 text-green-600" },
  { icon: <FiCamera size={28} />, title: "Creator Collabs", desc: "Partner with local content creators for authentic, viral agri-content.", color: "bg-amber-100 text-amber-600" },
  { icon: <FiTruck size={28} />, title: "Field Tours", desc: "Join guided farm walks, harvest festivals, and seasonal agri-activities.", color: "bg-blue-100 text-blue-600" },
  { icon: <FiHeart size={28} />, title: "Wishlist Trips", desc: "Build your dream agri-itinerary and save farms to visit later.", color: "bg-rose-100 text-rose-600" },
];

const steps = [
  { num: "01", title: "Choose a Farm", desc: "Browse verified farms by crop, region, and activity type." },
  { num: "02", title: "Book Instantly", desc: "Secure your stay with easy payments — no hidden fees." },
  { num: "03", title: "Experience & Share", desc: "Go, harvest, eat, create — and share your journey." },
];

const stats = [
  { value: "1,200+", label: "Farms Listed" },
  { value: "45K+", label: "Happy Tourists" },
  { value: "320+", label: "Content Creators" },
  { value: "18", label: "States Covered" },
];

const blogs = [
  { tag: "Coffee", title: "A Week in Coorg: Harvest, Coffee & Connection", author: "Ravi M.", readTime: "5 min", img: "☕" },
  { tag: "Organic", title: "Spiti Valley Farms: The Coldest Agri-Adventure", author: "Priya S.", readTime: "7 min", img: "🏔️" },
  { tag: "Rice", title: "Paddy Trails of Kerala: Getting Your Feet Wet", author: "Arjun K.", readTime: "4 min", img: "🌾" },
];

const reviews = [
  { name: "Anjali R.", role: "Tourist", text: "Staying on a coffee farm in Coorg was life-changing. NammaGig made it effortless!", rating: 5 },
  { name: "Karthik M.", role: "Farmer", text: "Tourists from the city found joy in our paddy fields. It's great for the community.", rating: 5 },
  { name: "Sneha P.", role: "Creator", text: "My reel from a Munnar tea estate got 2M views. NammaGig opened a new world for me.", rating: 5 },
];

export default function Landing() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recs, setRecs] = useState({ farmers: [], creators: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecs() {
      try {
        const data = await searchAPI.getRecommendations();
        setRecs(data);
      } catch (err) {
        console.error("Failed to fetch recommendations", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecs();
  }, []);

  const handleSearch = () => {
    navigate(`/home?q=${query}&start=${startDate}&end=${endDate}`);
  };

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      {/* ── Hero ── */}
      <section className="min-h-screen flex items-center relative overflow-hidden pt-20">
        <div className="orb w-[600px] h-[600px] bg-green-400 -top-40 -right-32" />
        <div className="orb w-[400px] h-[400px] bg-emerald-300 bottom-0 -left-20" />
        <div className="orb w-[300px] h-[300px] bg-amber-300 top-1/2 right-1/4" />

        <div className="max-w-7xl mx-auto px-6 w-full py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-green-100 border border-green-300 rounded-full px-4 py-2 text-sm text-green-700 font-semibold mb-6">
                🌿 India's #1 Agri-Tourism Platform
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 leading-tight mb-6">
                Find Your <span className="gradient-text">New</span> {" "}
                <span className="gradient-text">Escape</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-slate-500 text-lg md:text-xl leading-relaxed mb-10 max-w-lg">
                Connect with real farmers, stay on working farms, and create content that tells India's agricultural story — all in one place.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 mb-8">
                <Link to="/home" className="btn-primary flex items-center gap-2 text-base px-8 py-4">
                  Explore Farms <FiArrowRight />
                </Link>
                <Link to="/about" className="btn-outline flex items-center gap-2 text-base px-8 py-4">
                  <FiPlay size={15} /> About us
                </Link>
              </motion.div>
            </motion.div>

            {/* ── Right side hero visual ── */}
            <motion.div
              initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative hidden lg:flex items-center justify-center"
            >
              {/* Main card */}
              <div className="relative w-[420px] h-[480px]">

                {/* Big farm photo card */}
                <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/60">
                  <img
                    src={heroImg}
                    alt="Beautiful Indian farm landscape"
                    className="w-full h-full object-cover"
                  />
                  {/* Bottom gradient overlay for label readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-[2.5rem]" />
                  {/* Location label */}
                  <div className="absolute bottom-8 left-0 right-0 text-white text-center px-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-green-300 mb-1">📍 Featured Farm</p>
                    <p className="font-black text-xl drop-shadow-lg">India's Finest Agri-Stays</p>
                  </div>
                </div>

                {/* Floating stat chips */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, repeat: Infinity, repeatType: "reverse", repeatDelay: 3, duration: 1 }}
                  className="absolute -top-4 -left-8 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 border border-slate-100"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-xl">🌾</div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Farms Listed</p>
                    <p className="text-lg font-black text-slate-900">1,200+</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, repeat: Infinity, repeatType: "reverse", repeatDelay: 2.5, duration: 1 }}
                  className="absolute -bottom-6 -right-8 bg-white rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 border border-slate-100"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">😊</div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Happy Tourists</p>
                    <p className="text-lg font-black text-slate-900">45K+</p>
                  </div>
                </motion.div>

                {/* Crop type badges — floating on right */}
                <div className="absolute -right-5 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                  {[["☕","Coffee"],["🍃","Tea"],["🌶️","Spices"],["🥭","Mango"]].map(([e,l]) => (
                    <motion.div key={l}
                      initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + Math.random() * 0.5 }}
                      className="bg-white/90 backdrop-blur border border-slate-100 rounded-xl shadow-md px-3 py-2 flex items-center gap-2 text-xs font-bold text-slate-700"
                    >
                      <span>{e}</span>{l}
                    </motion.div>
                  ))}
                </div>

                {/* Decorative ring */}
                <div className="absolute -inset-6 rounded-[3rem] border-2 border-dashed border-green-200 -z-10 animate-spin" style={{animationDuration:"30s"}} />
                <div className="absolute -inset-12 rounded-[4rem] border border-green-100 -z-10" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="section-pad bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="section-heading">Everything You Need</h2>
            <p className="section-sub">One platform. Endless farm adventures.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center mb-4`}>{s.icon}</div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section-pad bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="section-heading mb-3">
            How It Works
          </motion.h2>
          <p className="section-sub mb-14">Simple steps, unforgettable experiences</p>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }} viewport={{ once: true }}
                className="relative"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                  <span className="font-black text-white text-xl">{s.num}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-xl mb-3">{s.title}</h3>
                <p className="text-slate-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Planner Mockup ── */}
      <section className="section-pad bg-green-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-2 text-white text-sm font-semibold mb-6">
              <FiFeather className="text-yellow-300" /> Powered by AI
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Your AI Farm Trip Planner</h2>
            <p className="text-green-100 text-lg mb-10">Tell us what you love — we'll plan the perfect agri-getaway.</p>
            <div className="bg-white rounded-3xl p-6 shadow-2xl text-left max-w-2xl mx-auto border border-green-100">
              {[
                { role: "user", msg: "I want a peaceful 3-day farm stay in South India for 2 people." },
                { role: "ai", msg: "✨ Great choice! How about a coffee harvest experience in Coorg (Day 1–2) followed by a tea estate walk in Ooty (Day 3)? Budget: ~₹8,500 total." },
              ].map(({ role, msg }) => (
                <div key={msg} className={`flex gap-3 mb-4 ${role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${role === "ai" ? "bg-green-600 text-white" : "bg-slate-800 text-white"}`}>
                    {role === "ai" ? "NG" : "Me"}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm max-w-xs md:max-w-sm ${role === "ai" ? "bg-green-50 text-slate-700 border border-green-200" : "bg-slate-900 text-white ml-auto"}`}>
                    {msg}
                  </div>
                </div>
              ))}
              <Link to="/ai-planner" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                Try AI Planner <FiArrowRight />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Recommendations ── */}
      <section className="section-pad bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="section-heading text-left">Recommended Escapes</h2>
              <p className="section-sub text-left">Hand-picked farms for your next visit.</p>
            </motion.div>
            <Link to="/home" className="text-green-600 font-bold flex items-center gap-1 hover:gap-2 transition-all">
              View All <FiArrowRight />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {(loading ? [1, 2, 3] : recs.farmers.slice(0, 3)).map((item, i) => (
              <motion.div key={item.id || i}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                whileHover={{ y: -10 }}
                className="group relative rounded-[2.5rem] bg-slate-50 border border-slate-100 overflow-hidden hover:shadow-2xl transition-all h-[400px]"
              >
                {loading ? (
                   <div className="h-full w-full bg-slate-200 animate-pulse" />
                ) : (
                  <>
                    <div className="h-full w-full bg-slate-100 relative">
                       {/* Placeholder for farm photo if available */}
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex flex-col justify-end p-8 text-white">
                        <div className="flex items-center gap-1 text-amber-400 mb-2">
                          <FiStar fill="currentColor" size={14} /> {item.rating || "4.9"} (120 reviews)
                        </div>
                        <h3 className="text-2xl font-black mb-1">{item.name}</h3>
                        <p className="text-sm text-slate-200 flex items-center gap-1 mb-4"><FiMapPin size={12} /> {item.area || item.state}</p>
                        <div className="flex gap-2">
                          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">Stay</span>
                          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">{item.crop_types || "Agri"}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="section-pad bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-4xl font-black gradient-text mb-2">{s.value}</p>
                <p className="text-slate-500 text-sm font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Blogs ── */}
      <section className="section-pad bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="section-heading">From The Farm</h2>
              <p className="section-sub">Stories, tips & travel diaries</p>
            </div>
            <Link to="/blog" className="text-green-600 text-sm font-semibold hover:underline flex items-center gap-1">
              View All <FiArrowRight size={14} />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {blogs.map((b, i) => (
              <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                whileHover={{ y: -6 }}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="h-40 bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center text-6xl">{b.img}</div>
                <div className="p-6">
                  <span className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full">{b.tag}</span>
                  <h3 className="font-bold text-slate-900 mt-3 mb-2 leading-snug">{b.title}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{b.author}</span><span>{b.readTime} read</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="section-pad bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="section-heading">Loved by All</h2>
            <p className="section-sub">Tourists, farmers, and creators all agree</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Arun K.", role: "Tourist", text: "Best farm stay experience I've ever had. Truly peaceful and authentic.", rating: 5 },
              { name: "Priya S.", role: "Creator", text: "Amazing opportunities to capture rural India. The hosts are so welcoming.", rating: 5 },
              { name: "Ravi G.", role: "Farmer", text: "Developing my farm as a stay has doubled my income. Namma Gig is a blessing.", rating: 5 }
            ].map((r, i) => (
              <motion.div key={r.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }} viewport={{ once: true }}
                className="bg-slate-50 rounded-3xl p-6 border border-slate-200"
              >
                <div className="flex gap-0.5 mb-4">{[...Array(r.rating)].map((_, j) => <FiStar key={j} className="text-amber-400 fill-amber-400" size={16} />)}</div>
                <p className="text-slate-600 leading-relaxed mb-6 italic">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">{r.name[0]}</div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{r.name}</p>
                    <p className="text-slate-400 text-xs">{r.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-pad bg-gradient-to-br from-green-600 to-emerald-700">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Ready to Find Your Farm?</h2>
          <p className="text-green-100 text-lg mb-10">Create an account and start exploring India's most beautiful farming regions.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/login" className="bg-white text-green-700 font-bold px-8 py-4 rounded-xl hover:bg-green-50 transition-all hover:shadow-xl hover:-translate-y-1 flex items-center gap-2">
              Get Started <FiArrowRight />
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
