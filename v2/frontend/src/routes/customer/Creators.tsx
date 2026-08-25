import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { Star, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppImage } from "@/components/ui/image";
import { formatCurrency } from "@/lib/utils";
import { getPublicCreators, getPublicCreatorById } from "@/services/creatorService";
import { CreatorProfile } from "@/types";

export function CustomerCreatorsPage() {
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCreators = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicCreators();
      setCreators(data || []);
    } catch (err: unknown) {
      console.error("Failed to load creators directory:", err);
      setError("Unable to load verified creators directory.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCreators();
  }, [loadCreators]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Creator Discovery Directory"
        subtitle="Collaborate with verified agricultural filmmakers, drone cinematographers, and culinary chroniclers."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadCreators}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadCreators}>Retry</Button>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                </div>
              </div>
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded" />
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {creators.map((creator) => (
            <Card key={creator.id} hover className="overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-sm">
              <div className="p-6 space-y-4">
                {/* Avatar & Header */}
                <div className="flex items-center gap-3.5">
                  <div className="h-14 w-14 rounded-2xl overflow-hidden bg-purple-100 dark:bg-purple-950/60 shrink-0">
                    <AppImage
                      src={creator.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb"}
                      alt={creator.display_name}
                      aspectRatio="square"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{creator.display_name}</h3>
                    <p className="text-xs font-mono text-purple-700 dark:text-purple-400 font-semibold">{creator.handle}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star className="h-3 w-3 fill-amber-400" />
                        <span>{creator.rating.toFixed(2)}</span>
                      </div>
                      <span>•</span>
                      <span className="truncate">{creator.reach}</span>
                    </div>
                  </div>
                </div>

                {/* Bio & Specialty */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {creator.bio}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {creator.specialties.map((s, idx) => (
                    <Badge key={idx} variant="purple" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Footer */}
              <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Starting at</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {formatCurrency(creator.starting_rate)}
                  </span>
                </div>
                <Link to={`/app/creators/${creator.id}`}>
                  <Button size="sm" className="font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
                    View Portfolio
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomerCreatorDetailPage() {
  const { creator_id } = useParams<{ creator_id: string }>();
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCreator = useCallback(async () => {
    if (!creator_id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicCreatorById(creator_id);
      setCreator(data);
    } catch (err: unknown) {
      console.error("Failed to load creator detail:", err);
      setError("Unable to load creator media kit.");
    } finally {
      setIsLoading(false);
    }
  }, [creator_id]);

  useEffect(() => {
    loadCreator();
  }, [loadCreator]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-32" />
        <div className="h-64 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <Link to="/app/creators" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900">
          ← Back to Creators
        </Link>
        <Card className="p-8 rounded-3xl border-rose-200 bg-rose-50 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Creator Not Found</h3>
          <p className="text-xs text-slate-600">{error || "The creator profile could not be loaded."}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <Link
        to="/app/creators"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        ← Back to Creators
      </Link>

      <Card className="p-8 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-20 w-20 rounded-3xl overflow-hidden bg-purple-100 dark:bg-purple-950/60 shrink-0">
            <AppImage
              src={creator.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb"}
              alt={creator.display_name}
              aspectRatio="square"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{creator.display_name}</h1>
              <Badge variant="purple" className="text-xs">Verified Creator</Badge>
            </div>
            <p className="text-xs font-mono font-bold text-purple-700 dark:text-purple-400">{creator.handle}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{creator.location}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 border-y border-slate-100 dark:border-slate-800 py-4 text-center">
          <div>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100">{creator.reach}</span>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Audience</span>
          </div>
          <div>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-amber-400" /> {creator.rating.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Quality Rating</span>
          </div>
          <div>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{creator.reviews_count}</span>
            <span className="text-[10px] text-slate-400 block uppercase font-semibold">Completed Projects</span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">About Media Capabilities</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{creator.bio}</p>
        </div>

        {/* Portfolio Showcase */}
        {creator.portfolio_items.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Verified Portfolio Work</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {creator.portfolio_items.map((item, idx) => (
                <div key={idx} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                  <AppImage src={item.imageUrl} alt={item.title} aspectRatio="video" className="w-full object-cover" />
                  <div className="p-3 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{item.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Media Packages */}
        {creator.packages.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900">Available Production Packages</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {creator.packages.map((pkg, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-purple-100 bg-purple-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{pkg.title}</span>
                    <span className="text-xs font-extrabold text-purple-900">{formatCurrency(pkg.price)}</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    {pkg.deliverables.map((d, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-purple-50 p-5 border border-purple-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-purple-950 block">Collaboration Campaign Package</span>
            <span className="text-sm font-extrabold text-purple-900 mt-0.5 block">{formatCurrency(creator.starting_rate)} / project</span>
          </div>
          <Link to="/partner/collaborations">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-sm">
              <Sparkles className="h-4 w-4" /> Send Campaign Proposal
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
