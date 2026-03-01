import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiMapPin, FiCalendar, FiCheckCircle,
  FiHome, FiTruck, FiTrendingUp, FiUser, FiHeart, FiAlertCircle
} from "react-icons/fi";

import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import api, { farmAPI, bookingAPI } from "@/services/api";
import { isInWishlist, toggleWishlist } from "@/components/ui/wishlist";
import { parseIdFromSlug, DetailLayout } from "@/components/ui/card";

// Local farm photos as fallback
import img0 from "@/assets/images/img-0.jpg";
import img1 from "@/assets/images/img-1.jpg";
import img2 from "@/assets/images/img-2.jpg";
import img3 from "@/assets/images/img-3.jpg";
import img4 from "@/assets/images/img-4.jpg";
import img5 from "@/assets/images/img-5.avif";

const FARM_PHOTOS = [img0, img1, img2, img3, img4, img5];
const getFallback = (id) => FARM_PHOTOS[(Number(id) || 0) % FARM_PHOTOS.length];

export default function FarmerCard() {
  const { slug }  = useParams();
  const id        = parseIdFromSlug(slug);
  const navigate  = useNavigate();

  const [farm,            setFarm]            = useState(null);
  const [farmerName,      setFarmerName]      = useState("Local Farmer");
  const [farmerRegistered,setFarmerRegistered]= useState("");
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");

  // Booking
  const [checkIn,         setCheckIn]         = useState("");
  const [checkOut,        setCheckOut]        = useState("");
  const [adults,          setAdults]          = useState(1);
  const [children,        setChildren]        = useState(0);
  const [bookingLoading,  setBookingLoading]  = useState(false);
  const [bookingError,    setBookingError]    = useState("");
  const [bookingSuccess,  setBookingSuccess]  = useState("");
  const [selfOwnedFarm,   setSelfOwnedFarm]   = useState(false);

  // Availability check
  const [checkingAvail,   setCheckingAvail]   = useState(false);
  const [availResult,     setAvailResult]     = useState(null);
  const [suggestedDates,  setSuggestedDates]  = useState([]);

  // Wishlist
  const [wishlisted, setWishlisted] = useState(false);

  // Current user
  const user = (() => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } })();

  useEffect(() => {
    if (!id) return;
    farmAPI.getListing(id)
      .then(async (res) => {
        const data = res.data;
        setFarm(data);

        if (data.created_at) {
          const d = new Date(data.created_at);
          setFarmerRegistered(d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }));
        }

        if (user?.role === "farmer" && data.farmer_id) {
          try {
            const profRes = await farmAPI.getProfile(user.userId);
            if (profRes.data?.id === data.farmer_id) setSelfOwnedFarm(true);
          } catch { /**/ }
        }

        if (data.farmer_id) {
          try {
            const profRes = await farmAPI.getFarmerProfile(data.farmer_id);
            setFarmerName(profRes.data?.full_name || profRes.data?.name || "Local Farmer");
          } catch { setFarmerName("Local Farmer"); }
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Farm not found or failed to load data.");
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!farm) return;
    setWishlisted(isInWishlist(farm.id, "farm"));
    const handler = () => setWishlisted(isInWishlist(farm.id, "farm"));
    window.addEventListener("wishlist-change", handler);
    return () => window.removeEventListener("wishlist-change", handler);
  }, [farm]);

  const handleWishlist = () => {
    if (!farm) return;
    toggleWishlist({ ...farm, name: farm.farm_name || farm.name, farm_photo: farm.farm_photo || getFallback(farm.id) }, "farm");
    setWishlisted(isInWishlist(farm.id, "farm"));
  };

  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut) { setBookingError("Select dates first."); return; }
    setCheckingAvail(true); setAvailResult(null); setSuggestedDates([]);
    try {
      const res = await api.get(`/farmer/check-availability/${id}?date_start=${checkIn}&date_end=${checkOut}`);
      if (res.data.available) {
        setAvailResult("available");
      } else {
        setAvailResult("unavailable");
        setSuggestedDates(res.data.suggested_dates || []);
      }
    } catch {
      setAvailResult("unavailable");
    } finally {
      setCheckingAvail(false);
    }
  };

  const handleBookFarm = async () => {
    setBookingError(""); setBookingSuccess(""); setSuggestedDates([]);
    if (selfOwnedFarm) { setBookingError("You cannot book your own farm listing."); return; }
    if (!user || !user.userId) { navigate("/login"); return; }
    if (!checkIn || !checkOut) { setBookingError("Please select both dates."); return; }
    if (new Date(checkOut) < new Date(checkIn)) { setBookingError("Check-out must be after check-in."); return; }

    try {
      setBookingLoading(true);
      
      const availRes = await api.get(`/farmer/check-availability/${id}?date_start=${checkIn}&date_end=${checkOut}`);
      if (!availRes.data.available) {
        setAvailResult("unavailable");
        setSuggestedDates(availRes.data.suggested_dates || []);
        setBookingError("Not available for these dates. See suggestions below.");
        setBookingLoading(false);
        return;
      }
      
      const guests = adults + children;
      const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
      await bookingAPI.create(user.userId, {
        booking_type: "farm", farm_id: farm.id, check_in: checkIn, check_out: checkOut,
        adults, children, total_price: (farm.price_per_night || 0) * nights,
      });
      setBookingSuccess("Booking request sent! Awaiting confirmation.");
      setTimeout(() => navigate("/tourist/bookings"), 1200);
    } catch (err) {
      setBookingError(err.response?.data?.detail || "Could not complete booking process.");
    } finally { setBookingLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !farm) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <Navbar minimal />
      <div className="text-6xl mb-4">🚜</div>
      <h2 className="text-2xl font-black text-slate-900 mb-2">Oops! Farm not found</h2>
      <button onClick={() => navigate("/home")} className="btn-primary px-8 mt-4">Back to Home</button>
    </div>
  );

  const photoSrc = farm.farm_photo || getFallback(farm.id);

  const subtitle = (
    <>
      {(farm.city || farm.state) && (
        <div className="flex items-center gap-2">
          <FiMapPin className="text-amber-500 text-lg" />
          {[farm.city, farm.state].filter(Boolean).join(", ")}
        </div>
      )}
      <div className="flex items-center gap-2">
        <FiTrendingUp className="text-emerald-500 text-lg" /> {farm.crop_types || "Agritourism"}
      </div>
    </>
  );

  const sidebar = (
    <>
      {selfOwnedFarm && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-4">
          <FiAlertCircle className="text-amber-500 mt-0.5" size={18} />
          <p className="text-sm font-bold text-amber-800">This is your own listing.</p>
        </div>
      )}

      <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            {farm.price_per_night > 0 ? (
              <p><span className="text-3xl font-black text-slate-900">₹{Number(farm.price_per_night).toLocaleString()}</span><span className="text-slate-400 font-bold ml-1">/ night</span></p>
            ) : <span className="text-xl font-black text-slate-600">Contact Host</span>}
          </div>
          <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-full border border-amber-100">Per Person</div>
        </div>

        {!selfOwnedFarm ? (
          <>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Check In</span>
                  <input type="date" value={checkIn} onChange={e => {setCheckIn(e.target.value); setAvailResult(null);}} className="w-full bg-slate-50 border border-slate-200 rounded-[18px] px-4 py-3 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Check Out</span>
                  <input type="date" value={checkOut} onChange={e => {setCheckOut(e.target.value); setAvailResult(null);}} className="w-full bg-slate-50 border border-slate-200 rounded-[18px] px-4 py-3 text-sm focus:ring-2 focus:ring-amber-200 outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adults</span>
                 <input type="number" min={1} value={adults} onChange={e => setAdults(Math.max(1, Number(e.target.value)))} className="w-full bg-slate-50 border border-slate-200 rounded-[18px] px-4 py-3 text-sm focus:ring-2 focus:ring-amber-200 outline-none" /></div>
                 <div className="space-y-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Children</span>
                 <input type="number" min={0} value={children} onChange={e => setChildren(Math.max(0, Number(e.target.value)))} className="w-full bg-slate-50 border border-slate-200 rounded-[18px] px-4 py-3 text-sm focus:ring-2 focus:ring-amber-200 outline-none" /></div>
              </div>
            </div>

            <button onClick={handleCheckAvailability} disabled={checkingAvail} className="w-full border-2 border-amber-100 text-amber-600 font-black py-3 rounded-[20px] transition-all text-sm mb-4 hover:bg-amber-50">
              {checkingAvail ? "Checking..." : "Check Availability"}
            </button>

            {availResult === "available" && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-2xl text-[11px] font-bold mb-4 flex items-center justify-center gap-2">✅ Available!</div>
            )}
            {availResult === "unavailable" && <div className="bg-red-50 text-red-700 p-3 rounded-2xl text-[11px] font-bold mb-4 flex items-center justify-center gap-2">❌ Not Available</div>}
            
            <button onClick={handleBookFarm} disabled={bookingLoading || !checkIn || !checkOut} className={`w-full font-black py-4 rounded-[22px] shadow-lg transition-all flex items-center justify-center gap-2 text-sm text-center mb-4 ${
              (!checkIn || !checkOut) ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
            }`}>
              {bookingLoading ? "Processing Booking..." : "Book Farm Stay"}
            </button>
            
            {suggestedDates.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Suggested Dates</p>
                <div className="flex flex-col gap-2">
                  {suggestedDates.map((d, i) => (
                    <button key={i} onClick={() => { setCheckIn(d.check_in); setCheckOut(d.check_out); setAvailResult(null); setSuggestedDates([]); setBookingError(""); }} className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-[12px] p-2 text-[11px] font-bold flex justify-between items-center transition-all text-left">
                      <span>{new Date(d.check_in).toLocaleDateString("en-GB", {day: "numeric", month: "short"})} – {new Date(d.check_out).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"})}</span>
                      <span className="text-amber-500 bg-white px-2 py-[2px] rounded-full shadow-sm text-[9px] uppercase tracking-wider">Select</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {bookingError && <p className="text-[11px] text-red-500 font-bold mb-2 ml-1 text-center">{bookingError}</p>}
            {bookingSuccess && <p className="text-[11px] text-emerald-600 font-bold mb-2 ml-1 text-center">{bookingSuccess}</p>}
          </>
        ) : (
          <button disabled className="w-full bg-slate-200 text-slate-500 font-black py-4 rounded-[22px] cursor-not-allowed shadow-none border border-slate-100 flex items-center justify-center gap-2">
            <FiAlertCircle size={18} /> Owned Listing
          </button>
        )}

        <button onClick={handleWishlist} className={`w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-[20px] font-bold text-sm transition-all border-2 ${wishlisted ? "bg-red-50 border-red-100 text-red-500" : "bg-white border-slate-100 text-slate-500 hover:border-red-100 hover:text-red-400"}`}>
          <FiHeart size={14} className={wishlisted ? "fill-red-500" : ""} /> {wishlisted ? "Saved" : "Save to Wishlist"}
        </button>
      </div>

      <div className="bg-slate-900 text-white rounded-[40px] p-8 relative overflow-hidden group">
        <div className="relative z-10">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Managed by</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-xl">{farmerName[0]}</div>
            <div>
               <p className="text-white font-black text-lg">Farmer {farmerName}</p>
               <p className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${farm.is_verified ? "text-emerald-600" : "text-slate-400"}`}>
                 {farm.is_verified ? <><FiCheckCircle /> Verified Host</> : "Not Verified"}
               </p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
      </div>
    </>
  );

  return (
    <>
      <DetailLayout title={farm.farm_name || farm.name} subtitle={subtitle} heroEmoji={farm.emoji || "🌾"} heroPhoto={photoSrc} sidebar={sidebar} accentColor="amber">
        <div className="space-y-6 pb-12">
          <div className="bg-white rounded-[40px] p-10 border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">About the Experience</h2>
            <p className="text-slate-600 leading-[1.8] text-lg lg:text-xl whitespace-pre-wrap font-medium">{farm.description || farm.farm_description}</p>
            
            {typeof farm.stay_available === "string" && !["Yes", "1", "true"].includes(farm.stay_available) && (
              <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 italic text-slate-500 text-sm">
                <p className="font-black text-slate-400 uppercase tracking-widest mb-3 text-[10px]">Host's Note on Stay</p>
                "{farm.stay_available}"
              </div>
            )}

            {farm.activities && (
              <div className="mt-12 pt-12 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Farm Activities</p>
                <div className="flex flex-wrap gap-3">
                  {farm.activities.split(",").map((act, i) => (
                    <span key={i} className="px-6 py-3 bg-slate-50 text-slate-700 rounded-2xl text-sm font-black border border-slate-100 hover:bg-amber-100 hover:border-amber-200 hover:text-amber-700 transition-all">{act.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`p-8 rounded-[40px] border transition-all ${farm.stay_available ? "bg-white border-slate-200 shadow-sm" : "bg-slate-100 border-slate-200 opacity-60"}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${farm.stay_available ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400"}`}><FiHome size={24} /></div>
                <div><p className="font-black text-slate-900">Accommodation</p><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{farm.stay_available ? "Available" : "Not Available"}</p></div>
              </div>
            </div>
            <div className={`p-8 rounded-[40px] border transition-all ${farm.transport_available ? "bg-white border-slate-200 shadow-sm" : "bg-slate-100 border-slate-200 opacity-60"}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${farm.transport_available ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400"}`}><FiTruck size={24} /></div>
                <div><p className="font-black text-slate-900">Transport Assistance</p><p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{farm.transport_available ? "Available" : "Not Available"}</p></div>
              </div>
            </div>
          </div>
        </div>
      </DetailLayout>
      <Footer />
    </>
  );
}
