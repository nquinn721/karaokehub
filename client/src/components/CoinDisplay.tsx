import { faCoins } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Chip, CircularProgress, Typography, useTheme } from '@mui/material';
import { storeStore } from '@stores/StoreStore';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface CoinDisplayProps {
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  onClick?: () => void;
}

export const CoinDisplay: React.FC<CoinDisplayProps> = observer(
  ({ size = 'medium', showIcon = true, onClick }) => {
    const theme = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
      // Fetch user coins when component mounts
      storeStore.fetchUserCoins();
    }, []);

    const handleClick = () => {
      if (onClick) {
        onClick();
      } else {
        navigate('/store');
      }
    };

    const formatCoins = (coins: number): string => {
      if (coins >= 1000000) {
        return `${(coins / 1000000).toFixed(1)}M`;
      } else if (coins >= 1000) {
        return `${(coins / 1000).toFixed(1)}K`;
      }
      return coins.toString();
    };

    const getSizeProps = () => {
      switch (size) {
        case 'small':
          return {
            fontSize: '0.75rem',
            iconSize: '14px',
            padding: '2px 6px',
            height: '24px',
          };
        case 'large':
          return {
            fontSize: '1rem',
            iconSize: '18px',
            padding: '6px 12px',
            height: '36px',
          };
        default:
          return {
            fontSize: '0.875rem',
            iconSize: '16px',
            padding: '4px 8px',
            height: '28px',
          };
      }
    };

    const sizeProps = getSizeProps();

    if (storeStore.isLoading) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: sizeProps.padding,
          }}
          onClick={handleClick}
        >
          <CircularProgress size={14} />
        </Box>
      );
    }

    return (
      <Chip
        icon={
          showIcon ? (
            <FontAwesomeIcon
              icon={faCoins}
              style={{
                fontSize: sizeProps.iconSize,
                color: '#FFD700', // Gold color for coins
              }}
            />
          ) : undefined
        }
        label={
          <Typography
            variant="body2"
            sx={{
              fontSize: sizeProps.fontSize,
              fontWeight: 600,
              color: 'inherit',
            }}
          >
            {formatCoins(storeStore.coins)}
          </Typography>
        }
        onClick={handleClick}
        sx={{
          cursor: 'pointer',
          height: sizeProps.height,
          backgroundColor:
            theme.palette.mode === 'light' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.25)',
          color: theme.palette.mode === 'light' ? '#B8860B' : '#FFD700',
          border: `1px solid ${theme.palette.mode === 'light' ? '#DAA520' : '#FFD700'}`,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor:
              theme.palette.mode === 'light'
                ? 'rgba(255, 215, 0, 0.25)'
                : 'rgba(255, 215, 0, 0.35)',
            transform: 'translateY(-1px)',
            boxShadow: theme.shadows[2],
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '& .MuiChip-icon': {
            marginLeft: '6px',
          },
        }}
      />
    );
  },
);
