import {
  faBuilding,
  faCalendar,
  faCity,
  faClone,
  faExclamationTriangle,
  faMapMarkerAlt,
  faMicrophone,
  faRocket,
  faSearch,
  faShieldAlt,
  faTrash,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { adminStore, uiStore } from '../stores';
import CustomModal from './CustomModal';

interface ShowAnalyticsProps {}

const ShowAnalytics: React.FC<ShowAnalyticsProps> = observer(() => {
  const theme = useTheme();
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [isValidatingVenues, setIsValidatingVenues] = useState(false);
  const [isValidatingTimes, setIsValidatingTimes] = useState(false);

  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);

  // Handle cleaning duplicates
  const handleCleanDuplicates = async () => {
    setIsCleaningDuplicates(true);
    try {
      const result = await adminStore.cleanupShowsSimple();
      uiStore.addNotification(result.message, 'success');

      // Refresh the statistics to reflect the cleanup
      await adminStore.fetchStatistics();
    } catch (error) {
      console.error('Failed to clean duplicates:', error);
      uiStore.addNotification('Failed to clean duplicates. Please try again.', 'error');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  // Handle venue validation with Gemini AI
  const handleValidateVenues = async () => {
    setIsValidatingVenues(true);
    try {
      uiStore.addNotification('Detecting duplicate venues with Gemini AI...', 'info');

      const response = await fetch('/api/admin/venues/detect-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to detect venue duplicates');
      }

      const results = await response.json();
      setValidationResults(results);
      setValidationModalOpen(true);

      const duplicateCount = results.summary.duplicatesFound;
      const deletionCount = results.summary.venuesMarkedForDeletion;
      
      if (duplicateCount > 0) {
        uiStore.addNotification(
          `Duplicate detection complete! Found ${duplicateCount} duplicate groups affecting ${deletionCount} venues.`,
          'warning',
        );
      } else {
        uiStore.addNotification(
          `Duplicate detection complete! No duplicates found in ${results.totalVenues} venues.`,
          'success',
        );
      }
    } catch (error) {
      console.error('Failed to detect venue duplicates:', error);
      uiStore.addNotification('Failed to detect venue duplicates. Please try again.', 'error');
    } finally {
      setIsValidatingVenues(false);
    }
  };

  // Handle enhanced multi-threaded venue validation with time fixes
  const handleValidateVenuesEnhanced = async () => {
    setIsValidatingVenues(true);
    try {
      uiStore.addNotification(
        'Starting enhanced multi-threaded venue validation with time detection...',
        'info',
      );

      const response = await fetch('/api/admin/venues/validate-all-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to validate venues with enhanced system');
      }

      const results = await response.json();
      setValidationResults(results);
      setValidationModalOpen(true);

      const summary = results.summary;
      const processingTime = Math.round(results.processingTime / 1000);
      const threadsUsed = results.threadsUsed;

      uiStore.addNotification(
        `Enhanced validation complete! ${summary.totalVenues} venues processed using ${threadsUsed} threads in ${processingTime}s. Fixed: ${summary.timeFixesCount} times, ${summary.geoFixesCount} locations, ${summary.conflictsFound} conflicts found.`,
        'success',
      );
    } catch (error) {
      console.error('Failed to validate venues with enhanced system:', error);
      uiStore.addNotification('Enhanced venue validation failed. Please try again.', 'error');
    } finally {
      setIsValidatingVenues(false);
    }
  };

  // Handle show time validation and fixes
  const handleValidateTimes = async () => {
    setIsValidatingTimes(true);
    try {
      uiStore.addNotification('Starting show time validation and automatic fixes...', 'info');

      const response = await fetch('/api/admin/shows/validate-times', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to validate show times');
      }

      const results = await response.json();

      uiStore.addNotification(
        `Time validation complete! Found ${results.issuesFound} issues in ${results.totalShows} shows. Fixed ${results.fixesApplied} automatically. AM/PM errors: ${results.summary.amPmErrors}, Range issues: ${results.summary.impossibleRanges}`,
        results.fixesApplied > 0 ? 'success' : 'warning',
      );
    } catch (error) {
      console.error('Failed to validate show times:', error);
      uiStore.addNotification('Show time validation failed. Please try again.', 'error');
    } finally {
      setIsValidatingTimes(false);
    }
  };



  // Handle cleanup of detected duplicate venues
  const handleCleanupDuplicates = async (duplicateGroups: any[]) => {
    try {
      uiStore.addNotification('Cleaning up duplicate venues...', 'info');

      const response = await fetch('/api/admin/venues/cleanup-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ duplicateGroups }),
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup duplicate venues');
      }

      const results = await response.json();

      if (results.success) {
        uiStore.addNotification(
          `Cleanup complete! Deleted ${results.deletedVenues} duplicate venues and merged ${results.mergedShows} shows.`,
          'success',
        );
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        uiStore.addNotification(
          `Cleanup completed with errors. Deleted ${results.deletedVenues} venues. Errors: ${results.errors.join(', ')}`,
          'warning',
        );
      }
    } catch (error) {
      console.error('Failed to cleanup duplicates:', error);
      uiStore.addNotification('Failed to cleanup duplicate venues. Please try again.', 'error');
    }
  };

  // State abbreviation to full name mapping
  const getFullStateName = (abbreviation: string): string => {
    const stateMap: { [key: string]: string } = {
      AL: 'Alabama',
      AK: 'Alaska',
      AZ: 'Arizona',
      AR: 'Arkansas',
      CA: 'California',
      CO: 'Colorado',
      CT: 'Connecticut',
      DE: 'Delaware',
      FL: 'Florida',
      GA: 'Georgia',
      HI: 'Hawaii',
      ID: 'Idaho',
      IL: 'Illinois',
      IN: 'Indiana',
      IA: 'Iowa',
      KS: 'Kansas',
      KY: 'Kentucky',
      LA: 'Louisiana',
      ME: 'Maine',
      MD: 'Maryland',
      MA: 'Massachusetts',
      MI: 'Michigan',
      MN: 'Minnesota',
      MS: 'Mississippi',
      MO: 'Missouri',
      MT: 'Montana',
      NE: 'Nebraska',
      NV: 'Nevada',
      NH: 'New Hampshire',
      NJ: 'New Jersey',
      NM: 'New Mexico',
      NY: 'New York',
      NC: 'North Carolina',
      ND: 'North Dakota',
      OH: 'Ohio',
      OK: 'Oklahoma',
      OR: 'Oregon',
      PA: 'Pennsylvania',
      RI: 'Rhode Island',
      SC: 'South Carolina',
      SD: 'South Dakota',
      TN: 'Tennessee',
      TX: 'Texas',
      UT: 'Utah',
      VT: 'Vermont',
      VA: 'Virginia',
      WA: 'Washington',
      WV: 'West Virginia',
      WI: 'Wisconsin',
      WY: 'Wyoming',
      BC: 'British Columbia', // For Canadian provinces
      ON: 'Ontario',
      QC: 'Quebec',
      AB: 'Alberta',
      MB: 'Manitoba',
      SK: 'Saskatchewan',
      NS: 'Nova Scotia',
      NB: 'New Brunswick',
      PE: 'Prince Edward Island',
      NL: 'Newfoundland and Labrador',
      YT: 'Yukon',
      NT: 'Northwest Territories',
      NU: 'Nunavut',
    };

    return stateMap[abbreviation?.toUpperCase()] || abbreviation || 'Unknown State';
  };

  useEffect(() => {
    // Fetch shows data for analytics - using admin endpoint to get user relationships
    adminStore.fetchShows(1, 10000); // Fetch a large number to get all shows
  }, []);

  const toggleCard = (cardId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Calculate analytics
  const shows = adminStore.shows?.items || [];
  const totalShows = shows.length;

  // City analytics
  const cityStats = shows.reduce(
    (acc, show) => {
      const city = show.venue?.city || 'Unknown City';
      if (!acc[city]) {
        acc[city] = { count: 0, shows: [] };
      }
      acc[city].count++;
      acc[city].shows.push(show);
      return acc;
    },
    {} as Record<string, { count: number; shows: any[] }>,
  );

  // State analytics
  const stateStats = shows.reduce(
    (acc, show) => {
      const stateAbbreviation = show.venue?.state || 'Unknown State';
      const stateName = getFullStateName(stateAbbreviation);
      if (!acc[stateName]) {
        acc[stateName] = { count: 0, shows: [] };
      }
      acc[stateName].count++;
      acc[stateName].shows.push(show);
      return acc;
    },
    {} as Record<string, { count: number; shows: any[] }>,
  );

  // User-uploaded vs system shows with detailed breakdown
  const userUploadedShows = shows.filter(
    (show) =>
      show.submittedByUser ||
      (show.source && (show.source.includes('manual') || show.source === 'user_submission')),
  );
  const systemShows = shows.filter(
    (show) =>
      !show.submittedByUser &&
      (!show.source || (!show.source.includes('manual') && show.source !== 'user_submission')),
  );

  // User upload statistics - group by actual users who submitted shows
  const userUploadStats = useMemo(() => {
    const userUploads = new Map<
      string,
      { count: number; shows: any[]; user: any; displayName: string }
    >();

    userUploadedShows.forEach((show) => {
      let userKey: string;
      let displayName: string;
      let user: any = null;

      if (show.submittedByUser) {
        // Use actual user information
        userKey = show.submittedByUser.id;
        displayName = show.submittedByUser.stageName || show.submittedByUser.name;
        user = show.submittedByUser;
      } else {
        // Fallback to source-based categorization for legacy data
        userKey = show.source || 'unknown';
        if (show.source?.includes('manual_submission')) {
          displayName = 'Manual Submission (Unknown User)';
        } else if (show.source?.includes('user_submission')) {
          displayName = 'User Submission (Unknown User)';
        } else if (show.source?.includes('manual')) {
          displayName = 'Manual Entry (Admin)';
        } else {
          displayName = 'Unknown Source';
        }
      }

      if (!userUploads.has(userKey)) {
        userUploads.set(userKey, { count: 0, shows: [], user, displayName });
      }
      userUploads.get(userKey)!.count++;
      userUploads.get(userKey)!.shows.push(show);
    });

    return Array.from(userUploads.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [userUploadedShows]);

  // Missing data analysis
  const showsMissingVenue = shows.filter((show) => !show.venue?.name);
  const showsMissingTime = shows.filter((show) => !show.startTime && !show.endTime);
  const showsMissingDJ = shows.filter((show) => !show.dj?.name);
  const showsMissingLocation = shows.filter((show) => !show.venue?.city || !show.venue?.state);

  // Duplicate detection (basic - by venue name and day)
  const duplicateGroups = shows.reduce(
    (acc, show, index) => {
      const key = `${show.venue?.name || 'unknown'}-${show.day}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({ ...show, originalIndex: index });
      return acc;
    },
    {} as Record<string, any[]>,
  );

  const potentialDuplicates = Object.values(duplicateGroups).filter((group) => group.length > 1);

  // Venue analytics
  const venueStats = shows.reduce(
    (acc, show) => {
      const venueName = show.venue?.name || 'Unknown Venue';
      if (!acc[venueName]) {
        acc[venueName] = { count: 0, shows: [] };
      }
      acc[venueName].count++;
      acc[venueName].shows.push(show);
      return acc;
    },
    {} as Record<string, { count: number; shows: any[] }>,
  );

  // DJ analytics
  const djStats = shows.reduce(
    (acc, show) => {
      const djName = show.dj?.name || 'Unknown DJ';
      if (!acc[djName]) {
        acc[djName] = { count: 0, shows: [] };
      }
      acc[djName].count++;
      acc[djName].shows.push(show);
      return acc;
    },
    {} as Record<string, { count: number; shows: any[] }>,
  );

  // Filter shows based on search
  const filterShows = (shows: any[]) => {
    if (!searchTerm) return shows;
    return shows.filter(
      (show) =>
        show.venue?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        show.venue?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        show.dj?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  const StatCard = ({
    title,
    count,
    icon,
    color,
    shows,
    cardId,
    subtitle,
  }: {
    title: string;
    count: number;
    icon: any;
    color: string;
    shows: any[];
    cardId: string;
    subtitle?: string;
  }) => {
    const isExpanded = expandedCards[cardId];
    const filteredShows = filterShows(shows);

    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={icon} style={{ color: color, fontSize: '1.5rem' }} />
              <Typography variant="h6" component="h3">
                {title}
              </Typography>
            </Box>
            <IconButton onClick={() => toggleCard(cardId)}>
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Typography variant="h4" sx={{ color: color, fontWeight: 'bold', mb: 1 }}>
            {count}
          </Typography>

          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}

          <Collapse in={isExpanded}>
            <Box sx={{ mt: 2 }}>
              {filteredShows.length > 0 ? (
                <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {filteredShows.slice(0, 50).map((show, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={show.venue?.name || 'Unknown Venue'}
                        secondary={`${show.venue?.city || 'Unknown'}, ${show.venue?.state || 'Unknown'} - ${show.dayOfWeek} - DJ: ${show.dj?.name || 'Unknown'}`}
                      />
                    </ListItem>
                  ))}
                  {filteredShows.length > 50 && (
                    <ListItem>
                      <ListItemText secondary={`... and ${filteredShows.length - 50} more`} />
                    </ListItem>
                  )}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No shows found
                </Typography>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  const UserUploadCard = ({
    title,
    totalCount,
    icon,
    color,
    uploadStats,
    cardId,
    subtitle,
  }: {
    title: string;
    totalCount: number;
    icon: any;
    color: string;
    uploadStats: Array<{
      userId: string;
      count: number;
      shows: any[];
      displayName: string;
      user: any;
    }>;
    cardId: string;
    subtitle?: string;
  }) => {
    const isExpanded = expandedCards[cardId];

    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={icon} style={{ color: color, fontSize: '1.5rem' }} />
              <Typography variant="h6" component="h3">
                {title}
              </Typography>
            </Box>
            <IconButton onClick={() => toggleCard(cardId)}>
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Typography variant="h4" sx={{ color: color, fontWeight: 'bold', mb: 1 }}>
            {totalCount}
          </Typography>

          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}

          <Collapse in={isExpanded}>
            <Box sx={{ mt: 2 }}>
              {uploadStats.length > 0 ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Contributors ({uploadStats.length} unique user
                    {uploadStats.length === 1 ? '' : 's'}):
                  </Typography>
                  {uploadStats.map((stat, index) => (
                    <Box
                      key={index}
                      sx={{
                        mb: 2,
                        p: 2,
                        bgcolor: alpha(color, 0.1),
                        borderRadius: 1,
                        border: `1px solid ${alpha(color, 0.2)}`,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {stat.displayName}
                          </Typography>
                          {stat.user && stat.user.email && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block' }}
                            >
                              {stat.user.email}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={`${stat.count} show${stat.count === 1 ? '' : 's'}`}
                          size="small"
                          sx={{ bgcolor: color, color: 'white' }}
                        />
                      </Box>

                      {/* Show first few shows from this user */}
                      {stat.shows.slice(0, 3).map((show, showIndex) => (
                        <Typography
                          key={showIndex}
                          variant="body2"
                          sx={{ ml: 1, mb: 0.5, fontSize: '0.85rem' }}
                        >
                          • {show.venue?.name || 'Unknown Venue'} -{' '}
                          {show.venue?.city || 'Unknown City'},{' '}
                          {show.venue?.state || 'Unknown State'}
                          {show.day && ` (${show.day})`}
                        </Typography>
                      ))}

                      {stat.shows.length > 3 && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ... and {stat.shows.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No user uploaded shows found
                </Typography>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  const TopStatsCard = ({
    title,
    stats,
    icon,
    color,
    cardId,
  }: {
    title: string;
    stats: Record<string, { count: number; shows: any[] }>;
    icon: any;
    color: string;
    cardId: string;
  }) => {
    const isExpanded = expandedCards[cardId];
    const sortedStats = Object.entries(stats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={icon} style={{ color: color, fontSize: '1.5rem' }} />
              <Typography variant="h6" component="h3">
                {title}
              </Typography>
            </Box>
            <IconButton onClick={() => toggleCard(cardId)}>
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Box sx={{ mb: 2 }}>
            {sortedStats.slice(0, 5).map(([name, data]) => (
              <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
                  {name}
                </Typography>
                <Chip
                  label={data.count}
                  size="small"
                  sx={{ bgcolor: alpha(color, 0.1), color: color }}
                />
              </Box>
            ))}
          </Box>

          <Collapse in={isExpanded}>
            <Box>
              {sortedStats.slice(5).map(([name, data]) => (
                <Box key={name} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" noWrap sx={{ maxWidth: '70%' }}>
                    {name}
                  </Typography>
                  <Chip
                    label={data.count}
                    size="small"
                    sx={{ bgcolor: alpha(color, 0.1), color: color }}
                  />
                </Box>
              ))}
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        {/* Header with Title and Action Buttons */}
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
        >
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Show Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive insights into your karaoke show database
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FontAwesomeIcon icon={faShieldAlt} />}
              onClick={handleValidateVenues}
              disabled={isValidatingVenues}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                minWidth: 200,
              }}
            >
              {isValidatingVenues ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Detecting Duplicates...
                </>
              ) : (
                'Detect Duplicate Venues'
              )}
            </Button>

            <Button
              variant="contained"
              startIcon={<FontAwesomeIcon icon={faRocket} />}
              onClick={handleValidateVenuesEnhanced}
              disabled={isValidatingVenues}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                minWidth: 220,
                background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FF5252, #26C6DA)',
                },
              }}
            >
              {isValidatingVenues ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                  Enhanced Validating...
                </>
              ) : (
                'Enhanced Multi-Thread Fix'
              )}
            </Button>

            <Button
              variant="outlined"
              startIcon={<FontAwesomeIcon icon={faCalendar} />}
              onClick={handleValidateTimes}
              disabled={isValidatingTimes}
              sx={{
                borderRadius: 2,
                px: 3,
                py: 1.5,
                minWidth: 200,
                borderColor: theme.palette.warning.main,
                color: theme.palette.warning.main,
                '&:hover': {
                  borderColor: theme.palette.warning.dark,
                  backgroundColor: alpha(theme.palette.warning.main, 0.1),
                },
              }}
            >
              {isValidatingTimes ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1, color: theme.palette.warning.main }} />
                  Fixing Times...
                </>
              ) : (
                'Fix Show Times'
              )}
            </Button>


          </Box>
        </Box>

        {/* Search Filter */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search shows, venues, cities, or DJs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <FontAwesomeIcon
                icon={faSearch}
                style={{ marginRight: 8, color: theme.palette.text.secondary }}
              />
            ),
          }}
          sx={{ mb: 3, maxWidth: 400 }}
        />
      </Box>

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Shows"
            count={totalShows}
            icon={faCalendar}
            color={theme.palette.primary.main}
            shows={shows}
            cardId="total-shows"
            subtitle="All karaoke shows in database"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <UserUploadCard
            title="User Uploaded"
            totalCount={userUploadedShows.length}
            icon={faUser}
            color={theme.palette.success.main}
            uploadStats={userUploadStats}
            cardId="user-uploaded"
            subtitle="Shows submitted by users"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="System Shows"
            count={systemShows.length}
            icon={faBuilding}
            color={theme.palette.info.main}
            shows={systemShows}
            cardId="system-shows"
            subtitle="Shows from automated sources"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Unique Cities"
            count={Object.keys(cityStats).length}
            icon={faCity}
            color={theme.palette.secondary.main}
            shows={[]}
            cardId="unique-cities"
            subtitle="Distinct cities with shows"
          />
        </Grid>
      </Grid>

      {/* Data Quality Issues */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
        Data Quality Issues
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Missing Venue"
            count={showsMissingVenue.length}
            icon={faExclamationTriangle}
            color={theme.palette.error.main}
            shows={showsMissingVenue}
            cardId="missing-venue"
            subtitle="Shows without venue information"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Missing Time"
            count={showsMissingTime.length}
            icon={faExclamationTriangle}
            color={theme.palette.warning.main}
            shows={showsMissingTime}
            cardId="missing-time"
            subtitle="Shows without time specified"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Missing DJ"
            count={showsMissingDJ.length}
            icon={faMicrophone}
            color={theme.palette.warning.main}
            shows={showsMissingDJ}
            cardId="missing-dj"
            subtitle="Shows without DJ information"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Missing Location"
            count={showsMissingLocation.length}
            icon={faMapMarkerAlt}
            color={theme.palette.error.main}
            shows={showsMissingLocation}
            cardId="missing-location"
            subtitle="Shows without city/state"
          />
        </Grid>
      </Grid>

      {/* Potential Duplicates */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
        Potential Duplicates
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FontAwesomeIcon
                    icon={faClone}
                    style={{ color: theme.palette.warning.main, fontSize: '1.5rem' }}
                  />
                  <Typography variant="h6">
                    Duplicate Groups ({potentialDuplicates.length})
                  </Typography>
                </Box>

                {potentialDuplicates.length > 0 && (
                  <Button
                    variant="contained"
                    color="warning"
                    onClick={handleCleanDuplicates}
                    disabled={isCleaningDuplicates}
                    size="small"
                  >
                    {isCleaningDuplicates ? 'Cleaning...' : 'Clean Duplicates'}
                  </Button>
                )}
              </Box>

              {potentialDuplicates.length > 0 ? (
                <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {potentialDuplicates.map((group, index) => (
                    <Box
                      key={index}
                      sx={{
                        mb: 2,
                        p: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.1),
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {group[0].venue?.name || 'Unknown Venue'} - {group[0].dayOfWeek}
                      </Typography>
                      {group.map((show, showIndex) => (
                        <Typography key={showIndex} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                          • {show.time || 'No time'} - DJ: {show.dj?.name || 'Unknown'}
                        </Typography>
                      ))}
                    </Box>
                  ))}
                </List>
              ) : (
                <Alert severity="success">No potential duplicates found!</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Geographic Distribution */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
        Geographic Distribution
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <TopStatsCard
            title="Top Cities"
            stats={cityStats}
            icon={faCity}
            color={theme.palette.primary.main}
            cardId="top-cities"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TopStatsCard
            title="Top States"
            stats={stateStats}
            icon={faMapMarkerAlt}
            color={theme.palette.secondary.main}
            cardId="top-states"
          />
        </Grid>
      </Grid>

      {/* Venue and DJ Stats */}
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
        Venue & DJ Analytics
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TopStatsCard
            title="Top Venues"
            stats={venueStats}
            icon={faBuilding}
            color={theme.palette.info.main}
            cardId="top-venues"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TopStatsCard
            title="Top DJs"
            stats={djStats}
            icon={faMicrophone}
            color={theme.palette.success.main}
            cardId="top-djs"
          />
        </Grid>
      </Grid>

      {/* Venue Validation Results Modal */}
      <CustomModal
        open={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        title="Duplicate Venue Detection Results"
        maxWidth="lg"
      >
        <Box sx={{ p: 2 }}>
          {validationResults && (
            <>
              {/* Summary */}
              <Card sx={{ mb: 3, p: 2, bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'primary.main' }}>
                    � Duplicate Detection Summary
                  </Typography>
                  {validationResults.summary?.duplicatesFound > 0 && (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<FontAwesomeIcon icon={faTrash} />}
                      onClick={() => handleCleanupDuplicates(validationResults.duplicateGroups)}
                      sx={{ borderRadius: 2 }}
                    >
                      Clean Up Duplicates
                    </Button>
                  )}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
                        {validationResults.totalVenues || validationResults.summary?.totalVenues || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Venues
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                        {validationResults.summary?.duplicatesFound || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Duplicate Groups
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                        {validationResults.summary?.venuesMarkedForDeletion || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        To Delete
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                        {validationResults.summary?.conflictsRequiringManualReview || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Manual Review
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Card>

              {/* Duplicate Groups List */}
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                {validationResults.duplicateGroups?.length > 0 ? 'Duplicate Groups Found' : 'No Duplicates Found'}
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {(validationResults.duplicateGroups || []).map((group: any, groupIndex: number) => (
                  <Card
                    key={group.id || groupIndex}
                    sx={{
                      mb: 3,
                      border: '2px solid',
                      borderColor: '#f57c00',
                      bgcolor: 'rgba(245, 124, 0, 0.05)',
                    }}
                  >
                    <CardContent sx={{ pb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 3,
                          p: 2,
                          bgcolor: 'rgba(245, 124, 0, 0.1)',
                          borderRadius: 1,
                        }}
                      >
                        <Box>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: '#e65100',
                              mb: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            🔄 Duplicate Group {groupIndex + 1}
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 'medium' }}>
                            📍 {group.city}, {group.state}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            AI Confidence: {Math.round((group.confidence || 0) * 100)}%
                          </Typography>
                        </Box>
                        <Chip
                          label={`${group.duplicates?.length || 0} venues`}
                          sx={{
                            bgcolor: '#f57c00',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.875rem'
                          }}
                        />
                      </Box>

                      <Box sx={{ ml: 2 }}>
                        {group.duplicates?.map((duplicate: any, dupIndex: number) => (
                          <Box
                            key={duplicate.id || dupIndex}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              py: 2,
                              px: 3,
                              mb: 2,
                              bgcolor: duplicate.isCorrectName 
                                ? 'rgba(46, 125, 50, 0.15)' // Dark green background
                                : 'rgba(211, 47, 47, 0.15)', // Dark red background
                              border: duplicate.isCorrectName
                                ? '2px solid #2e7d32' // Dark green border
                                : '2px solid #d32f2f', // Dark red border
                              borderRadius: 2,
                            }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    color: duplicate.isCorrectName ? '#1b5e20' : '#b71c1c',
                                    mr: 1
                                  }}
                                >
                                  {duplicate.isCorrectName ? '✅ KEEP' : '❌ DELETE'}
                                </Typography>
                                <Chip
                                  label={duplicate.isCorrectName ? 'Keep' : 'Delete'}
                                  size="small"
                                  sx={{
                                    bgcolor: duplicate.isCorrectName ? '#2e7d32' : '#d32f2f',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    '& .MuiChip-label': {
                                      px: 1.5,
                                    }
                                  }}
                                />
                              </Box>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: duplicate.isCorrectName ? 'bold' : 'medium',
                                  color: 'text.primary',
                                  mb: duplicate.address ? 0.5 : 0
                                }}
                              >
                                {duplicate.name}
                              </Typography>
                              {duplicate.address && (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: 'text.secondary',
                                    fontStyle: 'italic'
                                  }}
                                >
                                  📍 {duplicate.address}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </>
          )}
        </Box>
      </CustomModal>
    </Box>
  );
});

export default ShowAnalytics;
