import { Link } from "@/lib/router-compat";
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
  ],
  Support: [
    { label: "Contact Us", path: "/contact" },
    { label: "Help Center", path: "/contact" },
    { label: "Privacy Policy", path: "#" },
    { label: "Terms of Service", path: "#" },
  ],
};

const socials = [
  { icon: <FiMail size={18} />, href: "nammaconnect@gmail.com", label: "Mail" },
  { icon: <FiInstagram size={18} />, href: "https://instagram.com", label: "Instagram" },
  { icon: <FiTwitter size={18} />, href: "https://twitter.com", label: "Twitter" },
  { icon: <FiFacebook size={18} />, href: "https://facebook.com", label: "Facebook" },
  { icon: <FiYoutube size={18} />, href: "https://youtube.com", label: "YouTube" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="mb-4 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                N
              </span>
              <span className="text-lg font-semibold tracking-tight text-foreground">
                Namma<span className="text-primary"> Connect</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Connecting travellers with authentic farm experiences and talented
              local creators across India.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-sm font-semibold text-foreground">{section}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.path}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-3 border-t border-border pt-8 md:grid-cols-3">
          {[
            { icon: <FiMail />, text: "nammaconnect@gmail.com" },
            { icon: <FiPhone />, text: "+91 9708315049" },
            { icon: <FiMapPin />, text: "Bengaluru, Karnataka, India" },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <span className="text-primary">{icon}</span> {text}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 Namma Connect. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for India's farming community
          </p>
        </div>
      </div>
    </footer>
  );
}
