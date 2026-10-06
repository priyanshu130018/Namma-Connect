import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import {
  ServiceGrid,
  CategoryFilter,
  SortControl,
  Pagination,
  SearchBar,
  SearchPopover,
} from "@/components/marketplace";
import { Compass, Wheat } from "lucide-react";
import { MarketplaceService } from "@/types";

const mockService: MarketplaceService = {
  id: "srv-001",
  title: "Organic Farm Trail",
  slug: "farm-trail",
  description: "Scenic organic farm trail in Mandya",
  category: "Farm Visit",
  category_slug: "farm-visit",
  location: "Mandya, Karnataka",
  district: "Mandya",
  state: "Karnataka",
  price: 500,
  unit: "person",
  rating: 4.8,
  reviews_count: 12,
  is_verified: true,
  status: "PUBLISHED",
  provider_name: "Ramesh Gowda",
  provider_type: "Farmer",
  primary_image: "/images/services/farm.jpg",
  images: ["/images/services/farm.jpg"],
  inclusions: [],
  amenities: [],
};

describe("Generalized Marketplace Building Blocks", () => {
  it("renders ServiceGrid with real service cards", () => {
    render(
      <BrowserRouter>
        <ServiceGrid services={[mockService]} columns={4} />
      </BrowserRouter>
    );
    expect(screen.getByText("Organic Farm Trail")).toBeInTheDocument();
    expect(screen.getByText("Ramesh Gowda")).toBeInTheDocument();
  });

  it("renders ServiceGrid loading skeleton state", () => {
    const { container } = render(
      <BrowserRouter>
        <ServiceGrid services={[]} isLoading={true} skeletonCount={4} />
      </BrowserRouter>
    );
    expect(container.getElementsByClassName("animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders ServiceGrid empty state when no services exist", () => {
    const onAction = vi.fn();
    render(
      <BrowserRouter>
        <ServiceGrid
          services={[]}
          emptyTitle="No custom activities"
          emptyDescription="Try clearing filters."
          emptyActionLabel="Clear"
          onEmptyAction={onAction}
        />
      </BrowserRouter>
    );
    expect(screen.getByText("No custom activities")).toBeInTheDocument();
    expect(screen.getByText("Try clearing filters.")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Clear" });
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders ServiceGrid error state and retries on click", () => {
    const onRetry = vi.fn();
    render(
      <BrowserRouter>
        <ServiceGrid
          services={[]}
          error="Network error encountered"
          onRetry={onRetry}
        />
      </BrowserRouter>
    );
    expect(screen.getByText("Unable to load listings")).toBeInTheDocument();
    expect(screen.getByText("Network error encountered")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /Try Again/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders CategoryFilter with correct 6 categories and handles category selection", () => {
    const onSelect = vi.fn();
    const categories = [
      { id: "all", label: "All Activities", icon: Compass },
      { id: "farm-visit", label: "Farm Visit", icon: Wheat },
      { id: "cultural-fair", label: "Cultural Fair" },
    ];
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory="farm-visit"
        onSelectCategory={onSelect}
      />
    );
    expect(screen.getByText("All Activities")).toBeInTheDocument();
    expect(screen.getByText("Farm Visit")).toBeInTheDocument();
    expect(screen.getByText("Cultural Fair")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cultural Fair"));
    expect(onSelect).toHaveBeenCalledWith("cultural-fair");
  });

  it("renders SortControl and handles change event", () => {
    const onChange = vi.fn();
    render(<SortControl value="rating" onChange={onChange} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "price_asc" } });
    expect(onChange).toHaveBeenCalledWith("price_asc");
  });

  it("renders Pagination with page count and navigation buttons", () => {
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={4}
        onPageChange={onPageChange}
        totalItems={50}
        itemsPerPage={16}
      />
    );
    expect(screen.getByText(/listings/i)).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 4/i)).toBeInTheDocument();

    const nextBtn = screen.getByRole("button", { name: /Next/i });
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("renders SearchBar and SearchPopover correctly", () => {
    const onQueryChange = vi.fn();
    const onSubmit = vi.fn();
    const onSelectGPS = vi.fn();
    const onSelectQuery = vi.fn();

    render(
      <div>
        <SearchBar
          value="Farming"
          onChange={onQueryChange}
          onSubmit={onSubmit}
        />
        <SearchPopover
          isOpen={true}
          onSelectGPS={onSelectGPS}
          onSelectQuery={onSelectQuery}
          recentSearches={["Coorg Coffee", "Mysuru Palace"]}
        />
      </div>
    );

    expect(screen.getByDisplayValue("Farming")).toBeInTheDocument();
    expect(screen.getByText("Use Current Location (GPS)")).toBeInTheDocument();
    expect(screen.getByText("Coorg Coffee")).toBeInTheDocument();
    expect(screen.getByText("Mysuru Palace")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Use Current Location (GPS)"));
    expect(onSelectGPS).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Coorg Coffee"));
    expect(onSelectQuery).toHaveBeenCalledWith("Coorg Coffee");
  });
});
