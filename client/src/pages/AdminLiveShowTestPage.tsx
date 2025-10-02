/**
 * AdminLiveShowTestPage Component
 * Admin-only test page for simulating live show scenarios with fake users
 */

import {
  Add as AddIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Mic as MicIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  FormCo      // Step 3: Populate show with test users
      addTestResult(`🎭 Adding test users to the show...`);
      
      try {
        const populateResponse = await apiStore.post(`/live-shows/${showId}/populate-test-users`);
        if (populateResponse.success) {
          addTestResult(`✅ Successfully added test users: DJ Mike, Sarah Star, Rock Andy`);
          addTestResult(`🎤 Test users are now in the participant list and queue`);
        } else {
          addTestResult(`⚠️ Warning: Could not populate test users: ${populateResponse.message}`);
        }
      } catch (populateError) {
        addTestResult(
          `⚠️ Could not populate test users: ${populateError instanceof Error ? populateError.message : String(populateError)}`,
        );
      }
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { locationService } from '../services/LocationService';
import { apiStore, authStore } from '../stores/index';
import { testDataStore, TestUser, TestVenue } from '../utils/testDataStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const AdminLiveShowTestPage: React.FC = observer(() => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [fakeUsers, setFakeUsers] = useState<TestUser[]>([]);
  const [testVenues, setTestVenues] = useState<TestVenue[]>([]);

  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'dj' | 'singer'>('singer');
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Check if user is admin
  const isAdmin = authStore.user?.isAdmin;

  // Helper functions for test results
  const addTestResult = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  // Helper functions for role detection
  const isUserDJ = (user: TestUser): boolean => {
    return user.isDjSubscriptionActive;
  };

  const getUserRole = (user: TestUser): 'dj' | 'singer' => {
    return isUserDJ(user) ? 'dj' : 'singer';
  };

  const getUserMicrophoneName = (user: TestUser): string => {
    const mic = testDataStore.getMicrophone(user.equippedMicrophoneId || '');
    return mic?.name || 'Basic Mic';
  };

  useEffect(() => {
    if (!isAdmin) return;

    // Initialize test data
    initializeTestData();
  }, [isAdmin]);

  const initializeTestData = () => {
    // Initialize test data store with default users if empty
    if (testDataStore.getAllUsers().length === 0) {
      const allAvatars = testDataStore.getAllAvatars();
      const allMics = testDataStore.getAllMicrophones();

      // Create default test users with different avatars and microphones
      const djUser: TestUser = {
        id: 'test-dj-1',
        name: 'DJ Mike',
        email: 'dj.mike@test.com',
        stageName: 'DJ Mike',
        isActive: false,
        isAdmin: false,
        coins: 1500,
        isDjSubscriptionActive: true,
        equippedAvatarId: allAvatars.find(a => a.id === 'avatar_rockstar_1')?.id || allAvatars[0]?.id,
        equippedMicrophoneId: allMics.find(m => m.id === 'mic_pro_1')?.id || allMics[0]?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const singer1: TestUser = {
        id: 'test-singer-1',
        name: 'Sarah Star',
        email: 'sarah.star@test.com',
        stageName: 'Sarah Star',
        isActive: false,
        isAdmin: false,
        coins: 800,
        isDjSubscriptionActive: false,
        equippedAvatarId: allAvatars.find(a => a.id === 'avatar_pop_1')?.id || allAvatars[0]?.id,
        equippedMicrophoneId: allMics.find(m => m.id === 'mic_wireless_1')?.id || allMics[0]?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const singer2: TestUser = {
        id: 'test-singer-2',
        name: 'Rock Andy',
        email: 'rock.andy@test.com',
        stageName: 'Rock Andy',
        isActive: false,
        isAdmin: false,
        coins: 600,
        isDjSubscriptionActive: false,
        equippedAvatarId: allAvatars.find(a => a.id === 'avatar_hip_hop_1')?.id || allAvatars[0]?.id,
        equippedMicrophoneId: allMics.find(m => m.id === 'mic_vintage_1')?.id || allMics[0]?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      testDataStore.addUser(djUser);
      testDataStore.addUser(singer1);
      testDataStore.addUser(singer2);
    }

    // Load from test data store
    setFakeUsers(testDataStore.getAllUsers());
    setTestVenues(testDataStore.getAllVenues());
  };

  const addFakeUser = () => {
    if (!newUserName.trim()) return;

    const allAvatars = testDataStore.getAllAvatars();
    const allMics = testDataStore.getAllMicrophones();
    
    // Pick random avatar and microphone for variety
    const randomAvatar = allAvatars[Math.floor(Math.random() * allAvatars.length)];
    const randomMic = allMics[Math.floor(Math.random() * allMics.length)];

    const newUser: TestUser = {
      id: `test-${newUserRole}-${Date.now()}`,
      name: newUserName.trim(),
      email: `${newUserName.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@test.com`,
      stageName: newUserName.trim(),
      isActive: false,
      isAdmin: false,
      coins: Math.floor(Math.random() * 1000) + 100, // Random coins 100-1100
      isDjSubscriptionActive: newUserRole === 'dj',
      equippedAvatarId: randomAvatar?.id,
      equippedMicrophoneId: randomMic?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    testDataStore.addUser(newUser);
    setFakeUsers(testDataStore.getAllUsers());
    setNewUserName('');
    addTestResult(`✅ Added test user: ${newUser.name} (${newUserRole})`);
  };

  const toggleUserActive = (userId: string) => {
    const user = testDataStore.getUser(userId);
    if (user) {
      testDataStore.updateUser(userId, { isActive: !user.isActive });
      setFakeUsers(testDataStore.getAllUsers());
      addTestResult(`🔄 ${user.isActive ? 'Deactivated' : 'Activated'} user: ${user.name}`);
    }
  };

  const removeFakeUser = (userId: string) => {
    const user = testDataStore.getUser(userId);
    if (user) {
      testDataStore.deleteUser(userId);
      setFakeUsers(testDataStore.getAllUsers());
      addTestResult(`🗑️ Deleted test user: ${user.name}`);
    }
  };

  const simulateLocationTest = async () => {
    setSimulationRunning(true);
    addTestResult('🧪 Starting location proximity test...');

    try {
      // Test browser geolocation permission
      if (!navigator.geolocation) {
        addTestResult('❌ Geolocation not supported by browser');
        setSimulationRunning(false);
        return;
      }

      addTestResult('📍 Requesting location permission...');

      // Test location detection
      const userLocation = await locationService.getCurrentLocation();
      addTestResult(
        `✅ User location detected: ${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`,
      );
      addTestResult(`📡 Accuracy: ${userLocation.accuracy || 'Unknown'}m`);

      // Test nearby shows API call
      addTestResult('🔍 Testing nearby shows API...');
      try {
        const nearbyShows = await locationService.findNearbyShows(userLocation);
        addTestResult(`✅ Found ${nearbyShows.length} nearby shows`);

        if (nearbyShows.length > 0) {
          nearbyShows.forEach((show, index) => {
            addTestResult(
              `📍 Show ${index + 1}: "${show.show.name}" at ${show.venue?.name || 'Unknown venue'} (${show.distanceMeters?.toFixed(1) || 'Unknown'}m away)`,
            );
          });
        } else {
          addTestResult('ℹ️ No live shows currently active near your location');
        }
      } catch (error) {
        addTestResult(
          `❌ Nearby shows API failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Test distance calculation to each test venue
      addTestResult('📏 Testing distance calculations to test venues...');
      for (const venue of testVenues.filter((v) => v.isActive)) {
        try {
          const distance = await locationService.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            venue.lat,
            venue.lng,
          );

          const isNearby = distance <= 30; // 30 meter radius
          addTestResult(
            `📍 ${venue.name}: ${distance.toFixed(1)}m away - ${isNearby ? '✅ Within 30m range' : '❌ Outside range'}`,
          );
        } catch (error) {
          addTestResult(`❌ Distance calculation failed for ${venue.name}: ${error}`);
        }
      }

      // Test location service features
      addTestResult('⚙️ Testing location service features...');
      const activeUsers = fakeUsers.filter((u) => u.isActive);
      addTestResult(`👥 ${activeUsers.length} active fake users for proximity simulation`);

      if (activeUsers.length > 0) {
        addTestResult('✅ Location service ready for live show proximity detection');
      } else {
        addTestResult(
          '⚠️ No active fake users - create some in the Fake Users tab for full testing',
        );
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        const geoError = error as GeolocationPositionError;
        if (geoError.code === 1) {
          addTestResult('❌ Location permission denied by user');
        } else if (geoError.code === 2) {
          addTestResult('❌ Location unavailable');
        } else if (geoError.code === 3) {
          addTestResult('❌ Location request timeout');
        } else {
          addTestResult(`❌ Location test failed: ${geoError.message}`);
        }
      } else {
        addTestResult(
          `❌ Location test failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    setSimulationRunning(false);
    addTestResult('🏁 Location proximity test completed');
  };

  const simulateLiveShowFlow = async () => {
    setSimulationRunning(true);
    addTestResult('🎤 Starting live show simulation...');

    try {
      const dj = fakeUsers.find((u) => isUserDJ(u) && u.isActive);
      const singers = fakeUsers.filter((u) => !isUserDJ(u) && u.isActive);

      if (!dj) {
        addTestResult('❌ No active DJ found for simulation');
        addTestResult('💡 Create and activate a DJ user in the "Fake Users" tab first');
        setSimulationRunning(false);
        return;
      }

      addTestResult('🎭 Test Mode: Location validation disabled for testing');

      // Step 1: Create a real live show
      addTestResult(`🎵 DJ ${dj.name} creating live show...`);

      const now = new Date();
      const startTime = new Date(now.getTime() - 5 * 60 * 1000); // Started 5 minutes ago
      const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // Ends in 3 hours

      const showData = await apiStore.post('/live-shows', {
        name: `🧪 Test Show by ${dj.name}`,
        description: `Live show simulation created by admin test - DJ: ${dj.name}, Expected singers: ${singers.length}`,
        venueId: testVenues.find((v) => v.isActive)?.id || 'test-venue-1',
        maxParticipants: 50,
        isPublic: true,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        djId: dj.id, // Set the DJ when creating the show
      });

      if (!showData.success || !showData.show) {
        throw new Error(`Show creation failed: ${showData.message || 'Unknown error'}`);
      }

      const showId = showData.show.id;
      addTestResult(`✅ Live show created successfully! Show ID: ${showId}`);
      addTestResult(`📝 Show name: "${showData.show.name}"`);

      // Step 2: Join the show as DJ (current user)
      addTestResult(`👤 Joining show as DJ...`);

      // Join without location validation (test mode)
      addTestResult(`🚫 Skipping location validation for testing`);

      try {
        const joinData = await apiStore.post(`/live-shows/${showId}/join`, {
          // No location provided - will allow join in test mode
          avatarId: null,
          microphoneId: null,
        });
        addTestResult(`✅ Successfully joined show as ${joinData.userRole || 'participant'}`);
      } catch (joinError) {
        addTestResult(
          `⚠️ Failed to join show: ${joinError instanceof Error ? joinError.message : String(joinError)}`,
        );
      }

      // Step 3: Simulate some activity
      addTestResult(`� Simulating ${singers.length} singers joining...`);
      for (let i = 0; i < Math.min(singers.length, 3); i++) {
        const singer = singers[i];
        addTestResult(`🎤 ${singer.name} would join the queue...`);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      // Step 4: Navigate to the live show page
      addTestResult(`🚀 Navigating to live show page...`);
      addTestResult(`📄 You will be redirected to: /live-shows/${showId}`);
      addTestResult(`🎭 Test as DJ: You'll see DJ controls (manage queue, set current singer)`);
      addTestResult(`🎤 To test as singer: Leave show and rejoin, or use another browser`);
      addTestResult(`💡 Tip: Open in incognito/private window to test different user roles`);

      // Add a small delay so user can see the success message
      setTimeout(() => {
        navigate(`/live-shows/${showId}`);
      }, 3000);

      addTestResult(`✅ Live show simulation complete! Redirecting in 3 seconds...`);
    } catch (error) {
      addTestResult(
        `❌ Live show simulation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error('Live show simulation error:', error);
    }

    setSimulationRunning(false);
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">
          <Typography variant="h6">Access Denied</Typography>
          <Typography>This page is only accessible to admin users.</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#00d4ff', fontWeight: 600 }}>
        🧪 Live Show Test Center
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 3, opacity: 0.8 }}>
        Admin testing environment for live show features and location-based functionality
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Fake Users" />
          <Tab label="Test Venues" />
          <Tab label="Simulations" />
          <Tab label="Test Results" />
        </Tabs>
      </Box>

      {/* Fake Users Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card
              sx={{
                background: 'rgba(26, 26, 46, 0.8)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  Fake Users Management
                </Typography>

                {/* Add new fake user */}
                <Box
                  sx={{ mb: 3, p: 2, border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: 1 }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="User Name"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Role</InputLabel>
                        <Select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as 'dj' | 'singer')}
                          label="Role"
                        >
                          <MenuItem value="singer">Singer</MenuItem>
                          <MenuItem value="dj">DJ</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Button
                        variant="contained"
                        onClick={addFakeUser}
                        disabled={!newUserName.trim()}
                        sx={{ background: 'linear-gradient(135deg, #00d4ff 0%, #00b8d4 100%)' }}
                      >
                        <AddIcon sx={{ mr: 1 }} />
                        Add User
                      </Button>
                    </Grid>
                  </Grid>
                </Box>

                {/* Fake users list */}
                <List>
                  {fakeUsers.map((user) => (
                    <ListItem
                      key={user.id}
                      sx={{
                        border: '1px solid rgba(0, 212, 255, 0.2)',
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: user.isActive ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon sx={{ color: isUserDJ(user) ? '#ff4081' : '#00d4ff' }} />
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {user.name}
                            </Typography>
                            <Chip
                              label={getUserRole(user).toUpperCase()}
                              size="small"
                              sx={{
                                background: isUserDJ(user) ? '#ff4081' : '#00d4ff',
                                color: 'white',
                              }}
                            />
                            {user.isActive && <Chip label="ACTIVE" size="small" color="success" />}
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            {getUserMicrophoneName(user)} • {user.stageName} • {user.email}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={user.isActive}
                          onChange={() => toggleUserActive(user.id)}
                          sx={{ mr: 1 }}
                        />
                        <IconButton onClick={() => removeFakeUser(user.id)} size="small">
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                background: 'rgba(26, 26, 46, 0.8)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  Quick Stats
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Total Users:</Typography>
                    <Chip label={fakeUsers.length} size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Active Users:</Typography>
                    <Chip
                      label={fakeUsers.filter((u) => u.isActive).length}
                      size="small"
                      color="success"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>DJs:</Typography>
                    <Chip
                      label={fakeUsers.filter((u) => isUserDJ(u)).length}
                      size="small"
                      sx={{ background: '#ff4081', color: 'white' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Singers:</Typography>
                    <Chip
                      label={fakeUsers.filter((u) => !isUserDJ(u)).length}
                      size="small"
                      sx={{ background: '#00d4ff', color: 'white' }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Test Venues Tab */}
      <TabPanel value={tabValue} index={1}>
        <Card
          sx={{ background: 'rgba(26, 26, 46, 0.8)', border: '1px solid rgba(0, 212, 255, 0.3)' }}
        >
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
              Test Venues
            </Typography>
            <List>
              {testVenues.map((venue) => (
                <ListItem
                  key={venue.id}
                  sx={{
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: venue.isActive ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationIcon sx={{ color: '#00d4ff' }} />
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {venue.name}
                        </Typography>
                        {venue.isActive && <Chip label="ACTIVE" size="small" color="success" />}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {venue.address} • {venue.lat}, {venue.lng}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Simulations Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 3, backgroundColor: 'rgba(0, 212, 255, 0.1)' }}>
              <Typography variant="h6" sx={{ color: '#00d4ff', mb: 1 }}>
                🧪 Test Mode Active
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Location validation is <strong>disabled</strong> for testing. You can join shows
                without being at the venue.
              </Typography>
              <Typography variant="body2">
                <strong>Role Testing Tips:</strong>
              </Typography>
              <Typography variant="body2" component="ul" sx={{ mt: 1, pl: 2 }}>
                <li>You'll join as DJ if you're the first person in the show</li>
                <li>
                  Use <strong>incognito/private windows</strong> to test different user roles
                </li>
                <li>DJ sees: Queue management, current singer controls, chat moderation</li>
                <li>Singer sees: Join queue, song requests, position in queue</li>
              </Typography>
            </Alert>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                background: 'rgba(26, 26, 46, 0.8)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00d4ff' }}>
                  Location Proximity Test
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                  Test location detection and 30-meter proximity validation (for future venue
                  testing).
                </Typography>
                <Button
                  variant="contained"
                  onClick={simulateLocationTest}
                  disabled={simulationRunning}
                  sx={{
                    background: 'linear-gradient(135deg, #00d4ff 0%, #00b8d4 100%)',
                    color: '#1a1a2e',
                  }}
                >
                  <LocationIcon sx={{ mr: 1 }} />
                  {simulationRunning ? 'Testing...' : 'Test Location API'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                background: 'rgba(26, 26, 46, 0.8)',
                border: '1px solid rgba(255, 64, 129, 0.3)',
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#ff4081' }}>
                  🎤 Create & Join Live Show
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                  Create a real live show and join it immediately (no location validation).
                </Typography>
                <Button
                  variant="contained"
                  onClick={simulateLiveShowFlow}
                  disabled={simulationRunning || fakeUsers.filter((u) => u.isActive).length === 0}
                  sx={{
                    background: 'linear-gradient(135deg, #ff4081 0%, #f50057 100%)',
                  }}
                >
                  <MicIcon sx={{ mr: 1 }} />
                  {simulationRunning ? 'Creating...' : 'Start Live Show'}
                </Button>
                {fakeUsers.filter((u) => u.isActive).length === 0 && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#ff9800' }}>
                    ⚠️ Create and activate fake users first
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card
              sx={{
                background: 'rgba(26, 26, 46, 0.8)',
                border: '1px solid rgba(156, 39, 176, 0.3)',
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#9c27b0' }}>
                  🎭 Role Testing Guide
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ color: '#ff4081', mb: 1 }}>
                      👑 DJ Experience:
                    </Typography>
                    <Typography variant="body2" component="ul" sx={{ pl: 2, opacity: 0.9 }}>
                      <li>Manage participant queue</li>
                      <li>Set current singer performing</li>
                      <li>Send announcements to all users</li>
                      <li>View all chat messages</li>
                      <li>Control show flow and timing</li>
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ color: '#00d4ff', mb: 1 }}>
                      🎤 Singer Experience:
                    </Typography>
                    <Typography variant="body2" component="ul" sx={{ pl: 2, opacity: 0.9 }}>
                      <li>Join the singing queue</li>
                      <li>See your position in queue</li>
                      <li>Submit song requests</li>
                      <li>Chat with other participants</li>
                      <li>Get notified when it's your turn</li>
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Test Results Tab */}
      <TabPanel value={tabValue} index={3}>
        <Card
          sx={{ background: 'rgba(26, 26, 46, 0.8)', border: '1px solid rgba(0, 212, 255, 0.3)' }}
        >
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6" sx={{ color: '#00d4ff' }}>
                Test Results Log
              </Typography>
              <Button
                variant="outlined"
                onClick={clearTestResults}
                size="small"
                sx={{ borderColor: '#00d4ff', color: '#00d4ff' }}
              >
                Clear Log
              </Button>
            </Box>

            <Box
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                border: '1px solid rgba(0, 212, 255, 0.2)',
                borderRadius: 1,
                p: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                fontFamily: 'monospace',
              }}
            >
              {testResults.length === 0 ? (
                <Typography variant="body2" sx={{ opacity: 0.6, textAlign: 'center' }}>
                  No test results yet. Run some simulations to see results here.
                </Typography>
              ) : (
                testResults.map((result, index) => (
                  <Typography
                    key={index}
                    variant="body2"
                    sx={{
                      mb: 0.5,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      wordBreak: 'break-all',
                    }}
                  >
                    {result}
                  </Typography>
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      </TabPanel>
    </Container>
  );
});
