import { faCheck, faGlobe, faMicrophone, faUsers } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

export interface ParseResults {
  vendor: string | { name: string; website?: string; description?: string; confidence?: number };
  djsCount: number;
  showsCount: number;
  confidence: {
    vendor: number;
    avgDjConfidence: number;
    avgShowConfidence: number;
  };
  url?: string;
}

interface ParseResultsDialogProps {
  open: boolean;
  onClose: () => void;
  results: ParseResults | null;
  title?: string;
}

export const ParseResultsDialog: React.FC<ParseResultsDialogProps> = ({
  open,
  onClose,
  results,
  title = 'Parse Results',
}) => {
  const theme = useTheme();

  if (!results) return null;

  // Helper function to get vendor name
  const getVendorName = (
    vendor: string | { name: string; website?: string; description?: string; confidence?: number },
  ) => {
    if (typeof vendor === 'string') {
      return vendor || 'Unknown Vendor';
    }
    return vendor?.name || 'Unknown Vendor';
  };

  // Provide default values for confidence if missing
  const confidence = {
    vendor: Math.max(0, Math.min(100, results.confidence?.vendor || 0)),
    avgDjConfidence: Math.max(0, Math.min(100, results.confidence?.avgDjConfidence || 0)),
    avgShowConfidence: Math.max(0, Math.min(100, results.confidence?.avgShowConfidence || 0)),
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return theme.palette.success.main;
    if (confidence >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'Excellent';
    if (confidence >= 60) return 'Good';
    return 'Needs Review';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          pb: 1,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
        }}
      >
        <FontAwesomeIcon icon={faCheck} color={theme.palette.success.main} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Successfully parsed and processed website data with the following results:
          </Typography>

          {results.url && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Source:</strong> {results.url}
              </Typography>
            </Box>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} sm={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ mb: 2 }}>
                  <FontAwesomeIcon
                    icon={faGlobe}
                    style={{ fontSize: '2rem', color: theme.palette.primary.main }}
                  />
                </Box>
                <Typography variant="h6" gutterBottom>
                  Vendor
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {getVendorName(results.vendor)}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Confidence: {confidence.vendor}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={confidence.vendor}
                    sx={{
                      mt: 1,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getConfidenceColor(confidence.vendor),
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ mb: 2 }}>
                  <FontAwesomeIcon
                    icon={faUsers}
                    style={{ fontSize: '2rem', color: theme.palette.primary.main }}
                  />
                </Box>
                <Typography variant="h6" gutterBottom>
                  DJs Found
                </Typography>
                <Typography variant="h4" color="primary" sx={{ mb: 2 }}>
                  {results.djsCount || 0}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Avg Confidence: {Math.round(confidence.avgDjConfidence)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={confidence.avgDjConfidence}
                    sx={{
                      mt: 1,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getConfidenceColor(confidence.avgDjConfidence),
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ mb: 2 }}>
                  <FontAwesomeIcon
                    icon={faMicrophone}
                    style={{ fontSize: '2rem', color: theme.palette.success.main }}
                  />
                </Box>
                <Typography variant="h6" gutterBottom>
                  Shows Found
                </Typography>
                <Typography variant="h4" color="success.main" sx={{ mb: 2 }}>
                  {results.showsCount || 0}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Avg Confidence: {Math.round(confidence.avgShowConfidence)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={confidence.avgShowConfidence}
                    sx={{
                      mt: 1,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getConfidenceColor(confidence.avgShowConfidence),
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Overall Assessment */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Overall Assessment
          </Typography>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Vendor Confidence
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: getConfidenceColor(confidence.vendor),
                  fontWeight: 600,
                }}
              >
                {getConfidenceLabel(confidence.vendor)}
              </Typography>
            </Grid>

            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                DJ Detection
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: getConfidenceColor(confidence.avgDjConfidence),
                  fontWeight: 600,
                }}
              >
                {getConfidenceLabel(confidence.avgDjConfidence)}
              </Typography>
            </Grid>

            <Grid item xs={4}>
              <Typography variant="body2" color="text.secondary">
                Show Detection
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: getConfidenceColor(confidence.avgShowConfidence),
                  fontWeight: 600,
                }}
              >
                {getConfidenceLabel(confidence.avgShowConfidence)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} variant="contained" size="large" sx={{ px: 4 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
