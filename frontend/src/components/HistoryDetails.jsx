import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DollarSign,
  Calendar,
  Landmark,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Plus,
} from 'lucide-react';
import { updateStatus } from '../features/users/usersSlice.js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { getUser } from '../api/services.js';

const HistoryDetails = () => {
  const dispatch = useDispatch();
  const { selectedId } = useSelector((state) => state.users);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    installment_number: '',
    notes: '',
  });

  useEffect(() => {
    if (!selectedId) {
      setData(null);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await getUser(selectedId);
        console.log('API Response:', res); // Debug log
        if (res && res.data) {
          setData(res.data);
        } else {
          console.error('Invalid response structure:', res);
          setData(null);
        }
      } catch (e) {
        console.error('Failed to fetch entity details', e);
        setData(null);
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

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'ongoing':
        return 'default';
      case 'finished':
        return 'success'; // Need custom class for success
      default:
        return 'outline';
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

  const handleAddPayment = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${data.data.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          date: paymentForm.date,
          installment_number: paymentForm.installment_number ? parseInt(paymentForm.installment_number) : null,
          notes: paymentForm.notes,
        }),
      });

      if (response.ok) {
        setOpenPaymentDialog(false);
        setPaymentForm({
          amount: '',
          date: new Date().toISOString().split('T')[0],
          installment_number: '',
          notes: '',
        });
        // Refresh data
        const res = await getUser(selectedId);
        if (res && res.data) {
          setData(res.data);
        }
      } else {
        console.error('Failed to add payment');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  // Prepare payment timeline chart data (must be defined before any early returns)
  const timelineData = useMemo(() => {
    const paymentHistory = data?.data?.details?.payment_history || [];
    if (!paymentHistory.length) return [];

    return paymentHistory
      .map((p) => ({
        date: p.date,
        timestamp: new Date(p.date).getTime(),
        amount: p.amount,
        cumulative: paymentHistory
          .filter((x) => x.date <= p.date)
          .reduce((sum, x) => sum + (x.amount || 0), 0),
      }))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [data]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-muted-foreground">No data available</div>
    );
  }

  // Validate response structure
  if (!data.type || !data.data) {
    console.error('Invalid data structure:', data);
    return (
      <div className="p-6 space-y-2">
        <div className="text-destructive font-medium">Invalid data structure received</div>
        <div className="text-sm text-muted-foreground">
          Expected: {'{type, data, group?, members?}'}
        </div>
        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  const { type, data: entity, group, members } = data;

  if (!entity) {
    return (
      <div className="p-6 text-destructive">Entity data is missing</div>
    );
  }

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

  return (
    <div className="p-6 h-full overflow-auto space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">{entity.name}</h2>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(entity.status)} className="capitalize">
              {entity.status || 'pending'}
            </Badge>
            <Button
              size="sm"
              onClick={() => setOpenPaymentDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Payment
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to archive this user?')) {
                  dispatch(updateStatus({ id: entity.id, status: 'archived' }));
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          {type === 'user' ? 'User Details' : 'Group Details'} • ID: {entity.id}
        </p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Amount Owed
            </CardTitle>
            <Landmark className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(amountOwed)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Paid
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {collectionProgress.toFixed(1)}% collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Remaining Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(remainingAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Due Date
            </CardTitle>
            {isOverdue(dueDate) ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Calendar className="h-4 w-4 text-blue-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueDate ? formatDate(dueDate) : 'N/A'}</div>
            {overdueDays !== null && overdueDays > 0 && (
              <p className="text-xs text-destructive font-medium">
                {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collection Progress */}
      {amountOwed > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Collection Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-4">
              <Progress value={Math.min(collectionProgress, 100)} className="h-2" />
              <span className="text-sm font-medium w-12 text-right">{collectionProgress.toFixed(1)}%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(totalPaid)} of {formatCurrency(amountOwed)} collected
            </p>
          </CardContent>
        </Card>
      )}

      {/* Service Information */}
      {service && (
        <Card>
          <CardHeader>
            <CardTitle>Service Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{service}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <Accordion type="single" collapsible defaultValue="payment-history">
          <AccordionItem value="payment-history">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span>Payment History</span>
                <Badge variant="secondary">{paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6 pt-4">
                {/* Payment Timeline Chart */}
                {timelineData.length > 0 && (
                  <div className="h-[300px] w-full">
                    <h4 className="text-sm font-medium mb-4">Payment Timeline</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="timestamp"
                          type="number"
                          scale="time"
                          domain={['dataMin', 'dataMax']}
                          tickFormatter={(timestamp) => {
                            const date = new Date(timestamp);
                            return date.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            });
                          }}
                          className="text-xs"
                        />
                        <YAxis
                          tickFormatter={(value) => `$${value}`}
                          className="text-xs"
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(timestamp) => {
                            const date = new Date(timestamp);
                            return date.toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            });
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="cumulative"
                          stroke="#4CAF50"
                          strokeWidth={2}
                          name="Cumulative Amount"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Payment Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Installment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
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
                              <Badge variant="outline">
                                #{payment.installment_number || idx + 1}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(payment.date)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                                <CheckCircle className="mr-1 h-3 w-3" /> Paid
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Communication Preferences */}
      {Object.keys(communicationPrefs).length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="comm-prefs">
            <AccordionTrigger>Communication Preferences</AccordionTrigger>
            <AccordionContent>
              <div className="rounded-md border">
                <Table>
                  <TableBody>
                    {Object.entries(communicationPrefs).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>{String(value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Additional Details */}
      <Accordion type="single" collapsible>
        <AccordionItem value="additional-details">
          <AccordionTrigger>Additional Details</AccordionTrigger>
          <AccordionContent>
            <div className="rounded-md border">
              <Table>
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
                        <TableCell className="font-medium capitalize">
                          {key.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* History Text */}
      {historyText && (
        <Accordion type="single" collapsible>
          <AccordionItem value="history-text">
            <AccordionTrigger>History & Notes</AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted p-4 rounded-md whitespace-pre-wrap max-h-[400px] overflow-auto text-sm">
                {historyText}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Documents Section */}
      <Accordion type="single" collapsible>
        <AccordionItem value="documents">
          <AccordionTrigger>
            <div className="flex items-center justify-between w-full pr-4">
              <span>Documents</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="relative"
                >
                  Upload File
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      const formData = new FormData();
                      formData.append('file', file);

                      try {
                        const response = await fetch(`http://localhost:8000/users/${entity.id}/documents`, {
                          method: 'POST',
                          body: formData,
                        });

                        if (response.ok) {
                          // Refresh data
                          const res = await getUser(selectedId);
                          if (res && res.data) {
                            setData(res.data);
                          }
                        } else {
                          console.error('Upload failed');
                        }
                      } catch (error) {
                        console.error('Error uploading file:', error);
                      }
                    }}
                  />
                </Button>
              </div>
              {entity.documents && entity.documents.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Uploaded At</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entity.documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>{doc.filename}</TableCell>
                          <TableCell>{doc.file_type || 'N/A'}</TableCell>
                          <TableCell>{new Date(doc.uploaded_at).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No documents uploaded yet.
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Group Information */}
      {type === 'user' && group && (
        <Card>
          <CardHeader>
            <CardTitle>Group Membership</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{group.name}</Badge>
          </CardContent>
        </Card>
      )}

      {type === 'group' && members && members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Group Members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <Badge key={m.id} variant="outline">{m.name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  className="pl-6"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="installment">Installment Number (Optional)</Label>
              <Input
                id="installment"
                type="number"
                value={paymentForm.installment_number}
                onChange={(e) => setPaymentForm({ ...paymentForm, installment_number: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
            <Button
              onClick={handleAddPayment}
              disabled={!paymentForm.amount || !paymentForm.date}
            >
              Add Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistoryDetails;
