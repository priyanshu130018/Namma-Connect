import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiEdit2, FiTrash2, FiX, FiMapPin, FiInbox } from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { farmAPI } from "@/services/api";

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

export default function FarmerListings() {
  const navigate = useNavigate();
  const user = getUser();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.loginId) {
      farmAPI.getListings(user.loginId)
        .then(res => {
          setListings(res.data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user?.loginId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-24 pb-16 px-6 flex flex-col items-center min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-slate-900">My Listings</h1>
              <p className="text-slate-500 text-sm mt-1">Manage your farm experiences</p>
            </div>
            <Link to="/farmer/listing/new" className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 text-sm">
              <FiPlus size={14} /> Add Listing
            </Link>
          </div>

          <div className="space-y-4 w-full">
            {loading ? (
              <div className="py-20 text-center text-slate-400">Loading your farm listings...</div>
            ) : listings.length === 0 ? (
              <div className="py-20 text-center">
                <FiInbox size={48} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 text-sm">No farm registered yet. Click "Add Listing" to register your farm!</p>
              </div>
            ) : (
              listings.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4 hover:border-amber-300 transition-all group"
                >
                  <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl">🌾</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{item.name}</h3>
                    <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5"><FiMapPin size={9}/>{item.area}, {item.state}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                    <button 
                      onClick={() => navigate(`/farmer/listing/${item.id}`)}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <FiEdit2 size={14}/>
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
