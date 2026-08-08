import { useState, useEffect } from "react";
import { useParams, useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import {
  FiMapPin, FiPhone, FiMail, FiInstagram, FiYoutube,
  FiCheckCircle, FiUser, FiBriefcase, FiLink, FiHeart, FiCalendar, FiAlertCircle
} from "react-icons/fi";

import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { creatorAPI, bookingAPI } from "@/services/api";
import { isInWishlist, toggleWishlist } from "@/components/ui/wishlist";
import { parseIdFromSlug, DetailLayout } from "@/components/ui/ListingCard";

export default function CreatorCard() {
  const { slug } = useParams();
  const id = parseIdFromSlug(slug);
  const navigate = useNavigate();

  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Booking
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [bookingNote, setBookingNote] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  // Availability
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [availResult, setAvailResult] = useState(null);
  const [suggestedDates, setSuggestedDates] = useState([]);

  // States
  const [selfOwnedCard, setSelfOwnedCard] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  const user = (() => { try { return JSON.parse(localStorage.getItem("nc_user") || "null"); } catch { return null; } })();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    creatorAPI.getCreator(id)
      .then(res => {
        const data = res.data;
        setCreator(data);
        if (user?.userId && data.user_id === user.userId) setSelfOwnedCard(true);
        setLoading(false);
      })
      .catch(() => {
        setError("Creator not found or failed to load data.");
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!creator) return;
    setWishlisted(isInWishlist(creator.id, "creator"));
    const handler = () => setWishlisted(isInWishlist(creator.id, "creator"));
    window.addEventListener("wishlist-change", handler);
    return () => window.removeEventListener("wishlist-change", handler);
  }, [creator]);

  const handleWishlist = () => {
    if (!creator) return;
    toggleWishlist({ ...creator, name: creator.name, photo: creator.photo }, "creator");
    setWishlisted(isInWishlist(creator.id, "creator"));
  };

  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut) { setBookingError("Select dates first"); return; }
    setCheckingAvail(true); setAvailResult(null); setSuggestedDates([]);
    try {
      const res = await creatorAPI.checkAvailability(id, checkIn, checkOut);
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

  const handleBookCreator = async () => {
    setBookingError(""); setBookingSuccess(""); setSuggestedDates([]);
    if (selfOwnedCard) { setBookingError("You cannot book your own profile."); return; }
    if (!user || !user.userId) { navigate("/login"); return; }
    if (!checkIn || !checkOut) { setBookingError("Please select dates."); return; }
    if (new Date(checkOut) < new Date(checkIn)) { setBookingError("End date must be after start date."); return; }

    try {
      setBookingLoading(true);

      const availRes = await creatorAPI.checkAvailability(id, checkIn, checkOut);
      if (!availRes.data.available) {
        setAvailResult("unavailable");
        setSuggestedDates(availRes.data.suggested_dates || []);
        setBookingError("Not available for these dates. See suggestions below.");
        setBookingLoading(false);
        return;
      }

      const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
      await bookingAPI.create(user.userId, {
        booking_type: "creator", creator_id: creator.id, check_in: checkIn, check_out: checkOut,
        adults, children, total_price: (creator.rate || 0) * nights, collab_note: bookingNote || null,
      });
      setBookingSuccess("Collaboration request sent! Awaiting confirmation.");
      setTimeout(() => navigate("/tourist/bookings"), 1200);
    } catch (err) {
      setBookingError(err.response?.data?.detail || "Could not create booking.");
    } finally { setBookingLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary/30 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !creator) return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <Navbar minimal />
      <div className="text-6xl mb-4">🎬</div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">Oops! Creator not found</h2>
      <button onClick={() => navigate("/home")} className="btn-primary px-8 mt-4">Back to Home</button>
    </div>
  );

  const regDate = creator.created_at ? new Date(creator.created_at).toLocaleDateString('en-IN', {
    month: 'short', year: 'numeric'
  }) : null;

  const subtitle = (
    <div className="flex flex-wrap items-center gap-6">
      {(creator.city || creator.state) && (
        <div className="flex items-center gap-2">
          <FiMapPin className="text-primary text-lg" />
          {[creator.city, creator.state].filter(Boolean).join(", ")}
        </div>
      )}
      <div className="flex items-center gap-2">
        <FiBriefcase className="text-primary text-lg" /> Professional Creator
      </div>
      <div className="flex gap-2 ml-auto">
        {creator.instagram && (
          <a href={creator.instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shadow-sm"><FiInstagram size={18} /></a>
        )}
        {creator.youtube && (
          <a href={creator.youtube} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all shadow-sm"><FiYoutube size={18} /></a>
        )}
      </div>
    </div>
  );

  const sidebar = (
    <>
      {selfOwnedCard && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-start gap-3 mb-4">
          <FiAlertCircle className="text-primary mt-0.5" size={18} />
          <p className="text-sm font-bold text-primary">This is your own profile.</p>
        </div>
      )}

      <div className="bg-card rounded-2xl p-8 border border-border shadow-md text-center relative overflow-hidden">
        <FiBriefcase className="w-16 h-16 text-primary mx-auto mb-4" />
        <h3 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">Hire {creator.name}</h3>
        <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-6">₹{Number(creator.rate || 0).toLocaleString()} / Day</p>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed font-medium">Collaborate on visual storytelling and high-quality content production.</p>

        {!selfOwnedCard ? (
          <>
            <div className="space-y-4 mb-6 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Start Date</span>
                  <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full bg-surface border border-border rounded-[18px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">End Date</span>
                  <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full bg-surface border border-border rounded-[18px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">Collab Note</span>
                <textarea rows={3} value={bookingNote} onChange={e => setBookingNote(e.target.value)} placeholder="Project details..." className="w-full bg-surface border border-border rounded-[18px] px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none resize-none transition-all" />
              </div>
            </div>

            <button onClick={handleCheckAvailability} disabled={checkingAvail} className="w-full border-2 border-primary/30 text-primary font-semibold py-3 rounded-[20px] transition-all text-sm mb-4 hover:bg-primary/10">
              {checkingAvail ? "Checking..." : "Check Availability"}
            </button>

            {availResult === "available" && (
              <div className="bg-primary/10 text-primary p-3 rounded-2xl text-[11px] font-bold mb-4 flex items-center justify-center gap-2">✅ Available for Booking!</div>
            )}
            {availResult === "unavailable" && <div className="bg-destructive/10 text-destructive p-3 rounded-2xl text-[11px] font-bold mb-4 flex items-center justify-center gap-2">❌ Not Available</div>}
            
            <button onClick={handleBookCreator} disabled={bookingLoading || !checkIn || !checkOut} className={`w-full font-semibold py-4 rounded-[22px] shadow-sm transition-all flex items-center justify-center gap-2 text-sm text-center mb-4 ${
              (!checkIn || !checkOut) ? "bg-muted text-muted-foreground cursor-not-allowed shadow-none" : "bg-primary hover:bg-primary text-primary-foreground "
            }`}>
              {bookingLoading ? "Processing Booking..." : "Book Creator Now"}
            </button>
            
            {suggestedDates.length > 0 && (
              <div className="mb-4 text-left">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1 mb-2">Suggested Dates</p>
                <div className="flex flex-col gap-2">
                  {suggestedDates.map((d, i) => (
                    <button key={i} onClick={() => { setCheckIn(d.check_in); setCheckOut(d.check_out); setAvailResult(null); setSuggestedDates([]); setBookingError(""); }} className="bg-primary/10 hover:bg-primary/10 text-primary border border-primary/30 rounded-[12px] p-2 text-[11px] font-bold flex justify-between items-center transition-all">
                      <span>{new Date(d.check_in).toLocaleDateString("en-GB", {day: "numeric", month: "short"})} – {new Date(d.check_out).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"})}</span>
                      <span className="text-primary bg-card px-2 py-[2px] rounded-full shadow-sm text-[9px] uppercase tracking-wider">Select</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {bookingError && <p className="text-[11px] text-destructive font-bold mb-2 text-center">{bookingError}</p>}
            {bookingSuccess && <p className="text-[11px] text-primary font-bold mb-2 text-center">{bookingSuccess}</p>}
          </>
        ) : (
          <button disabled className="w-full bg-muted text-muted-foreground font-semibold py-4 rounded-[22px] cursor-not-allowed shadow-none border border-border flex items-center justify-center gap-2">
            <FiAlertCircle size={18} /> Owned Profile
          </button>
        )}

        <button onClick={handleWishlist} className={`w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-[20px] font-bold text-sm transition-all border-2 ${wishlisted ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-card border-border text-muted-foreground hover:border-destructive/30 hover:text-primary"}`}>
          <FiHeart size={14} className={wishlisted ? "fill-current" : ""} /> {wishlisted ? "Saved" : "Save Creator"}
        </button>
      </div>

      <div className="bg-foreground text-primary-foreground rounded-2xl p-8 relative overflow-hidden group">
        <div className="relative z-10">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-4">Contractor</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xl shadow-sm border border-white/20">{creator.name?.[0]}</div>
            <div>
               <p className="font-bold text-lg text-primary-foreground">Creator {creator.name}</p>
               <p className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${creator.is_verified ? "text-primary" : "text-muted-foreground"}`}>
                 {creator.is_verified ? <><FiCheckCircle /> Verified Creator</> : "Not Verified"}
               </p>
               <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1"><FiCheckCircle className="text-primary" /> Joined {regDate || "Recently"}</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 blur-3xl rounded-full" />
      </div>
    </>
  );

  return (
    <>
      <DetailLayout 
        title={creator.name} 
        subtitle={subtitle} 
        heroEmoji="🎬" 
        heroPhoto={null} 
        sidebar={sidebar} 
        accentColor="purple"
      >
        <div className="space-y-6 pb-12">
          <div className="bg-card rounded-2xl p-10 border border-border shadow-sm transition-all hover:shadow-md">
            <h2 className="text-3xl font-semibold text-foreground mb-6 tracking-tight flex items-center gap-3">
              <FiUser className="text-primary" /> Bio & Portfolio
            </h2>
            <p className="text-muted-foreground leading-[1.8] text-lg lg:text-xl whitespace-pre-wrap font-medium">
              {creator.bio || "No biography provided."}
            </p>

            {creator.portfolio && (
              <div className="mt-8 pt-8 border-t border-border flex items-center gap-3">
                <FiLink className="text-primary" />
                <a href={creator.portfolio} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">View Portfolio Website</a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-foreground text-primary-foreground p-8 rounded-2xl border border-border">
               <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Social Reach</p>
               <p className="text-4xl font-semibold tracking-tight">50,000+</p>
               <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">Active Audience</p>
            </div>
            <div className="bg-card p-8 rounded-2xl border border-border">
               <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Review Score</p>
               <p className="text-4xl font-semibold tracking-tight text-foreground flex items-center gap-2">4.9 <FiCheckCircle className="text-primary" size={24} /></p>
               <p className="text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">Highly Rated</p>
            </div>
          </div>
        </div>
      </DetailLayout>
      <Footer />
    </>
  );
}
