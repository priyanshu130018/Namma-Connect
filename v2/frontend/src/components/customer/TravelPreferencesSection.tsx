import { useEffect, useState } from "react";
import { Sparkles, Check, AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TravelPreferences } from "@/types";
import { getTravelPreferences, updateTravelPreferences } from "@/services/userService";
import { TravelPreferencesForm } from "./TravelPreferencesForm";
import { hasAnyPreferences } from "./travelPreferences";

/** Profile card: load, edit and persist the customer's travel preferences. */
export function TravelPreferencesSection() {
  const [prefs, setPrefs] = useState<TravelPreferences>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getTravelPreferences();
      setPrefs(data || {});
    } catch {
      setLoadError("We couldn't load your travel preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await updateTravelPreferences(prefs);
      setPrefs((prev) => updated || prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      setSaveError("We couldn't save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Travel Preferences</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personalize how the Namma AI Trip Planner builds your itineraries.
          </p>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-4 w-28 rounded-lg" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-6 text-center">
            <AlertCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              className="gap-1.5 rounded-xl text-xs font-bold"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {!hasAnyPreferences(prefs) && (
              <p className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/60 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                You haven't set any travel preferences yet. Choose below and save to personalize AI trip planning.
              </p>
            )}
            <TravelPreferencesForm
              value={prefs}
              onChange={setPrefs}
              disabled={saving}
              idPrefix="profile-tp"
            />
          </div>
        )}
      </div>

      {!loading && !loadError && (
        <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[1.25rem] text-xs" aria-live="polite">
            {saved && (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Travel preferences saved.
              </span>
            )}
            {saveError && (
              <span
                role="alert"
                className="inline-flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400"
              >
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                {saveError}
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            isLoading={saving}
            className="font-bold sm:w-auto"
          >
            Save Preferences
          </Button>
        </div>
      )}
    </Card>
  );
}
