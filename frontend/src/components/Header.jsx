import React from 'react';
import { AppBar, Box, Button, TextField, Toolbar, Typography } from '@mui/material';

const Header = ({ onOpenUpload, search, onSearchChange }) => {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Collections App
        </Typography>
        <Box sx={{ mr: 2, width: 300 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search users/groups"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </Box>
        <Button color="inherit" variant="outlined" onClick={onOpenUpload}>
          Add Users / Upload CSV
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
