import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconButton, Tooltip } from '@mui/material';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { themeStore } from '../stores';

export const ThemeToggle: React.FC = observer(() => {
  const handleToggle = () => {
    themeStore.toggleTheme();
  };

  return (
    <Tooltip title={`Switch to ${themeStore.isDark ? 'light' : 'dark'} theme`}>
      <IconButton
        onClick={handleToggle}
        color="inherit"
        sx={{
          transition: 'transform 0.3s ease-in-out',
          '&:hover': {
            transform: 'rotate(180deg)',
          },
        }}
      >
        <FontAwesomeIcon icon={themeStore.isDark ? faSun : faMoon} style={{ fontSize: '18px' }} />
      </IconButton>
    </Tooltip>
  );
});
