import { faComments } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Fab, Tooltip } from '@mui/material';
import React, { useState } from 'react';
import FeedbackModal from './FeedbackModal';

interface FeedbackButtonProps {
  position?: 'fixed' | 'static';
  size?: 'small' | 'medium' | 'large';
}

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ position = 'fixed', size = 'medium' }) => {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <Tooltip title="Send Feedback" placement="left">
        <Fab
          color="primary"
          size={size}
          onClick={() => setFeedbackOpen(true)}
          sx={
            position === 'fixed'
              ? {
                  position: 'fixed',
                  bottom: 24,
                  right: 24,
                  zIndex: 1000,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    transform: 'scale(1.05)',
                  },
                  transition: 'transform 0.2s ease-in-out',
                }
              : {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  },
                }
          }
        >
          <FontAwesomeIcon icon={faComments} />
        </Fab>
      </Tooltip>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
};

export default FeedbackButton;
