export interface ExploreCategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  count: number;
}

export const EXPLORE_CATEGORIES: ExploreCategoryItem[] = [
  {
    id: "cat-1",
    name: "Experiences",
    slug: "experiences",
    description: "Hands-on harvest workshops, pottery, and traditional agro-crafts",
    iconName: "Wheat",
    count: 48,
  },
  {
    id: "cat-2",
    name: "Guides & Tours",
    slug: "guides-tours",
    description: "Canopy walks, spice identification, and farmer-led nature treks",
    iconName: "Compass",
    count: 36,
  },
  {
    id: "cat-3",
    name: "Travel Services",
    slug: "travel-services",
    description: "Rural EV rentals, tractor safari shuttles, and station pick-ups",
    iconName: "Car",
    count: 19,
  },
  {
    id: "cat-4",
    name: "Stay",
    slug: "stay",
    description: "Heritage coffee estates, organic farmhouses, and treehouses",
    iconName: "Home",
    count: 92,
  },
  {
    id: "cat-5",
    name: "Food",
    slug: "food",
    description: "Organic farm-to-table dining and traditional earthen pot meals",
    iconName: "Utensils",
    count: 27,
  },
  {
    id: "cat-6",
    name: "Events",
    slug: "events",
    description: "Harvest folk festivals, agro-fairs, and seasonal night stargazing",
    iconName: "CalendarDays",
    count: 14,
  },
];

export interface RecommendedServiceItem {
  id: string;
  title: string;
  providerName: string;
  isVerified: boolean;
  location: string;
  category: string;
  categorySlug: string;
  price: number;
  unit: string;
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  amenities: string[];
  description: string;
  crops: string[];
}

export const RECOMMENDED_SERVICES: RecommendedServiceItem[] = [
  {
    id: "srv-coorg-01",
    title: "Highland Arabica Coffee Estate Stay & Cupping",
    providerName: "Kodagu Organics Farm",
    isVerified: true,
    location: "Madikeri, Coorg, Karnataka",
    category: "Stay",
    categorySlug: "stay",
    price: 3499,
    unit: "night",
    rating: 4.92,
    reviewsCount: 148,
    imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80",
    amenities: ["Farm Breakfast Included", "Coffee Cupping Session", "Solar Heated Water", "Nature Trails"],
    description: "Immerse in a 120-acre lush heritage shade-grown coffee plantation. Wake up to fresh cardamom-infused coffee and mist over the Western Ghats.",
    crops: ["Arabica Coffee", "Black Pepper", "Green Cardamom"],
  },
  {
    id: "srv-wayanad-02",
    title: "Organic Spice Trail & Honey Harvest Workshop",
    providerName: "Wayanad Eco Guild",
    isVerified: true,
    location: "Kalpetta, Wayanad, Kerala",
    category: "Experiences",
    categorySlug: "experiences",
    price: 1250,
    unit: "person",
    rating: 4.88,
    reviewsCount: 94,
    imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6eb2252a?w=800&auto=format&fit=crop&q=80",
    amenities: ["Beekeeping Suit Provided", "Fresh Wild Honey Jar", "Spices Tasting", "Guide Included"],
    description: "Hands-on apiary workshop and regenerative spice foraging trail guided by certified tribal agro-naturalists.",
    crops: ["Wild Honey", "Clove", "Cinnamon", "Nutmeg"],
  },
  {
    id: "srv-chikmagalur-03",
    title: "Mullayanagiri Foothill Agro-Cottage & Trek",
    providerName: "Giri Bio Farms",
    isVerified: true,
    location: "Chikmagalur, Karnataka",
    category: "Stay",
    categorySlug: "stay",
    price: 2899,
    unit: "night",
    rating: 4.85,
    reviewsCount: 76,
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80",
    amenities: ["Campfire & Stargazing", "Local Malnad Thali", "Estate River Stream", "Free WiFi"],
    description: "Nestled at the base of Karnataka's highest peak, experience rustic cottages surrounded by organic pepper vines and natural water streams.",
    crops: ["Robusta Coffee", "Silver Oak", "Ginger"],
  },
  {
    id: "srv-munnar-04",
    title: "Artisanal Tea Plucking & Woodfire Cooking Class",
    providerName: "High Range Village Collective",
    isVerified: true,
    location: "Munnar, Kerala",
    category: "Guides & Tours",
    categorySlug: "guides-tours",
    price: 950,
    unit: "person",
    rating: 4.95,
    reviewsCount: 210,
    imageUrl: "https://images.unsplash.com/photo-1589802829985-817e51171b92?w=800&auto=format&fit=crop&q=80",
    amenities: ["Traditional Tea Basket", "Earthen Pot Lunch", "Tea Processing Demo", "Photography Friendly"],
    description: "Walk alongside generational tea artisans, learn the two-leaves-and-a-bud technique, and hand-roll your own organic tea leaves.",
    crops: ["Orthodox Tea", "Vanilla", "Eucalyptus"],
  },
  {
    id: "srv-pollachi-05",
    title: "Anamalai Coconut Grove Glamping & Bull-Cart Trail",
    providerName: "Kongu Eco Farms",
    isVerified: true,
    location: "Pollachi, Tamil Nadu",
    category: "Stay",
    categorySlug: "stay",
    price: 3200,
    unit: "night",
    rating: 4.79,
    reviewsCount: 52,
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
    amenities: ["Tender Coconut on Arrival", "Canal Bathing", "Bullock Cart Ride", "Farm Lunch"],
    description: "Experience tranquil glamping tents situated amidst towering coconut palms and regenerative cocoa undercrops along the Anamalai river basin.",
    crops: ["Tall & Dwarf Coconut", "Cocoa", "Areca Nut"],
  },
  {
    id: "srv-hampi-06",
    title: "Traditional Banana Fiber Weaving & Agro-Dinner",
    providerName: "Tungabhadra Crafts & Farms",
    isVerified: true,
    location: "Anegundi, Hampi, Karnataka",
    category: "Food",
    categorySlug: "food",
    price: 1100,
    unit: "person",
    rating: 4.91,
    reviewsCount: 88,
    imageUrl: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=800&auto=format&fit=crop&q=80",
    amenities: ["Weaving Kit to Keep", "Unlimited Millets Buffet", "Folk Music Night", "Bicycle Parking"],
    description: "Learn zero-waste banana stalk fiber craft from women artisan self-help groups followed by a multi-course regional millet dinner.",
    crops: ["Grand Naine Banana", "Finger Millet (Ragi)", "Pomegranate"],
  },
];

