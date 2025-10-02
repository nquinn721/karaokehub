/**
 * CustomModal Component
 * A reusable modal component with glass morphism styling
 */

import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Backdrop, Box, IconButton, Modal, Typography } from '@mui/material';
import React from 'react';

interface CustomModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string | number;
  hideCloseButton?: boolean;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 600,
  hideCloseButton = false,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth,
          maxHeight: '90vh',
          overflow: 'auto',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 45px rgba(0, 0, 0, 0.2)',
          outline: 'none',
          p: 0,
        }}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 3,
              pb: title ? 2 : 3,
              borderBottom: title ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
            }}
          >
            {title && (
              <Typography
                variant="h6"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                }}
              >
                {title}
              </Typography>
            )}

            {!hideCloseButton && (
              <IconButton
                onClick={onClose}
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  ml: title ? 2 : 0,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                  },
                }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </IconButton>
            )}
          </Box>
        )}

        {/* Content */}
        <Box
          sx={{
            p: 3,
            pt: title ? 3 : 3,
          }}
        >
          {children}
        </Box>
      </Box>
    </Modal>
  );
};
