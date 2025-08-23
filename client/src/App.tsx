import { HeaderComponent } from '@components/HeaderComponent';
import { Box, CssBaseline } from '@mui/material';
import { authStore, showStore } from '@stores/index';
import { ThemeProvider } from '@theme/ThemeProvider';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import FeedbackButton from './components/FeedbackButton';
import FloatingVolumeControl from './components/FloatingVolumeControl';
import FooterComponent from './components/FooterComponent';
import GlobalNotifications from './components/GlobalNotifications';
import PostLoginModal from './components/PostLoginModalNew';
import StageNameRequiredModal from './components/StageNameRequiredModal';
import VenueDetectionModal from './components/VenueDetectionModal';
import useVenueDetection from './hooks/useVenueDetection';
import { VenueProximity } from './services/GeolocationService';

// Pages
import AdminDashboardPageTabbed from './pages/AdminDashboardPageTabbed';
import AdminParserPage from './pages/AdminParserPage';
import AuthError from './pages/AuthError';
import AuthSuccess from './pages/AuthSuccess';
import DashboardPage from './pages/DashboardPage';
import FeedbackManagementPage from './pages/FeedbackManagementPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MusicPage from './pages/MusicPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import ShowsPage from './pages/ShowsPage';
import SubmitShowPage from './pages/SubmitShowPage';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return authStore.isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Public Route component (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return !authStore.isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
};

// App content component that has access to location
const AppContent: React.FC = observer(() => {
  const location = useLocation();
  const isShowsPage = location.pathname === '/shows';

  // Venue detection state
  const [detectedVenue, setDetectedVenue] = useState<VenueProximity | null>(null);
  const [venueModalOpen, setVenueModalOpen] = useState(false);
  const [dismissedVenues, setDismissedVenues] = useState<Set<string>>(new Set());

  // Initialize venue detection
  const { nearbyVenues, permissionStatus, requestPermission } = useVenueDetection({
    shows: showStore.filteredShows,
    enableAutoDetection: true,
    trackingInterval: 30000, // 30 seconds
  });

  // Handle venue detection
  useEffect(() => {
    if (nearbyVenues.length > 0) {
      // Find the closest venue that hasn't been dismissed
      const closestVenue = nearbyVenues.find(
        (venue) => !dismissedVenues.has(venue.show.id) && venue.isAtVenue,
      );

      if (closestVenue && !detectedVenue) {
        setDetectedVenue(closestVenue);
        setVenueModalOpen(true);
        console.log('Detected user at venue:', closestVenue);
      }
    }
  }, [nearbyVenues, dismissedVenues, detectedVenue]);

  // Handle venue confirmation
  const handleVenueConfirm = (showId: string) => {
    console.log('User confirmed they are at show:', showId);
    // TODO: You can add logic here to mark user as attending the show
    setVenueModalOpen(false);
    setDetectedVenue(null);
  };

  // Handle venue dismissal
  const handleVenueDismiss = () => {
    if (detectedVenue) {
      setDismissedVenues((prev) => new Set(prev).add(detectedVenue.show.id));
    }
    setVenueModalOpen(false);
    setDetectedVenue(null);
  };

  // Request permission on first visit
  useEffect(() => {
    if (permissionStatus === 'prompt') {
      // Automatically request permission when user first visits
      requestPermission().then((granted) => {
        if (granted) {
          console.log('Geolocation permission granted, starting venue detection');
        } else {
          console.log('Geolocation permission denied');
        }
      });
    }
  }, [permissionStatus, requestPermission]);

  // Load shows for venue detection
  useEffect(() => {
    if (showStore.filteredShows.length === 0) {
      showStore.fetchShows();
    }
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <HeaderComponent />

      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          '&:has([data-homepage])': {
            p: 0,
            paddingTop: 0,
          },
          '&:has([data-showspage])': {
            p: 0,
            paddingTop: 0,
          },
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />

            {/* Shows Routes */}
            <Route path="/shows" element={<ShowsPage />} />

            {/* Music Routes with nested navigation */}
            <Route path="/music" element={<MusicPage />} />
            <Route path="/music/search" element={<MusicPage />} />
            <Route path="/music/category/:categoryId" element={<MusicPage />} />
            <Route path="/music/artist/:artistId" element={<MusicPage />} />
            <Route path="/music/song/:songId" element={<MusicPage />} />

            {/* Submit Show Page */}
            <Route path="/submit" element={<SubmitShowPage />} />

            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />

            {/* Auth callback routes */}
            <Route path="/auth/success" element={<AuthSuccess />} />
            <Route path="/auth/error" element={<AuthError />} />

            {/* Public pages */}
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboardPageTabbed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parser"
              element={
                <ProtectedRoute>
                  <AdminParserPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/feedback"
              element={
                <ProtectedRoute>
                  <FeedbackManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Box>
      </Box>

      {/* Footer - hidden on shows page */}
      {!isShowsPage && <FooterComponent />}

      {/* Venue Detection Modal */}
      {detectedVenue && (
        <VenueDetectionModal
          open={venueModalOpen}
          onClose={() => setVenueModalOpen(false)}
          venueProximity={detectedVenue}
          onConfirm={handleVenueConfirm}
          onDismiss={handleVenueDismiss}
        />
      )}
    </Box>
  );
});

const App: React.FC = observer(() => {
  return (
    <ThemeProvider>
      <CssBaseline />
      <Router>
        <AppContent />

        {/* Global Feedback Button */}
        <FeedbackButton />

        {/* Floating Volume Control */}
        <FloatingVolumeControl />

        {/* Global Notifications */}
        <GlobalNotifications />

        {/* Post Login Modal */}
        <PostLoginModal />

        {/* Stage Name Required Modal */}
        <StageNameRequiredModal open={authStore.showStageNameModal} />
      </Router>
    </ThemeProvider>
  );
});

export default App;
