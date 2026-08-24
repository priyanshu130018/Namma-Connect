// Wishlist — stored in localStorage under key "ng_wishlist"
// Shape: [{ id, type: "farm"|"creator", name, photo, location, price }]

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiHeart, FiMapPin, FiArrowRight, FiTrash2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

// Helper to get the correct storage key for the current user
const getStorageKey = () => {
  const user = JSON.parse(localStorage.getItem("ng_user") || "null");
  const userId = user?.userId || user?.id || "guest";
  return `ng_wishlist_${userId}`;
};

// ── Public helpers used by FarmerCard / CreatorCard ──────────────────────────
export function getWishlist() {
  const key = getStorageKey();
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}

export function isInWishlist(id, type) {
  return getWishlist().some(w => w.id === id && w.type === type);
}

export function toggleWishlist(item, type) {
  const key = getStorageKey();
  const list = getWishlist();
  const idx  = list.findIndex(w => w.id === item.id && w.type === type);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push({
      id:       item.id,
      type,
      name:     item.farm_name || item.name || "—",
      photo:    item.farm_photo || item.photo || null,
      location: item.location  || item.state || "",
      price:    item.price_per_night || item.price || null,
    });
  }
  localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new Event("wishlist-change"));
  return !( idx >= 0 ); // returns true if now added
}

// ── Wishlist Drawer Component ────────────────────────────────────────────────
export default function WishlistDrawer({ open, onClose }) {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const reload = () => setItems(getWishlist());

  useEffect(() => {
    reload();
    window.addEventListener("wishlist-change", reload);
    return () => window.removeEventListener("wishlist-change", reload);
  }, []);

  useEffect(() => { if (open) reload(); }, [open]);

  const remove = (id, type) => {
    const list = getWishlist().filter(w => !(w.id === id && w.type === type));
    localStorage.setItem(getStorageKey(), JSON.stringify(list));
    setItems(list);
    window.dispatchEvent(new Event("wishlist-change"));
  };

  const handleOpen = (item) => {
    onClose();
    navigate(`/${item.type === "farm" ? "farmercard" : "creatorcard"}/${item.id}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-[70] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <FiHeart className="text-red-500" size={16} />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-base leading-none">Wishlist</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{items.length} Saved Items</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { onClose(); navigate("/home"); }}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-200 flex items-center justify-center transition-all shadow-sm"
                  title="Go to Home"
                >
                  <FiArrowRight size={16} />
                </button>
                <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all shadow-sm">
                  <FiX size={16} />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                    <FiHeart size={40} className="text-slate-200" />
                  </div>
                  <h3 className="font-black text-slate-900 text-lg mb-2">Nothing saved yet</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    Tap the heart icon on any farm or creator card to save it here for later.
                  </p>
                  <button
                    onClick={() => { onClose(); navigate("/home"); }}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                  >
                    Go Exploring <FiArrowRight size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <motion.div
                        key={`${item.type}-${item.id}`}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 group hover:border-red-100 hover:bg-red-50/10 transition-all shadow-sm"
                      >
                        {/* Thumbnail */}
                        <div
                          className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 cursor-pointer border border-slate-100 shadow-inner"
                          onClick={() => handleOpen(item)}
                        >
                          {item.photo ? (
                            <img src={item.photo} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center font-black text-xl ${item.type === "farm" ? "bg-amber-100 text-amber-500" : "bg-purple-100 text-purple-500"}`}>
                              {item.name?.[0] || "?"}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleOpen(item)}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${item.type === "farm" ? "bg-amber-100 text-amber-600" : "bg-purple-100 text-purple-600"}`}>
                              {item.type === "farm" ? "Farm" : "Creator"}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-sm truncate leading-tight">{item.name}</p>
                          {item.location && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate mt-0.5">
                              <FiMapPin size={10} /> {item.location}
                            </p>
                          )}
                        </div>

                        {/* Remove */}
                        <button
                          onClick={(e) => { e.stopPropagation(); remove(item.id, item.type); }}
                          className="w-10 h-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all group-hover:bg-slate-50 shrink-0 border border-transparent hover:border-red-100"
                          title="Remove from wishlist"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </div>

                  {/* Footer Action */}
                  <div className="pt-4 mt-6 border-t border-slate-100">
                    <button
                      onClick={() => { onClose(); navigate("/home"); }}
                      className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-black hover:border-amber-300 hover:text-amber-500 hover:bg-amber-50/30 transition-all"
                    >
                      <FiArrowRight size={14} /> Continue Exploring
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">
                      Saved to your local browser
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
