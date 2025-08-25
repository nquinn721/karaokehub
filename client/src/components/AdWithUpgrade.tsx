import { faAd, faCrown, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Skeleton,
  Typography,
  useTheme,
} from '@mui/material';
import { authStore, subscriptionStore } from '@stores/index';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

interface AdWithUpgradeProps {
  size: 'banner' | 'square' | 'rectangle' | 'sidebar' | 'wide';
  className?: string;
  showUpgradePrompt?: boolean;
}

const AD_SIZES = {
  banner: { width: '728px', height: '90px' }, // Leaderboard
  square: { width: '250px', height: '250px' }, // Medium Rectangle
  rectangle: { width: '300px', height: '250px' }, // Medium Rectangle
  sidebar: { width: '160px', height: '600px' }, // Wide Skyscraper
  wide: { width: '100%', height: '120px' }, // Full width ad
};

export const AdWithUpgrade: React.FC<AdWithUpgradeProps> = observer(
  ({ size, className, showUpgradePrompt = true }) => {
    const dimensions = AD_SIZES[size];
    const theme = useTheme();
    const [showPrompt, setShowPrompt] = useState(showUpgradePrompt);
    const [upgradeExpanded, setUpgradeExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpgrade = async () => {
      setError(null);
      console.log('AdWithUpgrade: Starting checkout session...');

      const result = await subscriptionStore.createCheckoutSession('ad_free');
      if (!result.success) {
        console.error('Failed to create checkout session:', result.error);
        setError(result.error || 'Failed to start checkout. Please try again.');

        // Show error for a few seconds then hide it
        setTimeout(() => setError(null), 5000);
      }
    };

    // Don't show anything if user has ad-free access
    if (subscriptionStore.hasAdFreeAccess) {
      return null;
    }

    // Only show upgrade prompts to authenticated users
    const shouldShowUpgradePrompt = showPrompt && authStore.isAuthenticated;

    return (
      <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
        {/* Upgrade Prompt */}
        {shouldShowUpgradePrompt && (
          <Collapse in={!upgradeExpanded}>
            <Card
              elevation={2}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
                border: `1px solid ${theme.palette.primary.main}30`,
                position: 'relative',
              }}
            >
              <IconButton
                size="small"
                onClick={() => setShowPrompt(false)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 1,
                }}
              >
                <FontAwesomeIcon icon={faTimes} size="xs" />
              </IconButton>

              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <FontAwesomeIcon
                    icon={faCrown}
                    style={{ color: theme.palette.warning.main, fontSize: '18px' }}
                  />
                  <Typography variant="subtitle2" fontWeight={600}>
                    Tired of ads?
                  </Typography>
                  <Chip label="Ad-Free" size="small" color="primary" variant="outlined" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Upgrade to enjoy KaraokePal without any advertisements and support our platform.
                </Typography>

                {/* Error Display */}
                {error && (
                  <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
                    {error}
                  </Typography>
                )}
              </CardContent>

              <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                <Button
                  size="small"
                  onClick={() => setUpgradeExpanded(!upgradeExpanded)}
                  sx={{ textTransform: 'none' }}
                >
                  Learn More
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<FontAwesomeIcon icon={faCrown} />}
                  onClick={handleUpgrade}
                  disabled={subscriptionStore.isLoading}
                  sx={{ textTransform: 'none' }}
                >
                  {subscriptionStore.isLoading ? 'Loading...' : 'Go Ad-Free'}
                </Button>
              </CardActions>

              {/* Expanded Details */}
              <Collapse in={upgradeExpanded}>
                <CardContent sx={{ pt: 0, borderTop: `1px solid ${theme.palette.divider}` }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Ad-Free Benefits:</strong>
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    <Typography component="li" variant="caption" color="text.secondary">
                      Complete ad removal across all pages
                    </Typography>
                    <Typography component="li" variant="caption" color="text.secondary">
                      Faster page loading without ad scripts
                    </Typography>
                    <Typography component="li" variant="caption" color="text.secondary">
                      Support KaraokePal development
                    </Typography>
                    <Typography component="li" variant="caption" color="text.secondary">
                      Clean, distraction-free experience
                    </Typography>
                  </Box>
                </CardContent>
              </Collapse>
            </Card>
          </Collapse>
        )}

        {/* Ad Placeholder */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Paper
            elevation={1}
            sx={{
              width: size === 'wide' ? '100%' : dimensions.width,
              height: dimensions.height,
              maxWidth: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.palette.background.paper,
              border: `2px solid ${theme.palette.divider}`,
              borderRadius: 2,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Animated background */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                opacity: 0.3,
              }}
            />

            {/* Content */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                zIndex: 1,
              }}
            >
              <FontAwesomeIcon
                icon={faAd}
                style={{
                  fontSize: size === 'banner' ? '20px' : '28px',
                  color: theme.palette.primary.main,
                  opacity: 0.8,
                }}
              />
              <Typography
                variant={size === 'banner' ? 'caption' : 'body2'}
                color="primary"
                fontWeight={500}
                textAlign="center"
              >
                Advertisement
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                textAlign="center"
                sx={{ fontSize: size === 'banner' ? '10px' : '12px' }}
              >
                {dimensions.width} × {dimensions.height}
              </Typography>
            </Box>

            {/* Shimmer effect */}
            <Skeleton
              variant="rectangular"
              width="100%"
              height="100%"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                opacity: 0.1,
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
          </Paper>
        </Box>
      </Box>
    );
  },
);

// Enhanced ad components that include upgrade prompts
export const BannerAdWithUpgrade: React.FC<{ className?: string; showUpgradePrompt?: boolean }> = ({
  className,
  showUpgradePrompt = true,
}) => <AdWithUpgrade size="banner" className={className} showUpgradePrompt={showUpgradePrompt} />;

export const WideAdWithUpgrade: React.FC<{ className?: string; showUpgradePrompt?: boolean }> = ({
  className,
  showUpgradePrompt = true,
}) => <AdWithUpgrade size="wide" className={className} showUpgradePrompt={showUpgradePrompt} />;

export const SidebarAdWithUpgrade: React.FC<{
  className?: string;
  showUpgradePrompt?: boolean;
}> = ({ className, showUpgradePrompt = true }) => (
  <AdWithUpgrade size="sidebar" className={className} showUpgradePrompt={showUpgradePrompt} />
);

export const SquareAdWithUpgrade: React.FC<{ className?: string; showUpgradePrompt?: boolean }> = ({
  className,
  showUpgradePrompt = true,
}) => <AdWithUpgrade size="square" className={className} showUpgradePrompt={showUpgradePrompt} />;

export const RectangleAdWithUpgrade: React.FC<{
  className?: string;
  showUpgradePrompt?: boolean;
}> = ({ className, showUpgradePrompt = true }) => (
  <AdWithUpgrade size="rectangle" className={className} showUpgradePrompt={showUpgradePrompt} />
);
