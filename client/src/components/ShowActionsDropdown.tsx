import {
  faCalendarAlt,
  faEdit,
  faEllipsisV,
  faFlag,
  faShare,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, useTheme } from '@mui/material';
import React, { useState } from 'react';
import { Show } from '../stores/ShowStore';

interface ShowActionsDropdownProps {
  show: Show;
  onScheduleClick: (event: React.MouseEvent, show: Show) => void;
  onEditClick: (event: React.MouseEvent, show: Show) => void;
  onFlagClick: (event: React.MouseEvent, show: Show) => void;
  onShareClick?: (event: React.MouseEvent, show: Show) => void;
  size?: 'small' | 'medium';
}

export const ShowActionsDropdown: React.FC<ShowActionsDropdownProps> = ({
  show,
  onScheduleClick,
  onEditClick,
  onFlagClick,
  onShareClick,
  size = 'small',
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    setAnchorEl(null);
  };

  const handleMenuItemClick = (
    event: React.MouseEvent,
    action: (event: React.MouseEvent, show: Show) => void,
  ) => {
    event.stopPropagation();
    action(event, show);
    setAnchorEl(null);
  };

  const buttonSize = size === 'small' ? { xs: '28px', md: '32px' } : { xs: '32px', md: '36px' };

  return (
    <>
      <IconButton
        size={size}
        onClick={handleClick}
        sx={{
          color: theme.palette.text.secondary,
          width: buttonSize,
          height: buttonSize,
          '&:hover': {
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.action.hover,
          },
        }}
        aria-label="Show actions"
      >
        <FontAwesomeIcon icon={faEllipsisV} style={{ fontSize: '12px' }} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 140,
              boxShadow: theme.shadows[8],
            },
          },
        }}
      >
        <MenuItem onClick={(e) => handleMenuItemClick(e, onScheduleClick)}>
          <ListItemIcon>
            <FontAwesomeIcon
              icon={faCalendarAlt}
              style={{
                fontSize: '14px',
                color: theme.palette.primary.main,
              }}
            />
          </ListItemIcon>
          <ListItemText primary="Schedule" />
        </MenuItem>

        <MenuItem onClick={(e) => handleMenuItemClick(e, onEditClick)}>
          <ListItemIcon>
            <FontAwesomeIcon
              icon={faEdit}
              style={{
                fontSize: '14px',
                color: theme.palette.info.main,
              }}
            />
          </ListItemIcon>
          <ListItemText primary="Edit" />
        </MenuItem>

        <MenuItem onClick={(e) => handleMenuItemClick(e, onFlagClick)}>
          <ListItemIcon>
            <FontAwesomeIcon
              icon={faFlag}
              style={{
                fontSize: '14px',
                color: show.isFlagged ? theme.palette.warning.main : theme.palette.text.secondary,
              }}
            />
          </ListItemIcon>
          <ListItemText
            primary="Flag"
            sx={{
              color: show.isFlagged ? theme.palette.warning.main : 'inherit',
            }}
          />
        </MenuItem>

        {onShareClick && (
          <MenuItem onClick={(e) => handleMenuItemClick(e, onShareClick)}>
            <ListItemIcon>
              <FontAwesomeIcon
                icon={faShare}
                style={{
                  fontSize: '14px',
                  color: theme.palette.success.main,
                }}
              />
            </ListItemIcon>
            <ListItemText primary="Share" />
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
