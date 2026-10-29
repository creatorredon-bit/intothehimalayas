import { Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { RequireAuth } from '@/components/RequireAuth';
import HomePage from '@/pages/Home';
import ExplorePage from '@/pages/Explore';
import TrailDetailPage from '@/pages/TrailDetail';
import { DestinationDetailPage, DestinationsPage } from '@/pages/Destinations';
import { GuideDetailPage, GuidesPage, StayDetailPage, StaysPage } from '@/pages/GuidesStays';
import { TripDetailPage, TripsPage } from '@/pages/TripPlanner';
import SavedTrailsPage from '@/pages/SavedTrails';
import DashboardPage from '@/pages/Dashboard';
import AdminPage from '@/pages/Admin';
import CommunityPage from '@/pages/Community';
import LiveGpsPage from '@/pages/LiveGPS';
import { SplitGroupPage, SplitGroupsPage } from '@/pages/SplitMoney';
import {
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
  SignupPage,
  VerifyEmailPage,
} from '@/pages/AuthPages';
import { AboutPage, ContactPage, HelpPage, PrivacyPage, TermsPage } from '@/pages/StaticPages';
import NotFoundPage from '@/pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="trails/:slug" element={<TrailDetailPage />} />
        <Route path="destinations" element={<DestinationsPage />} />
        <Route path="destinations/:slug" element={<DestinationDetailPage />} />
        <Route path="guides" element={<GuidesPage />} />
        <Route path="guides/:slug" element={<GuideDetailPage />} />
        <Route path="stays" element={<StaysPage />} />
        <Route path="stays/:slug" element={<StayDetailPage />} />
        <Route path="plan" element={<TripsPage />} />
        <Route path="plan/:tripId" element={<TripDetailPage />} />
        <Route path="split" element={<SplitGroupsPage />} />
        <Route path="split/:groupId" element={<SplitGroupPage />} />
        <Route path="live" element={<LiveGpsPage />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="saved" element={<SavedTrailsPage />} />
        <Route
          path="dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="admin"
          element={
            <RequireAuth adminOnly>
              <AdminPage />
            </RequireAuth>
          }
        />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
