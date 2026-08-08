import { useState, useEffect } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import {
  FiArrowRight, FiStar, FiUsers, FiMapPin, FiPlay,
  FiCamera, FiTruck, FiHeart, FiFeather, FiSearch, FiCheckCircle,
  FiBarChart2, FiZap
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import heroImg from "@/assets/images/img-0.jpg";
import { searchAPI } from "@/services/api";

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { show: { transition: { staggerChildren: 0.12 } } };

const services = [
  {
    icon: <FiMapPin size={24} />, title: "Farm Stays & Experiences", audience: "For Tourists",
    desc: "Book verified farm stays, guided field tours and harvest activities across India.",
    points: ["Verified farm listings", "Instant booking & payments", "Reviews, wishlist & trip planner"],
  },
  {
    icon: <FiTruck size={24} />, title: "List Your Farm", audience: "For Farmers",
    desc: "Turn your farm into a destination — host guests, activities and seasonal events.",
    points: ["Listing & availability manager", "Booking requests dashboard", "Revenue & weather insights"],
  },
  {
    icon: <FiCamera size={24} />, title: "Creator Collaborations", audience: "For Creators",
    desc: "Partner with farms and brands to produce authentic agri-content that pays.",
    points: ["Portfolio & brand deals", "Collab requests from farms", "Earnings & analytics"],
  },
  {
    icon: <FiHeart size={24} />, title: "AI Trip Planner", audience: "For Everyone",
    desc: "Tell our AI what you love and get a complete agri-getaway itinerary in seconds.",
    points: ["Personalised itineraries", "Smart farm matching", "Packing checklist included"],
  },
  {
    icon: <FiZap size={24} />, title: "Smart Recommendations", audience: "For Everyone",
    desc: "The platform learns what you enjoy and surfaces farms, activities and creators to match.",
    points: ["Match-score on every listing", "Seasonal & nearby suggestions", "Budget-aware picks"],
  },
  {
    icon: <FiBarChart2 size={24} />, title: "Analytics & Insights", audience: "For Hosts",
    desc: "Farmers and creators get clear dashboards on bookings, revenue and audience growth.",
    points: ["Revenue & occupancy charts", "Demand and weather signals", "Exportable reports"],
  },
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
  { name: "Anjali R.", role: "Tourist", text: "Staying on a coffee farm in Coorg was life-changing. Namma Connect made it effortless!", rating: 5 },
  { name: "Karthik M.", role: "Farmer", text: "Tourists from the city found joy in our paddy fields. It's great for the community.", rating: 5 },
  { name: "Sneha P.", role: "Creator", text: "My reel from a Munnar tea estate got 2M views. Namma Connect opened a new world for me.", rating: 5 },
];

export default function Landing() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recs, setRecs] = useState({ farmers: [], creators: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("nc_user") || "null");
    if (user) {
      // Signed-in users skip the landing page and land on their dashboard.
      const home =
        user.role === "admin" ? "/admin/home"
        : user.role === "farmer" ? "/farmer/home"
        : user.role === "creator" ? "/creator/home"
        : "/tourist/home";
      navigate(home);
    }

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
  }, [navigate]);

  const handleSearch = () => {
    const user = JSON.parse(localStorage.getItem("nc_user") || "null");
    if (!user) {
      // Browsing experiences requires an account — send visitors to sign in.
      navigate("/login");
      return;
    }
    navigate(`/home?q=${query}&start=${startDate}&end=${endDate}`);
  };

  return (
    <div className="bg-card min-h-screen">
      <Navbar />

      {/* ── Hero ── */}
      <section className="min-h-screen flex items-center relative overflow-hidden pt-20">
        <div className="orb w-[600px] h-[600px] bg-primary -top-40 -right-32" />
        <div className="orb w-[400px] h-[400px] bg-primary bottom-0 -left-20" />
        <div className="orb w-[300px] h-[300px] bg-primary top-1/2 right-1/4" />

        <div className="max-w-7xl mx-auto px-6 w-full py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 text-sm text-primary font-semibold mb-6">
                <FiFeather size={14} /> India's #1 Agri-Tourism Platform
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl lg:text-7xl font-semibold text-foreground leading-tight mb-6">
                Find Your <span className="gradient-text">New</span> {" "}
                <span className="gradient-text">Escape</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg md:text-xl leading-relaxed mb-10 max-w-lg">
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
                <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden shadow-md border border-white/60">
                  <img
                    src={heroImg}
                    alt="Beautiful Indian farm landscape"
                    className="w-full h-full object-cover"
                  />
                  {/* Bottom gradient overlay for label readability */}
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent rounded-[2.5rem]" />
                  {/* Location label */}
                  <div className="absolute bottom-8 left-0 right-0 text-primary-foreground text-center px-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">📍 Featured Farm</p>
                    <p className="font-semibold text-xl drop-shadow-sm">India's Finest Agri-Stays</p>
                  </div>
                </div>

                {/* Floating stat chips */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, repeat: Infinity, repeatType: "reverse", repeatDelay: 3, duration: 1 }}
                  className="absolute -top-4 -left-8 bg-card rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 border border-border"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-xl">🌾</div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Farms Listed</p>
                    <p className="text-lg font-semibold text-foreground">1,200+</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, repeat: Infinity, repeatType: "reverse", repeatDelay: 2.5, duration: 1 }}
                  className="absolute -bottom-6 -right-8 bg-card rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 border border-border"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-xl">😊</div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Happy Tourists</p>
                    <p className="text-lg font-semibold text-foreground">45K+</p>
                  </div>
                </motion.div>

                {/* Crop type badges — floating on right */}
                <div className="absolute -right-5 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                  {[["☕","Coffee"],["🍃","Tea"],["🌶️","Spices"],["🥭","Mango"]].map(([e,l]) => (
                    <motion.div key={l}
                      initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + Math.random() * 0.5 }}
                      className="bg-card/90 backdrop-blur border border-border rounded-xl shadow-md px-3 py-2 flex items-center gap-2 text-xs font-bold text-foreground"
                    >
                      <span>{e}</span>{l}
                    </motion.div>
                  ))}
                </div>

                {/* Decorative ring */}
                <div className="absolute -inset-6 rounded-[3rem] border-2 border-dashed border-primary/30 -z-10 animate-spin" style={{animationDuration:"30s"}} />
                <div className="absolute -inset-12 rounded-[4rem] border border-primary/30 -z-10" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Services / What You Get ── */}
      <section id="services" className="section-pad bg-surface">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-block bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest rounded-full px-4 py-1.5 mb-4">
              Services
            </span>
            <h2 className="section-heading">What You Get</h2>
            <p className="section-sub">One platform for tourists, farmers and creators — pick what fits you.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <motion.div key={s.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">{s.icon}</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted rounded-full px-2.5 py-1">{s.audience}</span>
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{s.desc}</p>
                <ul className="mt-auto space-y-2">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-foreground/80">
                      <FiCheckCircle className="text-primary mt-0.5 shrink-0" size={13} />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section-pad bg-card">
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
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-primary to-primary flex items-center justify-center mx-auto mb-6 shadow-sm ">
                  <span className="font-semibold text-primary-foreground text-xl">{s.num}</span>
                </div>
                <h3 className="font-bold text-foreground text-xl mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Planner Mockup ── */}
      <section className="section-pad bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 bg-card/20 backdrop-blur rounded-full px-4 py-2 text-primary-foreground text-sm font-semibold mb-6">
              <FiFeather className="text-primary" /> Powered by AI
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold text-primary-foreground mb-4">Your AI Farm Trip Planner</h2>
            <p className="text-primary text-lg mb-10">Tell us what you love — we'll plan the perfect agri-getaway.</p>
            <div className="bg-card rounded-2xl p-6 shadow-md text-left max-w-2xl mx-auto border border-primary/30">
              {[
                { role: "user", msg: "I want a peaceful 3-day farm stay in South India for 2 people." },
                { role: "ai", msg: "Great choice! How about a coffee harvest experience in Coorg (Day 1–2) followed by a tea estate walk in Ooty (Day 3)? Budget: ~₹8,500 total." },
              ].map(({ role, msg }) => (
                <div key={msg} className={`flex gap-3 mb-4 ${role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${role === "ai" ? "bg-primary text-primary-foreground" : "bg-foreground text-primary-foreground"}`}>
                    {role === "ai" ? "NC" : "Me"}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm max-w-xs md:max-w-sm ${role === "ai" ? "bg-primary/10 text-foreground border border-primary/30" : "bg-foreground text-primary-foreground ml-auto"}`}>
                    {msg}
                  </div>
                </div>
              ))}
              <Link to="/AI-trip-planner" className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                Try AI Planner <FiArrowRight />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Recommendations ── */}
      <section className="section-pad bg-card overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="section-heading text-left">Recommended Escapes</h2>
              <p className="section-sub text-left">Hand-picked farms for your next visit.</p>
            </motion.div>
            <Link to="/home" className="text-primary font-bold flex items-center gap-1 hover:gap-2 transition-all">
              View All <FiArrowRight />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {(loading ? [1, 2, 3] : recs.farmers.slice(0, 3)).map((item, i) => (
              <motion.div key={item.id || i}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                whileHover={{ y: -10 }}
                className="group relative rounded-[2.5rem] bg-surface border border-border overflow-hidden hover:shadow-md transition-all h-[400px]"
              >
                {loading ? (
                   <div className="h-full w-full bg-muted animate-pulse" />
                ) : (
                  <>
                    <div className="h-full w-full bg-muted relative">
                       {/* Placeholder for farm photo if available */}
                       <div className="absolute inset-0 bg-linear-to-t from-foreground/80 via-transparent to-transparent flex flex-col justify-end p-8 text-primary-foreground">
                        <div className="flex items-center gap-1 text-primary mb-2">
                          <FiStar fill="currentColor" size={14} /> {item.rating || "4.9"} (120 reviews)
                        </div>
                        <h3 className="text-2xl font-semibold mb-1">{item.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4"><FiMapPin size={12} /> {item.area || item.state}</p>
                        <div className="flex gap-2">
                          <span className="bg-card/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">Stay</span>
                          <span className="bg-card/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">{item.crop_types || "Agri"}</span>
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
      <section className="section-pad bg-card">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="text-center"
              >
                <p className="text-4xl font-semibold gradient-text mb-2">{s.value}</p>
                <p className="text-muted-foreground text-sm font-medium">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Blogs ── */}
      <section className="section-pad bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="section-heading">From The Farm</h2>
              <p className="section-sub">Stories, tips & travel diaries</p>
            </div>
            <Link to="/blog" className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
              View All <FiArrowRight size={14} />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {blogs.map((b, i) => (
              <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                whileHover={{ y: -6 }}
                className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-sm transition-all"
              >
                <div className="h-40 bg-linear-to-br from-primary to-primary flex items-center justify-center text-6xl">{b.img}</div>
                <div className="p-6">
                  <span className="text-xs bg-primary/10 text-primary font-semibold px-3 py-1 rounded-full">{b.tag}</span>
                  <h3 className="font-bold text-foreground mt-3 mb-2 leading-snug">{b.title}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{b.author}</span><span>{b.readTime} read</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="section-pad bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="section-heading">Loved by All</h2>
            <p className="section-sub">Tourists, farmers, and creators all agree</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Arun K.", role: "Tourist", text: "Best farm stay experience I've ever had. Truly peaceful and authentic.", rating: 5 },
              { name: "Priya S.", role: "Creator", text: "Amazing opportunities to capture rural India. The hosts are so welcoming.", rating: 5 },
              { name: "Ravi G.", role: "Farmer", text: "Developing my farm as a stay has doubled my income. Namma Connect is a blessing.", rating: 5 }
            ].map((r, i) => (
              <motion.div key={r.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }} viewport={{ once: true }}
                className="bg-surface rounded-2xl p-6 border border-border"
              >
                <div className="flex gap-0.5 mb-4">{[...Array(r.rating)].map((_, j) => <FiStar key={j} className="text-primary fill-current" size={16} />)}</div>
                <p className="text-muted-foreground leading-relaxed mb-6 italic">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-primary flex items-center justify-center text-primary-foreground font-bold text-sm">{r.name[0]}</div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{r.name}</p>
                    <p className="text-muted-foreground text-xs">{r.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-pad bg-linear-to-br from-primary to-primary">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-semibold text-primary-foreground mb-4">Ready to Find Your Farm?</h2>
          <p className="text-primary text-lg mb-10">Create an account and start exploring India's most beautiful farming regions.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to={localStorage.getItem("nc_user") ? "/home" : "/login"} className="bg-card text-primary font-bold px-8 py-4 rounded-xl hover:bg-primary/10 transition-all hover:shadow-sm hover:-translate-y-1 flex items-center gap-2">
              Get Started <FiArrowRight />
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
