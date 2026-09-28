import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck, Compass, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface PlatformInfoCardProps {
  title: string;
  description: string;
  category?: string;
  badgeText?: string;
  actionLabel?: string;
  actionHref?: string;
  iconType?: "sparkles" | "shield" | "compass" | "users";
  className?: string;
}

export function PlatformInfoCard({
  title,
  description,
  category = "Namma Connect",
  badgeText = "Platform Guide",
  actionLabel = "Explore",
  actionHref = "/activities",
  iconType = "compass",
  className = "",
}: PlatformInfoCardProps) {
  const IconComponent = {
    sparkles: Sparkles,
    shield: ShieldCheck,
    compass: Compass,
    users: Users,
  }[iconType] || Compass;

  return (
    <Card
      hover
      className={`group flex flex-col justify-between overflow-hidden rounded-3xl border-dashed border-2 border-harvest-200 dark:border-harvest-900/50 bg-gradient-to-br from-harvest-50/50 via-white to-slate-50 dark:from-slate-900/80 dark:via-slate-900 dark:to-harvest-950/20 p-6 transition-all shadow-sm hover:shadow-md ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <Badge
            variant="secondary"
            className="bg-harvest-100 text-harvest-800 dark:bg-harvest-900/50 dark:text-harvest-300 text-xs font-semibold"
          >
            {category}
          </Badge>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {badgeText}
          </span>
        </div>

        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-harvest-600 text-white shadow-sm group-hover:scale-105 transition-transform">
          <IconComponent className="h-6 w-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
          {title}
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
          {description}
        </p>
      </div>

      <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-xs font-medium text-harvest-700 dark:text-harvest-400">
          Official Community Info
        </span>
        {actionHref && (
          <Link to={actionHref}>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-harvest-200 dark:border-harvest-800 text-harvest-700 dark:text-harvest-300 hover:bg-harvest-50 dark:hover:bg-harvest-900/30 gap-1 text-xs"
            >
              <span>{actionLabel}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
