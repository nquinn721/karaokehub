import {
  faBars,
  faCog,
  faHome,
  faMusic,
  faPlus,
  faSignOutAlt,
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
import { authStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserDisplayName, getUserSecondaryName } from '../../utils/userUtils';
import { ThemeToggle } from '../ThemeToggle';

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
                variant={isActivePath('/') ? 'contained' : 'text'}
                size="medium"
                onClick={() => navigate('/')}
                startIcon={<FontAwesomeIcon icon={faHome} />}
                sx={{
                  color: isActivePath('/')
                    ? theme.palette.primary.contrastText
                    : theme.palette.mode === 'light'
                      ? 'white'
                      : 'inherit',
                  backgroundColor: isActivePath('/')
                    ? theme.palette.mode === 'light'
                      ? 'rgba(255, 255, 255, 0.2)'
                      : theme.palette.primary.main
                    : 'transparent',
                  fontWeight: isActivePath('/') ? 600 : 500,
                  textTransform: 'none',
                  fontSize: '1rem',
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease-in-out',
                  border:
                    isActivePath('/') && theme.palette.mode === 'light'
                      ? '1px solid rgba(255, 255, 255, 0.3)'
                      : 'none',
                  '&:hover': {
                    backgroundColor: isActivePath('/')
                      ? theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.25)'
                        : theme.palette.primary.dark
                      : theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Home
              </Button>

              {/* Music Search - Only show when authenticated */}
              {authStore.isAuthenticated && (
                <Button
                  variant={isActivePath('/music') ? 'contained' : 'text'}
                  size="medium"
                  onClick={() => navigate('/music')}
                  startIcon={<FontAwesomeIcon icon={faMusic} />}
                  sx={{
                    color: isActivePath('/music')
                      ? theme.palette.primary.contrastText
                      : theme.palette.mode === 'light'
                        ? 'white'
                        : 'inherit',
                    backgroundColor: isActivePath('/music')
                      ? theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.2)'
                        : theme.palette.primary.main
                      : 'transparent',
                    fontWeight: isActivePath('/music') ? 600 : 500,
                    textTransform: 'none',
                    fontSize: '1rem',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease-in-out',
                    border:
                      isActivePath('/music') && theme.palette.mode === 'light'
                        ? '1px solid rgba(255, 255, 255, 0.3)'
                        : 'none',
                    '&:hover': {
                      backgroundColor: isActivePath('/music')
                        ? theme.palette.mode === 'light'
                          ? 'rgba(255, 255, 255, 0.25)'
                          : theme.palette.primary.dark
                        : theme.palette.mode === 'light'
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(255, 255, 255, 0.05)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  Music
                </Button>
              )}

              {/* Submit Show */}
              <Button
                variant={isActivePath('/submit') ? 'contained' : 'text'}
                size="medium"
                onClick={() => navigate('/submit')}
                startIcon={<FontAwesomeIcon icon={faPlus} />}
                sx={{
                  color: isActivePath('/submit')
                    ? theme.palette.primary.contrastText
                    : theme.palette.mode === 'light'
                      ? 'white'
                      : 'inherit',
                  backgroundColor: isActivePath('/submit')
                    ? theme.palette.mode === 'light'
                      ? 'rgba(255, 255, 255, 0.2)'
                      : theme.palette.primary.main
                    : 'transparent',
                  fontWeight: isActivePath('/submit') ? 600 : 500,
                  textTransform: 'none',
                  fontSize: '1rem',
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease-in-out',
                  border:
                    isActivePath('/submit') && theme.palette.mode === 'light'
                      ? '1px solid rgba(255, 255, 255, 0.3)'
                      : 'none',
                  '&:hover': {
                    backgroundColor: isActivePath('/submit')
                      ? theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.25)'
                        : theme.palette.primary.dark
                      : theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Submit Show
              </Button>

              {/* Dashboard (if authenticated) */}
              {authStore.isAuthenticated && (
                <Button
                  variant={isActivePath('/dashboard') ? 'contained' : 'text'}
                  size="medium"
                  onClick={() => navigate('/dashboard')}
                  sx={{
                    color: isActivePath('/dashboard')
                      ? theme.palette.primary.contrastText
                      : theme.palette.mode === 'light'
                        ? 'white'
                        : 'inherit',
                    backgroundColor: isActivePath('/dashboard')
                      ? theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.2)'
                        : theme.palette.primary.main
                      : 'transparent',
                    fontWeight: isActivePath('/dashboard') ? 600 : 500,
                    textTransform: 'none',
                    fontSize: '1rem',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease-in-out',
                    border:
                      isActivePath('/dashboard') && theme.palette.mode === 'light'
                        ? '1px solid rgba(255, 255, 255, 0.3)'
                        : 'none',
                    '&:hover': {
                      backgroundColor: isActivePath('/dashboard')
                        ? theme.palette.mode === 'light'
                          ? 'rgba(255, 255, 255, 0.25)'
                          : theme.palette.primary.dark
                        : theme.palette.mode === 'light'
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(255, 255, 255, 0.05)',
                      transform: 'translateY(-1px)',
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
                {/* Theme Toggle */}
                <ThemeToggle />

                {authStore.isAuthenticated ? (
                  <>
                    {/* User Avatar and Name Display */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                          padding: '4px 8px',
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
                            <Typography variant="caption" color="text.secondary">
                              {authStore.user.email}
                            </Typography>
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
                      variant={theme.palette.mode === 'light' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => navigate('/login')}
                      sx={
                        theme.palette.mode === 'light'
                          ? {
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              color: theme.palette.primary.contrastText,
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                              },
                            }
                          : {}
                      }
                    >
                      Login
                    </Button>
                    <Button
                      color="primary"
                      variant="contained"
                      size="small"
                      onClick={() => navigate('/register')}
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
                      Get Started
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
          PaperProps={{
            sx: {
              width: 280,
              backgroundColor: theme.palette.background.paper,
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Menu
            </Typography>
            <IconButton onClick={handleMobileMenuClose}>
              <FontAwesomeIcon icon={faTimes} />
            </IconButton>
          </Box>

          <List>
            {/* Theme Toggle */}
            <ListItem>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="body2">Theme</Typography>
                <ThemeToggle />
              </Box>
            </ListItem>

            <Divider sx={{ my: 1 }} />

            {/* Home */}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => handleMobileNavigation('/')}
                sx={{
                  backgroundColor: isActivePath('/') ? theme.palette.primary.main : 'transparent',
                  color: isActivePath('/') ? theme.palette.primary.contrastText : 'inherit',
                  '&:hover': {
                    backgroundColor: isActivePath('/')
                      ? theme.palette.primary.dark
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

            {/* Music - Only show when authenticated */}
            {authStore.isAuthenticated && (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleMobileNavigation('/music')}
                  sx={{
                    backgroundColor: isActivePath('/music')
                      ? theme.palette.primary.main
                      : 'transparent',
                    color: isActivePath('/music') ? theme.palette.primary.contrastText : 'inherit',
                    '&:hover': {
                      backgroundColor: isActivePath('/music')
                        ? theme.palette.primary.dark
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
                      backgroundColor: isActivePath('/dashboard')
                        ? theme.palette.primary.main
                        : 'transparent',
                      color: isActivePath('/dashboard')
                        ? theme.palette.primary.contrastText
                        : 'inherit',
                      '&:hover': {
                        backgroundColor: isActivePath('/dashboard')
                          ? theme.palette.primary.dark
                          : theme.palette.action.hover,
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'inherit' }}>
                      <FontAwesomeIcon icon={faUser} />
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
                        <Typography variant="caption" color="text.secondary" display="block">
                          {authStore.user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItem>
                )}

                {/* Profile */}
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => handleMobileNavigation('/profile')}
                    sx={{
                      backgroundColor: isActivePath('/profile')
                        ? theme.palette.primary.main
                        : 'transparent',
                      color: isActivePath('/profile')
                        ? theme.palette.primary.contrastText
                        : 'inherit',
                      '&:hover': {
                        backgroundColor: isActivePath('/profile')
                          ? theme.palette.primary.dark
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
                      backgroundColor: isActivePath('/settings')
                        ? theme.palette.primary.main
                        : 'transparent',
                      color: isActivePath('/settings')
                        ? theme.palette.primary.contrastText
                        : 'inherit',
                      '&:hover': {
                        backgroundColor: isActivePath('/settings')
                          ? theme.palette.primary.dark
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

                {/* Admin Dashboard */}
                {authStore.isAdmin && (
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleMobileNavigation('/admin')}
                      sx={{
                        backgroundColor: isActivePath('/admin')
                          ? theme.palette.primary.main
                          : 'transparent',
                        color: isActivePath('/admin')
                          ? theme.palette.primary.contrastText
                          : 'inherit',
                        '&:hover': {
                          backgroundColor: isActivePath('/admin')
                            ? theme.palette.primary.dark
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
                {/* Login */}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/login')}>
                    <ListItemIcon>
                      <FontAwesomeIcon icon={faUser} />
                    </ListItemIcon>
                    <ListItemText primary="Login" />
                  </ListItemButton>
                </ListItem>

                {/* Register */}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/register')}>
                    <ListItemIcon>
                      <FontAwesomeIcon icon={faUser} />
                    </ListItemIcon>
                    <ListItemText primary="Get Started" />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Drawer>
      </>
    );
  },
);
