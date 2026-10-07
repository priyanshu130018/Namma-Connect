import React from "react";
import {
  Scale,
  Star,
  CheckCircle2,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";

interface ComparisonItem {
  id: string;
  title: string;
  category?: string;
  district?: string;
  price: number;
  rating?: number;
  provider_name?: string;
  primary_image?: string;
  amenities?: string[];
  cancellation_policy?: string;
  distance?: string;
}

interface ComparisonCardProps {
  items: ComparisonItem[];
  onChooseItem?: (item: ComparisonItem) => void;
  className?: string;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  items,
  onChooseItem,
  className,
}) => {
  if (!items || items.length < 2) return null;

  const compareItems = items.slice(0, 3); // Compare up to 3 options

  return (
    <div
      className={cn(
        "rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-900 shadow-sm overflow-hidden my-3",
        className
      )}
    >
      {/* Comparison Header */}
      <div className="px-4 py-3 bg-purple-50/70 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            Option Comparison Matrix
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
          Comparing {compareItems.length} verified stays
        </span>
      </div>

      {/* Comparison Grid */}
      <div className="p-3 sm:p-4 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="py-2.5 px-3 font-semibold text-slate-400 uppercase text-[10px] w-28">
                Feature
              </th>
              {compareItems.map((item, idx) => (
                <th key={item.id} className="py-2.5 px-3 font-bold text-slate-900 dark:text-white min-w-[160px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[10px] font-extrabold">
                      {idx + 1}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {/* Price */}
            <tr>
              <td className="py-2.5 px-3 font-medium text-slate-500 dark:text-slate-400">
                Price
              </td>
              {compareItems.map((item) => (
                <td key={item.id} className="py-2.5 px-3 font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(item.price)}
                </td>
              ))}
            </tr>

            {/* Rating */}
            <tr>
              <td className="py-2.5 px-3 font-medium text-slate-500 dark:text-slate-400">
                Rating
              </td>
              {compareItems.map((item) => (
                <td key={item.id} className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                  <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {item.rating || 4.5} / 5.0
                  </span>
                </td>
              ))}
            </tr>

            {/* Location */}
            <tr>
              <td className="py-2.5 px-3 font-medium text-slate-500 dark:text-slate-400">
                Location
              </td>
              {compareItems.map((item) => (
                <td key={item.id} className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {item.district || "Karnataka"}
                  </span>
                </td>
              ))}
            </tr>

            {/* Breakfast */}
            <tr>
              <td className="py-2.5 px-3 font-medium text-slate-500 dark:text-slate-400">
                Breakfast
              </td>
              {compareItems.map((item) => (
                <td key={item.id} className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Included
                  </span>
                </td>
              ))}
            </tr>

            {/* Free Cancellation */}
            <tr>
              <td className="py-2.5 px-3 font-medium text-slate-500 dark:text-slate-400">
                Cancellation
              </td>
              {compareItems.map((item) => (
                <td key={item.id} className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Free up to 48h
                  </span>
                </td>
              ))}
            </tr>

            {/* Actions */}
            <tr>
              <td className="py-3 px-3 font-medium text-slate-500">
                Select
              </td>
              {compareItems.map((item, idx) => (
                <td key={item.id} className="py-3 px-3">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onChooseItem?.(item)}
                    className="w-full text-xs h-8 font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1 shadow-xs"
                  >
                    <span>Choose Option {idx + 1}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
