import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Tab, Tabs, Typography } from '@mui/material';

import HistoryDetails from './HistoryDetails.jsx';
import StrategyPlanning from './StrategyPlanning.jsx';
import { fetchStrategy } from '../features/strategies/strategiesSlice.js';

const TabPanel = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index} style={{ height: '100%' }}>
      {value === index && <Box sx={{ p: 2, height: '100%' }}>{children}</Box>}
    </div>
  );
};

const MainContent = () => {
  const dispatch = useDispatch();
  const { selectedId, selectedType } = useSelector((state) => state.users);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (selectedId && selectedType === 'user') {
      dispatch(fetchStrategy(selectedId));
    }
  }, [dispatch, selectedId, selectedType]);

  if (!selectedId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Select a user from the left to begin.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tabs value={tab} onChange={(e, v) => setTab(v)}>
        <Tab label="History & Details" />
        <Tab label="Strategy Planning" />
      </Tabs>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <TabPanel value={tab} index={0}>
          <HistoryDetails />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <StrategyPlanning />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default MainContent;
