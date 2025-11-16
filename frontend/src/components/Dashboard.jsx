import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  People,
  AttachMoney,
  CheckCircle,
  Schedule,
  TrendingUp,
} from '@mui/icons-material';

const COLORS = ['#4CAF50', '#FFC107', '#F44336'];

const Dashboard = () => {
  const analytics = useSelector((state) => state.users.analytics);
  const users = useSelector((state) => state.users.users);

  if (!analytics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading analytics...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  const {
    counts_by_status,
    total_users,
    total_amount_owed,
    total_amount_collected,
    total_remaining,
    avg_overdue_days,
    timeline_data,
  } = analytics;

  const statusData = [
    { name: 'Pending', value: counts_by_status.pending || 0, color: COLORS[0] },
    { name: 'Ongoing', value: counts_by_status.ongoing || 0, color: COLORS[1] },
    { name: 'Finished', value: counts_by_status.finished || 0, color: COLORS[2] },
  ];

  const collectionRate =
    total_amount_owed > 0
      ? ((total_amount_collected / total_amount_owed) * 100).toFixed(1)
      : 0;

  // Prepare timeline chart data (group by date)
  const timelineMap = {};
  timeline_data?.forEach((item) => {
    const date = item.date;
    if (!timelineMap[date]) {
      timelineMap[date] = { date, amount: 0, count: 0 };
    }
    timelineMap[date].amount += item.amount || 0;
    timelineMap[date].count += 1;
  });
  const timelineChartData = Object.values(timelineMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 days

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Collections Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Overview of all users, collections status, and payment timeline
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <People color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">{total_users}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Users
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoney color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">{formatCurrency(total_amount_owed)}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Amount Owed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">{formatCurrency(total_amount_collected)}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Amount Collected
              </Typography>
              <Typography variant="caption" color="success.main">
                {collectionRate}% collection rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">{formatCurrency(total_remaining)}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Remaining Amount
              </Typography>
              {avg_overdue_days > 0 && (
                <Typography variant="caption" color="warning.main">
                  Avg {avg_overdue_days.toFixed(1)} days overdue
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Status Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Distribution
              </Typography>
              <Box sx={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ mt: 2 }}>
                {statusData.map((item) => (
                  <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          bgcolor: item.color,
                          borderRadius: '50%',
                          mr: 1,
                        }}
                      />
                      <Typography variant="body2">{item.name}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Timeline */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Timeline
              </Typography>
              {timelineChartData.length > 0 ? (
                <Box sx={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={timelineChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        labelStyle={{ fontSize: 12 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#4CAF50"
                        strokeWidth={2}
                        name="Amount Collected"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No payment data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Payments Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Payments
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Installment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {timeline_data && timeline_data.length > 0 ? (
                      timeline_data
                        .slice(-10)
                        .reverse()
                        .map((payment, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{payment.date}</TableCell>
                            <TableCell>{payment.user_name}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(payment.amount || 0)}
                            </TableCell>
                            <TableCell>
                              {payment.installment_number && (
                                <Chip
                                  label={`#${payment.installment_number}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No payment history available
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

