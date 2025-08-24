import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Autocomplete,
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Show } from '../../stores/ShowStore';

interface ShowSearchProps {
  onSelectShow: (show: Show) => void;
  placeholder?: string;
  size?: 'small' | 'medium';
  shows?: Show[]; // Accept shows as a prop for client-side filtering
}

export const ShowSearch: React.FC<ShowSearchProps> = observer(
  ({
    onSelectShow,
    placeholder = 'Search venues, DJs, locations...',
    size = 'small',
    shows = [], // Default to empty array
  }) => {
    const theme = useTheme();
    const inputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Show[]>([]);
    const [open, setOpen] = useState(false);

    // Client-side filtering function
    const filterShows = useCallback((query: string, showList: Show[]): Show[] => {
      if (!query || query.trim().length < 1) {
        return [];
      }

      const searchTerms = query.toLowerCase().trim().split(/\s+/);

      return showList
        .filter((show) => {
          const searchableText = [
            show.venue,
            show.address,
            show.city,
            show.state,
            show.dj?.vendor?.name,
            show.dj?.name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          // Check if all search terms match somewhere in the searchable text
          return searchTerms.every((term) => searchableText.includes(term));
        })
        .slice(0, 20); // Limit to 20 results
    }, []);

    useEffect(() => {
      if (searchQuery && shows.length > 0) {
        const results = filterShows(searchQuery, shows);
        setSearchResults(results);
        setOpen(true);
      } else {
        setSearchResults([]);
        setOpen(false);
      }
    }, [searchQuery, shows, filterShows]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchQuery(value);

      // If user clears the search, close dropdown
      if (!value) {
        setOpen(false);
      }
    };

    const handleInputFocus = () => {
      // When user focuses input, open dropdown and show results based on current query
      if (searchQuery.length > 0) {
        const results = filterShows(searchQuery, shows);
        setSearchResults(results);
        setOpen(true);
      } else {
        // If no query, show a subset of shows as suggestions
        const suggestions = shows.slice(0, 10); // Show first 10 shows as suggestions
        setSearchResults(suggestions);
        setOpen(true);
      }
    };

    const handleSelectShow = (show: Show | null) => {
      if (show) {
        onSelectShow(show);
        setSearchQuery('');
        setSearchResults([]);
        setOpen(false);
      }
    };

    const handleClearSearch = () => {
      setSearchQuery('');
      setSearchResults([]);
      setOpen(false);
      // Focus back to the input after clearing
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    };

    const highlightMatches = (text: string, query: string): React.ReactNode => {
      if (!query) return text;

      const terms = query.toLowerCase().split(/\s+/);
      let highlightedText: React.ReactNode = text;

      terms.forEach((term) => {
        if (term.length > 0) {
          const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          const parts = String(highlightedText).split(regex);

          highlightedText = parts.map((part, index) => {
            if (regex.test(part)) {
              return (
                <Box
                  key={index}
                  component="span"
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    padding: '1px 2px',
                    borderRadius: '2px',
                    fontWeight: 600,
                  }}
                >
                  {part}
                </Box>
              );
            }
            return part;
          });
        }
      });

      return highlightedText;
    };

    const formatShowDisplay = (show: Show): string => {
      const parts = [];

      if (show.venue) parts.push(show.venue);
      if (show.dj?.name) parts.push(`DJ: ${show.dj.name}`);
      if (show.city && show.state) parts.push(`${show.city}, ${show.state}`);
      else if (show.city) parts.push(show.city);
      else if (show.state) parts.push(show.state);

      return parts.join(' • ');
    };

    const formatShowSecondary = (show: Show): string => {
      const parts = [];

      if (show.dj?.vendor?.name) parts.push(show.dj.vendor.name);
      if (show.day) {
        const dayCapitalized = show.day.charAt(0).toUpperCase() + show.day.slice(1).toLowerCase();
        parts.push(dayCapitalized);
      }
      if (show.startTime) {
        try {
          const [hours, minutes] = show.startTime.split(':');
          const time = new Date();
          time.setHours(parseInt(hours, 10), parseInt(minutes, 10));
          parts.push(
            time.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
          );
        } catch {
          parts.push(show.startTime);
        }
      }

      return parts.join(' • ');
    };

    return (
      <Autocomplete
        open={open}
        onOpen={() => {
          setOpen(true);
        }}
        onClose={() => setOpen(false)}
        options={searchResults}
        getOptionLabel={(option) => formatShowDisplay(option)}
        renderOption={(props, option) => (
          <Box component="li" {...props} sx={{ p: 2 }}>
            <Box sx={{ width: '100%' }}>
              <Typography variant="body2" fontWeight={500}>
                {highlightMatches(formatShowDisplay(option), searchQuery)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {highlightMatches(formatShowSecondary(option), searchQuery)}
              </Typography>
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            inputRef={inputRef}
            placeholder={placeholder}
            variant="outlined"
            size={size}
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <FontAwesomeIcon
                    icon={faSearch}
                    style={{
                      fontSize: '14px',
                      color: theme.palette.text.secondary,
                    }}
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {searchQuery && (
                    <IconButton
                      size="small"
                      onClick={handleClearSearch}
                      sx={{ color: 'text.secondary' }}
                    >
                      <FontAwesomeIcon icon={faTimes} style={{ fontSize: '12px' }} />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
              sx: {
                '& .MuiOutlinedInput-root': {
                  borderRadius: { xs: 1, md: 0 }, // Rounded on mobile, square on desktop
                },
              },
            }}
          />
        )}
        onChange={(_, value) => handleSelectShow(value)}
        noOptionsText={
          searchQuery.length < 1 ? 'Focus and start typing to search...' : 'No shows found'
        }
        filterOptions={(x) => x} // Disable built-in filtering since we handle it client-side
        sx={{ width: '100%' }}
      />
    );
  },
);

export default ShowSearch;
