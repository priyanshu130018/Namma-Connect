import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import {
  CreatorHomePage,
  CreatorServicesPage,
  CreatorPortfolioPage,
  CreatorCollaborationsPage,
} from "@/routes/partner/PartnerCreatorPages";
import { PartnerCollaborationsPage } from "@/routes/partner/PartnerCollaborations";
import { CustomerCreatorsPage } from "@/routes/customer/Creators";
import * as creatorService from "@/services/creatorService";
import * as marketplaceService from "@/services/marketplaceService";
import { CreatorProfile, CollaborationItem, MarketplaceService } from "@/types";

const mockProfile: CreatorProfile = {
  id: "cre-001",
  user_id: "usr-001",
  display_name: "Priya Storyteller",
  handle: "@priyastoryteller",
  avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
  bio: "Agro-cinematographer & visual storyteller documenting Western Ghats organic estates.",
  location: "Bangalore & Coorg, Karnataka",
  reach: "120K+ Reach",
  starting_rate: 15000,
  rating: 4.96,
  reviews_count: 28,
  is_verified: true,
  specialties: ["Drone Cinematography", "Farm-to-Table Stories"],
  social_links: { instagram: "@priyastoryteller" },
  portfolio_items: [
    {
      title: "Coorg Mist Blossom Drone Reel",
      location: "Madikeri, Karnataka",
      imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
      category: "Drone Video",
    },
  ],
  packages: [
    {
      id: "pkg-1",
      title: "Estate Harvest 4K Cinematography Package",
      price: 15000,
      deliverables: ["2x 4K Drone Reels (60s)", "15x Retouched Photos"],
      turnaround: "5 Business Days",
    },
  ],
};

const mockCollabs: CollaborationItem[] = [
  {
    id: "col-001",
    collaboration_code: "NC-COL-9901A",
    creator_id: "usr-001",
    creator_name: "Priya Storyteller",
    creator_handle: "@priyastoryteller",
    partner_id: "usr-host-1",
    partner_name: "Kodagu Organics",
    campaign_title: "Arabica Blossom Spring Campaign",
    message: "We would love to sponsor a 3-day harvest shoot during the spring bloom.",
    proposed_dates: "Oct 15 - Oct 18, 2026",
    budget: 22000,
    deliverables: ["2x 4K Reels", "15x Stills"],
    status: "PENDING",
    created_at: "2026-08-10T10:00:00Z",
  },
  {
    id: "col-002",
    collaboration_code: "NC-COL-9902B",
    creator_id: "usr-001",
    creator_name: "Priya Storyteller",
    creator_handle: "@priyastoryteller",
    partner_id: "usr-host-2",
    partner_name: "Wayanad Tribal Retreat",
    campaign_title: "Wild Honey Harvesting Documentary",
    message: "Filming sustainable wild honey extraction with forest guides.",
    proposed_dates: "Nov 01 - Nov 04, 2026",
    budget: 28000,
    deliverables: ["1x Long-form Video", "10x Stills"],
    status: "ACCEPTED",
    created_at: "2026-08-12T10:00:00Z",
  },
];

const mockCreatorService: MarketplaceService = {
  id: "srv-cr-01",
  title: "Estate Harvest 4K Cinematography Package",
  slug: "estate-harvest-4k",
  description: "Professional aerial drone shoot and 4K reel production for coffee and spice plantations.",
  category: "Content Creator",
  category_slug: "content-creator",
  location: "Madikeri, Coorg",
  district: "Kodagu",
  state: "Karnataka",
  price: 15000,
  unit: "package",
  rating: 4.95,
  reviews_count: 18,
  is_verified: true,
  status: "PUBLISHED",
  provider_name: "Priya Storyteller",
  provider_type: "Creator",
  primary_image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
  images: ["https://images.unsplash.com/photo-1500382017468-9049fed747ef"],
  inclusions: ["2x 4K Reels", "15x High-res photos"],
  amenities: [],
};

