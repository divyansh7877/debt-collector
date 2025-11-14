import React from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#4CAF50', '#FFC107', '#F44336'];

const AnalyticsCard = () => {
  const analytics = useSelector((state) => state.users.analytics);

  if (!analytics) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2">Loading analytics...</Typography>
        </CardContent>
      </Card>
    );
  }

  const { counts_by_status } = analytics;
  const data = [
    { name: 'Pending', value: counts_by_status.pending || 0 },
    { name: 'Ongoing', value: counts_by_status.ongoing || 0 },
    { name: 'Finished', value: counts_by_status.finished || 0 },
  ];

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="subtitle2" gutterBottom>
          Status Overview
        </Typography>
        <Box sx={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={60}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default AnalyticsCard;
