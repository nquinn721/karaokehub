import { HeaderComponent } from '@components/HeaderComponent';
import { Box, CssBaseline } from '@mui/material';
import { authStore } from '@stores/index';
import { ThemeProvider } from '@theme/ThemeProvider';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import FeedbackButton from './components/FeedbackButton';
import GlobalNotifications from './components/GlobalNotifications';

// Pages
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminParserPage from './pages/AdminParserPage';
import AuthError from './pages/AuthError';
import AuthSuccess from './pages/AuthSuccess';
import DashboardPage from './pages/DashboardPage';
import FeedbackManagementPage from './pages/FeedbackManagementPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MusicPage from './pages/MusicPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import SubmitShowPage from './pages/SubmitShowPage';

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return authStore.isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Public Route component (redirect to dashboard if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return !authStore.isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
};

const App: React.FC = observer(() => {
  return (
    <ThemeProvider>
      <CssBaseline />
      <Router>
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
              p: 3,
              paddingTop: '24px', // Minimal padding since secondary header is now properly positioned
              '&:has([data-homepage])': {
                p: 0,
                paddingTop: 0,
              },
            }}
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />

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

          {/* Global Feedback Button */}
          <FeedbackButton />

          {/* Global Notifications */}
          <GlobalNotifications />
        </Box>
      </Router>
    </ThemeProvider>
  );
});

export default App;
