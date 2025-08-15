import {
  faBars,
  faCog,
  faMusic,
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
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../ThemeToggle';

export interface HeaderComponentProps {
  title?: string;
  showMenuButton?: boolean;
}

export const HeaderComponent: React.FC<HeaderComponentProps> = observer(
  ({ title = 'KaraokeHub', showMenuButton = true }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
            }}
          >
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

            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
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

              {/* Desktop Navigation - Hidden on small screens */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
                {/* Theme Toggle - Always visible on desktop */}
                <ThemeToggle />

                {/* Music Search - Always visible on desktop */}
                <Button
                  color="primary"
                  variant={theme.palette.mode === 'light' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => navigate('/music')}
                  startIcon={<FontAwesomeIcon icon={faMusic} />}
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
                  Music
                </Button>

                {authStore.isAuthenticated ? (
                  <>
                    <Button
                      color="primary"
                      variant={theme.palette.mode === 'light' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => navigate('/dashboard')}
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
                      Dashboard
                    </Button>

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
                        <FontAwesomeIcon icon={faUser} />
                      )}
                    </IconButton>

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
                              {authStore.user.stageName || authStore.user.name}
                            </Typography>
                            {authStore.user.stageName && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: '0.65rem' }}
                              >
                                {authStore.user.name}
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

            {/* Music */}
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleMobileNavigation('/music')}>
                <ListItemIcon>
                  <FontAwesomeIcon icon={faMusic} />
                </ListItemIcon>
                <ListItemText primary="Music" />
              </ListItemButton>
            </ListItem>

            {authStore.isAuthenticated ? (
              <>
                {/* Dashboard */}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/dashboard')}>
                    <ListItemIcon>
                      <FontAwesomeIcon icon={faUser} />
                    </ListItemIcon>
                    <ListItemText primary="Dashboard" />
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
                          {authStore.user.stageName || authStore.user.name}
                        </Typography>
                        {authStore.user.stageName && (
                          <Typography variant="caption" color="text.secondary">
                            {authStore.user.name}
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
                  <ListItemButton onClick={() => handleMobileNavigation('/profile')}>
                    <ListItemIcon>
                      <FontAwesomeIcon icon={faUser} />
                    </ListItemIcon>
                    <ListItemText primary="Profile" />
                  </ListItemButton>
                </ListItem>

                {/* Settings */}
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileNavigation('/settings')}>
                    <ListItemIcon>
                      <FontAwesomeIcon icon={faCog} />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                  </ListItemButton>
                </ListItem>

                {/* Admin Dashboard */}
                {authStore.isAdmin && (
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleMobileNavigation('/admin')}>
                      <ListItemIcon>
                        <FontAwesomeIcon icon={faUserShield} />
                      </ListItemIcon>
                      <ListItemText primary="Admin Dashboard" />
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
