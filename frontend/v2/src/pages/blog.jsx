import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams, Link } from "@/lib/router-compat";
import {
  FiClock, FiHeart, FiBookmark, FiShare2,
  FiArrowLeft, FiArrowRight
} from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const blogPosts = [
  {
    id: 1,
    title: "The Art of Coffee Picking in Coorg",
    excerpt: "Learn why picking the right cherry at the right time is the secret to great coffee.",
    content: "Coffee is not just a crop in Coorg; it is a way of life...\n\n**The Golden Rule**\nOnly pick the bright red ones! Each cherry is hand-selected to ensure the highest quality...",
    tag: "Coffee",
    author: "Somanna K.",
    date: "Oct 24, 2025",
    readTime: "5 min",
    img: "☕",
    relatedFarmId: 1
  },
  {
    id: 2,
    title: "Organic Farming: My First Week",
    excerpt: "What I learned when I swapped my laptop for a hoe in rural Karnataka.",
    content: "The first thing you notice is the silence. Then the birds. Then the back pain...\n\n**Morning Routine**\nWe start at 5:00 AM. The dew is still on the ground...",
    tag: "Organic",
    author: "Anita R.",
    date: "Nov 12, 2025",
    readTime: "8 min",
    img: "🌿"
  },
  {
    id: 3,
    title: "Discovering the Hidden Waterfalls of Malnad",
    excerpt: "A guide to the secret spots that locals don't want you to find.",
    tag: "Travel Tips",
    author: "Rohan D.",
    date: "Dec 05, 2025",
    readTime: "12 min",
    img: "🌊"
  },
  {
    id: 4,
    title: "Tea Tasting: Varieties of the Western Ghats",
    excerpt: "From Oolong to Green, understand the flavor profiles of our mountain tea.",
    tag: "Tea",
    author: "Prasad M.",
    date: "Dec 18, 2025",
    readTime: "6 min",
    img: "🍵"
  },
  {
    id: 5,
    title: "The Rice Cycle: Seed to Harvest",
    excerpt: "Why traditional paddy cultivation is still the heart of Indian agriculture.",
    tag: "Rice",
    author: "Lakshmi H.",
    date: "Jan 10, 2026",
    readTime: "15 min",
    img: "🌾"
  },
  {
    id: 6,
    title: "Mango Season: A Celebration of Flavor",
    excerpt: "Preparing for the summer harvest of the king of fruits.",
    tag: "Mango",
    author: "Suresh P.",
    date: "Feb 02, 2026",
    readTime: "7 min",
    img: "🥭"
  }
];

const TAGS = ["All", "Coffee", "Tea", "Rice", "Organic", "Mango", "Travel Tips"];
const INITIAL_VISIBLE = 9;

function Markdown({ content }) {
  const lines = content.split("\n");
  return (
    <div className="prose prose-slate max-w-none text-foreground leading-relaxed space-y-3 text-base">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.startsWith("**") && line.endsWith("**")) {
          return <h3 key={i} className="text-lg font-semibold text-foreground mt-6 mb-1">{line.replace(/\*\*/g, "")}</h3>;
        }
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") ? <strong key={j}>{p.replace(/\*\*/g, "")}</strong> : <span key={j}>{p}</span>
        );
        return <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

export function BlogPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const post = blogPosts.find(p => p.id === Number(id));
  const relatedPosts = blogPosts.filter(p => p.id !== Number(id)).slice(0, 3);

  if (!post) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Post not found</h2>
        <Link to="/blog" className="btn-primary text-sm">← Back to Blog</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <Navbar minimal />

      <div className="bg-card pt-32 pb-10 border-b border-border">
        <div className="max-w-4xl mx-auto px-6">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 font-medium transition-colors"
          >
            <FiArrowLeft size={14} /> Back to Blog
          </button>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">{post.tag}</span>
            <span className="text-muted-foreground">·</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><FiClock size={10} />{post.readTime} read</span>
          </div>
          <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-semibold text-foreground mb-4 leading-tight"
          >{post.title}</motion.h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6 italic">"{post.excerpt}"</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                {post.author[0]}
              </div>
              <span className="font-semibold text-foreground text-sm">{post.author}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary/10 border-b border-primary/30">
        <div className="max-w-4xl mx-auto px-6 py-10 flex items-center justify-center">
          <div className="text-[120px] drop-shadow-sm">{post.img}</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-sm mb-10">
          <Markdown content={post.content} />
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-5">More Stories</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {relatedPosts.map(p => (
            <motion.div key={p.id} whileHover={{ y: -4 }}
              className="bg-card rounded-2xl border border-border shadow-sm cursor-pointer overflow-hidden"
              onClick={() => navigate(`/blog/${p.id}`)}
            >
              <div className="h-28 bg-primary/10 flex items-center justify-center text-5xl">{p.img}</div>
              <div className="p-4">
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">{p.tag}</span>
                <h4 className="font-bold text-foreground text-sm mt-2 line-clamp-2 leading-snug">{p.title}</h4>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><FiClock size={9} />{p.readTime}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function Blog() {
  const navigate = useNavigate();
  const [activeTag, setActiveTag] = useState("All");
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const filtered = activeTag === "All" ? blogPosts : blogPosts.filter(p => p.tag === activeTag);
  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  const resetAndFilter = (tag) => { setActiveTag(tag); setVisible(INITIAL_VISIBLE); };

  return (
    <div className="min-h-screen bg-card">
      <Navbar />

      <div className="sticky top-16 z-30 bg-card/80 backdrop-blur-md border-b border-border py-3 px-6 select-none">
        <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide">
          {TAGS.map(t => (
            <button key={t} onClick={() => resetAndFilter(t)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-widest transition-all ${
                activeTag === t ? "bg-foreground text-primary-foreground shadow-sm" : "bg-surface text-muted-foreground hover:bg-muted hover:text-muted-foreground"
              }`}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10 pb-16">
        {shown.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-muted-foreground">No posts in this category yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {shown.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -8 }}
                onClick={() => navigate(`/blog/${post.id}`)}
                className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer transition-all duration-500 group relative hover:shadow-md hover: hover:border-primary/30"
              >
                <div className="h-48 bg-surface flex items-center justify-center text-8xl relative overflow-hidden">
                  <div className="group-hover:scale-125 transition-transform duration-700 ease-out z-10">{post.img}</div>
                  <div className="absolute inset-0 bg-linear-to-t from-white via-transparent to-transparent opacity-60" />
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold uppercase tracking-widest border border-primary/30/50">{post.tag}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{post.date}</span>
                  </div>
                  
                  <h3 className="font-semibold text-foreground text-xl mb-3 leading-tight group-hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 font-medium">{post.excerpt}</p>

                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-xl bg-foreground flex items-center justify-center text-primary-foreground text-[10px] font-semibold group-hover:bg-primary transition-colors">
                         {post.author[0]}
                       </div>
                       <div>
                         <p className="text-[10px] font-semibold text-foreground">{post.author}</p>
                         <p className="text-[9px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-tight"><FiClock size={8} /> {post.readTime} read</p>
                       </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center mt-10">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setVisible(v => v + 3)}
              className="flex items-center gap-2 bg-card border border-border hover:border-primary/30 text-foreground hover:text-primary font-semibold px-8 py-3 rounded-xl shadow-sm transition-all text-sm"
            >
              Load More Posts
            </motion.button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
