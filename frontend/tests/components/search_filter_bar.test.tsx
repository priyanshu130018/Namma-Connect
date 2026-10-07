import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchFilterBar } from "@/components/marketplace/SearchFilterBar";

describe("SearchFilterBar Unified Marketplace Search & Filter Suite", () => {
  it("renders single clean horizontal row without date or time inputs", () => {
    render(
      <SearchFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText("Search activities, places, experiences...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Search$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filter/i })).toBeInTheDocument();

    // Verify date and time inputs are NOT present
    expect(screen.queryByText(/Date:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Time:/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/dd-mm-yyyy/i)).not.toBeInTheDocument();
  });

  it("opens filter popover on filter button click and closes on Escape", () => {
    render(
      <SearchFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
      />
    );

    const filterBtn = screen.getByRole("button", { name: /filter/i });
    expect(filterBtn).toHaveAttribute("aria-expanded", "false");

    // Open popover
    fireEvent.click(filterBtn);
    expect(filterBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Sort By")).toBeInTheDocument();

    // Press Escape to close
    fireEvent.keyDown(document, { key: "Escape" });
    expect(filterBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stages filter selections until Apply is clicked", () => {
    const onCategoryChange = vi.fn();
    const onLocationChange = vi.fn();
    const onSortByChange = vi.fn();

    render(
      <SearchFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedCategory="all"
        onCategoryChange={onCategoryChange}
        selectedLocation=""
        onLocationChange={onLocationChange}
        sortBy="rating"
        onSortByChange={onSortByChange}
      />
    );

    const filterBtn = screen.getByRole("button", { name: /filter/i });
    fireEvent.click(filterBtn);

    // Select category in popover
    const categorySelect = screen.getByDisplayValue("All Categories");
    fireEvent.change(categorySelect, { target: { value: "farm" } });

    // Select location in popover
    const locationSelect = screen.getByDisplayValue("All Karnataka");
    fireEvent.change(locationSelect, { target: { value: "Kodagu (Coorg)" } });

    // Select sort by in popover
    const sortSelect = screen.getByDisplayValue("Top Rated");
    fireEvent.change(sortSelect, { target: { value: "price_asc" } });

    // Callbacks should NOT have been called yet because Apply has not been clicked
    expect(onCategoryChange).not.toHaveBeenCalled();
    expect(onLocationChange).not.toHaveBeenCalled();
    expect(onSortByChange).not.toHaveBeenCalled();

    // Click Apply
    const applyBtn = screen.getByRole("button", { name: /^Apply$/i });
    fireEvent.click(applyBtn);

    // Now callbacks should be called
    expect(onCategoryChange).toHaveBeenCalledWith("farm");
    expect(onLocationChange).toHaveBeenCalledWith("Kodagu (Coorg)");
    expect(onSortByChange).toHaveBeenCalledWith("price_asc");
  });

  it("shows active filter count badge when filters are active", () => {
    render(
      <SearchFilterBar
        searchQuery=""
        onSearchChange={vi.fn()}
        selectedCategory="farm"
        selectedLocation="Kodagu (Coorg)"
      />
    );

    // Filter badge should show "2"
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("resets filters when Reset button is clicked inside popover", () => {
    const onReset = vi.fn();
    const onCategoryChange = vi.fn();
    const onLocationChange = vi.fn();

    render(
      <SearchFilterBar
        searchQuery="coffee"
        onSearchChange={vi.fn()}
        selectedCategory="farm"
        selectedLocation="Kodagu (Coorg)"
        onCategoryChange={onCategoryChange}
        onLocationChange={onLocationChange}
        onReset={onReset}
      />
    );

    const filterBtn = screen.getByRole("button", { name: /filter/i });
    fireEvent.click(filterBtn);

    const resetBtn = screen.getByRole("button", { name: /Reset/i });
    fireEvent.click(resetBtn);

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onCategoryChange).toHaveBeenCalledWith("all");
    expect(onLocationChange).toHaveBeenCalledWith("");
  });

  it("handles search submission on Enter or search button click", () => {
    const onSubmit = vi.fn();
    const onSearchChange = vi.fn();

    render(
      <SearchFilterBar
        searchQuery="Trek"
        onSearchChange={onSearchChange}
        onSubmit={onSubmit}
      />
    );

    const searchBtn = screen.getByRole("button", { name: /^Search$/i });
    fireEvent.click(searchBtn);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