describe("Creator Collaboration Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders CreatorHomePage and manages studio profile", async () => {
    vi.spyOn(creatorService, "getMyCreatorProfile").mockResolvedValue(mockProfile);
    vi.spyOn(creatorService, "getMyCollaborations").mockResolvedValue(mockCollabs);
    const updateSpy = vi.spyOn(creatorService, "updateMyCreatorProfile").mockResolvedValue({
      ...mockProfile,
      bio: "Updated agro-storyteller bio.",
    });

    render(
      <BrowserRouter>
        <CreatorHomePage />
      </BrowserRouter>
    );

    expect(screen.getByText("Creator Media Studio")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("120K+ Reach")).toBeInTheDocument();
      expect(screen.getByText("Arabica Blossom Spring Campaign")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Edit Profile/i }));

    const bioInput = screen.getByLabelText(/Bio \/ Creative Pitch/i);
    fireEvent.change(bioInput, { target: { value: "Updated agro-storyteller bio." } });

    fireEvent.click(screen.getByRole("button", { name: /Save Profile/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          bio: "Updated agro-storyteller bio.",
        })
      );
    });
  });

  it("renders CreatorServicesPage and manages package listings", async () => {
    vi.spyOn(creatorService, "getMyCreatorProfile").mockResolvedValue(mockProfile);
    const addPackageSpy = vi.spyOn(creatorService, "addOrUpdatePackage").mockResolvedValue(mockProfile);

    render(
      <BrowserRouter>
        <CreatorServicesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Creator Service Packages")).toBeInTheDocument();
      expect(screen.getByText("Estate Harvest 4K Cinematography Package")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Media Package/i }));

    fireEvent.change(screen.getByLabelText(/Package Title/i), {
      target: { value: "Mini Drone Reel Package" },
    });
    fireEvent.change(screen.getByLabelText(/Package Price/i), {
      target: { value: "8500" },
    });
    fireEvent.change(screen.getByLabelText(/Deliverables/i), {
      target: { value: "1x 4K Reel, 5x Stills" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save Package/i }));

    await waitFor(() => {
      expect(addPackageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Mini Drone Reel Package",
          price: 8500,
          deliverables: ["1x 4K Reel", "5x Stills"],
        })
      );
    });
  });

  it("renders CreatorPortfolioPage and manages visual assets", async () => {
    vi.spyOn(creatorService, "getMyCreatorProfile").mockResolvedValue(mockProfile);
    const addMediaSpy = vi.spyOn(creatorService, "addPortfolioItem").mockResolvedValue(mockProfile);

    render(
      <BrowserRouter>
        <CreatorPortfolioPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Visual Portfolio Showcase")).toBeInTheDocument();
      expect(screen.getByText("Coorg Mist Blossom Drone Reel")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Upload Media Asset/i }));

    fireEvent.change(screen.getByLabelText(/Project Title/i), {
      target: { value: "Wayanad Bamboo Plantation Story" },
    });
    fireEvent.change(screen.getByLabelText(/Location & Region/i), {
      target: { value: "Wayanad, Kerala" },
    });
    fireEvent.change(screen.getByLabelText(/Media Image \/ Thumbnail URL/i), {
      target: { value: "https://images.unsplash.com/photo-1592417817098" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Add Media Piece/i }));

    await waitFor(() => {
      expect(addMediaSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Wayanad Bamboo Plantation Story",
        })
      );
    });
  });

  it("renders CreatorCollaborationsPage and handles accept/decline", async () => {
    vi.spyOn(creatorService, "getMyCollaborations").mockResolvedValue(mockCollabs);
    const acceptSpy = vi.spyOn(creatorService, "acceptCollaboration").mockResolvedValue({
      ...mockCollabs[0],
      status: "ACCEPTED",
    });

    render(
      <BrowserRouter>
        <CreatorCollaborationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Creator Brand Deals")).toBeInTheDocument();
      expect(screen.getByText("Arabica Blossom Spring Campaign")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Accept Campaign/i }));

    await waitFor(() => {
      expect(acceptSpy).toHaveBeenCalledWith("col-001");
    });
  });

  it("renders PartnerCollaborationsPage with tabbed requests", async () => {
    vi.spyOn(creatorService, "getMyCollaborations").mockResolvedValue(mockCollabs);

    render(
      <BrowserRouter>
        <PartnerCollaborationsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Creator Collaborations")).toBeInTheDocument();
      expect(screen.getByText(/Requests \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Accepted \(1\)/i)).toBeInTheDocument();
    });
  });

  it("renders CustomerCreatorsPage with Content Creator services discovery", async () => {
    vi.spyOn(marketplaceService, "getMarketplaceServices").mockResolvedValue({
      services: [mockCreatorService],
      total: 1,
      page: 1,
      limit: 16,
      total_pages: 1,
    });

    render(
      <MemoryRouter initialEntries={["/app/creators"]}>
        <CustomerCreatorsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Content Creator (Marketplace|Services)/i })).toBeInTheDocument();
      expect(screen.getByText("Estate Harvest 4K Cinematography Package")).toBeInTheDocument();
    });
  });
});
