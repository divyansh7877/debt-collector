import React from 'react';
import { useDispatch } from 'react-redux';
import { AppBar, Box, Button, IconButton, TextField, Toolbar, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { clearSelection } from '../features/users/usersSlice.js';

const Header = ({ onOpenUpload, search, onSearchChange }) => {
  const dispatch = useDispatch();

  const handleHomeClick = () => {
    dispatch(clearSelection());
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <IconButton
          color="inherit"
          onClick={handleHomeClick}
          sx={{ mr: 2 }}
          aria-label="home"
        >
          <HomeIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={handleHomeClick}>
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
