import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { AppProviders } from "@/app/providers";

function RedirectPartnerServiceDetail() {
  const { service_id } = useParams();
  return <Navigate to={`/provider/services/${service_id}`} replace />;
}

function RedirectPartnerBookingDetail() {
  const { booking_id } = useParams();
  return <Navigate to={`/provider/bookings/${booking_id}`} replace />;
}

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
import { BlogPage } from "@/routes/public/Blog";
import { TermsPage } from "@/routes/public/Terms";
import { PrivacyPage } from "@/routes/public/Privacy";
import { LoginPage } from "@/routes/public/Login";
import { RegisterPage } from "@/routes/public/Register";
import { ForgotPasswordPage } from "@/routes/public/ForgotPassword";
import { ResetPasswordPage } from "@/routes/public/ResetPassword";
import { VerifyEmailPage } from "@/routes/public/VerifyEmail";

// Customer Routes
import {
  CustomerHomePage,
  CustomerExplorePage,
  CustomerActivitiesPage,
  CustomerUnderProcessPage,
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
  ChangePasswordPage,
  CustomerBecomePartnerPage,
  CustomerSupportHubPage,
  CustomerSupportTicketsPage,
  CustomerSupportTicketDetailPage,
} from "@/routes/customer/CustomerPages";

// Provider Routes
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
  PartnerAnalyticsPage,
  PartnerSettingsPage,
} from "@/routes/partner/PartnerPages";

