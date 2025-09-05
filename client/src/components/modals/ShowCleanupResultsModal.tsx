import { faCheckCircle, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from '@mui/material';
import React from 'react';
import CustomModal from '../CustomModal';

interface ShowCleanupResult {
  deleted: number;
  message: string;
  details: string[];
}

interface ShowCleanupResultsModalProps {
  open: boolean;
  onClose: () => void;
  result: ShowCleanupResult | null;
}

export const ShowCleanupResultsModal: React.FC<ShowCleanupResultsModalProps> = ({
  open,
  onClose,
  result,
}) => {
  const theme = useTheme();

  if (!result) return null;

  return (
    <CustomModal
      open={open}
      onClose={onClose}
      title="Show Cleanup Results"
      icon={<FontAwesomeIcon icon={faCheckCircle} />}
      maxWidth="md"
    >
      <Box sx={{ p: 3 }}>
        {/* Summary */}
        <Box
          sx={{
            p: 3,
            backgroundColor:
              result.deleted > 0
                ? theme.palette.success.main + '15'
                : theme.palette.info.main + '15',
            borderRadius: 2,
            mb: 3,
            border: `1px solid ${result.deleted > 0 ? theme.palette.success.main + '30' : theme.palette.info.main + '30'}`,
          }}
        >
          <Typography
            variant="h6"
            gutterBottom
            color={result.deleted > 0 ? 'success.main' : 'info.main'}
          >
            <FontAwesomeIcon
              icon={result.deleted > 0 ? faTrash : faCheckCircle}
              style={{ marginRight: 8 }}
            />
            Cleanup Complete
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {result.message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>{result.deleted}</strong> shows were deleted from the database
          </Typography>
        </Box>

        {/* Details */}
        {result.details && result.details.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Deleted Shows Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              The following shows were removed:
            </Typography>

            <List
              sx={{
                maxHeight: 400,
                overflow: 'auto',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              {result.details.map((detail, index) => (
                <ListItem
                  key={index}
                  sx={{
                    borderBottom:
                      index < result.details.length - 1
                        ? `1px solid ${theme.palette.divider}`
                        : 'none',
                  }}
                >
                  <ListItemIcon>
                    <FontAwesomeIcon
                      icon={faTrash}
                      style={{
                        color: theme.palette.error.main,
                        fontSize: '16px',
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={detail}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '0.875rem',
                        fontFamily: 'monospace',
                      },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {result.deleted === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              color: 'text.secondary',
            }}
          >
            <FontAwesomeIcon
              icon={faCheckCircle}
              style={{
                fontSize: '48px',
                marginBottom: '16px',
                color: theme.palette.success.main,
              }}
            />
            <Typography variant="h6" gutterBottom>
              No Issues Found
            </Typography>
            <Typography variant="body2">
              All shows have valid venues and DJs. Your database is clean!
            </Typography>
          </Box>
        )}
      </Box>
    </CustomModal>
  );
};

export default ShowCleanupResultsModal;
