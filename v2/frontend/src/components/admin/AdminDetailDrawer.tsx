import React from "react";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";

export interface DetailField {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  fullWidth?: boolean;
}

interface AdminDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: "default" | "outline" | "secondary" | "destructive" | "warning";
    colorScheme?: string;
  };
  fields: DetailField[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function AdminDetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  fields,
  actions,
  children,
}: AdminDetailDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} description={subtitle} className="max-w-lg">
      <div className="space-y-6 pb-6 text-slate-100">
        {badge && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Status
            </span>
            <Badge variant={badge.variant || "outline"} className={badge.colorScheme}>
              {badge.text}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          {fields.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className={f.fullWidth ? "col-span-full" : "col-span-1"}>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  <span>{f.label}</span>
                </div>
                <div className="text-sm font-medium text-white break-words">
                  {f.value || <span className="text-slate-500 italic">Not provided</span>}
                </div>
              </div>
            );
          })}
        </div>

        {children}

        {actions && (
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </Drawer>
  );
}
