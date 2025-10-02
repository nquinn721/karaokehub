/**
 * FloatingLiveShowButton Component
 * Floating action button for active live show - shows on mobile under header,
 * integrates into header on desktop
 */

import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Badge,
  Box,
  Fab,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { liveShowStore } from '../../stores/LiveShowStore';

export const FloatingLiveShowButton: React.FC = observer(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleClick = () => {
    if (liveShowStore.currentShow) {
      // Navigate to live show page
      navigate(`/live-shows/${liveShowStore.currentShow.id}`);
    }
  };

  if (!liveShowStore.shouldShowFloatingButton) {
    return null;
  }

  const participantCount = liveShowStore.currentShow?.participants?.length || 0;
  const queueCount = liveShowStore.currentShow?.queue?.length || 0;
  const showName = liveShowStore.currentShow?.name || 'Live Show';

  // Mobile version - Floating Action Button
  if (isMobile) {
    return (
      <Fab
        onClick={handleClick}
        sx={{
          position: 'fixed',
          top: 80, // Under the header
          right: 16,
          zIndex: 1300,
          background: 'linear-gradient(135deg, #00d4ff 0%, #00b8d4 100%)',
          color: '#1a1a2e',
          boxShadow: '0 8px 25px rgba(0, 212, 255, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #00b8d4 0%, #0097a7 100%)',
            boxShadow: '0 12px 35px rgba(0, 212, 255, 0.4)',
          },
          '&:active': {
            boxShadow: '0 6px 20px rgba(0, 212, 255, 0.4)',
          },
        }}
      >
        <Badge
          badgeContent={participantCount}
          color="secondary"
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#ff4081',
              color: 'white',
              fontSize: '0.65rem',
              minWidth: 16,
              height: 16,
              right: -2,
              top: -2,
            },
          }}
        >
          <FontAwesomeIcon icon={faMicrophone} style={{ fontSize: '1.2rem' }} />
        </Badge>
      </Fab>
    );
  }

  // Desktop version - Header integration
  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
            {showName}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
            {participantCount} participants • {queueCount} in queue
          </Typography>
        </Box>
      }
    >
      <IconButton
        onClick={handleClick}
        sx={{
          ml: 1,
          background:
            'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 188, 212, 0.1) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          color: '#00d4ff',
          '&:hover': {
            background:
              'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 188, 212, 0.2) 100%)',
            border: '1px solid rgba(0, 212, 255, 0.5)',
          },
          position: 'relative',
        }}
      >
        <Badge
          badgeContent={participantCount}
          color="secondary"
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#ff4081',
              color: 'white',
              fontSize: '0.6rem',
              minWidth: 14,
              height: 14,
              right: -1,
              top: -1,
            },
          }}
        >
          <FontAwesomeIcon icon={faMicrophone} />
        </Badge>

        {/* Connection indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: liveShowStore.isConnected ? '#4caf50' : '#f44336',
            border: '1px solid rgba(255, 255, 255, 0.8)',
          }}
        />
      </IconButton>
    </Tooltip>
  );
});

/**
 * HeaderLiveShowButton Component
 * Button for integration into header component
 */
export const HeaderLiveShowButton: React.FC = observer(() => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleClick = () => {
    if (liveShowStore.currentShow) {
      navigate(`/live-shows/${liveShowStore.currentShow.id}`);
    }
  };

  if (!liveShowStore.shouldShowFloatingButton || isMobile) {
    return null;
  }

  const participantCount = liveShowStore.currentShow?.participants?.length || 0;
  const queueCount = liveShowStore.currentShow?.queue?.length || 0;
  const showName = liveShowStore.currentShow?.name || 'Live Show';
  const isUserInQueue = liveShowStore.userQueuePosition !== undefined;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip
        title={
          <Box sx={{ p: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
              {showName}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8 }}>
              {participantCount} participants • {queueCount} in queue
            </Typography>
            {isUserInQueue && (
              <Typography variant="caption" sx={{ display: 'block', color: '#00d4ff' }}>
                You're #{liveShowStore.userQueuePosition} in queue
              </Typography>
            )}
          </Box>
        }
      >
        <Box
          onClick={handleClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.5,
            borderRadius: 2,
            background:
              'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 188, 212, 0.1) 100%)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              background:
                'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(0, 188, 212, 0.2) 100%)',
              border: '1px solid rgba(0, 212, 255, 0.5)',
            },
          }}
        >
          <Badge
            badgeContent={participantCount}
            color="secondary"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#ff4081',
                color: 'white',
                fontSize: '0.6rem',
                minWidth: 14,
                height: 14,
              },
            }}
          >
            <FontAwesomeIcon icon={faMicrophone} style={{ color: '#00d4ff', fontSize: '0.9rem' }} />
          </Badge>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Typography
              variant="caption"
              sx={{
                color: '#00d4ff',
                fontWeight: 600,
                lineHeight: 1,
                fontSize: '0.7rem',
              }}
            >
              Live Show
            </Typography>
            {isUserInQueue && (
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: 1,
                  fontSize: '0.65rem',
                }}
              >
                Queue #{liveShowStore.userQueuePosition}
              </Typography>
            )}
          </Box>

          {/* Connection indicator */}
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: liveShowStore.isConnected ? '#4caf50' : '#f44336',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              ml: 0.5,
            }}
          />
        </Box>
      </Tooltip>
    </Box>
  );
});
