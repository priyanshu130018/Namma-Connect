import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import {
  getMyCollaborations,
  acceptCollaboration,
  rejectCollaboration,
} from "@/services/creatorService";
import { CollaborationItem } from "@/types";

export function PartnerCollaborationsPage() {
  const [activeTab, setActiveTab] = useState("requests");
  const [collabs, setCollabs] = useState<CollaborationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCollabs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyCollaborations();
      setCollabs(data || []);
    } catch (err: unknown) {
      console.error("Failed to load partner collaborations:", err);
      setError("Unable to load collaboration inquiries. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollabs();
  }, [loadCollabs]);

  const handleAccept = async (id: string) => {
    try {
      const updated = await acceptCollaboration(id);
      setCollabs((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: unknown) {
      console.error("Failed to accept proposal:", err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await rejectCollaboration(id);
      setCollabs((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: unknown) {
      console.error("Failed to decline proposal:", err);
    }
  };

  const requests = collabs.filter((c) => c.status === "PENDING");
  const accepted = collabs.filter((c) => c.status === "ACCEPTED");
  const rejected = collabs.filter((c) => c.status === "REJECTED");
  const completed = collabs.filter((c) => c.status === "COMPLETED");

  const renderCollabCard = (c: CollaborationItem) => (
    <Card key={c.id} className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">{c.creator_name}</h3>
            <span className="text-xs font-mono text-purple-700 font-bold">{c.creator_handle}</span>
            <Badge variant="purple" className="text-[10px] uppercase font-bold">{c.status}</Badge>
          </div>
          <p className="text-xs font-bold text-harvest-800 mt-0.5">{c.campaign_title}</p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Production Stipend</span>
          <span className="text-sm font-black text-slate-900">{formatCurrency(c.budget)}</span>
        </div>
      </div>

      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl">
        "{c.message}"
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Shoot Dates</span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mt-0.5">
            <Calendar className="h-3.5 w-3.5 text-harvest-700" />
            <span>{c.proposed_dates}</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Deliverables</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {c.deliverables.map((d, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {d}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {c.status === "PENDING" && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReject(c.id)}
            className="text-rose-600 hover:bg-rose-50 border-rose-200 gap-1 text-xs font-bold"
          >
            <X className="h-4 w-4" /> Decline
          </Button>
          <Button
            size="sm"
            onClick={() => handleAccept(c.id)}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-1 text-xs font-bold shadow-sm"
          >
            <Check className="h-4 w-4" /> Accept Proposal
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Creator Collaborations"
        subtitle="Review promotional proposals from agro-storytellers, videographers, and drone pilots."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadCollabs}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Requests ({requests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Accepted ({accepted.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            <span>Rejected ({rejected.length})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Completed ({completed.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 pt-2">
          {requests.length > 0 ? (
            requests.map(renderCollabCard)
          ) : (
            <EmptyState
              icon={Clock}
              title="No pending collaboration inquiries"
              description="When verified digital creators submit storytelling proposals for your property, they will appear here."
            />
          )}
        </TabsContent>

        <TabsContent value="accepted" className="space-y-4 pt-2">
          {accepted.length > 0 ? (
            accepted.map(renderCollabCard)
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="No active accepted collaborations"
              description="Accepted creative shoots will show here."
            />
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 pt-2">
          {rejected.length > 0 ? (
            rejected.map(renderCollabCard)
          ) : (
            <EmptyState
              icon={XCircle}
              title="No rejected proposals"
              description="Declined proposals are archived here."
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 pt-2">
          {completed.length > 0 ? (
            completed.map(renderCollabCard)
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No completed campaigns"
              description="Finished promotional media packages appear here."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
