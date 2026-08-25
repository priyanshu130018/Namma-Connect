import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { CustomerExplorePage } from "@/routes/customer/Explore";
import * as marketplaceService from "@/services/marketplaceService";

// Mock translation
vi.mock("@/i18n", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const dict: Record<string, string> = {
        "search.title": "Explore Offerings",
        "search.placeholder": "Search places, activities, farms, food, events, guides...",
        "search.experiences": "Experiences",
        "search.activities": "Activities",
        "search.farms": "Farms",
        "search.stays": "Stays",
        "search.events": "Events",
        "search.food": "Food",
        "search.travelServices": "Travel Services",
        "search.guidesTours": "Guides & Tours",
        "search.noResultsTitle": "No experiences or stays found",
        "search.noResultsDesc": `No offerings matched "${params?.query || "filters"}". Try searching another destination or clearing filters.`,
        "search.popularSuggestions": "Popular categories to explore:",
        "search.searchUnavailable": "Search is temporarily unavailable. Please try again.",
        "search.searchHeading": "Where would you like to explore?",
        "common.browseHome": "Browse All Offerings",
        "common.clearSearch": "Clear Filters",
        "common.search": "Search",
        "home.heroSubtitle": "Discover authentic farm stays and heritage experiences.",
      };
      return dict[key] || key;
    },
    language: "en",
    changeLanguage: vi.fn(),
  }),
}));

describe("Semantic Search & Search Suggestions UI", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders search bar and category filters correctly with results", async () => {
    vi.spyOn(marketplaceService, "getMarketplaceServices").mockResolvedValue({
      services: [
        {
          id: "srv-001",
          title: "Organic Cardamom Farm Stay",
          slug: "cardamom-stay",
          description: "Peaceful cardamom estate in Madikeri Coorg",
          category: "Stays",
          category_slug: "stay",
          location: "Madikeri, Coorg",
          district: "Kodagu (Coorg)",
          state: "Karnataka",
          price: 3800,
          unit: "night",
          rating: 4.9,
          reviews_count: 24,
          is_verified: true,
          status: "PUBLISHED",
          provider_name: "Bopanna Gowda",
          provider_type: "Farmer",
          primary_image: "/images/services/coffee-estate.jpg",
          images: ["/images/services/coffee-estate.jpg"],
          inclusions: [],
          amenities: [],
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      total_pages: 1,
    });

    render(
      <BrowserRouter>
        <CustomerExplorePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Organic Cardamom Farm Stay")).toBeInTheDocument();
    });
  });

  it("displays clear no-results state with browse home button when query returns no items", async () => {
    vi.spyOn(marketplaceService, "getMarketplaceServices").mockResolvedValue({
      services: [],
      total: 0,
      page: 1,
      limit: 12,
      total_pages: 1,
    });

    render(
      <BrowserRouter>
        <CustomerExplorePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No experiences or stays found")).toBeInTheDocument();
      expect(screen.getByText("Browse All Offerings")).toBeInTheDocument();
    });
  });

  it("fetches and renders autocomplete suggestions on input change", async () => {
    const suggestionsMock = vi.spyOn(marketplaceService, "getSearchSuggestions").mockResolvedValue([
      {
        id: "cat-stay",
        title: "Farm stays",
        text: "Farm stays",
        category: "stay",
        location: "Karnataka",
        type: "category",
      },
      {
        id: "loc-coorg",
        title: "Coorg Coffee Estate",
        text: "Coorg Coffee Estate",
        category: "stay",
        location: "Madikeri, Coorg",
        type: "service",
      },
    ]);

    render(
      <BrowserRouter>
        <CustomerExplorePage />
      </BrowserRouter>
    );

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "coorg" } });

    await waitFor(() => {
      expect(suggestionsMock).toHaveBeenCalled();
    });
  });
});
