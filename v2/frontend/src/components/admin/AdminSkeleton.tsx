import { Card } from "@/components/ui/card";

export function OverviewCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} className="p-5 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </Card>
      ))}
    </div>
  );
}

export function TableSkeleton({
  headers,
  rowCount = 5,
}: {
  headers: string[];
  rowCount?: number;
}) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white dark:bg-slate-900 shadow-sm rounded-3xl animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-6 py-3.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: rowCount }).map((_, rIdx) => (
              <tr key={rIdx}>
                {headers.map((_, cIdx) => (
                  <td key={cIdx} className="px-6 py-4">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 shadow-sm space-y-4 animate-pulse">
      <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex items-end p-4 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-t-lg"
            style={{ height: `${20 + ((i * 17) % 75)}%` }}
          />
        ))}
      </div>
    </Card>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto animate-pulse">
      <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-4">
        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </Card>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-3">
            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-12">
      <div className="h-8 w-72 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      <OverviewCardsSkeleton count={8} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-3 animate-pulse">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        </Card>
        <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-3 animate-pulse">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        </Card>
        <Card className="p-6 rounded-3xl border-slate-200 bg-white dark:bg-slate-900 space-y-3 animate-pulse">
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        </Card>
      </div>
    </div>
  );
}
