import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Public pages
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Services from "@/pages/services";
import Blog from "@/pages/blog";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import { BlogPost } from "@/pages/blog";
import Login from "@/auth/login";
import ChangePassword from "@/auth/changePassword";

// Registration forms
import FarmerRegister from "@/dashboard/farmers/FarmerRegister";
import CreatorRegister from "@/dashboard/creators/CreatorRegister";

// Farmer-specific pages
import FarmerHome from "@/dashboard/farmers/FarmerHome";
import FarmerCard from "@/dashboard/farmers/FarmerCard";
import FarmerProfile from "@/dashboard/farmers/FarmerProfile";
import FarmerBookings from "@/dashboard/farmers/FarmerBookings";
import FarmerListings from "@/dashboard/farmers/FarmerListings";
import FarmerListingForm from "@/dashboard/farmers/FarmerListingForm";
import FarmerSetting from "@/dashboard/farmers/FarmerSetting";

// Creator-specific pages
import CreatorHome from "@/dashboard/creators/CreatorHome";
import CreatorCard from "@/dashboard/creators/CreatorCard";
import CreatorProfile from "@/dashboard/creators/CreatorProfile";
import CreatorTrips from "@/dashboard/creators/CreatorTrips";
import CreatorBookings from "@/dashboard/creators/CreatorBookings";
import CreatorSetting from "@/dashboard/creators/CreatorSetting";

// Tourist-specific pages
import MyProfile from "@/dashboard/tourists/MyProfile";
import MyTrips from "@/dashboard/tourists/MyTrips";
import MyBookings from "@/dashboard/tourists/MyBookings";
import AiTripPlanner from "@/pages/AiTripPlanner";
import TouristSetting from "@/dashboard/tourists/TouristSetting";

const getUser = () => {
  try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; }
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/home" replace />;
  return children;
};

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/ai-planner" element={<AiTripPlanner />} />

        {/* Detail pages */}
        <Route path="/farmercard/:id" element={<FarmerCard />} />
        <Route path="/creatorcard/:id" element={<CreatorCard />} />
        <Route path="/blog/:id" element={<BlogPost />} />

        {/* Service registration (gated: any logged-in user) */}
        <Route path="/services/farmer/register" element={
          <ProtectedRoute allowedRoles={["tourist", "farmer"]}><FarmerRegister /></ProtectedRoute>
        } />
        <Route path="/service/farmer/register" element={<Navigate to="/services/farmer/register" replace />} />
        
        <Route path="/services/creator/register" element={
          <ProtectedRoute allowedRoles={["tourist", "creator"]}><CreatorRegister /></ProtectedRoute>
        } />
        <Route path="/service/creator/register" element={<Navigate to="/services/creator/register" replace />} />

        {/* Tourist routes */}
        <Route path="/tourist/profile" element={<ProtectedRoute allowedRoles={["tourist"]}><MyProfile /></ProtectedRoute>} />
        <Route path="/tourist/trips" element={<ProtectedRoute allowedRoles={["tourist"]}><MyTrips /></ProtectedRoute>} />
        <Route path="/tourist/bookings" element={<ProtectedRoute allowedRoles={["tourist"]}><MyBookings /></ProtectedRoute>} />
        <Route path="/tourist/settings" element={<ProtectedRoute allowedRoles={["tourist"]}><TouristSetting /></ProtectedRoute>} />

        {/* Farmer routes */}
        <Route path="/farmer/home" element={<ProtectedRoute allowedRoles={["farmer"]}><FarmerHome /></ProtectedRoute>} />
        <Route path="/farmer/profile" element={<ProtectedRoute allowedRoles={["farmer"]}><FarmerProfile /></ProtectedRoute>} />
        <Route path="/farmer/bookings" element={<ProtectedRoute allowedRoles={["farmer"]}><FarmerBookings /></ProtectedRoute>} />
        <Route path="/farmer/listings" element={<ProtectedRoute allowedRoles={["farmer"]}><FarmerListings /></ProtectedRoute>} />
        <Route path="/farmer/listing/new" element={<ProtectedRoute allowedRoles={["farmer"]}><FarmerListingForm /></ProtectedRoute>} />
        <Route path="/farmer/listing/:id" element={<ProtectedRoute allowedRoles={["farmer"]}><FarmerListingForm /></ProtectedRoute>} />
        <Route path="/farmer/settings" element={<ProtectedRoute allowedRoles={["farmer"]}><FarmerSetting /></ProtectedRoute>} />

        {/* Creator routes */}
        <Route path="/creator/home" element={<ProtectedRoute allowedRoles={["creator"]}><CreatorHome /></ProtectedRoute>} />
        <Route path="/creator/profile" element={<ProtectedRoute allowedRoles={["creator"]}><CreatorProfile /></ProtectedRoute>} />
        <Route path="/creator/trips" element={<ProtectedRoute allowedRoles={["creator"]}><CreatorTrips /></ProtectedRoute>} />
        <Route path="/creator/bookings" element={<ProtectedRoute allowedRoles={["creator"]}><CreatorBookings /></ProtectedRoute>} />
        <Route path="/creator/settings" element={<ProtectedRoute allowedRoles={["creator"]}><CreatorSetting /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
