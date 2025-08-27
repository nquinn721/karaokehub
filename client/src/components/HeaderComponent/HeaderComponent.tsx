import {
  faAngleDown,
  faBars,
  faCog,
  faComments,
  faCrown,
  faHome,
  faMapLocationDot,
  faMusic,
  faPlus,
  faSignOutAlt,
  faTachometerAlt,
  faTimes,
  faUser,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import { authStore, subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserDisplayName, getUserSecondaryName } from '../../utils/userUtils';
import FeedbackModal from '../FeedbackModal';
import { SubscriptionUpgradeModal } from '../SubscriptionUpgradeModal';

export interface HeaderComponentProps {
  title?: string;
  showMenuButton?: boolean;
}

export const HeaderComponent: React.FC<HeaderComponentProps> = observer(
  ({ title = 'KaraokeHub', showMenuButton = true }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [feedbackOpen, setFeedbackOpen] = React.useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = React.useState(false);

    // Helper function to check if a path is active
    const isActivePath = (path: string) => {
      if (path === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(path);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      setAnchorEl(null);
    };

    const handleLogout = () => {
      authStore.logout();
      navigate('/');
      handleMenuClose();
    };

    const handleProfile = () => {
      navigate('/profile');
      handleMenuClose();
    };

    const handleSettings = () => {
      navigate('/settings');
      handleMenuClose();
    };

    const handleAdminDashboard = () => {
      navigate('/admin');
      handleMenuClose();
    };

    const handleFeedback = () => {
      setFeedbackOpen(true);
      handleMenuClose();
    };

    const handleMobileMenuOpen = () => {
      setMobileMenuOpen(true);
    };

    const handleMobileMenuClose = () => {
      setMobileMenuOpen(false);
    };

    const handleMobileNavigation = (path: string) => {
      navigate(path);
      setMobileMenuOpen(false);
    };

    return (
      <>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundColor:
              theme.palette.mode === 'light'
                ? theme.palette.primary.main // Solid primary color in light mode
                : theme.palette.background.paper, // Keep current dark mode style
            color:
              theme.palette.mode === 'light'
                ? theme.palette.primary.contrastText // White text on solid primary
                : theme.palette.text.primary, // Current dark mode text
            height: { xs: '60px', md: '80px' }, // Reduced mobile header height so logo extends below
            zIndex: theme.zIndex.appBar,
          }}
        >
          <Toolbar
            sx={{
              height: '100%',
              minHeight: { xs: '60px !important', md: '80px !important' }, // Reduced mobile toolbar height
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between', // This creates three sections
            }}
          >
            {/* Left Section: Logo and Title */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {showMenuButton && (
                <Box
                  onClick={() => navigate('/')}
                  sx={{
                    mr: 2,
                    position: 'relative',
                    zIndex: theme.zIndex.appBar + 1, // Ensure logo is above the stripe
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      transition: 'transform 0.2s ease-in-out',
                    },
                  }}
                >
                  <Box
                    component="img"
                    src="/images/karaoke-hub-logo.png"
                    alt="KaraokeHub Logo"
                    sx={{
                      // Responsive logo sizing - made mobile logo bigger
                      width: { xs: '100px', sm: '100px', md: '120px', lg: '170px' },
                      height: { xs: '100px', sm: '100px', md: '120px', lg: '170px' },
                      transform: {
                        xs: 'translateY(0px)', // No vertical translation
                        sm: 'translateY(5px)',
                        md: 'translateY(15px)',
                        lg: 'translateY(35px)',
                      },
                      marginTop: { xs: '40px', sm: 0, md: 0, lg: 0 }, // Add margin-top for mobile
                      transition: 'all 0.3s ease-in-out',
                    }}
                  />
                </Box>
              )}

              <Typography
                variant="h6"
                component="div"
                onClick={() => navigate('/')}
                sx={{
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: theme.palette.mode === 'light' ? '#FFFFFF' : 'transparent',
                  background:
                    theme.palette.mode === 'light'
                      ? 'none'
                      : 'linear-gradient(135deg, #8fa8f7 0%, #9d6db8 50%, #f5b8fd 100%)',
                  WebkitBackgroundClip: theme.palette.mode === 'light' ? 'initial' : 'text',
                  WebkitTextFillColor: theme.palette.mode === 'light' ? '#FFFFFF' : 'transparent',
                  backgroundClip: theme.palette.mode === 'light' ? 'initial' : 'text',
                  textShadow:
                    theme.palette.mode === 'light' ? '1px 1px 2px rgba(0,0,0,0.3)' : 'none',
                  display: 'inline-block',
                  '&:hover': {
                    opacity: 0.8,
                    transform: 'scale(1.02)',
                    transition: 'all 0.2s ease-in-out',
                  },
                }}
              >
                {title}
              </Typography>
            </Box>
            {/* Center Section: Navigation Links (Desktop Only) */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                flexGrow: 1,
                height: '100%',
                gap: 2,
              }}
            >
              {/* Home */}
              <Button
                variant="text"
                size="medium"
                onClick={() => navigate('/')}
                startIcon={<FontAwesomeIcon icon={faHome} size="sm" />}
                sx={{
                  color: theme.palette.mode === 'light' ? 'white' : 'inherit',
                  fontWeight: isActivePath('/') ? 600 : 400,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  letterSpacing: '0.02em',
                  px: 2.5,
                  py: 1.25,
                  borderRadius: '12px',
                  minHeight: '42px',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: isActivePath('/')
                    ? `linear-gradient(135deg, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(64, 224, 208, 0.15)'
                            : 'rgba(100, 181, 246, 0.15)'
                        } 0%, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(147, 51, 234, 0.1)'
                            : 'rgba(156, 39, 176, 0.1)'
                        } 100%)`
                    : 'transparent',
                  backdropFilter: isActivePath('/') ? 'blur(10px)' : 'none',
                  border: isActivePath('/')
                    ? `1px solid ${
                        theme.palette.mode === 'light'
                          ? 'rgba(64, 224, 208, 0.2)'
                          : 'rgba(100, 181, 246, 0.2)'
                      }`
                    : '1px solid transparent',
                  boxShadow: isActivePath('/')
                    ? `0 4px 20px ${
                        theme.palette.mode === 'light'
                          ? 'rgba(64, 224, 208, 0.1)'
                          : 'rgba(100, 181, 246, 0.1)'
                      }`
                    : 'none',
                  '&:hover': {
                    background: isActivePath('/')
                      ? `linear-gradient(135deg, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(64, 224, 208, 0.2)'
                              : 'rgba(100, 181, 246, 0.2)'
                          } 0%, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(147, 51, 234, 0.15)'
                              : 'rgba(156, 39, 176, 0.15)'
                          } 100%)`
                      : theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(255, 255, 255, 0.08)',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 25px ${
                      theme.palette.mode === 'light'
                        ? 'rgba(64, 224, 208, 0.15)'
                        : 'rgba(100, 181, 246, 0.15)'
                    }`,
                  },
                  '& .MuiButton-startIcon': {
                    marginRight: '8px',
                  },
                }}
              >
                Home
              </Button>

              {/* Shows */}
              <Button
                variant="text"
                size="medium"
                onClick={() => navigate('/shows')}
                startIcon={<FontAwesomeIcon icon={faMapLocationDot} size="sm" />}
                sx={{
                  color: theme.palette.mode === 'light' ? 'white' : 'inherit',
                  fontWeight: isActivePath('/shows') ? 600 : 400,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  letterSpacing: '0.02em',
                  px: 2.5,
                  py: 1.25,
                  borderRadius: '12px',
                  minHeight: '42px',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: isActivePath('/shows')
                    ? `linear-gradient(135deg, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(64, 224, 208, 0.15)'
                            : 'rgba(100, 181, 246, 0.15)'
                        } 0%, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(147, 51, 234, 0.1)'
                            : 'rgba(156, 39, 176, 0.1)'
                        } 100%)`
                    : 'transparent',
                  backdropFilter: isActivePath('/shows') ? 'blur(10px)' : 'none',
                  border: isActivePath('/shows')
                    ? `1px solid ${
                        theme.palette.mode === 'light'
                          ? 'rgba(64, 224, 208, 0.2)'
                          : 'rgba(100, 181, 246, 0.2)'
                      }`
                    : '1px solid transparent',
                  boxShadow: isActivePath('/shows')
                    ? `0 4px 20px ${
                        theme.palette.mode === 'light'
                          ? 'rgba(64, 224, 208, 0.1)'
                          : 'rgba(100, 181, 246, 0.1)'
                      }`
                    : 'none',
                  '&:hover': {
                    background: isActivePath('/shows')
                      ? `linear-gradient(135deg, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(64, 224, 208, 0.2)'
                              : 'rgba(100, 181, 246, 0.2)'
                          } 0%, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(147, 51, 234, 0.15)'
                              : 'rgba(156, 39, 176, 0.15)'
                          } 100%)`
                      : theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.15)'
                        : 'rgba(255, 255, 255, 0.08)',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 6px 25px ${
                      theme.palette.mode === 'light'
                        ? 'rgba(64, 224, 208, 0.15)'
                        : 'rgba(100, 181, 246, 0.15)'
                    }`,
                  },
                  '& .MuiButton-startIcon': {
                    marginRight: '8px',
                  },
                }}
              >
                Shows
              </Button>

              {/* Submit Show - Elegantly prominent in the center */}
              <Button
                variant="outlined"
                size="medium"
                onClick={() => navigate('/submit')}
                startIcon={<FontAwesomeIcon icon={faPlus} size="sm" />}
                sx={{
                  color: theme.palette.mode === 'light' ? 'white' : 'inherit',
                  background: isActivePath('/submit')
                    ? `linear-gradient(135deg, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(64, 224, 208, 0.25)'
                            : 'rgba(100, 181, 246, 0.25)'
                        } 0%, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(147, 51, 234, 0.2)'
                            : 'rgba(156, 39, 176, 0.2)'
                        } 100%)`
                    : 'transparent',
                  borderColor:
                    theme.palette.mode === 'light'
                      ? 'rgba(64, 224, 208, 0.3)'
                      : 'rgba(100, 181, 246, 0.3)',
                  fontWeight: 600, // Always bold for prominence
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  letterSpacing: '0.03em',
                  px: 3, // Slightly wider than others
                  py: 1.25,
                  borderRadius: '12px',
                  minHeight: '42px',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: isActivePath('/submit')
                    ? `0 6px 30px ${
                        theme.palette.mode === 'light'
                          ? 'rgba(64, 224, 208, 0.15)'
                          : 'rgba(100, 181, 246, 0.15)'
                      }`
                    : `0 2px 12px ${
                        theme.palette.mode === 'light'
                          ? 'rgba(64, 224, 208, 0.1)'
                          : 'rgba(100, 181, 246, 0.1)'
                      }`,
                  '&:hover': {
                    background: isActivePath('/submit')
                      ? `linear-gradient(135deg, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(64, 224, 208, 0.3)'
                              : 'rgba(100, 181, 246, 0.3)'
                          } 0%, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(147, 51, 234, 0.25)'
                              : 'rgba(156, 39, 176, 0.25)'
                          } 100%)`
                      : `linear-gradient(135deg, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(64, 224, 208, 0.15)'
                              : 'rgba(100, 181, 246, 0.15)'
                          } 0%, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(147, 51, 234, 0.1)'
                              : 'rgba(156, 39, 176, 0.1)'
                          } 100%)`,
                    borderColor:
                      theme.palette.mode === 'light'
                        ? 'rgba(64, 224, 208, 0.5)'
                        : 'rgba(100, 181, 246, 0.5)',
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 35px ${
                      theme.palette.mode === 'light'
                        ? 'rgba(64, 224, 208, 0.2)'
                        : 'rgba(100, 181, 246, 0.2)'
                    }`,
                  },
                  '& .MuiButton-startIcon': {
                    marginRight: '8px',
                  },
                }}
              >
                Submit Show
              </Button>

              {/* Music Search - Only show when authenticated */}
              {authStore.isAuthenticated && (
                <Button
                  variant="text"
                  size="medium"
                  onClick={() => navigate('/music')}
                  startIcon={<FontAwesomeIcon icon={faMusic} size="sm" />}
                  sx={{
                    color: theme.palette.mode === 'light' ? 'white' : 'inherit',
                    fontWeight: isActivePath('/music') ? 600 : 400,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    letterSpacing: '0.02em',
                    px: 2.5,
                    py: 1.25,
                    borderRadius: '12px',
                    minHeight: '42px',
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: isActivePath('/music')
                      ? `linear-gradient(135deg, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(64, 224, 208, 0.15)'
                              : 'rgba(100, 181, 246, 0.15)'
                          } 0%, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(147, 51, 234, 0.1)'
                              : 'rgba(156, 39, 176, 0.1)'
                          } 100%)`
                      : 'transparent',
                    backdropFilter: isActivePath('/music') ? 'blur(10px)' : 'none',
                    border: isActivePath('/music')
                      ? `1px solid ${
                          theme.palette.mode === 'light'
                            ? 'rgba(64, 224, 208, 0.2)'
                            : 'rgba(100, 181, 246, 0.2)'
                        }`
                      : '1px solid transparent',
                    boxShadow: isActivePath('/music')
                      ? `0 4px 20px ${
                          theme.palette.mode === 'light'
                            ? 'rgba(64, 224, 208, 0.1)'
                            : 'rgba(100, 181, 246, 0.1)'
                        }`
                      : 'none',
                    '&:hover': {
                      background: isActivePath('/music')
                        ? `linear-gradient(135deg, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(64, 224, 208, 0.2)'
                                : 'rgba(100, 181, 246, 0.2)'
                            } 0%, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(147, 51, 234, 0.15)'
                                : 'rgba(156, 39, 176, 0.15)'
                            } 100%)`
                        : theme.palette.mode === 'light'
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'rgba(255, 255, 255, 0.08)',
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 25px ${
                        theme.palette.mode === 'light'
                          ? 'rgba(64, 224, 208, 0.15)'
                          : 'rgba(100, 181, 246, 0.15)'
                      }`,
                    },
                    '& .MuiButton-startIcon': {
                      marginRight: '8px',
                    },
                  }}
                >
                  Music
                </Button>
              )}

              {/* Dashboard (if authenticated) */}
              {authStore.isAuthenticated && (
                <Button
                  variant="text"
                  size="medium"
                  onClick={() => navigate('/dashboard')}
                  startIcon={<FontAwesomeIcon icon={faTachometerAlt} size="sm" />}
                  sx={{
                    color: theme.palette.mode === 'light' ? 'white' : 'inherit',
                    fontWeight: isActivePath('/dashboard') ? 600 : 400,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    letterSpacing: '0.02em',
                    px: 2.5,
                    py: 1.25,
                    borderRadius: '12px',
                    minHeight: '42px',
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    background: isActivePath('/dashboard')
                      ? `linear-gradient(135deg, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(64, 224, 208, 0.15)'
                              : 'rgba(100, 181, 246, 0.15)'
                          } 0%, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(147, 51, 234, 0.1)'
                              : 'rgba(156, 39, 176, 0.1)'
                          } 100%)`
                      : 'transparent',
                    backdropFilter: isActivePath('/dashboard') ? 'blur(10px)' : 'none',
                    border: isActivePath('/dashboard')
                      ? `1px solid ${
                          theme.palette.mode === 'light'
                            ? 'rgba(64, 224, 208, 0.2)'
                            : 'rgba(100, 181, 246, 0.2)'
                        }`
                      : '1px solid transparent',
                    boxShadow: isActivePath('/dashboard')
                      ? `0 4px 20px ${
                          theme.palette.mode === 'light'
                            ? 'rgba(64, 224, 208, 0.1)'
                            : 'rgba(100, 181, 246, 0.1)'
                        }`
                      : 'none',
                    '&:hover': {
                      background: isActivePath('/dashboard')
                        ? `linear-gradient(135deg, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(64, 224, 208, 0.2)'
                                : 'rgba(100, 181, 246, 0.2)'
                            } 0%, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(147, 51, 234, 0.15)'
                                : 'rgba(156, 39, 176, 0.15)'
                            } 100%)`
                        : theme.palette.mode === 'light'
                          ? 'rgba(255, 255, 255, 0.15)'
                          : 'rgba(255, 255, 255, 0.08)',
                      transform: 'translateY(-2px)',
                      boxShadow: `0 6px 25px ${
                        theme.palette.mode === 'light'
                          ? 'rgba(64, 224, 208, 0.15)'
                          : 'rgba(100, 181, 246, 0.15)'
                      }`,
                    },
                  }}
                >
                  Dashboard
                </Button>
              )}
            </Box>{' '}
            {/* Right Section: User Controls and Mobile Menu */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Mobile Hamburger Menu - Only visible on small screens */}
              <IconButton
                color="inherit"
                onClick={handleMobileMenuOpen}
                sx={{
                  display: { xs: 'block', md: 'none' },
                  mr: 1,
                }}
              >
                <FontAwesomeIcon icon={faBars} />
              </IconButton>

              {/* Desktop Controls - Hidden on small screens */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
                {/* Upgrade Button - Only show if user is authenticated and not on premium */}
                {authStore.isAuthenticated && subscriptionStore.currentPlan !== 'premium' && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setUpgradeModalOpen(true)}
                    sx={{
                      color: theme.palette.mode === 'light' ? 'white' : 'inherit',
                      borderColor:
                        theme.palette.mode === 'light' ? 'rgba(255,255,255,0.7)' : 'inherit',
                      '&:hover': {
                        borderColor: theme.palette.mode === 'light' ? 'white' : 'inherit',
                        backgroundColor:
                          theme.palette.mode === 'light' ? 'rgba(255,255,255,0.1)' : 'inherit',
                      },
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faCrown}
                      style={{ marginRight: '6px', fontSize: '14px' }}
                    />
                    Upgrade
                  </Button>
                )}

                {authStore.isAuthenticated ? (
                  <>
                    {/* User Avatar and Name Display */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {/* Display Name - Hidden on mobile, clickable to open menu */}
                      <Typography
                        variant="body2"
                        onClick={handleMenuOpen}
                        sx={{
                          color: theme.palette.mode === 'light' ? 'white' : 'inherit',
                          fontWeight: 500,
                          display: { xs: 'none', sm: 'block' },
                          cursor: 'pointer',
                          userSelect: 'none',
                          padding: '4px 4px 4px 8px',
                          borderRadius: 1,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor:
                              theme.palette.mode === 'light'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(255, 255, 255, 0.05)',
                            transform: 'translateY(-1px)',
                          },
                        }}
                      >
                        {authStore.user && getUserDisplayName(authStore.user)}
                      </Typography>

                      {/* Caret Icon */}
                      <Box
                        onClick={handleMenuOpen}
                        sx={{
                          display: { xs: 'none', sm: 'flex' },
                          alignItems: 'center',
                          cursor: 'pointer',
                          color: theme.palette.mode === 'light' ? 'white' : 'inherit',
                          padding: '4px 2px',
                          borderRadius: 1,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor:
                              theme.palette.mode === 'light'
                                ? 'rgba(255, 255, 255, 0.1)'
                                : 'rgba(255, 255, 255, 0.05)',
                          },
                        }}
                      >
                        <FontAwesomeIcon icon={faAngleDown} size="sm" />
                      </Box>

                      <IconButton
                        size="large"
                        edge="end"
                        aria-label="account of current user"
                        aria-controls="primary-search-account-menu"
                        aria-haspopup="true"
                        onClick={handleMenuOpen}
                        color="inherit"
                      >
                        {authStore.user?.avatar ? (
                          <Avatar src={authStore.user.avatar} sx={{ width: 32, height: 32 }} />
                        ) : (
                          <Avatar sx={{ width: 32, height: 32 }}>
                            <FontAwesomeIcon icon={faUser} />
                          </Avatar>
                        )}
                      </IconButton>
                    </Box>

                    <Menu
                      anchorEl={anchorEl}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                      keepMounted
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      open={Boolean(anchorEl)}
                      onClose={handleMenuClose}
                      PaperProps={{
                        sx: {
                          mt: 1,
                          minWidth: 200,
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                        },
                      }}
                    >
                      {authStore.user && (
                        <MenuItem disabled>
                          <Box>
                            <Typography variant="body2" color="text.primary">
                              {getUserDisplayName(authStore.user)}
                            </Typography>
                            {getUserSecondaryName(authStore.user) && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: '0.65rem' }}
                              >
                                {getUserSecondaryName(authStore.user)}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      )}
                      <MenuItem onClick={handleProfile}>
                        <FontAwesomeIcon icon={faUser} style={{ marginRight: '8px' }} />
                        Profile
                      </MenuItem>
                      <MenuItem onClick={handleSettings}>
                        <FontAwesomeIcon icon={faCog} style={{ marginRight: '8px' }} />
                        Settings
                      </MenuItem>
                      {authStore.isAdmin && (
                        <MenuItem onClick={handleAdminDashboard}>
                          <FontAwesomeIcon icon={faUserShield} style={{ marginRight: '8px' }} />
                          Admin Dashboard
                        </MenuItem>
                      )}
                      <MenuItem onClick={handleFeedback}>
                        <FontAwesomeIcon icon={faComments} style={{ marginRight: '8px' }} />
                        Send Feedback
                      </MenuItem>
                      <MenuItem onClick={handleLogout}>
                        <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: '8px' }} />
                        Logout
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <>
                    <Button
                      color="primary"
                      variant="contained"
                      size="small"
                      onClick={() => navigate('/login')}
                      sx={
                        theme.palette.mode === 'light'
                          ? {
                              backgroundColor: theme.palette.primary.contrastText,
                              color: theme.palette.primary.main,
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              },
                            }
                          : {}
                      }
                    >
                      Login/Register
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Mobile Drawer Menu */}
        <Drawer
          anchor="left"
          open={mobileMenuOpen}
          onClose={handleMobileMenuClose}
          ModalProps={{
            sx: {
              zIndex: theme.zIndex.modal - 40, // 1260 - backdrop above bottom sheet
            },
          }}
          PaperProps={{
            sx: {
              width: 280,
              backgroundColor:
                theme.palette.mode === 'dark' ? theme.palette.background.paper : '#1a1a1a',
              background:
                theme.palette.mode === 'dark' ? theme.palette.background.paper : '#1a1a1a',
              color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#ffffff',
              borderRight: `1px solid ${
                theme.palette.mode === 'dark' ? theme.palette.divider : '#333333'
              }`,
              zIndex: theme.zIndex.modal - 40, // 1260 - ensures drawer appears above bottom sheet
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: `1px solid ${
                theme.palette.mode === 'dark' ? theme.palette.divider : '#333333'
              }`,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#ffffff',
              }}
            >
              Menu
            </Typography>
            <IconButton
              onClick={handleMobileMenuClose}
              sx={{
                color: theme.palette.mode === 'dark' ? theme.palette.text.secondary : '#ffffff',
              }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </IconButton>
          </Box>

          <List>
            <Divider
              sx={{
                my: 1,
                borderColor: theme.palette.mode === 'dark' ? theme.palette.divider : '#333333',
              }}
            />

            {/* Home */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleMobileNavigation('/')}
                sx={{
                  background: isActivePath('/')
                    ? `linear-gradient(135deg, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(64, 224, 208, 0.15)'
                            : 'rgba(100, 181, 246, 0.15)'
                        } 0%, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(147, 51, 234, 0.1)'
                            : 'rgba(156, 39, 176, 0.1)'
                        } 100%)`
                    : 'transparent',
                  color: isActivePath('/')
                    ? theme.palette.mode === 'light'
                      ? 'white'
                      : 'inherit'
                    : 'inherit',
                  '&:hover': {
                    background: isActivePath('/')
                      ? `linear-gradient(135deg, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(64, 224, 208, 0.2)'
                              : 'rgba(100, 181, 246, 0.2)'
                          } 0%, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(147, 51, 234, 0.15)'
                              : 'rgba(156, 39, 176, 0.15)'
                          } 100%)`
                      : theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <FontAwesomeIcon icon={faHome} />
                </ListItemIcon>
                <ListItemText
                  primary="Home"
                  primaryTypographyProps={{
                    fontWeight: isActivePath('/') ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>

            {/* Shows */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleMobileNavigation('/shows')}
                sx={{
                  background: isActivePath('/shows')
                    ? `linear-gradient(135deg, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(64, 224, 208, 0.15)'
                            : 'rgba(100, 181, 246, 0.15)'
                        } 0%, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(147, 51, 234, 0.1)'
                            : 'rgba(156, 39, 176, 0.1)'
                        } 100%)`
                    : 'transparent',
                  color: isActivePath('/shows')
                    ? theme.palette.mode === 'light'
                      ? 'white'
                      : 'inherit'
                    : 'inherit',
                  '&:hover': {
                    background: isActivePath('/shows')
                      ? `linear-gradient(135deg, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(64, 224, 208, 0.2)'
                              : 'rgba(100, 181, 246, 0.2)'
                          } 0%, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(147, 51, 234, 0.15)'
                              : 'rgba(156, 39, 176, 0.15)'
                          } 100%)`
                      : theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <FontAwesomeIcon icon={faMapLocationDot} />
                </ListItemIcon>
                <ListItemText
                  primary="Shows"
                  primaryTypographyProps={{
                    fontWeight: isActivePath('/shows') ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>

            {/* Submit Show */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleMobileNavigation('/submit')}
                sx={{
                  background: isActivePath('/submit')
                    ? `linear-gradient(135deg, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(64, 224, 208, 0.15)'
                            : 'rgba(100, 181, 246, 0.15)'
                        } 0%, 
                        ${
                          theme.palette.mode === 'light'
                            ? 'rgba(147, 51, 234, 0.1)'
                            : 'rgba(156, 39, 176, 0.1)'
                        } 100%)`
                    : 'transparent',
                  color: isActivePath('/submit')
                    ? theme.palette.mode === 'light'
                      ? 'white'
                      : 'inherit'
                    : 'inherit',
                  '&:hover': {
                    background: isActivePath('/submit')
                      ? `linear-gradient(135deg, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(64, 224, 208, 0.2)'
                              : 'rgba(100, 181, 246, 0.2)'
                          } 0%, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(147, 51, 234, 0.15)'
                              : 'rgba(156, 39, 176, 0.15)'
                          } 100%)`
                      : theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <FontAwesomeIcon icon={faPlus} />
                </ListItemIcon>
                <ListItemText
                  primary="Submit Show"
                  primaryTypographyProps={{
                    fontWeight: isActivePath('/submit') ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>

            {/* Music - Only show when authenticated */}
            {authStore.isAuthenticated && (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleMobileNavigation('/music')}
                  sx={{
                    background: isActivePath('/music')
                      ? `linear-gradient(135deg, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(64, 224, 208, 0.15)'
                              : 'rgba(100, 181, 246, 0.15)'
                          } 0%, 
                          ${
                            theme.palette.mode === 'light'
                              ? 'rgba(147, 51, 234, 0.1)'
                              : 'rgba(156, 39, 176, 0.1)'
                          } 100%)`
                      : 'transparent',
                    color: isActivePath('/music')
                      ? theme.palette.mode === 'light'
                        ? 'white'
                        : 'inherit'
                      : 'inherit',
                    '&:hover': {
                      background: isActivePath('/music')
                        ? `linear-gradient(135deg, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(64, 224, 208, 0.2)'
                                : 'rgba(100, 181, 246, 0.2)'
                            } 0%, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(147, 51, 234, 0.15)'
                                : 'rgba(156, 39, 176, 0.15)'
                            } 100%)`
                        : theme.palette.action.hover,
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit' }}>
                    <FontAwesomeIcon icon={faMusic} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Music"
                    primaryTypographyProps={{
                      fontWeight: isActivePath('/music') ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )}

            {authStore.isAuthenticated ? (
              <>
                {/* Dashboard */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleMobileNavigation('/dashboard')}
                    sx={{
                      background: isActivePath('/dashboard')
                        ? `linear-gradient(135deg, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(64, 224, 208, 0.15)'
                                : 'rgba(100, 181, 246, 0.15)'
                            } 0%, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(147, 51, 234, 0.1)'
                                : 'rgba(156, 39, 176, 0.1)'
                            } 100%)`
                        : 'transparent',
                      color: isActivePath('/dashboard')
                        ? theme.palette.mode === 'light'
                          ? 'white'
                          : 'inherit'
                        : 'inherit',
                      '&:hover': {
                        background: isActivePath('/dashboard')
                          ? `linear-gradient(135deg, 
                              ${
                                theme.palette.mode === 'light'
                                  ? 'rgba(64, 224, 208, 0.2)'
                                  : 'rgba(100, 181, 246, 0.2)'
                              } 0%, 
                              ${
                                theme.palette.mode === 'light'
                                  ? 'rgba(147, 51, 234, 0.15)'
                                  : 'rgba(156, 39, 176, 0.15)'
                              } 100%)`
                          : theme.palette.action.hover,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      <FontAwesomeIcon icon={faTachometerAlt} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Dashboard"
                      primaryTypographyProps={{
                        fontWeight: isActivePath('/dashboard') ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>

                <Divider sx={{ my: 1 }} />

                {/* User Info */}
                {authStore.user && (
                  <ListItem>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      {authStore.user.avatar ? (
                        <Avatar src={authStore.user.avatar} sx={{ width: 40, height: 40 }} />
                      ) : (
                        <Avatar sx={{ width: 40, height: 40 }}>
                          <FontAwesomeIcon icon={faUser} />
                        </Avatar>
                      )}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {getUserDisplayName(authStore.user)}
                        </Typography>
                        {getUserSecondaryName(authStore.user) && (
                          <Typography variant="caption" color="text.secondary">
                            {getUserSecondaryName(authStore.user)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </ListItem>
                )}

                {/* Profile */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleMobileNavigation('/profile')}
                    sx={{
                      background: isActivePath('/profile')
                        ? `linear-gradient(135deg, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(64, 224, 208, 0.15)'
                                : 'rgba(100, 181, 246, 0.15)'
                            } 0%, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(147, 51, 234, 0.1)'
                                : 'rgba(156, 39, 176, 0.1)'
                            } 100%)`
                        : 'transparent',
                      color: isActivePath('/profile')
                        ? theme.palette.mode === 'light'
                          ? 'white'
                          : 'inherit'
                        : 'inherit',
                      '&:hover': {
                        background: isActivePath('/profile')
                          ? `linear-gradient(135deg, 
                              ${
                                theme.palette.mode === 'light'
                                  ? 'rgba(64, 224, 208, 0.2)'
                                  : 'rgba(100, 181, 246, 0.2)'
                              } 0%, 
                              ${
                                theme.palette.mode === 'light'
                                  ? 'rgba(147, 51, 234, 0.15)'
                                  : 'rgba(156, 39, 176, 0.15)'
                              } 100%)`
                          : theme.palette.action.hover,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      <FontAwesomeIcon icon={faUser} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Profile"
                      primaryTypographyProps={{
                        fontWeight: isActivePath('/profile') ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>

                {/* Settings */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleMobileNavigation('/settings')}
                    sx={{
                      background: isActivePath('/settings')
                        ? `linear-gradient(135deg, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(64, 224, 208, 0.15)'
                                : 'rgba(100, 181, 246, 0.15)'
                            } 0%, 
                            ${
                              theme.palette.mode === 'light'
                                ? 'rgba(147, 51, 234, 0.1)'
                                : 'rgba(156, 39, 176, 0.1)'
                            } 100%)`
                        : 'transparent',
                      color: isActivePath('/settings')
                        ? theme.palette.mode === 'light'
                          ? 'white'
                          : 'inherit'
                        : 'inherit',
                      '&:hover': {
                        background: isActivePath('/settings')
                          ? `linear-gradient(135deg, 
                              ${
                                theme.palette.mode === 'light'
                                  ? 'rgba(64, 224, 208, 0.2)'
                                  : 'rgba(100, 181, 246, 0.2)'
                              } 0%, 
                              ${
                                theme.palette.mode === 'light'
                                  ? 'rgba(147, 51, 234, 0.15)'
                                  : 'rgba(156, 39, 176, 0.15)'
                              } 100%)`
                          : theme.palette.action.hover,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      <FontAwesomeIcon icon={faCog} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Settings"
                      primaryTypographyProps={{
                        fontWeight: isActivePath('/settings') ? 600 : 400,
                      }}
                    />
                  </ListItemButton>
                </ListItem>

                {/* Upgrade Button - Mobile - Only show if not on premium */}
                {subscriptionStore.currentPlan !== 'premium' && (
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setUpgradeModalOpen(true);
                      }}
                      sx={{
                        background: `linear-gradient(135deg, 
                          ${theme.palette.secondary.main}20 0%, 
                          ${theme.palette.secondary.main}10 100%)`,
                        border: `1px solid ${theme.palette.secondary.main}40`,
                        borderRadius: 1,
                        mx: 1,
                        my: 0.5,
                        '&:hover': {
                          background: `linear-gradient(135deg, 
                            ${theme.palette.secondary.main}30 0%, 
                            ${theme.palette.secondary.main}15 100%)`,
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: theme.palette.secondary.main }}>
                        <FontAwesomeIcon icon={faCrown} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          subscriptionStore.currentPlan === 'free'
                            ? 'Upgrade to Premium'
                            : 'Upgrade to Premium'
                        }
                        primaryTypographyProps={{
                          fontWeight: 600,
                          color: theme.palette.secondary.main,
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                )}

                {/* Admin Dashboard */}
                {authStore.isAdmin && (
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleMobileNavigation('/admin')}
                      sx={{
                        background: isActivePath('/admin')
                          ? `linear-gradient(135deg, 
                              ${
                                theme.palette.mode === 'light'
                                  ? 'rgba(64, 224, 208, 0.15)'
                                  : 'rgba(100, 181, 246, 0.15)'
                              } 0%, 
                              ${
                                theme.palette.mode === 'light'
                                  ? 'rgba(147, 51, 234, 0.1)'
                                  : 'rgba(156, 39, 176, 0.1)'
                              } 100%)`
                          : 'transparent',
                        color: isActivePath('/admin')
                          ? theme.palette.mode === 'light'
                            ? 'white'
                            : 'inherit'
                          : 'inherit',
                        '&:hover': {
                          background: isActivePath('/admin')
                            ? `linear-gradient(135deg, 
                                ${
                                  theme.palette.mode === 'light'
                                    ? 'rgba(64, 224, 208, 0.2)'
                                    : 'rgba(100, 181, 246, 0.2)'
                                } 0%, 
                                ${
                                  theme.palette.mode === 'light'
                                    ? 'rgba(147, 51, 234, 0.15)'
                                    : 'rgba(156, 39, 176, 0.15)'
                                } 100%)`
                            : theme.palette.action.hover,
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: 'inherit' }}>
                        <FontAwesomeIcon icon={faUserShield} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Admin Dashboard"
                        primaryTypographyProps={{
                          fontWeight: isActivePath('/admin') ? 600 : 400,
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                )}

                <Divider sx={{ my: 1 }} />

                {/* Feedback */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      setFeedbackOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <ListItemIcon>
                      <FontAwesomeIcon icon={faComments} />
                    </ListItemIcon>
                    <ListItemText primary="Send Feedback" />
                  </ListItemButton>
                </ListItem>

                {/* Logout */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <ListItemIcon>
                      <FontAwesomeIcon icon={faSignOutAlt} />
                    </ListItemIcon>
                    <ListItemText primary="Logout" />
                  </ListItemButton>
                </ListItem>
              </>
            ) : (
              <>
                {/* Feedback */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      setFeedbackOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <ListItemIcon>
                      <FontAwesomeIcon icon={faComments} />
                    </ListItemIcon>
                    <ListItemText primary="Send Feedback" />
                  </ListItemButton>
                </ListItem>

                <Divider sx={{ my: 1 }} />

                {/* Login/Register */}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/login')}>
                    <ListItemIcon>
                      <FontAwesomeIcon icon={faUser} />
                    </ListItemIcon>
                    <ListItemText primary="Login/Register" />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Drawer>

        {/* Feedback Modal */}
        <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

        {/* Subscription Upgrade Modal */}
        <SubscriptionUpgradeModal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          currentPlan={subscriptionStore.currentPlan}
        />
      </>
    );
  },
);
