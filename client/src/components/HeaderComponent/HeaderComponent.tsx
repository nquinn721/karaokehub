import {
  faBars,
  faCog,
  faSignOutAlt,
  faUser,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import { authStore, uiStore } from '@stores/index';
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

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      setAnchorEl(null);
    };

    const handleLogout = () => {
      authStore.logout();
      navigate('/login');
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

    return (
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
        }}
      >
        <Toolbar>
          {showMenuButton && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => uiStore.toggleSidebar()}
              sx={{ mr: 2 }}
            >
              <FontAwesomeIcon icon={faBars} />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component="div"
            onClick={() => navigate('/')}
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              color:
                theme.palette.mode === 'light'
                  ? theme.palette.primary.contrastText // White text on solid primary
                  : theme.palette.primary.main, // Keep original gradient in dark mode
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            {title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Theme Toggle - Always visible */}
            <ThemeToggle />

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
                  Sign Up
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>
    );
  },
);
