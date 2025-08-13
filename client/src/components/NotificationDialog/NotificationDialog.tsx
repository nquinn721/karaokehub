import { faCheck, faExclamationTriangle, faInfo, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationDialogProps {
  open: boolean;
  onClose: () => void;
  type: NotificationType;
  title: string;
  message: string;
  actionText?: string;
}

export const NotificationDialog: React.FC<NotificationDialogProps> = ({
  open,
  onClose,
  type,
  title,
  message,
  actionText = 'OK',
}) => {
  const theme = useTheme();

  const getIcon = () => {
    switch (type) {
      case 'success':
        return { icon: faCheck, color: theme.palette.success.main };
      case 'error':
        return { icon: faTimes, color: theme.palette.error.main };
      case 'warning':
        return { icon: faExclamationTriangle, color: theme.palette.warning.main };
      case 'info':
      default:
        return { icon: faInfo, color: theme.palette.info.main };
    }
  };

  const { icon, color } = getIcon();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
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
          pb: 2,
        }}
      >
        <FontAwesomeIcon icon={icon} style={{ color, fontSize: '1.25rem' }} />
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Typography variant="body1" color="text.primary">
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose} variant="contained" size="large" sx={{ px: 4 }}>
          {actionText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
