import { useState, useEffect } from "react";
import { Bookmark, AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getSavedServices, removeSavedService } from "@/services/savedService";
import { MarketplaceService } from "@/types";

export function CustomerSavedPage() {
  const [savedServices, setSavedServices] = useState<MarketplaceService[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSaved = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const items = await getSavedServices();
      setSavedServices(items);
    } catch {
      setErrorMessage("Unable to load saved services. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleSaveToggle = async (serviceId: string, isSaved: boolean) => {
    if (!isSaved) {
      // Optimistically remove from list
      setSavedServices((prev) => prev.filter((s) => s.id !== serviceId));
      try {
        await removeSavedService(serviceId);
      } catch {
        // Rollback on failure
        fetchSaved();
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <PageHeader
        title="Saved Services"
        subtitle="Your private collection of agricultural stays, authentic rural tours, and agro-workshops."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-xs">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3 rounded-lg" />
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
              </div>
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-6 w-24 rounded-lg" />
                <Skeleton className="h-9 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-3 text-center max-w-md mx-auto my-8">
          <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400 mx-auto" />
          <h3 className="text-sm font-bold">Unable to load saved services.</h3>
          <p className="text-xs text-rose-600 dark:text-rose-300 leading-relaxed">{errorMessage}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSaved}
            className="gap-1.5 font-bold text-xs bg-white dark:bg-slate-800 hover:bg-rose-100/50 dark:hover:bg-rose-900/50 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 rounded-xl shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      ) : savedServices.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {savedServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isInitiallySaved={true}
              onSaveToggle={handleSaveToggle}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="No saved services yet."
          description="Save services you want to revisit later."
          actionLabel="Explore Services"
          onAction={() => {
            window.location.href = "/app/explore";
          }}
        />
      )}
    </div>
  );
}
