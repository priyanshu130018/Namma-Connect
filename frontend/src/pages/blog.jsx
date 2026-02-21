import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams, Link } from "react-router-dom";
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
    readTime: "8 min",
    img: "🌿"
  }
];

const TAGS = ["All", "Coffee", "Tea", "Rice", "Organic", "Mango", "Travel Tips"];
const INITIAL_VISIBLE = 6;

function Markdown({ content }) {
  const lines = content.split("\n");
  return (
    <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed space-y-3 text-base">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.startsWith("**") && line.endsWith("**")) {
          return <h3 key={i} className="text-lg font-black text-slate-900 mt-6 mb-1">{line.replace(/\*\*/g, "")}</h3>;
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Post not found</h2>
        <Link to="/blog" className="btn-primary text-sm">← Back to Blog</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />

      <div className="bg-white pt-24 pb-10 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 font-medium transition-colors"
          >
            <FiArrowLeft size={14} /> Back to Blog
          </button>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">{post.tag}</span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1 text-xs text-slate-400"><FiClock size={10} />{post.readTime} read</span>
          </div>
          <motion.h1 initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight"
          >{post.title}</motion.h1>
          <p className="text-slate-500 text-lg leading-relaxed mb-6 italic">"{post.excerpt}"</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-black">
                {post.author[0]}
              </div>
              <span className="font-semibold text-slate-700 text-sm">{post.author}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border-b border-green-100">
        <div className="max-w-4xl mx-auto px-6 py-10 flex items-center justify-center">
          <div className="text-[120px] drop-shadow-sm">{post.img}</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-slate-200 shadow-sm mb-10">
          <Markdown content={post.content} />
        </div>

        <h2 className="text-xl font-black text-slate-900 mb-5">More Stories</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {relatedPosts.map(p => (
            <motion.div key={p.id} whileHover={{ y: -4 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm cursor-pointer overflow-hidden"
              onClick={() => navigate(`/blog/${p.id}`)}
            >
              <div className="h-28 bg-green-50 flex items-center justify-center text-5xl">{p.img}</div>
              <div className="p-4">
                <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-bold">{p.tag}</span>
                <h4 className="font-bold text-slate-900 text-sm mt-2 line-clamp-2 leading-snug">{p.title}</h4>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><FiClock size={9} />{p.readTime}</p>
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
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="sticky top-16 z-30 bg-white border-b border-slate-100 shadow-sm pt-20 pb-4 px-6">
        <div className="max-w-5xl mx-auto flex gap-2 overflow-x-auto scrollbar-hide">
          {TAGS.map(t => (
            <button key={t} onClick={() => resetAndFilter(t)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeTag === t ? "bg-green-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
        {shown.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-slate-500">No posts in this category yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shown.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,0,0,0.1)" }}
                onClick={() => navigate(`/blog/${post.id}`)}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden cursor-pointer transition-all duration-300 group"
              >
                <div className="h-44 bg-green-50 flex items-center justify-center text-7xl relative overflow-hidden">
                  <div className="group-hover:scale-110 transition-transform duration-500">{post.img}</div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="p-5">
                  <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold">{post.tag}</span>
                  <h3 className="font-black text-slate-900 mt-2.5 mb-2 leading-snug group-hover:text-green-700 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{post.excerpt}</p>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">{post.author[0]}</div>
                      {post.author}
                      <span className="flex items-center gap-0.5"><FiClock size={9} />{post.readTime}</span>
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
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-green-400 text-slate-700 hover:text-green-600 font-semibold px-8 py-3 rounded-xl shadow-sm transition-all text-sm"
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
