import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AttachMoney,
  CalendarToday,
  AccountBalance,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { getUser } from '../api/services.js';

const HistoryDetails = () => {
  const { selectedId } = useSelector((state) => state.users);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setData(null);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await getUser(selectedId);
        setData(res.data);
      } catch (e) {
        console.error('Failed to fetch entity details', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedId]);

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'ongoing':
        return 'info';
      case 'finished':
        return 'success';
      default:
        return 'default';
    }
  };

  const calculateOverdueDays = (dueDate) => {
    if (!dueDate) return null;
    try {
      const due = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      const diffTime = today - due;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return null;
    }
  };

  const isOverdue = (dueDate) => {
    const days = calculateOverdueDays(dueDate);
    return days !== null && days > 0;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading user details...</Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">No data available</Typography>
      </Box>
    );
  }

  const { type, data: entity, group, members } = data;
  const details = entity.details || {};
  const historyText = details.history_text;
  const paymentHistory = details.payment_history || [];
  const amountOwed = details.amount_owed || 0;
  const totalPaid = details.total_paid || 0;
  const remainingAmount = details.remaining_amount || amountOwed - totalPaid;
  const dueDate = details.due_date;
  const service = details.service;
  const communicationPrefs = details.communication_preferences || {};

  const overdueDays = calculateOverdueDays(dueDate);
  const collectionProgress = amountOwed > 0 ? (totalPaid / amountOwed) * 100 : 0;

  // Prepare payment timeline chart data
  const timelineData = useMemo(() => {
    if (!paymentHistory.length) return [];
    return paymentHistory
      .map((p) => ({
        date: p.date,
        amount: p.amount,
        cumulative: paymentHistory
          .filter((x) => x.date <= p.date)
          .reduce((sum, x) => sum + (x.amount || 0), 0),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [paymentHistory]);

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h4">{entity.name}</Typography>
          <Chip
            label={entity.status || 'pending'}
            color={getStatusColor(entity.status)}
            size="medium"
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {type === 'user' ? 'User Details' : 'Group Details'} • ID: {entity.id}
        </Typography>
      </Box>

      {/* Financial Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalance color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">{formatCurrency(amountOwed)}</Typography>
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
                <Typography variant="h6">{formatCurrency(totalPaid)}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Paid
              </Typography>
              <Typography variant="caption" color="success.main">
                {collectionProgress.toFixed(1)}% collected
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoney color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">{formatCurrency(remainingAmount)}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Remaining Amount
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {isOverdue(dueDate) ? (
                  <Warning color="error" sx={{ mr: 1 }} />
                ) : (
                  <CalendarToday color="info" sx={{ mr: 1 }} />
                )}
                <Typography variant="h6">
                  {dueDate ? formatDate(dueDate) : 'N/A'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Due Date
              </Typography>
              {overdueDays !== null && overdueDays > 0 && (
                <Typography variant="caption" color="error.main">
                  {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Collection Progress */}
      {amountOwed > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Collection Progress
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(collectionProgress, 100)}
                  sx={{ height: 10, borderRadius: 5 }}
                  color={collectionProgress >= 100 ? 'success' : 'primary'}
                />
              </Box>
              <Typography variant="body2" sx={{ minWidth: 60 }}>
                {collectionProgress.toFixed(1)}%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(totalPaid)} of {formatCurrency(amountOwed)} collected
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Service Information */}
      {service && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Service Information
            </Typography>
            <Typography variant="body1">{service}</Typography>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <Accordion defaultExpanded sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Typography variant="h6">Payment History</Typography>
              <Chip
                label={`${paymentHistory.length} payment${paymentHistory.length !== 1 ? 's' : ''}`}
                size="small"
                sx={{ ml: 2 }}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Payment Timeline Chart */}
              {timelineData.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Payment Timeline
                  </Typography>
                  <Box sx={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                      <LineChart data={timelineData}>
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
                          dataKey="cumulative"
                          stroke="#4CAF50"
                          strokeWidth={2}
                          name="Cumulative Amount"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
              )}

              {/* Payment Table */}
              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Installment</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentHistory
                        .sort((a, b) => {
                          const dateA = a.date || '';
                          const dateB = b.date || '';
                          return dateA.localeCompare(dateB);
                        })
                        .map((payment, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Chip
                                label={`#${payment.installment_number || idx + 1}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{formatDate(payment.date)}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold">
                                {formatCurrency(payment.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label="Paid"
                                size="small"
                                color="success"
                                icon={<CheckCircle />}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Communication Preferences */}
      {Object.keys(communicationPrefs).length > 0 && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Communication Preferences</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Table size="small">
              <TableBody>
                {Object.entries(communicationPrefs).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>{String(value)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Additional Details */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Additional Details</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Table size="small">
            <TableBody>
              {Object.entries(details)
                .filter(
                  ([key]) =>
                    ![
                      'history_text',
                      'payment_history',
                      'amount_owed',
                      'total_paid',
                      'remaining_amount',
                      'due_date',
                      'service',
                      'communication_preferences',
                    ].includes(key),
                )
                .map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </TableCell>
                  </TableRow>
                ))}
              {Object.entries(details).filter(
                ([key]) =>
                  ![
                    'history_text',
                    'payment_history',
                    'amount_owed',
                    'total_paid',
                    'remaining_amount',
                    'due_date',
                    'service',
                    'communication_preferences',
                  ].includes(key),
              ).length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No additional details available
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>

      {/* History Text */}
      {historyText && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">History & Notes</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
              {historyText}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Group Information */}
      {type === 'user' && group && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Group Membership
            </Typography>
            <Chip label={group.name} color="primary" />
          </CardContent>
        </Card>
      )}

      {type === 'group' && members && members.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Group Members ({members.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {members.map((m) => (
                <Chip key={m.id} label={m.name} variant="outlined" />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default HistoryDetails;
