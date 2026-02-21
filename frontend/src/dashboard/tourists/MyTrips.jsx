import { useState, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import TripList from "@/components/ui/myTrip";
import { bookingAPI } from "@/services/api";

function getUser() {
  try { return JSON.parse(localStorage.getItem("ng_user")); } catch { return null; }
}

export default function MyTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    if (user?.loginId) {
      bookingAPI.getBookings(user.loginId)
        .then(res => {
          // Map backend fields to TripList props
          const formattedTrips = res.data.map(b => ({
            id: b.id,
            farm: b.item_name,
            state: b.region || "Tourist Stay",
            date: new Date(b.check_in).toLocaleDateString(),
            duration: `${Math.ceil((new Date(b.check_out) - new Date(b.check_in)) / (1000 * 60 * 60 * 24))} days`,
            status: b.status,
            emoji: b.item_emoji || "🏠"
          }));
          setTrips(formattedTrips);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch trips:", err);
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
            <div className="w-10 h-10 border-4 border-slate-200 border-t-green-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-medium font-outfit">Gathering your journeys...</p>
          </div>
        ) : (
          <div className="w-full max-w-4xl">
            <TripList
              title="My Trips"
              subtitle="All your farm experience journeys"
              trips={trips}
              accentCard="bg-green-50 border-green-200"
              statusColors={{ 
                Completed: "bg-green-100 text-green-700", 
                Upcoming: "bg-blue-100 text-blue-700",
                Pending: "bg-amber-100 text-amber-700",
                Confirmed: "bg-green-100 text-green-700",
                Cancelled: "bg-red-100 text-red-600"
              }}
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
