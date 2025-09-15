import {
  faBuilding,
  faCalendar,
  faCity,
  faClone,
  faExclamationTriangle,
  faMapMarkerAlt,
  faMicrophone,
  faSearch,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
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
import { showStore } from '../stores';

interface ShowAnalyticsProps {}

const ShowAnalytics: React.FC<ShowAnalyticsProps> = observer(() => {
  const theme = useTheme();
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');

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
    // Fetch shows data for analytics
    showStore.fetchShows();
  }, []);

  const toggleCard = (cardId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Calculate analytics
  const shows = showStore.shows;
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
        <Typography variant="h4" component="h1" gutterBottom>
          Show Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Comprehensive insights into your karaoke show database
        </Typography>

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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FontAwesomeIcon
                  icon={faClone}
                  style={{ color: theme.palette.warning.main, fontSize: '1.5rem' }}
                />
                <Typography variant="h6">
                  Duplicate Groups ({potentialDuplicates.length})
                </Typography>
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
    </Box>
  );
});

export default ShowAnalytics;
