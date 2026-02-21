import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMapPin, FiPhone, FiMail, FiInstagram, FiYoutube, FiArrowLeft, FiCheckCircle, FiUser, FiBriefcase, FiLink } from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { creatorAPI, bookingAPI } from "@/services/api";

export default function CreatorCard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [bookingNote, setBookingNote] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  useEffect(() => {
    if (id) {
      creatorAPI.getCreator(id)
        .then(res => {
          setCreator(res.data);
          setLoading(false);
        })
        .catch(err => {
          setError("Creator not found or failed to load data.");
          setLoading(false);
        });
    }
  }, [id]);

  const handleBookCreator = async () => {
    setBookingError("");
    setBookingSuccess("");
    const user = JSON.parse(localStorage.getItem("ng_user") || "null");
    if (!user || !user.loginId) {
      navigate("/login");
      return;
    }
    if (!checkIn || !checkOut) {
      setBookingError("Please select both start and end dates.");
      return;
    }
    if (new Date(checkOut) < new Date(checkIn)) {
      setBookingError("End date must be after start date.");
      return;
    }

    try {
      setBookingLoading(true);
      await bookingAPI.create(user.loginId, {
        booking_type: "creator",
        item_id: creator.id,
        item_name: creator.name,
        item_emoji: "🎬",
        region: creator.state,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        total_price: 0,
        collab_note: bookingNote || null,
      });
      setBookingSuccess("Collaboration request sent. We will confirm availability soon.");
      setTimeout(() => navigate("/tourist/bookings"), 800);
    } catch (err) {
      setBookingError(
        err.response?.data?.detail ||
          "Could not create booking. Please try different dates.",
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !creator) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <Navbar minimal />
      <div className="text-6xl mb-4">🎬</div>
      <h2 className="text-2xl font-black text-slate-900 mb-2">Oops! Creator not found</h2>
      <p className="text-slate-500 mb-6 max-w-xs">{error || "The creator you're looking for doesn't exist or was removed."}</p>
      <button onClick={() => navigate("/home")} className="btn-primary-purple px-8">Back to Home</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold text-sm mb-8 transition-colors">
            <FiArrowLeft size={16} /> Explore More Creators
          </button>

          <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="w-32 h-32 md:w-48 md:h-48 rounded-[40px] bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-6xl font-black shadow-2xl shadow-purple-200 border-4 border-white"
            >
              {creator.name[0]}
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 pt-4">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">{creator.name}</h1>
                {creator.is_verified && <FiCheckCircle className="text-blue-500" size={24} />}
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider">{creator.niche || "Top Creator"}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-slate-500 mb-6 font-medium">
                <span className="flex items-center gap-1.5"><FiMapPin className="text-purple-500" /> {creator.state}, {creator.country}</span>
                <span className="flex items-center gap-1.5"><FiBriefcase className="text-purple-500" /> Professional Creator</span>
              </div>

              <div className="flex gap-3">
                {creator.instagram && (
                  <a href={creator.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-pink-600 hover:border-pink-200 hover:bg-pink-50 transition-all shadow-sm">
                    <FiInstagram size={20} />
                  </a>
                )}
                {creator.youtube && (
                  <a href={creator.youtube} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm">
                    <FiYoutube size={20} />
                  </a>
                )}
                <a href={`tel:${creator.mobile}`} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold px-5 py-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-sm">
                  <FiPhone size={16} /> Contact
                </a>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Bio Section */}
              <div className="bg-white rounded-[32px] p-8 md:p-10 border border-slate-200 shadow-sm">
                <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
                  <FiUser className="text-purple-500" size={24} /> About {creator.name}
                </h2>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{creator.bio || "No biography provided."}</p>
                </div>
              </div>

              {/* Stats / Portfolio Highlight */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-indigo-600 text-white p-6 rounded-[28px] shadow-lg shadow-indigo-200">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Visits</p>
                  <p className="text-2xl font-black">500+</p>
                </div>
                <div className="bg-white p-6 rounded-[28px] border border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Projects</p>
                  <p className="text-2xl font-black text-slate-900">24</p>
                </div>
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 hidden md:block">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Region</p>
                  <p className="text-2xl font-black text-slate-900 truncate">{creator.state}</p>
                </div>
              </div>
            </div>

            {/* Portfolio Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-28 text-center">
                <FiBriefcase className="w-16 h-16 text-purple-100 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900 mb-2">Interested in a Collaboration?</h3>
                <p className="text-slate-500 text-sm mb-6">Work with {creator.name} to create amazing stories about your farm stay or agri-experience.</p>
                
                {creator.portfolio && (
                  <a href={creator.portfolio} target="_blank" rel="noreferrer" className="w-full bg-purple-600 text-white font-black py-4 rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 flex items-center justify-center gap-2 mb-4">
                    <FiLink /> View Portfolio
                  </a>
                )}
                
                <div className="space-y-4 mb-4 text-left">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Select Dates
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                        Start
                      </label>
                      <input
                        type="date"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                        End
                      </label>
                      <input
                        type="date"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                      Guests
                    </label>
                    <input
                      type="number"
                      min={1}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                      value={guests}
                      onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                      Note for creator (optional)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                      placeholder="Share brief about your project or expectations."
                      value={bookingNote}
                      onChange={(e) => setBookingNote(e.target.value)}
                    />
                  </div>
                </div>

                {bookingError && (
                  <p className="text-xs text-red-500 font-medium mb-2">
                    {bookingError}
                  </p>
                )}
                {bookingSuccess && (
                  <p className="text-xs text-emerald-600 font-medium mb-2">
                    {bookingSuccess}
                  </p>
                )}

                <button
                  onClick={handleBookCreator}
                  disabled={bookingLoading}
                  className="w-full bg-slate-900 text-white font-black py-3 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 mb-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? "Booking..." : "Book Creator"}
                </button>
                <button className="w-full flex items-center justify-center gap-2 text-amber-500 font-bold text-sm py-2 hover:opacity-80 transition-all">
                  Save Creator
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
