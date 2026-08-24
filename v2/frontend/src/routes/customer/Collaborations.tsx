import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Calendar, CheckCircle2, XCircle, Clock, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { SAMPLE_COLLABORATIONS, CollaborationItem } from "@/features/customer/data/customerData";

export function CustomerCollaborationsPage() {
  const [activeTab, setActiveTab] = useState("requests");

  const requests = SAMPLE_COLLABORATIONS.filter((c) => c.status === "requests");
  const accepted = SAMPLE_COLLABORATIONS.filter((c) => c.status === "accepted");
  const rejected = SAMPLE_COLLABORATIONS.filter((c) => c.status === "rejected");
  const completed = SAMPLE_COLLABORATIONS.filter((c) => c.status === "completed");

  const renderCollabCard = (collab: CollaborationItem) => (
    <Card key={collab.id} className="p-6 rounded-3xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{collab.creatorName}</h3>
            <span className="text-xs font-mono text-purple-700 dark:text-purple-400 font-semibold">{collab.creatorHandle}</span>
          </div>
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">{collab.campaignTitle}</p>
        </div>
        <Badge
          variant={
            collab.status === "accepted"
              ? "default"
              : collab.status === "rejected"
              ? "destructive"
              : collab.status === "completed"
              ? "secondary"
              : "warning"
          }
          className="capitalize self-start sm:self-auto"
        >
          {collab.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Proposed Dates</span>
          <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
            <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{collab.proposedDates}</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Agreed Budget</span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 block">
            {formatCurrency(collab.budget)}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Key Deliverables</span>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {collab.deliverables.map((d, i) => (
            <Badge key={i} variant="secondary" className="text-[10px]">
              {d}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Creator Collaborations Hub"
        subtitle="Manage brand partnerships, creator story proposals, and media deliverables separate from personal bookings."
        actions={
          <Link to="/app/creators">
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2">
              <Plus className="h-4 w-4" /> Browse Creators
            </Button>
          </Link>
        }
      />

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
              title="No pending collaboration proposals"
              description="Browse our creator directory to pitch agro-storytelling campaigns."
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
              description="Proposals accepted by creators will show active timeline status here."
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
              description="Declined or expired collaboration inquiries appear here."
            />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 pt-2">
          {completed.length > 0 ? (
            completed.map(renderCollabCard)
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No completed campaigns yet"
              description="Published media links and verified deliverables are archived here."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
