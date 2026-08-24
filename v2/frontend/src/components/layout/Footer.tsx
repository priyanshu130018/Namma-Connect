import { Link } from "react-router-dom";
import { Sprout, Heart, Instagram, Youtube, Twitter } from "lucide-react";
import { Container } from "@/components/ui/container";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-harvest-600 text-white shadow-sm">
                <Sprout className="h-5 w-5" />
              </div>
              <span className="text-lg font-extrabold text-slate-900">
                Namma<span className="text-harvest-700">Connect</span>{" "}
                <span className="text-xs bg-harvest-100 text-harvest-800 px-1.5 py-0.5 rounded font-black">
                  V2
                </span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm">
              India's verified agricultural tourism and rural creator service marketplace. Connecting conscious travelers with authentic farm stays, guided agro-tours, and local creators.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-harvest-700 transition-colors cursor-pointer"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-harvest-700 transition-colors cursor-pointer"
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </span>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-harvest-700 transition-colors cursor-pointer"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </span>
            </div>
          </div>

          {/* Explore / Platform Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Platform
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <Link to="/about" className="hover:text-harvest-700 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/about#services" className="hover:text-harvest-700 transition-colors">
                  Service Categories
                </Link>
              </li>
              <li>
                <Link to="/about#trust" className="hover:text-harvest-700 transition-colors">
                  Trust & Safety
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-harvest-700 transition-colors">
                  Marketplace Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Partners & Creators Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Providers & Creators
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <Link to="/login?returnUrl=/app/become-partner" className="hover:text-harvest-700 transition-colors">
                  Become a Partner
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-harvest-700 transition-colors">
                  Creator Collaboration
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-harvest-700 transition-colors">
                  Provider FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Legal Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Company & Legal
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <Link to="/about" className="hover:text-harvest-700 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-harvest-700 transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-harvest-700 transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-harvest-700 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-harvest-700 transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 sm:flex-row text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Namma Connect Technologies Private Limited. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Empowering rural livelihoods with <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> in South India
          </p>
        </div>
      </Container>
    </footer>
  );
}
