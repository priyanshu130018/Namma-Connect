import { ListingPage } from "@/components/marketplace";
import { experienceConfig } from "@/config/listingConfig";

/**
 * Experience — curated things to do, grouped by vibe. Reuses the same generic
 * ListingPage as Explore, configured with the 5 experience chips + "All"
 * (Nature & Adventure, Food & Culture, Workshops, Wellness, Family).
 */
export function CustomerExperiencePage() {
  return <ListingPage config={experienceConfig} />;
}
