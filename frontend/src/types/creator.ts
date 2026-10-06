export interface PortfolioItem {
  title: string;
  location: string;
  imageUrl: string;
  description?: string;
  category?: string;
}

export interface CreatorPackage {
  id?: string;
  title: string;
  price: number;
  deliverables: string[];
  turnaround: string;
  description?: string;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string;
  handle: string;
  avatar_url?: string | null;
  bio: string;
  location: string;
  reach: string;
  starting_rate: number;
  rating: number;
  reviews_count: number;
  is_verified: boolean;
  specialties: string[];
  social_links: Record<string, string>;
  portfolio_items: PortfolioItem[];
  packages: CreatorPackage[];
  created_at?: string | null;
}

export interface CollaborationItem {
  id: string;
  collaboration_code: string;
  creator_id: string;
  creator_name: string;
  creator_handle: string;
  partner_id: string;
  partner_name: string;
  campaign_title: string;
  message: string;
  proposed_dates: string;
  budget: number;
  deliverables: string[];
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";
  created_at?: string | null;
}

export interface CollaborationCreatePayload {
  creator_id: string;
  campaign_title: string;
  message: string;
  proposed_dates: string;
  budget: number;
  deliverables: string[];
}