export interface CreatorItem {
  id: string;
  name: string;
  role: string;
  handle: string;
  location: string;
  rating: number;
  reach: string;
  avatarUrl: string;
  specialty: string[];
  startingRate: number;
  bio: string;
}

export const FEATURED_CREATORS: CreatorItem[] = [
  {
    id: "cr-01",
    name: "Arjun Nambiar",
    role: "Rural Agro-Storyteller & Drone Pilot",
    handle: "@arjun_wildtrails",
    location: "Kochi, Kerala",
    rating: 4.94,
    reach: "185K+ Followers",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    specialty: ["4K Drone Cinematography", "Estate Documentary", "Reels Creation"],
    startingRate: 15000,
    bio: "Passionate visual filmmaker spotlighting sustainable farming families, biodiversity conservation, and estate retreats across South India.",
  },
  {
    id: "cr-02",
    name: "Ananya Deshmukh",
    role: "Food & Farm-to-Table Chronicler",
    handle: "@ananya_eatslocal",
    location: "Bengaluru, Karnataka",
    rating: 4.89,
    reach: "320K+ Followers",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    specialty: ["Culinary Storytelling", "Heritage Recipes", "Brand Collabs"],
    startingRate: 20000,
    bio: "Culinary explorer reviving forgotten regional tribal recipes, millets cuisine, and farm-stay dining narratives.",
  },
  {
    id: "cr-03",
    name: "Vikramaditya Roy",
    role: "Biodiversity & Heritage Photographer",
    handle: "@vikram_lenscraft",
    location: "Mysuru, Karnataka",
    rating: 4.96,
    reach: "95K+ Followers",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    specialty: ["High-Res Media Kits", "Night Stargazing Timelapses", "Print Rights"],
    startingRate: 12500,
    bio: "National Geographic featured landscape photographer capturing the spirit of Indian plantations and organic farmer cooperatives.",
  },
];

export interface CustomerBookingItem {
  id: string;
  bookingCode: string;
  serviceId: string;
  serviceTitle: string;
  providerName: string;
  location: string;
  checkInDate: string;
  checkOutDate: string;
  status: "upcoming" | "completed" | "cancelled";
  guests: number;
  totalAmount: number;
  qrCodeUrl?: string;
  hostPhone: string;
  imageUrl: string;
}

