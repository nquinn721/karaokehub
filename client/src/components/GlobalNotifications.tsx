import { faCheck, faExclamationTriangle, faInfo, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, Snackbar } from '@mui/material';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { uiStore } from '../stores';

const GlobalNotifications: React.FC = observer(() => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return faCheck;
      case 'error':
        return faTimes;
      case 'warning':
        return faExclamationTriangle;
      case 'info':
      default:
        return faInfo;
    }
  };

  return (
    <>
      {uiStore.notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={5000}
          onClose={() => uiStore.removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{
            '& .MuiSnackbar-root': {
              position: 'relative',
            },
          }}
        >
          <Alert
            onClose={() => uiStore.removeNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            icon={<FontAwesomeIcon icon={getIcon(notification.type)} />}
            sx={{
              borderRadius: 2,
              fontWeight: 500,
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
});

export default GlobalNotifications;
