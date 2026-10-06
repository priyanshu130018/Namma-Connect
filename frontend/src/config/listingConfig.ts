import {
  LucideIcon,
  MapPin,
  BedDouble,
  Car,
  UtensilsCrossed,
  LayoutGrid,
  Mountain,
  ChefHat,
  Palette,
  Leaf,
  Users,
} from "lucide-react";

/**
 * Shared configuration that powers the generic <ListingPage /> for both the
 * Explore marketplace and the Experience section. Each UI category maps to a
 * real backend `category` query token (or a comma-joined set of tokens) that
 * the existing GET /services endpoint already understands — no mock data.
 */

export interface ListingCategoryDef {
  /** Tab id used in the URL (?category=) */
  id: string;
  /** Chip label shown to the user */
  label: string;
  /** Optional chip icon */
  icon?: LucideIcon;
  /**
   * Value passed to getMarketplaceServices({ category }). Comma-joined tokens
   * are supported server-side. Leave undefined for an unfiltered ("All") tab.
   */
  apiCategory?: string;
  /** Short helper description surfaced under the header */
  description?: string;
}

export interface ListingPageConfig {
  key: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  categories: ListingCategoryDef[];
  defaultCategory: string;
  columns?: 1 | 2 | 3 | 4;
  emptyTitle?: string;
  emptyDescription?: string;
}

/** EXPLORE — the practical marketplace, exactly 4 categories. */
export const exploreConfig: ListingPageConfig = {
  key: "explore",
  title: "Explore Karnataka",
  subtitle: "Find places to go, stays to book, ways to get around, and where to eat.",
  searchPlaceholder: "Search destinations, stays, transport, food...",
  defaultCategory: "destinations",
  columns: 4,
  categories: [
    {
      id: "destinations",
      label: "Destinations",
      icon: MapPin,
      apiCategory: "cultural-historical,wildlife,adventure,water-sports",
      description: "Handpicked places, tours and sights across the state.",
    },
    {
      id: "stays",
      label: "Stays",
      icon: BedDouble,
      apiCategory: "stay",
      description: "Farm stays, homestays and estate retreats.",
    },
    {
      id: "transport",
      label: "Transport",
      icon: Car,
      apiCategory: "transport",
      description: "Getting around — cabs, transfers and local rides.",
    },
    {
      id: "food",
      label: "Food & Dining",
      icon: UtensilsCrossed,
      apiCategory: "food",
      description: "Regional cuisine, food walks and farm-to-table meals.",
    },
  ],
  emptyTitle: "No listings here yet",
  emptyDescription:
    "There are no listings matching your current filters. Try another category, clear filters, or widen your search.",
};

/** EXPERIENCE — things to do, grouped by vibe (5 chips + All). */
export const experienceConfig: ListingPageConfig = {
  key: "experience",
  title: "Experiences",
  subtitle: "Authentic things to do — from Western Ghats treks to hands-on village workshops.",
  searchPlaceholder: "Search experiences, activities, workshops...",
  defaultCategory: "all",
  columns: 4,
  categories: [
    { id: "all", label: "All", icon: LayoutGrid, apiCategory: undefined },
    {
      id: "nature-adventure",
      label: "Nature & Adventure",
      icon: Mountain,
      apiCategory: "adventure,water-sports,wildlife",
      description: "Treks, rafting, safaris and the great outdoors.",
    },
    {
      id: "food-culture",
      label: "Food & Culture",
      icon: ChefHat,
      apiCategory: "food,cultural-historical",
      description: "Culinary walks, heritage trails and local traditions.",
    },
    {
      id: "workshops",
      label: "Workshops",
      icon: Palette,
      apiCategory: "farm",
      description: "Hands-on farm, craft and skill-building sessions.",
    },
    {
      id: "wellness",
      label: "Wellness",
      icon: Leaf,
      apiCategory: "wellness",
      description: "Ayurveda, yoga and restorative retreats.",
    },
    {
      id: "family",
      label: "Family",
      icon: Users,
      apiCategory: "family",
      description: "Kid-friendly outings the whole family will enjoy.",
    },
  ],
  emptyTitle: "No experiences found",
  emptyDescription:
    "There are no experiences matching your current filters. Try a different category or clear your search.",
};

/** Resolve a category def by id (falls back to the default category). */
export function resolveCategory(
  config: ListingPageConfig,
  categoryId?: string | null
): ListingCategoryDef {
  const found = config.categories.find((c) => c.id === categoryId);
  return found || config.categories.find((c) => c.id === config.defaultCategory) || config.categories[0];
}
