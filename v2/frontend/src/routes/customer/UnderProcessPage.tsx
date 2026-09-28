import { Link } from "react-router-dom";
import { Hotel, Home, Car, Clock, ArrowRight, Compass, Utensils, Sparkles, MapPin, Luggage } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type UnderProcessType = "hotel" | "stay" | "transport" | "food" | "experience" | "discover" | "mytrip";

interface UnderProcessPageProps {
  type: UnderProcessType;
}

const CONFIGS: Record<UnderProcessType, {
  title: string;
  subtitle: string;
  icon: any;
  heading: string;
  description: string;
  color: string;
  iconColor: string;
}> = {
  hotel: {
    title: "Hotel Bookings",
    subtitle: "Eco-resorts, heritage plantations, and boutique hotel stays across Karnataka.",
    icon: Hotel,
    heading: "Hotel Bookings are Under Process",
    description:
      "We are currently partnering with certified sustainable eco-resorts and boutique plantation estates to bring you premium booking options. This feature will be available soon.",
    color: "from-amber-500/20 to-orange-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  stay: {
    title: "Homestays & Farm Stays",
    subtitle: "Authentic rural farm stays and family-run cottages.",
    icon: Home,
    heading: "Farm & Village Stays are Under Process",
    description:
      "We are actively onboarding and verifying local agrarian homestays, estate cottages, and organic farm residences. Verified stays will be listed here shortly.",
    color: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  transport: {
    title: "Eco Transport & Rentals",
    subtitle: "Rural taxi routes, EV shuttles, and agri-trail transport.",
    icon: Car,
    heading: "Transport Services are Under Process",
    description:
      "Connecting farm locations with sustainable, on-demand local drivers and regional eco-shuttles is currently in progress. Stay tuned for seamless transit booking.",
    color: "from-sky-500/20 to-blue-500/10",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  food: {
    title: "Food & Culinary Trails",
    subtitle: "Traditional Karavali, Malnad, and North Karnataka farm-to-table dining.",
    icon: Utensils,
    heading: "Food & Culinary Experiences are Under Process",
    description:
      "We arecurating authentic regional culinary experiences, traditional cooking masterclasses, and organic farm dining options.",
    color: "from-orange-500/20 to-amber-500/10",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  experience: {
    title: "Custom Agro Experiences",
    subtitle: "Immersive multi-day farm retreats, harvest festivals, and rural living.",
    icon: Sparkles,
    heading: "Experience Hub is Under Process",
    description:
      "Our team is crafting personalized multi-day agro-tourism itineraries and seasonal festival packages across Karnataka's Western Ghats and Deccan plains.",
    color: "from-purple-500/20 to-pink-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  discover: {
    title: "Discover Karnataka",
    subtitle: "Interactive maps, local heritage guides, and seasonal crop calendars.",
    icon: MapPin,
    heading: "Discovery Portal is Under Process",
    description:
      "Interactive crop harvest timelines, localized weather alerts, and regional cultural audio guides will be launching here soon.",
    color: "from-teal-500/20 to-emerald-500/10",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
  mytrip: {
    title: "My Trip Planner",
    subtitle: "Manage your saved itineraries, active bookings, and custom travel plans.",
    icon: Luggage,
    heading: "My Trip Planner is Under Process",
    description:
      "Your personalized itinerary dashboard with synchronized offline passes, route maps, and host contacts is coming soon.",
    color: "from-indigo-500/20 to-blue-500/10",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
};

export function CustomerUnderProcessPage({ type }: UnderProcessPageProps) {
  const config = CONFIGS[type] || CONFIGS.hotel;
  const Icon = config.icon;

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <PageHeader title={config.title} subtitle={config.subtitle} />

      <Card className="p-8 sm:p-14 text-center rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
        {/* Animated Badge / Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-3xl bg-gradient-to-tr ${config.color} animate-pulse`} />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-inner">
            <Icon className={`h-8 w-8 ${config.iconColor}`} />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold mb-2">
            <Clock className="h-3.5 w-3.5" />
            <span>Under Development</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            {config.heading}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {config.description}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link to="/explore/activities">
            <Button className="rounded-2xl font-bold bg-harvest-600 hover:bg-harvest-700 text-white gap-2 shadow-sm">
              <Compass className="h-4 w-4" />
              <span>Explore Activities</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link to="/home">
            <Button variant="outline" className="rounded-2xl font-bold">
              Back to Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
