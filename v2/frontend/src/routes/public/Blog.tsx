import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Container, Section } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageMetadata } from "@/components/seo/PageMetadata";
import {
  Calendar,
  Clock,
  User,
  ArrowRight,
  ArrowLeft,
  Search,
  BookOpen,
  Tag,
} from "lucide-react";



export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  category: "Agro-Tourism" | "Trip Planning" | "AI Technology" | "Community & Culture";
  author: string;
  date: string;
  readTime: string;
  tags: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "agentic-trip-planning-in-rural-karnataka",
    title: "How Agentic AI Transforms Multi-Day Rural Trip Planning",
    excerpt: "Discover how Namma Connect's multi-turn Agentic Trip Planner creates verified, budget-aligned, and conflict-free travel itineraries.",
    content: [
      "Planning a multi-day rural journey across South India's agricultural landscapes often involves complex logistics: verifying plantation stay availability, synchronizing 4x4 transit over estate trails, and respecting seasonal harvesting schedules.",
      "Traditional travel portals offer disjointed booking forms with no awareness of geographic distance or local provider constraints. Namma Connect V2 addresses this with a dedicated Agentic Trip Planner built directly on top of our marketplace catalog.",
      "Our AI agent operates across an explicit 9-state machine: from requirements collection and provider search to availability validation, conflict detection, and itinerary refinement.",
      "Every recommended activity and accommodation is grounded in live provider inventory with decimal-safe pricing and capacity bounds, eliminating fabricated pricing or unavailable dates.",
      "Once an itinerary is finalized, travelers receive a structured day-by-day plan with pre-booking handoff, putting guests in full control before any financial commitment."
    ],
    category: "AI Technology",
    author: "Namma Connect Engineering",
    date: "September 2026",
    readTime: "4 min read",
    tags: ["AI", "Trip Planner", "Technology", "Innovation"],
  },
  {
    slug: "sustainable-coffee-estate-harvest-trails",
    title: "A Conscious Traveler's Guide to Coorg and Chikmagalur Coffee Trails",
    excerpt: "Step into shade-grown Arabica plantations, participate in organic harvesting, and savor authentic Malnad cuisine.",
    content: [
      "The Western Ghats of Karnataka are home to some of the world's finest shade-grown coffee ecosystems, where Arabica and Robusta bushes flourish beneath towering native jungle canopies.",
      "Through Namma Connect, travelers can step beyond generic commercial resorts and stay directly on historic family-owned estates.",
      "Guests participate in morning bean hand-picking, observe wet-mill processing, and learn traditional wood-fire roasting techniques directly from master estate growers.",
      "Evenings feature wood-fired regional dinners with authentic Akki Rotti, bamboo shoot curries, and farm-fresh honey infusions.",
      "By connecting directly through our verified provider marketplace, over 95% of booking value enriches rural hosting families and estate workers."
    ],
    category: "Agro-Tourism",
    author: "Malnad Heritage Team",
    date: "August 2026",
    readTime: "5 min read",
    tags: ["Coffee", "Coorg", "Ecotourism", "Farm Stays"],
  },
  {
    slug: "empowering-rural-hosts-provider-intelligence",
    title: "Empowering Rural Hosts with Provider Intelligence & Analytics",
    excerpt: "Learn how smallholder farmers and local guides use Namma Connect's Provider Intelligence dashboard to optimize seasonal bookings.",
    content: [
      "For smallholder farmers, managing online reservations, calendar blackouts, and guest manifests can be challenging without dedicated technology tools.",
      "The Namma Connect Provider Portal equips rural hosts with automated weekly availability management, booking request notifications, and transparent earnings tracking.",
      "Through our Provider Intelligence layer, hosts gain visibility into seasonal demand trends, profile completeness scores, and guest feedback ratings.",
      "With automated payout settlements and zero upfront listing fees, hosts can focus on delivering unforgettable rural hospitality."
    ],
    category: "Community & Culture",
    author: "Community Operations",
    date: "July 2026",
    readTime: "3 min read",
    tags: ["Providers", "Empowerment", "Analytics", "Rural Economy"],
  },
];

