import React from 'react';
import { Box, Typography } from '@mui/material';

const Analytics: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics
      </Typography>
      <Typography color="text.secondary">
        Financial analytics and charts coming soon...
      </Typography>
    </Box>
  );
};

export default Analytics;