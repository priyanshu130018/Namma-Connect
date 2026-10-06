import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Camera,
  Layers,
  Edit,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppImage } from "@/components/ui/image";
import { formatCurrency } from "@/lib/utils";
import {
  getMyCreatorProfile,
  updateMyCreatorProfile,
  addPortfolioItem,
  addOrUpdatePackage,
  getMyCollaborations,
  acceptCollaboration,
  rejectCollaboration,
} from "@/services/creatorService";
import { CreatorProfile, CollaborationItem } from "@/types";

// ── 1. Creator Studio Overview (/partner/creator) ──
export function CreatorHomePage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [collabs, setCollabs] = useState<CollaborationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [reach, setReach] = useState("");
  const [startingRate, setStartingRate] = useState("10000");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profData, collabsData] = await Promise.all([
        getMyCreatorProfile(),
        getMyCollaborations(),
      ]);
      setProfile(profData);
      setDisplayName(profData.display_name);
      setBio(profData.bio);
      setLocation(profData.location);
      setReach(profData.reach);
      setStartingRate(String(profData.starting_rate));
      setCollabs(collabsData || []);
    } catch (err: unknown) {
      console.error("Failed to load creator home:", err);
      setError("Unable to load creator studio data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await updateMyCreatorProfile({
        display_name: displayName,
        bio,
        location,
        reach,
        starting_rate: Number(startingRate),
      });
      setProfile(updated);
      setIsEditing(false);
    } catch (err: unknown) {
      console.error("Failed to update profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeCollabs = collabs.filter((c) => c.status === "ACCEPTED");

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Creator Media Studio"
        subtitle="Manage your promotional storytelling packages, portfolio gallery, and farm campaign proposals."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              variant={isEditing ? "ghost" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
              className="gap-1.5 font-bold"
            >
              <Edit className="h-3.5 w-3.5 text-purple-700" />
              <span>{isEditing ? "Cancel" : "Edit Profile"}</span>
            </Button>
            <Link to="/partner/creator/services">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-sm">
                <PlusCircle className="h-4 w-4" />
                <span>Add Package</span>
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center justify-between text-xs text-rose-800 font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadData}>Retry</Button>
        </div>
      )}

      {isEditing && (
        <Card className="p-6 rounded-3xl border-purple-200 bg-purple-50/40 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Edit Media Kit Profile Details</h3>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Creator Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <Input
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
              <Input
                label="Social Reach Headline"
                value={reach}
                onChange={(e) => setReach(e.target.value)}
                required
              />
              <Input
                label="Starting Rate (₹ INR)"
                type="number"
                value={startingRate}
                onChange={(e) => setStartingRate(e.target.value)}
                required
              />
            </div>
            <Textarea
              label="Bio / Creative Pitch"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                {isSaving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 rounded-3xl border-slate-200 bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Reach</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{profile?.reach || "50K+ Reach"}</p>
          <span className="text-xs text-purple-700 font-semibold">Across IG, YouTube & Drone Media</span>
        </Card>

        <Card className="p-5 rounded-3xl border-slate-200 bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Shoots</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{activeCollabs.length} Campaigns</p>
          <span className="text-xs text-emerald-700 font-semibold">Production In-Progress</span>
        </Card>

        <Card className="p-5 rounded-3xl border-slate-200 bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Starting Rate</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(profile?.starting_rate || 10000)}</p>
          <span className="text-xs text-slate-500">Per Brand Project</span>
        </Card>
      </div>

      {/* Active Proposals Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Active Storytelling Campaigns</h2>
          <Link to="/partner/creator/collaborations" className="text-xs font-bold text-purple-700 hover:underline">
            View All Proposals ({collabs.length})
          </Link>
        </div>

        {collabs.length === 0 ? (
          <Card className="p-8 rounded-3xl border-dashed border-2 border-slate-200 text-center bg-white space-y-2">
            <Sparkles className="h-8 w-8 text-purple-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No Collaboration Proposals Yet</h3>
            <p className="text-xs text-slate-500">When farm hosts and eco retreats request campaigns, they will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {collabs.slice(0, 3).map((c) => (
              <Card key={c.id} className="p-5 rounded-2xl border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="purple" className="text-[10px] uppercase font-bold">{c.status}</Badge>
                    <span className="text-xs text-slate-500">{c.proposed_dates}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{c.campaign_title}</h3>
                  <p className="text-xs text-slate-500">Partner Host: {c.partner_name}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Agreed Budget</span>
                  <span className="text-base font-extrabold text-slate-900">{formatCurrency(c.budget)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 2. Creator Services / Packages (/partner/creator/services) ──
export function CreatorServicesPage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New package fields
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [deliverablesStr, setDeliverablesStr] = useState("");
  const [turnaround, setTurnaround] = useState("5 Business Days");

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMyCreatorProfile();
      setProfile(data);
    } catch (err: unknown) {
      console.error("Failed to load creator packages:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const deliverables = deliverablesStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const updated = await addOrUpdatePackage({
        title,
        price: Number(price),
        deliverables,
        turnaround,
      });
      setProfile(updated);
      setShowAddForm(false);
      setTitle("");
      setPrice("");
      setDeliverablesStr("");
    } catch (err: unknown) {
      console.error("Failed to add package:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const packages = profile?.packages || [];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Creator Service Packages"
        subtitle="Manage fixed-price media packages available for agricultural hosts and rural retreats to book."
        actions={
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{showAddForm ? "Cancel" : "Add Media Package"}</span>
          </Button>
        }
      />

      {showAddForm && (
        <Card className="p-6 rounded-3xl border-purple-200 bg-purple-50/40 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Create New Fixed-Price Media Package</h3>
          <form onSubmit={handleAddPackage} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Package Title"
                placeholder="e.g. 4K Drone Aerial & Social Reel Kit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <Input
                label="Package Price (₹ INR)"
                type="number"
                placeholder="15000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <Input
              label="Deliverables (Comma separated)"
              placeholder="2x 4K Reels (60s), 15x High-Res Retouched Photos, Color Grading"
              value={deliverablesStr}
              onChange={(e) => setDeliverablesStr(e.target.value)}
              required
            />
            <Input
              label="Turnaround Time"
              placeholder="5 Business Days"
              value={turnaround}
              onChange={(e) => setTurnaround(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                {isSubmitting ? "Creating..." : "Save Package"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {packages.length === 0 && !isLoading && (
        <Card className="p-12 rounded-3xl border-dashed border-2 border-slate-200 text-center bg-white space-y-3">
          <Layers className="h-10 w-10 text-purple-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Creator Services Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Package your storytelling, photography, and aerial drone expertise into clear offerings for rural retreat hosts.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {packages.map((pkg, idx) => (
          <Card key={pkg.id || idx} className="p-6 rounded-3xl border-slate-200 bg-white flex flex-col justify-between space-y-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="purple" className="text-[10px]">Media Production</Badge>
                <span className="text-lg font-black text-slate-900">{formatCurrency(pkg.price)}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{pkg.title}</h3>
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Included Deliverables:</span>
                <ul className="space-y-1 text-xs text-slate-600">
                  {pkg.deliverables.map((d, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
              <span>Turnaround: <strong>{pkg.turnaround}</strong></span>
              <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 border-purple-200">Active</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── 3. Creator Portfolio (/partner/creator/portfolio) ──
export function CreatorPortfolioPage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New portfolio item
  const [itemTitle, setItemTitle] = useState("");
  const [itemLocation, setItemLocation] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemCategory, setItemCategory] = useState("Cinematography");

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMyCreatorProfile();
      setProfile(data);
    } catch (err: unknown) {
      console.error("Failed to load portfolio:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updated = await addPortfolioItem({
        title: itemTitle,
        location: itemLocation,
        imageUrl: itemImageUrl,
        category: itemCategory,
      });
      setProfile(updated);
      setShowUploadForm(false);
      setItemTitle("");
      setItemLocation("");
      setItemImageUrl("");
    } catch (err: unknown) {
      console.error("Failed to add portfolio item:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const portfolioItems = profile?.portfolio_items || [];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Visual Portfolio Showcase"
        subtitle="Showcase verified 4K landscape photography and documentary footage to potential partner hosts."
        actions={
          <Button
            size="sm"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{showUploadForm ? "Cancel" : "Upload Media Asset"}</span>
          </Button>
        }
      />

      {showUploadForm && (
        <Card className="p-6 rounded-3xl border-purple-200 bg-purple-50/40 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Add Verified Portfolio Media Piece</h3>
          <form onSubmit={handleAddMedia} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Project Title"
                placeholder="e.g. Coorg Coffee Pod Harvest Documentary"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                required
              />
              <Input
                label="Location & Region"
                placeholder="e.g. Madikeri, Kodagu, Karnataka"
                value={itemLocation}
                onChange={(e) => setItemLocation(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Media Image / Thumbnail URL"
                placeholder="https://images.unsplash.com/..."
                value={itemImageUrl}
                onChange={(e) => setItemImageUrl(e.target.value)}
                required
              />
              <Input
                label="Media Category"
                placeholder="Cinematography, Photography, etc."
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowUploadForm(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                {isSubmitting ? "Adding..." : "Add Media Piece"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {portfolioItems.length === 0 && !isLoading && (
        <Card className="p-12 rounded-3xl border-dashed border-2 border-slate-200 text-center bg-white space-y-3">
          <Camera className="h-10 w-10 text-purple-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Portfolio Items Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your drone reels, harvest photography, and cultural documentary frames to showcase your skills.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {portfolioItems.map((item, idx) => (
          <Card key={idx} className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm hover:border-purple-300 transition-colors">
            <AppImage src={item.imageUrl} alt={item.title} aspectRatio="video" className="w-full object-cover min-h-[160px]" />
            <div className="p-4 space-y-1">
              <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
              <p className="text-[10px] text-slate-500">{item.location}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── 4. Creator Brand Collaborations (/partner/creator/collaborations) ──
export function CreatorCollaborationsPage() {
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
      console.error("Failed to load collaborations:", err);
      setError("Unable to load collaboration proposals.");
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
      console.error("Failed to reject proposal:", err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Creator Brand Deals"
        subtitle="Manage storytelling contracts, timeline schedules, and deliverable handoffs."
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
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-semibold">
          {error}
        </div>
      )}

      {collabs.length === 0 && !isLoading && (
        <Card className="p-12 rounded-3xl border-dashed border-2 border-slate-200 text-center bg-white space-y-3">
          <Sparkles className="h-10 w-10 text-purple-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Collaboration Requests Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When verified partner hosts propose storytelling campaigns, they will be listed here with budget and shoot windows.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {collabs.map((c) => (
          <Card key={c.id} className="p-6 rounded-3xl border-slate-200 bg-white space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="purple" className="text-[10px] uppercase font-bold">{c.status}</Badge>
                  <span className="text-xs font-mono text-slate-500">{c.collaboration_code}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{c.campaign_title}</h3>
                <p className="text-xs text-slate-500">Host Partner: <strong>{c.partner_name}</strong></p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Agreed Budget</span>
                <span className="text-base font-extrabold text-slate-900">{formatCurrency(c.budget)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl leading-relaxed">
              "{c.message}"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Shoot Window</span>
                <p className="font-semibold text-slate-900 mt-0.5">{c.proposed_dates}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Deliverables</span>
                <p className="font-semibold text-slate-900 mt-0.5">{c.deliverables.join(", ")}</p>
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
                  <Check className="h-4 w-4" /> Accept Campaign
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
