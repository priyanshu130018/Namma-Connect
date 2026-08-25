import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { AppProviders } from "@/app/providers";

// Layouts
import { PublicLayout } from "@/layouts/PublicLayout";
import { CustomerLayout } from "@/layouts/CustomerLayout";
import { PartnerLayout } from "@/layouts/PartnerLayout";
import { AdminLayout } from "@/layouts/AdminLayout";

// Guards
import { ProtectedRoute } from "@/routes/guards/ProtectedRoute";
import { RoleGuard } from "@/routes/guards/RoleGuard";

// Public Routes
import { HomePage } from "@/routes/public/Home";
import { AboutPage } from "@/routes/public/About";
import { ContactPage } from "@/routes/public/Contact";
import { FAQPage } from "@/routes/public/FAQ";
import { TermsPage } from "@/routes/public/Terms";
import { PrivacyPage } from "@/routes/public/Privacy";
import { LoginPage } from "@/routes/public/Login";
import { RegisterPage } from "@/routes/public/Register";
import { ForgotPasswordPage } from "@/routes/public/ForgotPassword";
import { ResetPasswordPage } from "@/routes/public/ResetPassword";

// Customer Routes
import {
  CustomerHomePage,
  CustomerExplorePage,
  CustomerServiceDetailPage,
  CustomerCreatorsPage,
  CustomerCreatorDetailPage,
  CustomerMyTripPage,
  CustomerBookingDetailPage,
  CustomerSavedPage,
  CustomerMessagesPage,
  CustomerNotificationsPage,
  CustomerProfilePage,
  CustomerSettingsPage,
  CustomerCollaborationsPage,
  CustomerBecomePartnerPage,
  CustomerSupportHubPage,
  CustomerSupportTicketsPage,
  CustomerSupportTicketDetailPage,
} from "@/routes/customer/CustomerPages";

// Partner & Creator Routes
import {
  PartnerHomePage,
  PartnerServicesPage,
  PartnerServiceNewPage,
  PartnerServiceDetailPage,
  PartnerBookingsPage,
  PartnerBookingDetailPage,
  PartnerEarningsPage,
  PartnerCollaborationsPage,
  PartnerProfilePage,
  PartnerSettingsPage,
  CreatorHomePage,
  CreatorServicesPage,
  CreatorPortfolioPage,
  CreatorCollaborationsPage,
} from "@/routes/partner/PartnerPages";

// Admin Routes
import {
  AdminHomePage,
  AdminUsersPage,
  AdminPartnersPage,
  AdminVerificationPage,
  AdminServicesPage,
  AdminBookingsPage,
  AdminPaymentsPage,
  AdminPayoutsPage,
  AdminSupportPage,
  AdminSettingsPage,
} from "@/routes/admin/AdminPages";

import {
  PublicNotFoundPage,
  CustomerNotFoundPage,
  PartnerNotFoundPage,
  AdminNotFoundPage,
} from "@/routes/public/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* ── 1. Public Website Area ── */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* ── 2. Customer Application Area (Protected) ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<CustomerLayout />}>
                <Route path="/app" element={<CustomerHomePage />} />
                <Route path="/app/explore" element={<CustomerExplorePage />} />
                <Route path="/app/services/:service_id" element={<CustomerServiceDetailPage />} />
                <Route path="/app/creators" element={<CustomerCreatorsPage />} />
                <Route path="/app/creators/:creator_id" element={<CustomerCreatorDetailPage />} />
                <Route path="/app/my-trip" element={<CustomerMyTripPage />} />
                <Route path="/app/trip" element={<CustomerMyTripPage />} />
                <Route path="/app/trip/bookings" element={<CustomerMyTripPage />} />
                <Route path="/app/trip/history" element={<CustomerMyTripPage />} />
                <Route path="/app/trip/saved" element={<CustomerSavedPage />} />
                <Route path="/app/bookings" element={<CustomerMyTripPage />} />
                <Route path="/app/bookings/:booking_id" element={<CustomerBookingDetailPage />} />
                <Route path="/app/saved" element={<CustomerSavedPage />} />
                <Route path="/app/messages" element={<CustomerMessagesPage />} />
                <Route path="/app/notifications" element={<CustomerNotificationsPage />} />
                <Route path="/app/profile" element={<CustomerProfilePage />} />
                <Route path="/app/settings" element={<CustomerSettingsPage />} />
                <Route path="/app/collaborations" element={<CustomerCollaborationsPage />} />
                <Route path="/app/become-partner" element={<CustomerBecomePartnerPage />} />
                <Route path="/partner/apply" element={<CustomerBecomePartnerPage />} />
                <Route path="/partner/onboarding" element={<CustomerBecomePartnerPage />} />
                <Route path="/app/support" element={<CustomerSupportHubPage />} />
                <Route path="/app/support/tickets" element={<CustomerSupportTicketsPage />} />
                <Route path="/app/support/tickets/:ticket_id" element={<CustomerSupportTicketDetailPage />} />
                <Route path="/app/*" element={<CustomerNotFoundPage />} />
              </Route>
            </Route>

            {/* ── 3. Partner & Creator Application Area (Protected + Partner/Creator RBAC) ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<RoleGuard allowedRoles={["partner", "farmer", "creator"]} />}>
                <Route element={<PartnerLayout />}>
                  <Route path="/partner" element={<PartnerHomePage />} />
                  <Route path="/partner/services" element={<PartnerServicesPage />} />
                  <Route path="/partner/services/new" element={<PartnerServiceNewPage />} />
                  <Route path="/partner/services/:service_id" element={<PartnerServiceDetailPage />} />
                  <Route path="/partner/bookings" element={<PartnerBookingsPage />} />
                  <Route path="/partner/bookings/:booking_id" element={<PartnerBookingDetailPage />} />
                  <Route path="/partner/earnings" element={<PartnerEarningsPage />} />
                  <Route path="/partner/collaborations" element={<PartnerCollaborationsPage />} />
                  <Route path="/partner/profile" element={<PartnerProfilePage />} />
                  <Route path="/partner/settings" element={<PartnerSettingsPage />} />
                  <Route path="/partner/creator" element={<CreatorHomePage />} />
                  <Route path="/partner/creator/services" element={<CreatorServicesPage />} />
                  <Route path="/partner/creator/portfolio" element={<CreatorPortfolioPage />} />
                  <Route path="/partner/creator/collaborations" element={<CreatorCollaborationsPage />} />
                  <Route path="/partner/*" element={<PartnerNotFoundPage />} />
                </Route>
              </Route>
            </Route>

            {/* ── 4. Admin Application Area (Protected + Admin RBAC) ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<RoleGuard allowedRoles={["admin"]} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminHomePage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/partners" element={<AdminPartnersPage />} />
                  <Route path="/admin/partners/verification" element={<AdminVerificationPage />} />
                  <Route path="/admin/services" element={<AdminServicesPage />} />
                  <Route path="/admin/bookings" element={<AdminBookingsPage />} />
                  <Route path="/admin/payments" element={<AdminPaymentsPage />} />
                  <Route path="/admin/payouts" element={<AdminPayoutsPage />} />
                  <Route path="/admin/support" element={<AdminSupportPage />} />
                  <Route path="/admin/settings" element={<AdminSettingsPage />} />
                  <Route path="/admin/*" element={<AdminNotFoundPage />} />
                </Route>
              </Route>
            </Route>

            {/* Wildcard Fallback -> Public 404 */}
            <Route element={<PublicLayout />}>
              <Route path="*" element={<PublicNotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
