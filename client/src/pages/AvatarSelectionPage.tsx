import { Box } from '@mui/material';
import React from 'react';
import AvatarSelector from '../components/AvatarSelector';

const AvatarSelectionPage: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
      <AvatarSelector />
    </Box>
  );
};

export default AvatarSelectionPage;
