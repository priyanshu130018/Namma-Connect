import { useState, useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import BookingList from "@/components/ui/myBooking";
import { bookingAPI } from "@/services/api";

const getUser = () => { try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; } };

export default function MyBookings() {
  const user = getUser();
  const [bookings,  setBookings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [cancelling,setCancelling]= useState(null);

  const fetchBookings = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const res = await bookingAPI.getBookings(user.loginId);
      setBookings(res.data);
    } catch { setError("Could not load bookings. Please check your connection."); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this booking?")) return;
    setCancelling(id);
    try {
      await bookingAPI.delete(id, user.loginId);
      setBookings(bs => bs.filter(b => b.id !== id));
    } catch { alert("Failed to cancel. Please try again."); }
    finally { setCancelling(null); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      <div className="pt-24 pb-16 px-6 flex flex-col items-center min-h-[calc(100vh-80px)]">
        <div className="w-full">
          <BookingList
            bookings={bookings}
            loading={loading}
            error={error}
            onRetry={fetchBookings}
            onCancel={handleCancel}
            cancelling={cancelling}
            isLoggedIn={!!user}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