// Admin Routes
import {
  AdminHomePage,
  AdminUsersPage,
  AdminUserDetailPage,
  AdminProvidersPage,
  AdminKYCPage,
  AdminListingsPage,
  AdminBookingsPage,
  AdminPaymentsPage,
  AdminReviewsPage,
  AdminAnalyticsPage,
  AdminTicketsPage,
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
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
            </Route>

            {/* ── 2. Authenticated Customer Application Area ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<CustomerLayout />}>
                {/* Primary Top-level Authenticated Routes */}
                <Route path="/home" element={<CustomerHomePage />} />
                <Route path="/explore" element={<CustomerExplorePage />} />
                <Route path="/explore/activities" element={<CustomerActivitiesPage />} />
                <Route path="/explore/content-creators" element={<CustomerCreatorsPage />} />
                <Route path="/explore/hotel-stay" element={<CustomerUnderProcessPage type="hotel" />} />
                <Route path="/explore/food" element={<CustomerUnderProcessPage type="food" />} />
                <Route path="/explore/transport" element={<CustomerUnderProcessPage type="transport" />} />
                <Route path="/experience" element={<CustomerUnderProcessPage type="experience" />} />
                <Route path="/discover" element={<CustomerUnderProcessPage type="discover" />} />
                <Route path="/my-trip" element={<CustomerUnderProcessPage type="mytrip" />} />
                <Route path="/profile" element={<CustomerProfilePage />} />
                <Route path="/setting" element={<CustomerSettingsPage />} />
                <Route path="/setting/change-password" element={<ChangePasswordPage />} />
                <Route path="/notifications" element={<CustomerNotificationsPage />} />
                <Route path="/messages" element={<CustomerMessagesPage />} />

                {/* Legacy /app/* Aliases */}
                <Route path="/app" element={<CustomerHomePage />} />
                <Route path="/app/explore" element={<CustomerExplorePage />} />
                <Route path="/app/activities" element={<CustomerActivitiesPage />} />
                <Route path="/app/hotel" element={<CustomerUnderProcessPage type="hotel" />} />
                <Route path="/app/stay" element={<CustomerUnderProcessPage type="stay" />} />
                <Route path="/app/transport" element={<CustomerUnderProcessPage type="transport" />} />
                <Route path="/app/services/:service_id" element={<CustomerServiceDetailPage />} />
                <Route path="/app/creators" element={<CustomerCreatorsPage />} />
                <Route path="/app/creators/:creator_id" element={<CustomerCreatorDetailPage />} />
                <Route path="/app/my-trip" element={<CustomerMyTripPage />} />
                <Route path="/app/trip" element={<CustomerMyTripPage />} />
                <Route path="/app/trip/bookings" element={<CustomerMyTripPage />} />
                <Route path="/app/trip/history" element={<CustomerMyTripPage />} />
                <Route path="/app/trip/payment" element={<CustomerMyTripPage />} />
                <Route path="/app/trip/saved" element={<CustomerSavedPage />} />
                <Route path="/app/bookings" element={<CustomerMyTripPage />} />
                <Route path="/app/bookings/:booking_id" element={<CustomerBookingDetailPage />} />
                <Route path="/app/saved" element={<CustomerSavedPage />} />
                <Route path="/app/messages" element={<CustomerMessagesPage />} />
                <Route path="/app/notifications" element={<CustomerNotificationsPage />} />
                <Route path="/app/profile" element={<CustomerProfilePage />} />
                <Route path="/app/settings" element={<CustomerSettingsPage />} />
                <Route path="/app/setting/change-password" element={<ChangePasswordPage />} />
                <Route path="/app/become-partner" element={<CustomerBecomePartnerPage />} />
                <Route path="/partner/apply" element={<CustomerBecomePartnerPage />} />
                <Route path="/partner/onboarding" element={<CustomerBecomePartnerPage />} />
                <Route path="/app/support" element={<CustomerSupportHubPage />} />
                <Route path="/app/support/tickets" element={<CustomerSupportTicketsPage />} />
                <Route path="/app/support/tickets/:ticket_id" element={<CustomerSupportTicketDetailPage />} />
                <Route path="/services/:service_id" element={<CustomerServiceDetailPage />} />
                <Route path="/app/*" element={<CustomerNotFoundPage />} />
              </Route>
            </Route>

            {/* ── 3. Provider Application Area (Protected + Provider RBAC) ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<RoleGuard allowedRoles={["provider", "partner", "farmer", "creator", "admin"]} />}>
                <Route element={<PartnerLayout />}>
                  <Route path="/provider" element={<PartnerHomePage />} />
                  <Route path="/provider/listings" element={<PartnerServicesPage />} />
                  <Route path="/provider/listings/new" element={<PartnerServiceNewPage />} />
                  <Route path="/provider/listings/:service_id" element={<PartnerServiceDetailPage />} />
                  <Route path="/provider/services" element={<PartnerServicesPage />} />
                  <Route path="/provider/services/new" element={<PartnerServiceNewPage />} />
                  <Route path="/provider/services/:service_id" element={<PartnerServiceDetailPage />} />
                  <Route path="/provider/bookings" element={<PartnerBookingsPage />} />
                  <Route path="/provider/bookings/:booking_id" element={<PartnerBookingDetailPage />} />
                  <Route path="/provider/messages" element={<CustomerMessagesPage />} />
                  <Route path="/provider/earnings" element={<PartnerEarningsPage />} />
                  <Route path="/provider/analytics" element={<PartnerAnalyticsPage />} />
                  <Route path="/provider/collaborations" element={<PartnerCollaborationsPage />} />
                  <Route path="/provider/profile" element={<PartnerProfilePage />} />
                  <Route path="/provider/settings" element={<PartnerSettingsPage />} />
                  <Route path="/provider/*" element={<PartnerNotFoundPage />} />
                </Route>
              </Route>
            </Route>

            {/* ── Legacy Partner & Creator Compatibility Redirects ── */}
            <Route path="/partner" element={<Navigate to="/provider" replace />} />
            <Route path="/partner/listings" element={<Navigate to="/provider/listings" replace />} />
            <Route path="/partner/services" element={<Navigate to="/provider/listings" replace />} />
            <Route path="/partner/services/new" element={<Navigate to="/provider/listings/new" replace />} />
            <Route path="/partner/services/:service_id" element={<RedirectPartnerServiceDetail />} />
            <Route path="/partner/bookings" element={<Navigate to="/provider/bookings" replace />} />
            <Route path="/partner/bookings/:booking_id" element={<RedirectPartnerBookingDetail />} />
            <Route path="/partner/messages" element={<Navigate to="/provider/messages" replace />} />
            <Route path="/partner/earnings" element={<Navigate to="/provider/earnings" replace />} />
            <Route path="/partner/analytics" element={<Navigate to="/provider/analytics" replace />} />
            <Route path="/partner/collaborations" element={<Navigate to="/provider/collaborations" replace />} />
            <Route path="/partner/profile" element={<Navigate to="/provider/profile" replace />} />
            <Route path="/partner/settings" element={<Navigate to="/provider/settings" replace />} />
            <Route path="/partner/creator" element={<Navigate to="/provider/services" replace />} />
            <Route path="/partner/creator/*" element={<Navigate to="/provider/services" replace />} />
            <Route path="/partner/*" element={<Navigate to="/provider" replace />} />
            <Route path="/creator" element={<Navigate to="/provider/services" replace />} />
            <Route path="/creator/*" element={<Navigate to="/provider/services" replace />} />

            {/* ── 4. Admin Application Area (Protected + Admin RBAC) ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<RoleGuard allowedRoles={["admin"]} />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminHomePage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
                  <Route path="/admin/providers" element={<AdminProvidersPage />} />
                  <Route path="/admin/providers/kyc" element={<AdminKYCPage />} />
                  <Route path="/admin/listings" element={<AdminListingsPage />} />
                  <Route path="/admin/bookings" element={<AdminBookingsPage />} />
                  <Route path="/admin/payments" element={<AdminPaymentsPage />} />
                  <Route path="/admin/reviews" element={<AdminReviewsPage />} />
                  <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                  <Route path="/admin/tickets" element={<AdminTicketsPage />} />

                  {/* Legacy Admin Redirects */}
                  <Route path="/admin/partners" element={<Navigate to="/admin/providers" replace />} />
                  <Route path="/admin/partners/verification" element={<Navigate to="/admin/providers/kyc" replace />} />
                  <Route path="/admin/services" element={<Navigate to="/admin/listings" replace />} />
                  <Route path="/admin/reports" element={<Navigate to="/admin/analytics" replace />} />
                  <Route path="/admin/support" element={<Navigate to="/admin/tickets" replace />} />
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
