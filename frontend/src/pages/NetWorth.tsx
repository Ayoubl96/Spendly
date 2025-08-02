import React from 'react';
import { Box, Typography } from '@mui/material';

const NetWorth: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Net Worth
      </Typography>
      <Typography color="text.secondary">
        Net worth tracking and asset management coming soon...
      </Typography>
    </Box>
  );
};

export default NetWorth;