export function BlogPage() {
  const { slug } = useParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>(" ");

  // Article Detail View
  if (slug) {
    const post = BLOG_POSTS.find((p) => p.slug === slug);

    if (!post) {
      return (
        <Section className="py-12 bg-slate-50 min-h-screen">
          <PageMetadata title="Article Not Found" description="The requested article could not be found." />
          <Container size="sm" className="text-center space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <BookOpen className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Article Not Found</h1>
            <p className="text-sm text-slate-600">The requested blog post could not be found or has been moved.</p>
            <Link to="/blog">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Blog
              </Button>
            </Link>
          </Container>
        </Section>
      );
    }

    const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

    return (
      <Section className="py-10 bg-slate-50 min-h-screen">
        <PageMetadata
          title={post.title}
          description={post.excerpt}
          type="article"
        />

        <Container size="default" className="space-y-8 max-w-4xl">

          <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors">

            <ArrowLeft className="h-4 w-4" /> Back to all articles
          </Link>

          <article className="p-8 sm:p-12 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default" className="bg-emerald-600 text-white font-bold">{post.category}</Badge>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> {post.readTime}</span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-xs text-slate-500"><Calendar className="h-3.5 w-3.5" /> {post.date}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {post.title}
              </h1>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                <User className="h-4 w-4 text-emerald-600" />
                <span>Written by {post.author}</span>
              </div>
            </div>

            <div className="space-y-4 text-slate-700 text-base leading-relaxed border-t border-slate-100 pt-6">
              {post.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600">
                  <Tag className="h-3 w-3" /> {tag}
                </span>
              ))}
            </div>
          </article>

          {/* Related Articles */}
          <div className="space-y-4 pt-6">
            <h3 className="text-lg font-bold text-slate-900">Related Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedPosts.map((related) => (
                <Card key={related.slug} className="p-6 bg-white rounded-3xl border-slate-200 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-[10px] font-bold">{related.category}</Badge>
                    <h4 className="text-base font-bold text-slate-900 line-clamp-2">{related.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{related.excerpt}</p>
                  </div>
                  <Link to={`/blog/${related.slug}`} className="pt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800">
                    Read article <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </Section>
    );
  }

  // Blog Listing View
  const categories = ["All", "Agro-Tourism", "Trip Planning", "AI Technology", "Community & Culture"];

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch =
      cleanQuery === "" ||
      post.title.toLowerCase().includes(cleanQuery) ||
      post.excerpt.toLowerCase().includes(cleanQuery) ||
      post.tags.some((t) => t.toLowerCase().includes(cleanQuery));
    return matchesCategory && matchesSearch;
  });

  return (
    <Section className="py-8 sm:py-12 bg-slate-50 min-h-screen">
      <PageMetadata
        title="Stories & Insights - Rural Travel & AI Guides"
        description="Discover agricultural travel guides, responsible agro-tourism tips, and behind-the-scenes engineering of our AI Trip Planner."
      />

      <Container className="space-y-10">
        <PageHeader
          title="Namma Connect Insights & Stories"
          subtitle="Discover agricultural travel guides, responsible agro-tourism tips, and behind-the-scenes engineering of our AI Trip Planner."
        />

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-2xl bg-white border-slate-200 text-xs"
            />
          </div>
        </div>


        {/* Article Cards Grid */}
        {filteredPosts.length === 0 ? (
          <Card className="p-12 text-center bg-white rounded-3xl border-slate-200 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No articles match your criteria</h3>
            <p className="text-xs text-slate-500">Try adjusting your search query or selecting a different category filter.</p>
            <Button variant="outline" size="sm" onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}>
              Reset Filters
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <Card
                key={post.slug}
                className="p-6 bg-white rounded-3xl border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-[11px]">
                      {post.category}
                    </Badge>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="h-3 w-3" /> {post.readTime}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <User className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{post.author}</span>
                  </div>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform"
                  >
                    Read article <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
