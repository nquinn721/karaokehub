import { faMusic, faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  CircularProgress,
  ClickAwayListener,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { musicStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useRef, useState } from 'react';

interface MusicAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  onKeyPress: (event: React.KeyboardEvent) => void;
  placeholder?: string;
  fullWidth?: boolean;
}

export const MusicAutocomplete: React.FC<MusicAutocompleteProps> = observer(
  ({
    value,
    onChange,
    onSearch,
    onKeyPress,
    placeholder = 'Search for songs, artists, or albums...',
    fullWidth = true,
  }) => {
    const theme = useTheme();
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      onChange(newValue);
      setSelectedIndex(-1);

      // Get suggestions
      if (newValue.trim()) {
        musicStore.getSuggestions(newValue.trim());
      } else {
        musicStore.setShowSuggestions(false);
      }
    };

    const handleSuggestionClick = (suggestion: string) => {
      onChange(suggestion);
      musicStore.setShowSuggestions(false);
      onSearch(suggestion);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
      const { suggestions, showSuggestions } = musicStore;

      if (!showSuggestions || suggestions.length === 0) {
        if (event.key === 'Enter') {
          onKeyPress(event);
        }
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => (prev > -1 ? prev - 1 : -1));
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSuggestionClick(suggestions[selectedIndex]);
          } else {
            onKeyPress(event);
          }
          break;
        case 'Escape':
          musicStore.setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
        default:
          if (event.key === 'Enter') {
            onKeyPress(event);
          }
          break;
      }
    };

    const handleClickAway = () => {
      musicStore.setShowSuggestions(false);
      setSelectedIndex(-1);
    };

    return (
      <ClickAwayListener onClickAway={handleClickAway}>
        <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
          <TextField
            ref={inputRef}
            fullWidth={fullWidth}
            variant="outlined"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FontAwesomeIcon icon={faSearch} />
                </InputAdornment>
              ),
              endAdornment: (musicStore.isLoading || musicStore.isLoadingSuggestions) && (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                backgroundColor: theme.palette.background.paper,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              },
            }}
          />

          {/* Suggestions Dropdown */}
          {musicStore.showSuggestions && musicStore.suggestions.length > 0 && (
            <Popper
              open={musicStore.showSuggestions}
              anchorEl={inputRef.current}
              placement="bottom-start"
              style={{ width: inputRef.current?.offsetWidth || 'auto', zIndex: 1300 }}
            >
              <Paper
                elevation={8}
                sx={{
                  mt: 1,
                  maxHeight: 300,
                  overflow: 'auto',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <List dense>
                  {musicStore.suggestions.map((suggestion, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton
                        selected={index === selectedIndex}
                        onClick={() => handleSuggestionClick(suggestion)}
                        sx={{
                          py: 1,
                          '&.Mui-selected': {
                            backgroundColor: theme.palette.primary.light + '20',
                          },
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <FontAwesomeIcon
                            icon={faMusic}
                            size="sm"
                            style={{ color: theme.palette.text.secondary }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" noWrap>
                              {suggestion}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Popper>
          )}
        </Box>
      </ClickAwayListener>
    );
  },
);
