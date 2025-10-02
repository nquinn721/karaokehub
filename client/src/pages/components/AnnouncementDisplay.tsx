import { faBullhorn, faTimes, faVolumeUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  alpha,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fade,
  Paper,
  Slide,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import React, { useEffect, useState } from 'react';
import { AnnouncementMessage } from '../../types/live-show.types';

const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

interface AnnouncementDisplayProps {
  announcement?: AnnouncementMessage;
  isDJ: boolean;
  onSendAnnouncement: (message: string) => void;
  onDismissAnnouncement: () => void;
}

export const AnnouncementDisplay: React.FC<AnnouncementDisplayProps> = ({
  announcement,
  isDJ,
  onSendAnnouncement,
  onDismissAnnouncement,
}) => {
  const theme = useTheme();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Auto-dismiss timer for active announcements
  useEffect(() => {
    if (announcement && announcement.isActive) {
      const startTime = Date.now();
      const endTime =
        new Date(announcement.timestamp).getTime() + announcement.displayDuration * 1000;
      const remaining = Math.max(0, endTime - startTime);

      setTimeRemaining(Math.ceil(remaining / 1000));

      const timer = setInterval(() => {
        const now = Date.now();
        const timeLeft = Math.max(0, endTime - now);
        const secondsLeft = Math.ceil(timeLeft / 1000);

        setTimeRemaining(secondsLeft);

        if (timeLeft <= 0) {
          onDismissAnnouncement();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [announcement, onDismissAnnouncement]);

  const handleSendAnnouncement = () => {
    if (!announcementText.trim()) return;

    onSendAnnouncement(announcementText.trim());
    setAnnouncementText('');
    setCreateDialogOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAnnouncement();
    }
  };

  return (
    <>
      {/* DJ Announcement Controls */}
      {isDJ && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FontAwesomeIcon icon={faBullhorn} style={{ color: theme.palette.warning.main }} />
              <Typography variant="h6" color="text.primary">
                Announcements
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="warning"
              startIcon={<FontAwesomeIcon icon={faBullhorn} />}
              onClick={() => setCreateDialogOpen(true)}
              disabled={!!announcement?.isActive}
            >
              Make Announcement
            </Button>
          </Box>

          {announcement?.isActive && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Current announcement (visible to all singers):
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {announcement.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dismisses in {timeRemaining} seconds
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Active Announcement Display (for all users) */}
      {announcement && announcement.isActive && (
        <Fade in={true}>
          <Paper
            elevation={8}
            sx={{
              position: 'fixed',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: theme.zIndex.modal - 1,
              minWidth: 320,
              maxWidth: 600,
              width: '90vw',
              background: `linear-gradient(135deg, ${theme.palette.warning.main}, ${theme.palette.warning.dark})`,
              color: theme.palette.warning.contrastText,
              border: `3px solid ${theme.palette.warning.light}`,
              borderRadius: 3,
              boxShadow: `0 8px 32px ${alpha(theme.palette.warning.main, 0.4)}`,
            }}
          >
            <Box sx={{ p: 3 }}>
              {/* Header */}
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
                    icon={faVolumeUp}
                    style={{
                      fontSize: '1.2rem',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                  >
                    DJ Announcement
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {/* Countdown */}
                  <Box
                    sx={{
                      minWidth: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: alpha(theme.palette.warning.contrastText, 0.2),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                    }}
                  >
                    {timeRemaining}
                  </Box>

                  {/* Dismiss Button (DJ only) */}
                  {isDJ && (
                    <Button
                      size="small"
                      onClick={onDismissAnnouncement}
                      sx={{
                        minWidth: 'auto',
                        color: theme.palette.warning.contrastText,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.warning.contrastText, 0.1),
                        },
                      }}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Message */}
              <Typography
                variant="body1"
                sx={{
                  fontSize: '1.1rem',
                  lineHeight: 1.4,
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  mb: 1,
                }}
              >
                {announcement.message}
              </Typography>

              {/* DJ Attribution */}
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.8,
                  fontSize: '0.8rem',
                }}
              >
                — DJ {announcement.djName}
              </Typography>

              {/* Progress Bar */}
              <Box
                sx={{
                  mt: 2,
                  height: 4,
                  backgroundColor: alpha(theme.palette.warning.contrastText, 0.3),
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    backgroundColor: theme.palette.warning.contrastText,
                    borderRadius: 2,
                    transition: 'width 1s linear',
                    width: `${(timeRemaining / announcement.displayDuration) * 100}%`,
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Fade>
      )}

      {/* Create Announcement Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        TransitionComponent={SlideTransition}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FontAwesomeIcon icon={faBullhorn} style={{ color: theme.palette.warning.main }} />
          Make Announcement
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Send an important message to all singers. The announcement will be displayed prominently
            on everyone's screen for 10 seconds.
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Announcement Message"
            placeholder="e.g., Next song will be the final performance of the night!"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            onKeyPress={handleKeyPress}
            inputProps={{ maxLength: 200 }}
            helperText={`${announcementText.length}/200 characters`}
            sx={{ mt: 1 }}
          />

          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              <strong>Preview:</strong> Your announcement will appear at the top of everyone's
              screen with a countdown timer and will automatically dismiss after 10 seconds.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleSendAnnouncement}
            disabled={!announcementText.trim()}
            startIcon={<FontAwesomeIcon icon={faBullhorn} />}
          >
            Send Announcement
          </Button>
        </DialogActions>
      </Dialog>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}
      </style>
    </>
  );
};
