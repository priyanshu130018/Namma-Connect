import { Link } from "react-router-dom";
import { FiInstagram, FiTwitter, FiFacebook, FiYoutube, FiMail, FiPhone, FiMapPin } from "react-icons/fi";

const footerLinks = {
  Company: [
    { label: "About Us", path: "/about" },
    { label: "How It Works", path: "/about#how" },
    { label: "Our Mission", path: "/about#mission" },
    { label: "Blog", path: "/blog" },
  ],
  Services: [
    { label: "Agri-Tourism", path: "/services" },
    { label: "Register as Farmer", path: "/services/farmer/register" },
    { label: "Register as Creator", path: "/services/creator/register" },
    { label: "AI Trip Planner", path: "/tourist/ai-planner" },
  ],
  Support: [
    { label: "Contact Us", path: "/contact" },
    { label: "Help Center", path: "/contact" },
    { label: "Privacy Policy", path: "/contact" },
    { label: "Terms of Service", path: "/contact" },
  ],
};

const socials = [
  { icon: <FiInstagram size={18} />, href: "https://instagram.com", label: "Instagram" },
  { icon: <FiTwitter size={18} />, href: "https://twitter.com", label: "Twitter" },
  { icon: <FiFacebook size={18} />, href: "https://facebook.com", label: "Facebook" },
  { icon: <FiYoutube size={18} />, href: "https://youtube.com", label: "YouTube" },
];

export default function Footer() {
  return (
    <footer className="relative bg-slate-50 border-t border-slate-200 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand block */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                <span className="text-white font-black text-sm">NG</span>
              </div>
              <span className="font-black text-2xl text-slate-900">Namma<span className="text-green-600">Gig</span></span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-xs">
              Connecting tourists with authentic farm experiences and talented creators.
              Discover India's agricultural heritage through immersive travel.
            </p>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-green-600 hover:border-green-400 transition-all duration-200 shadow-sm"
                  aria-label={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Footer link columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-slate-900 font-semibold text-sm mb-4 uppercase tracking-widest">{section}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.path} className="text-slate-500 text-sm hover:text-green-600 transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact strip */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid md:grid-cols-3 gap-4">
          {[
            { icon: <FiMail />, text: "support@nammagig.in" },
            { icon: <FiPhone />, text: "+91 98765 43210" },
            { icon: <FiMapPin />, text: "Bengaluru, Karnataka, India" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-slate-500 text-sm">
              <span className="text-green-600">{icon}</span> {text}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-slate-500 text-sm">© 2026 NammaGig. All rights reserved.</p>
          <p className="text-slate-400 text-xs">Built with ❤️ for India's farming community</p>
        </div>
      </div>
    </footer>
  );
}
