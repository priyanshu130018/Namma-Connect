import { Link } from "react-router-dom";
import { Container, Section } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Compass, Home, LogIn } from "lucide-react";

export function PublicNotFoundPage() {
  return (
    <Section className="py-20 min-h-[70vh] flex items-center justify-center bg-slate-50">
      <Container size="sm" className="text-center space-y-6">
        <div className="h-16 w-16 rounded-3xl bg-harvest-50 text-harvest-700 flex items-center justify-center mx-auto shadow-sm">
          <Compass className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-harvest-700">
            404 Error
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            The page you are looking for does not exist on the public portal or has been moved to the authenticated application.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button className="font-bold gap-2 bg-harvest-600 hover:bg-harvest-700 text-white rounded-2xl">
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" className="font-semibold gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 rounded-2xl">
              <LogIn className="h-4 w-4" />
              <span>Sign In to App</span>
            </Button>
          </Link>
        </div>
      </Container>
    </Section>
  );
}

export function CustomerNotFoundPage() {
  return (
    <div className="py-16 text-center space-y-6 max-w-md mx-auto">
      <div className="h-16 w-16 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
        <Compass className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-700">
          404 Customer Area
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Service or Page Not Found
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The customer destination or booking resource you requested is unavailable or has been archived.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Link to="/app/explore">
          <Button className="font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl">
            Explore Services
          </Button>
        </Link>
        <Link to="/app/my-trip">
          <Button variant="outline" className="font-semibold text-xs border-slate-200 text-slate-700 rounded-2xl">
            My Bookings
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function PartnerNotFoundPage() {
  return (
    <div className="py-16 text-center space-y-6 max-w-md mx-auto">
      <div className="h-16 w-16 rounded-3xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
        <Compass className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-700">
          404 Partner Studio
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Partner Resource Not Found
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The requested management view, booking manifest, or service editor could not be located.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Link to="/partner">
          <Button className="font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-2xl">
            Partner Dashboard
          </Button>
        </Link>
        <Link to="/partner/services">
          <Button variant="outline" className="font-semibold text-xs border-slate-200 text-slate-700 rounded-2xl">
            My Services
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function AdminNotFoundPage() {
  return (
    <div className="py-16 text-center space-y-6 max-w-md mx-auto">
      <div className="h-16 w-16 rounded-3xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto shadow-sm">
        <Compass className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-600">
          404 Administration
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Admin Console Route Not Found
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The administrative operation or data table requested does not exist.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <Link to="/admin">
          <Button className="font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-2xl">
            Admin Overview
          </Button>
        </Link>
      </div>
    </div>
  );
}