export const SAMPLE_BOOKINGS: CustomerBookingItem[] = [
  {
    id: "bk-1001",
    bookingCode: "NC-2026-8812",
    serviceId: "srv-coorg-01",
    serviceTitle: "Highland Arabica Coffee Estate Stay & Cupping",
    providerName: "Kodagu Organics Farm",
    location: "Madikeri, Coorg, Karnataka",
    checkInDate: "2026-09-15",
    checkOutDate: "2026-09-17",
    status: "upcoming",
    guests: 2,
    totalAmount: 6998,
    hostPhone: "+91 94481 23456",
    imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "bk-1002",
    bookingCode: "NC-2026-7241",
    serviceId: "srv-wayanad-02",
    serviceTitle: "Organic Spice Trail & Honey Harvest Workshop",
    providerName: "Wayanad Eco Guild",
    location: "Kalpetta, Wayanad, Kerala",
    checkInDate: "2026-07-10",
    checkOutDate: "2026-07-10",
    status: "completed",
    guests: 3,
    totalAmount: 3750,
    hostPhone: "+91 98470 56789",
    imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6eb2252a?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "bk-1003",
    bookingCode: "NC-2026-5590",
    serviceId: "srv-munnar-04",
    serviceTitle: "Artisanal Tea Plucking & Woodfire Cooking Class",
    providerName: "High Range Village Collective",
    location: "Munnar, Kerala",
    checkInDate: "2026-06-02",
    checkOutDate: "2026-06-02",
    status: "cancelled",
    guests: 2,
    totalAmount: 1900,
    hostPhone: "+91 97455 11223",
    imageUrl: "https://images.unsplash.com/photo-1589802829985-817e51171b92?w=600&auto=format&fit=crop&q=80",
  },
];

export interface CollaborationItem {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  campaignTitle: string;
  proposedDates: string;
  deliverables: string[];
  budget: number;
  status: "requests" | "accepted" | "rejected" | "completed";
  createdAt: string;
}

export const SAMPLE_COLLABORATIONS: CollaborationItem[] = [
  {
    id: "collab-01",
    creatorId: "cr-01",
    creatorName: "Arjun Nambiar",
    creatorHandle: "@arjun_wildtrails",
    campaignTitle: "Coffee Blossom Season 4K Drone Showcase",
    proposedDates: "Oct 10 - Oct 12, 2026",
    deliverables: ["2x Instagram Reels", "1x High-Res Photo Pack (15 shots)", "1x YouTube Short"],
    budget: 15000,
    status: "requests",
    createdAt: "2026-08-20",
  },
  {
    id: "collab-02",
    creatorId: "cr-02",
    creatorName: "Ananya Deshmukh",
    creatorHandle: "@ananya_eatslocal",
    campaignTitle: "Heritage Malnad Earthen Cooking Feature",
    proposedDates: "Aug 05 - Aug 06, 2026",
    deliverables: ["1x Long-form Video Feature", "3x Instagram Stories"],
    budget: 20000,
    status: "accepted",
    createdAt: "2026-07-28",
  },
];

export interface ProviderTypeItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  badge: string;
  requirements: string[];
}

export const PROVIDER_TYPES: ProviderTypeItem[] = [
  {
    id: "farmer",
    title: "Farmer / Agriculture Host",
    description: "Growers, plantation holders, and rural agro-estates offering tours and farm stays.",
    iconName: "Sprout",
    badge: "Most Popular",
    requirements: ["Land ownership/lease deed", "Aadhaar KYC", "Bank account details"],
  },
  {
    id: "guide",
    title: "Local Guide & Naturalist",
    description: "Certified eco-guides, birding naturalists, and trekking leaders.",
    iconName: "Compass",
    badge: "Experiences",
    requirements: ["Govt / Tourism ID", "First aid certification", "Local address proof"],
  },
  {
    id: "travel",
    title: "Travel / Rural Driver",
    description: "Local drivers providing pickup, village shuttles, and scenic jeep safaris.",
    iconName: "Car",
    badge: "Transit",
    requirements: ["Commercial driving license", "Vehicle registration & insurance"],
  },
  {
    id: "hotel",
    title: "Eco Hotel / Homestay Owner",
    description: "Eco-lodges, farm villas, and homestays celebrating local culture.",
    iconName: "Building2",
    badge: "Hospitality",
    requirements: ["Homestay registration", "Property pictures", "Trade license"],
  },
  {
    id: "creator",
    title: "Content Creator / Storyteller",
    description: "Photographers, drone pilots, and filmmakers collaborating on rural campaigns.",
    iconName: "Camera",
    badge: "Media Studio",
    requirements: ["Social media profile links", "Portfolio link", "GST/PAN details"],
  },
  {
    id: "artisan",
    title: "Rural Artisan & Craftsman",
    description: "Potters, weavers, and folk artists offering experiential workshops.",
    iconName: "Palette",
    badge: "Heritage Crafts",
    requirements: ["Crafts council / Aadhaar ID", "Workshop venue details"],
  },
  {
    id: "homestay",
    title: "Plantation Homestay Host",
    description: "Family-run estate homestays offering home-cooked regional feasts.",
    iconName: "Home",
    badge: "Family Host",
    requirements: ["Local panchayat NOC", "Aadhaar verification", "Food hygiene checklist"],
  },
];
