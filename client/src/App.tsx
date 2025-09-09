import { HeaderComponent } from '@components/HeaderComponent';
import { Box, CircularProgress, CssBaseline } from '@mui/material';
import { authStore, showStore, uiStore } from '@stores/index';
import { ThemeProvider } from '@theme/ThemeProvider';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import FeedbackModal from './components/FeedbackModal';
import FloatingVolumeControl from './components/FloatingVolumeControl';
import FooterComponent from './components/FooterComponent';
import GlobalNotifications from './components/GlobalNotifications';
import PostLoginModal from './components/PostLoginModal';
import StageNameRequiredModal from './components/StageNameRequiredModal';
import VenueDetectionModal from './components/VenueDetectionModal';
import useVenueDetection from './hooks/useVenueDetection';
import { VenueProximity } from './services/GeolocationService';

// Pages
import AboutPage from './pages/AboutPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminParserPage from './pages/AdminParserPage';
import AdTestPage from './pages/AdTestPage';
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
  // Wait for authentication initialization to complete
  if (authStore.isInitializing) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return authStore.isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Public Route component (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Wait for authentication initialization to complete
  if (authStore.isInitializing) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return !authStore.isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
}; // App content component that has access to location
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

  // Load shows for venue detection (but not on shows page where map controls data)
  useEffect(() => {
    const isOnShowsPage = location.pathname === '/shows';
    if (!isOnShowsPage && showStore.filteredShows.length === 0) {
      showStore.fetchShows();
    }
  }, [location.pathname]);

  // Check for stage name requirement on every route change and app load
  useEffect(() => {
    // Force check stage name requirement whenever the user is authenticated and location changes
    if (authStore.isAuthenticated) {
      authStore.forceCheckStageNameRequired();
    }
  }, [location.pathname, authStore.isAuthenticated, authStore.user]);

  // Automatically sync subscription status when app loads and user is authenticated
  useEffect(() => {
    if (authStore.isAuthenticated && authStore.user) {
      // Import subscriptionStore dynamically to avoid circular dependencies
      import('@stores/index').then(({ subscriptionStore }) => {
        // Force sync subscription data from Stripe to ensure it's up to date
        subscriptionStore.syncSubscription().then((result) => {
          if (result.success) {
            console.log('Subscription synced successfully on app load');
          } else {
            console.warn('Failed to sync subscription on app load:', result.error);
            // Fallback to regular fetch if sync fails
            subscriptionStore.fetchSubscriptionStatus();
          }
        });
      });
    }
  }, [authStore.isAuthenticated, authStore.user]);

  // Refresh subscription when user returns to tab (page becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && authStore.isAuthenticated && authStore.user) {
        // Import subscriptionStore dynamically to avoid circular dependencies
        import('@stores/index').then(({ subscriptionStore }) => {
          // Sync subscription when user returns to the tab
          subscriptionStore.fetchSubscriptionStatus().then((result) => {
            if (result.success) {
              console.log('Subscription refreshed on tab focus');
            }
          });
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [authStore.isAuthenticated, authStore.user]);

  // Additional safety check - ensure stage name modal can't be bypassed
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        authStore.isAuthenticated &&
        authStore.user &&
        (!authStore.user.stageName || authStore.user.stageName.trim() === '') &&
        !authStore.showStageNameModal
      ) {
        // Force show the modal if it somehow got closed
        authStore.setShowStageNameModal(true);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [authStore.isAuthenticated, authStore.user, authStore.showStageNameModal]);

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
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

            {/* Ad Testing (temporary) */}
            <Route path="/ad-test" element={<AdTestPage />} />

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
                  <AdminDashboardPage />
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

        {/* Floating Volume Control */}
        <FloatingVolumeControl />

        {/* Global Notifications */}
        <GlobalNotifications />

        {/* Global Feedback Modal */}
        <FeedbackModal
          open={uiStore.feedbackModalOpen}
          onClose={() => uiStore.closeFeedbackModal()}
        />

        {/* Post Login Modal */}
        <PostLoginModal />

        {/* Stage Name Required Modal */}
        <StageNameRequiredModal open={authStore.showStageNameModal} />
      </Router>
    </ThemeProvider>
  );
});

export default App;
