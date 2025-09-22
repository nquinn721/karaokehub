import AdminBreadcrumb from '@components/AdminBreadcrumb';
import AdminDataTables from '@components/AdminDataTables';
import DataUploadModal from '@components/DataUploadModal';
import EnhancedApiMonitoring from '@components/EnhancedApiMonitoring';
import LocationTrackingModal from '@components/modals/LocationTrackingModal';
import ShowAnalytics from '@components/ShowAnalytics';
import SpriteCutter from '@components/SpriteCutter';
import StoreItemGenerator from '@components/StoreItemGenerator';
import TransactionManagement from '@components/TransactionManagement';
import UrlApprovalComponent from '@components/UrlApprovalComponent';
import {
  faBars,
  faChartBar,
  faChevronRight,
  faCoins,
  faCut,
  faDatabase,
  faGlobe,
  faHome,
  faLocationArrow,
  faPalette,
  faPlus,
  faRobot,
  faSync,
  faTimes,
  faUpload,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Alert,
  alpha,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Drawer,
  Fab,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { adminStore, authStore, parserStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ px: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDashboardPageTabbed = observer(() => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [locationTrackingModalOpen, setLocationTrackingModalOpen] = useState(false);
  const [urlApprovalCount, setUrlApprovalCount] = useState(0);

  // Function to fetch URL approval count
  const fetchUrlApprovalCount = async () => {
    try {
      const result = await parserStore.getUnapprovedUrls();
      if (result.success && result.data) {
        setUrlApprovalCount(result.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch URL approval count:', error);
    }
  };

  useEffect(() => {
    if (!authStore.isAuthenticated || !authStore.user?.isAdmin) {
      return;
    }

    adminStore.fetchStatistics();
    fetchUrlApprovalCount();
  }, []);

  if (!authStore.isAuthenticated || !authStore.user?.isAdmin) {
    return <Navigate to="/auth/login" replace />;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (isMobile) {
      setMobileDrawerOpen(false); // Close drawer after selection on mobile
    }

    // Refresh URL count when switching to URL Approval Queue tab
    if (newValue === 3) {
      fetchUrlApprovalCount();
    }
  };

  const adminSections = [
    {
      id: 0,
      title: 'Data Management',
      icon: faDatabase,
      description: 'Manage platform data and content',
      component: <AdminDataTables />,
      category: 'data',
    },
    {
      id: 1,
      title: 'Show Analytics',
      icon: faChartBar,
      description: 'Visualize show statistics and data insights',
      component: <ShowAnalytics />,
      category: 'analytics',
    },
    {
      id: 2,
      title: 'Transaction Management',
      icon: faCoins,
      description: 'View transactions and manage user coins',
      component: <TransactionManagement />,
      category: 'finance',
    },
    {
      id: 3,
      title: 'URL Approval Queue',
      icon: faGlobe,
      description: 'Review and approve submitted URLs',
      component: <UrlApprovalComponent onCountChange={setUrlApprovalCount} />,
      category: 'content',
    },
    {
      id: 4,
      title: 'Enhanced API Monitoring',
      icon: faRobot,
      description: 'Comprehensive API monitoring with charts and detailed error tracking',
      component: <EnhancedApiMonitoring />,
      category: 'monitoring',
    },
    {
      id: 6,
      title: 'Avatar Tools',
      icon: faCut,
      description: 'Avatar management and image processing tools',
      component: <SpriteCutter />,
      category: 'avatars',
    },
    {
      id: 7,
      title: 'Store Generator',
      icon: faPalette,
      description: 'Generate avatar store items using AI image generation',
      component: <StoreItemGenerator />,
      category: 'avatars',
    },
  ];

  const currentSection =
    adminSections.find((section) => section.id === tabValue) || adminSections[0];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, 
          ${alpha(theme.palette.primary.main, 0.1)} 0%, 
          ${alpha(theme.palette.secondary.main, 0.05)} 50%, 
          ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, ${alpha(theme.palette.secondary.main, 0.1)} 0%, transparent 50%)`,
          pointerEvents: 'none',
        },
      }}
    >
      {/* Mobile Layout */}
      {isMobile ? (
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Mobile Header with Menu Button */}
          <Paper
            elevation={2}
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1100,
              background: `linear-gradient(135deg, 
                ${alpha(theme.palette.background.paper, 0.95)} 0%, 
                ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
              backdropFilter: 'blur(10px)',
              borderRadius: 0,
              borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Box
              sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  onClick={() => setMobileDrawerOpen(true)}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                  }}
                >
                  <FontAwesomeIcon icon={faBars} />
                </IconButton>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 0 }}>
                    Admin Dashboard
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {currentSection.title}
                  </Typography>
                </Box>
              </Box>
              <IconButton
                onClick={() => navigate('/dashboard')}
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                <FontAwesomeIcon icon={faHome} />
              </IconButton>
            </Box>
          </Paper>

          {/* Mobile Navigation Drawer */}
          <Drawer
            anchor="left"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            sx={{
              '& .MuiDrawer-paper': {
                width: 280,
                backgroundColor:
                  theme.palette.mode === 'dark' ? theme.palette.background.paper : '#1a1a1a',
                background:
                  theme.palette.mode === 'dark' ? theme.palette.background.paper : '#1a1a1a',
                color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#ffffff',
                borderRight: `1px solid ${
                  theme.palette.mode === 'dark' ? theme.palette.divider : '#333333'
                }`,
              },
            }}
          >
            <Box
              sx={{
                p: 3,
                borderBottom: `1px solid ${
                  theme.palette.mode === 'dark'
                    ? theme.palette.divider
                    : alpha(theme.palette.common.white, 0.1)
                }`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color:
                      theme.palette.mode === 'dark'
                        ? theme.palette.text.primary
                        : theme.palette.common.white,
                  }}
                >
                  Admin Panel
                </Typography>
                <IconButton
                  onClick={() => setMobileDrawerOpen(false)}
                  size="small"
                  sx={{
                    color:
                      theme.palette.mode === 'dark'
                        ? theme.palette.text.secondary
                        : alpha(theme.palette.common.white, 0.7),
                    '&:hover': {
                      backgroundColor:
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.common.white, 0.1)
                          : alpha(theme.palette.common.white, 0.1),
                    },
                  }}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </IconButton>
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color:
                    theme.palette.mode === 'dark'
                      ? theme.palette.text.secondary
                      : alpha(theme.palette.common.white, 0.7),
                }}
              >
                Manage platform content and data
              </Typography>
            </Box>

            <List sx={{ px: 2, py: 1 }}>
              {/* Data & Analytics Group */}
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  px: 2,
                  py: 1,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color:
                    theme.palette.mode === 'dark'
                      ? theme.palette.text.secondary
                      : alpha(theme.palette.common.white, 0.7),
                }}
              >
                Data & Analytics
              </Typography>
              {adminSections
                .filter((section) => ['data', 'analytics', 'finance'].includes(section.category))
                .map((section) => (
                  <ListItem key={section.id} disablePadding sx={{ mb: 1 }}>
                    <ListItemButton
                      selected={tabValue === section.id}
                      onClick={() => handleTabChange({} as React.SyntheticEvent, section.id)}
                      sx={{
                        borderRadius: 2,
                        py: 2,
                        '&.Mui-selected': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.25) },
                        },
                        '&:hover': {
                          bgcolor:
                            theme.palette.mode === 'dark'
                              ? alpha(theme.palette.common.white, 0.05)
                              : alpha(theme.palette.common.white, 0.1),
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color:
                            tabValue === section.id
                              ? theme.palette.primary.main
                              : theme.palette.mode === 'dark'
                                ? theme.palette.text.secondary
                                : alpha(theme.palette.common.white, 0.7),
                          minWidth: 40,
                        }}
                      >
                        <FontAwesomeIcon icon={section.icon} />
                      </ListItemIcon>
                      <ListItemText
                        primary={section.title}
                        primaryTypographyProps={{
                          fontWeight: tabValue === section.id ? 600 : 400,
                          fontSize: '0.9rem',
                          color:
                            tabValue === section.id
                              ? theme.palette.primary.main
                              : theme.palette.mode === 'dark'
                                ? theme.palette.text.primary
                                : theme.palette.common.white,
                        }}
                      />
                      {tabValue === section.id && (
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          style={{
                            fontSize: '12px',
                            color: theme.palette.primary.main,
                            marginLeft: '8px',
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                ))}

              {/* Content & Monitoring Group */}
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  px: 2,
                  py: 1,
                  mt: 2,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color:
                    theme.palette.mode === 'dark'
                      ? theme.palette.text.secondary
                      : alpha(theme.palette.common.white, 0.7),
                }}
              >
                Content & Monitoring
              </Typography>
              {adminSections
                .filter((section) => ['content', 'monitoring'].includes(section.category))
                .map((section) => (
                  <ListItem key={section.id} disablePadding sx={{ mb: 1 }}>
                    <ListItemButton
                      selected={tabValue === section.id}
                      onClick={() => handleTabChange({} as React.SyntheticEvent, section.id)}
                      sx={{
                        borderRadius: 2,
                        py: 2,
                        '&.Mui-selected': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.25) },
                        },
                        '&:hover': {
                          bgcolor:
                            theme.palette.mode === 'dark'
                              ? alpha(theme.palette.common.white, 0.05)
                              : alpha(theme.palette.common.white, 0.1),
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color:
                            tabValue === section.id
                              ? theme.palette.primary.main
                              : theme.palette.mode === 'dark'
                                ? theme.palette.text.secondary
                                : alpha(theme.palette.common.white, 0.7),
                          minWidth: 40,
                        }}
                      >
                        <FontAwesomeIcon icon={section.icon} />
                      </ListItemIcon>
                      <ListItemText
                        primary={section.title}
                        primaryTypographyProps={{
                          fontWeight: tabValue === section.id ? 600 : 400,
                          fontSize: '0.9rem',
                          color:
                            tabValue === section.id
                              ? theme.palette.primary.main
                              : theme.palette.mode === 'dark'
                                ? theme.palette.text.primary
                                : theme.palette.common.white,
                        }}
                      />
                      {tabValue === section.id && (
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          style={{
                            fontSize: '12px',
                            color: theme.palette.primary.main,
                            marginLeft: '8px',
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                ))}

              {/* Avatar Tools Group */}
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  px: 2,
                  py: 1,
                  mt: 2,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color:
                    theme.palette.mode === 'dark'
                      ? theme.palette.text.secondary
                      : alpha(theme.palette.common.white, 0.7),
                }}
              >
                Avatar Tools
              </Typography>
              {adminSections
                .filter((section) => section.category === 'avatars')
                .map((section) => (
                  <ListItem key={section.id} disablePadding sx={{ mb: 1 }}>
                    <ListItemButton
                      selected={tabValue === section.id}
                      onClick={() => handleTabChange({} as React.SyntheticEvent, section.id)}
                      sx={{
                        borderRadius: 2,
                        py: 2,
                        '&.Mui-selected': {
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.25) },
                        },
                        '&:hover': {
                          bgcolor:
                            theme.palette.mode === 'dark'
                              ? alpha(theme.palette.common.white, 0.05)
                              : alpha(theme.palette.common.white, 0.1),
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color:
                            tabValue === section.id
                              ? theme.palette.primary.main
                              : theme.palette.mode === 'dark'
                                ? theme.palette.text.secondary
                                : alpha(theme.palette.common.white, 0.7),
                          minWidth: 40,
                        }}
                      >
                        <FontAwesomeIcon icon={section.icon} />
                      </ListItemIcon>
                      <ListItemText
                        primary={section.title}
                        primaryTypographyProps={{
                          fontWeight: tabValue === section.id ? 600 : 400,
                          fontSize: '0.9rem',
                          color:
                            tabValue === section.id
                              ? theme.palette.primary.main
                              : theme.palette.mode === 'dark'
                                ? theme.palette.text.primary
                                : theme.palette.common.white,
                        }}
                      />
                      {tabValue === section.id && (
                        <FontAwesomeIcon
                          icon={faChevronRight}
                          style={{
                            fontSize: '12px',
                            color: theme.palette.primary.main,
                            marginLeft: '8px',
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                ))}
            </List>

            <Divider
              sx={{
                mx: 2,
                borderColor:
                  theme.palette.mode === 'dark'
                    ? theme.palette.divider
                    : alpha(theme.palette.common.white, 0.1),
              }}
            />

            {/* Quick Actions */}
            <Box sx={{ p: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color:
                    theme.palette.mode === 'dark'
                      ? theme.palette.text.secondary
                      : alpha(theme.palette.common.white, 0.7),
                }}
              >
                Quick Actions
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<FontAwesomeIcon icon={faSync} />}
                    onClick={() => {
                      adminStore.fetchStatistics();
                      setMobileDrawerOpen(false);
                    }}
                    disabled={adminStore.isLoading}
                    sx={{ py: 1.5, fontSize: '0.75rem' }}
                  >
                    Refresh
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<FontAwesomeIcon icon={faLocationArrow} />}
                    onClick={() => {
                      setLocationTrackingModalOpen(true);
                      setMobileDrawerOpen(false);
                    }}
                    sx={{ py: 1.5, fontSize: '0.75rem' }}
                  >
                    Location
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    startIcon={<FontAwesomeIcon icon={faUpload} />}
                    onClick={() => {
                      setUploadModalOpen(true);
                      setMobileDrawerOpen(false);
                    }}
                    sx={{ py: 1.5, fontSize: '0.75rem' }}
                  >
                    Upload
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    startIcon={<FontAwesomeIcon icon={faPlus} />}
                    onClick={() => {
                      navigate('/admin/parser');
                      setMobileDrawerOpen(false);
                    }}
                    sx={{
                      py: 1.5,
                      fontSize: '0.75rem',
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                      },
                    }}
                  >
                    Use Parser
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Drawer>

          {/* Mobile Content Area */}
          <Box sx={{ p: 2 }}>
            {adminStore.error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {adminStore.error}
              </Alert>
            )}

            {/* Section Header Card */}
            <Card
              elevation={1}
              sx={{
                mb: 3,
                background: alpha(theme.palette.background.paper, 0.7),
                backdropFilter: 'blur(10px)',
              }}
            >
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <FontAwesomeIcon icon={currentSection.icon} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {currentSection.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentSection.description}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Content */}
            <Box sx={{ mb: 10 }}>{currentSection.component}</Box>
          </Box>

          {/* Mobile FAB for Quick Menu Access */}
          <Fab
            color="primary"
            onClick={() => setMobileDrawerOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
              },
            }}
          >
            <FontAwesomeIcon icon={faBars} />
          </Fab>
        </Box>
      ) : (
        /* Desktop Layout (existing) */
        <Box sx={{ maxWidth: '1400px', mx: 'auto', py: 6, position: 'relative', zIndex: 1 }}>
          {/* Breadcrumbs */}
          <Box sx={{ px: 3 }}>
            <AdminBreadcrumb
              items={[
                {
                  label: 'Admin',
                  icon: faUsers,
                  isActive: true,
                },
              ]}
            />
          </Box>

          {/* Enhanced Header */}
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(135deg, 
                ${alpha(theme.palette.background.paper, 0.95)} 0%, 
                ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              borderRadius: 3,
              mb: 4,
              mx: 3,
              overflow: 'hidden',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
              },
            }}
          >
            <Box sx={{ p: 4, pb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <FontAwesomeIcon icon={faUsers} size="lg" />
                  </Box>
                  <Box>
                    <Typography
                      variant="h3"
                      sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}
                    >
                      Admin Dashboard
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                      Manage content approval and platform data
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<FontAwesomeIcon icon={faSync} />}
                    onClick={() => {
                      adminStore.fetchStatistics();
                      fetchUrlApprovalCount();
                    }}
                    disabled={adminStore.isLoading}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1.5,
                    }}
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FontAwesomeIcon icon={faLocationArrow} />}
                    onClick={() => setLocationTrackingModalOpen(true)}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1.5,
                    }}
                  >
                    Location Tracking
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FontAwesomeIcon icon={faUpload} />}
                    onClick={() => setUploadModalOpen(true)}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1.5,
                    }}
                  >
                    Upload Data
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<FontAwesomeIcon icon={faPlus} />}
                    onClick={() => navigate('/admin/parser')}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1.5,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                      },
                    }}
                  >
                    Use Parser
                  </Button>
                </Box>
              </Box>

              {adminStore.error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {adminStore.error}
                </Alert>
              )}

              {/* Tab Navigation */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': {
                      minHeight: 70,
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '0.95rem',
                      py: 2,
                      minWidth: 140,
                    },
                    '& .Mui-selected': {
                      color: theme.palette.primary.main,
                    },
                    '& .MuiTabs-indicator': {
                      height: 3,
                      borderRadius: '3px 3px 0 0',
                      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    },
                  }}
                >
                  <Tab
                    icon={<FontAwesomeIcon icon={faDatabase} />}
                    label="Data Management"
                    iconPosition="start"
                    sx={{ gap: 1 }}
                  />
                  <Tab
                    icon={<FontAwesomeIcon icon={faChartBar} />}
                    label="Show Analytics"
                    iconPosition="start"
                    sx={{ gap: 1 }}
                  />
                  <Tab
                    icon={<FontAwesomeIcon icon={faCoins} />}
                    label="Transaction Management"
                    iconPosition="start"
                    sx={{ gap: 1 }}
                  />
                  <Tab
                    icon={
                      <Badge
                        badgeContent={urlApprovalCount}
                        color="warning"
                        max={99}
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: '0.75rem',
                            minWidth: 18,
                            height: 18,
                          },
                        }}
                      >
                        <FontAwesomeIcon icon={faGlobe} />
                      </Badge>
                    }
                    label="URL Approval"
                    iconPosition="start"
                    sx={{ gap: 1 }}
                  />
                  <Tab
                    icon={<FontAwesomeIcon icon={faRobot} />}
                    label="API Monitoring"
                    iconPosition="start"
                    sx={{ gap: 1 }}
                  />
                  <Tab
                    icon={<FontAwesomeIcon icon={faCut} />}
                    label="Avatar Tools"
                    iconPosition="start"
                    sx={{ gap: 1 }}
                  />
                  <Tab
                    icon={<FontAwesomeIcon icon={faPalette} />}
                    label="Store Generator"
                    iconPosition="start"
                    sx={{ gap: 1 }}
                  />
                </Tabs>
              </Box>
            </Box>

            {/* Tab Content */}
            <TabPanel value={tabValue} index={0}>
              <AdminDataTables />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <ShowAnalytics />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <TransactionManagement />
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <UrlApprovalComponent onCountChange={setUrlApprovalCount} />
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
              <EnhancedApiMonitoring />
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
              <SpriteCutter />
            </TabPanel>

            <TabPanel value={tabValue} index={6}>
              <StoreItemGenerator />
            </TabPanel>
          </Paper>
        </Box>
      )}

      {/* Data Upload Modal */}
      <DataUploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />

      {/* Location Tracking Modal */}
      <LocationTrackingModal
        open={locationTrackingModalOpen}
        onClose={() => setLocationTrackingModalOpen(false)}
      />
    </Box>
  );
});

export default AdminDashboardPageTabbed;
