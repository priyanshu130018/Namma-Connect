import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import TripList from "@/components/ui/myTrip";
import { bookingAPI } from "@/services/api";

function getUser() {
  try { return JSON.parse(localStorage.getItem("ng_user")); } catch { return null; }
}

export default function CreatorTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (user?.loginId) {
      bookingAPI.getBookings(user.loginId)
        .then(res => {
          const formatted = res.data.map(b => ({
            id: b.id,
            farm: b.item_name,
            state: b.region || "Agri-Content Visit",
            date: new Date(b.check_in).toLocaleDateString(),
            duration: `${Math.ceil((new Date(b.check_out) - new Date(b.check_in)) / (1000 * 60 * 60 * 24))} days`,
            status: b.status === "Confirmed" ? "Published" : b.status, // Show Published if confirmed for creators
            emoji: b.item_emoji || "🎬",
            views: "—" // Backend doesn't have views yet, so keep placeholder
          }));
          setTrips(formatted);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch creator trips:", err);
          setLoading(false);
        });
    }
  }, [user?.loginId]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-24 pb-16 px-6 flex flex-col items-center min-h-[calc(100vh-80px)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading your journeys...</p>
          </div>
        ) : (
          <div className="w-full max-w-4xl">
            <TripList
              title="My Farm Trips"
              subtitle="All your agri-content journeys"
              trips={trips}
              accentCard="bg-purple-50 border-purple-100"
              statusColors={{ 
                Published: "bg-green-100 text-green-700", 
                Upcoming: "bg-purple-100 text-purple-700",
                Pending: "bg-amber-100 text-amber-700",
                Confirmed: "bg-green-100 text-green-700" 
              }}
              showViews
              action={
                <Link to="/creator/home"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all flex items-center gap-2"
                >
                  Book a Farm <FiArrowRight size={13} />
                </Link>
              }
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
