import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Box, Grid, Typography } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { fetchUsers, fetchAnalytics } from './features/users/usersSlice.js';
import Header from './components/Header.jsx';
import LeftSidebar from './components/LeftSidebar.jsx';
import MainContent from './components/MainContent.jsx';
import UploadModal from './components/UploadModal.jsx';

const theme = createTheme({
  palette: {
    primary: { main: '#4CAF50' },
    error: { main: '#F44336' },
  },
});

const App = () => {
  const dispatch = useDispatch();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchAnalytics());
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <Header onOpenUpload={() => setUploadOpen(true)} search={search} onSearchChange={setSearch} />
        <Grid container sx={{ flex: 1, overflow: 'hidden' }}>
          <Grid item sx={{ width: 300, borderRight: 1, borderColor: 'divider', height: '100%' }}>
            <LeftSidebar search={search} />
          </Grid>
          <Grid item xs sx={{ height: '100%', overflow: 'hidden' }}>
            <MainContent />
          </Grid>
        </Grid>
        <Box component="footer" sx={{ p: 1, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption">Collections App prototype</Typography>
        </Box>
        <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      </Box>
    </ThemeProvider>
  );
};

export default App;
