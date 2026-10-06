import { Link } from "react-router-dom";
import { Sprout, Heart, Instagram, Youtube, Twitter } from "lucide-react";
import { Container } from "@/components/ui/container";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Sprout className="h-5 w-5" />
              </div>
              <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Namma<span className="text-emerald-700 dark:text-emerald-400">Connect</span>{" "}
                <span className="text-xs bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-black">
                  V2
                </span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
              Discover verified farm stays, rural agro-trails, and authentic harvest experiences across South India.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer" aria-label="YouTube">
                <Youtube className="h-4 w-4" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer" aria-label="Twitter">
                <Twitter className="h-4 w-4" />
              </span>
            </div>
          </div>

          {/* Explore / Platform Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Explore
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Stories & Blog
                </Link>
              </li>
              <li>
                <Link to="/login?returnUrl=/explore" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Discover Services
                </Link>
              </li>
            </ul>
          </div>

          {/* Partners & Hosts Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              For Providers
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/login?returnUrl=/app/become-partner" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Become a Partner
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Provider Roles
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Host FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Support & Legal
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/contact" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-8 sm:flex-row text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} Namma Connect Technologies Private Limited. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> for community tourism
          </p>
        </div>
      </Container>
    </footer>
  );
}
