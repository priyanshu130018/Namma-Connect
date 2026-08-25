import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Sparkles,
  ShieldCheck,
  CreditCard,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  Bell,
  ArrowUpRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/communicationService";
import { AppNotification } from "@/types";

export function CustomerNotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err: unknown) {
      console.error("Failed to load notifications:", err);
      setError("Unable to load notifications. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err: unknown) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleNavigateResource = (n: AppNotification) => {
    if (!n.is_read) {
      handleMarkRead(n.id);
    }

    if (n.resource_type === "booking" && n.resource_id) {
      navigate(`/app/bookings/${n.resource_id}`);
    } else if (n.resource_type === "service" && n.resource_id) {
      navigate(`/app/services/${n.resource_id}`);
    } else if (n.resource_type === "collaboration") {
      navigate("/partner/collaborations");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "booking":
        return Calendar;
      case "payment":
        return CreditCard;
      case "collaboration":
        return Sparkles;
      default:
        return ShieldCheck;
    }
  };

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return "Just now";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Notifications Center"
        subtitle="Stay updated on booking confirmations, check-in alerts, and seasonal agro-harvest events."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadNotifications}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllRead}
                className="gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700"
              >
                <CheckCheck className="h-4 w-4 text-emerald-600" />
                <span>Mark all as read</span>
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadNotifications}>
            Retry
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !error && notifications.length === 0 && (
        <Card className="p-12 rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800 text-center bg-white dark:bg-slate-900 space-y-3">
          <Bell className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No notifications yet.</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You're all caught up! Updates regarding your bookings, payments, and seasonal retreat alerts will appear here.
          </p>
        </Card>
      )}

      {!isLoading && !error && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = getIcon(n.type);
            const hasLink = Boolean(n.resource_type && n.resource_id);

            return (
              <Card
                key={n.id}
                onClick={() => hasLink && handleNavigateResource(n)}
                className={`p-5 rounded-2xl border transition-all ${
                  hasLink ? "cursor-pointer hover:shadow-md" : ""
                } ${
                  !n.is_read
                    ? "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      !n.is_read
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">{n.title}</h4>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400">
                          {n.type}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.message}</p>

                    {hasLink && (
                      <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        <span>View Details</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkRead(n.id, e)}
                      title="Mark as read"
                      className="p-1 text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400"
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 block shrink-0" />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
