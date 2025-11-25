import React from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  Users,
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';

const COLORS = ['#4CAF50', '#FFC107', '#F44336'];

const Dashboard = () => {
  const analytics = useSelector((state) => state.users.analytics);
  const users = useSelector((state) => state.users.users);

  if (!analytics) {
    return (
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
        </div>
      </div>
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
      timelineMap[date] = { date, timestamp: new Date(date).getTime(), amount: 0, count: 0 };
    }
    timelineMap[date].amount += item.amount || 0;
    timelineMap[date].count += 1;
  });
  const timelineChartData = Object.values(timelineMap)
    .sort((a, b) => a.timestamp - b.timestamp)
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
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Collections Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of all users, collections status, and payment timeline
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total_users}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Amount Owed
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(total_amount_owed)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Amount Collected
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(total_amount_collected)}</div>
            <p className="text-xs text-muted-foreground">
              {collectionRate}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Remaining Amount
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(total_remaining)}</div>
            {avg_overdue_days > 0 && (
              <p className="text-xs text-muted-foreground">
                Avg {avg_overdue_days.toFixed(1)} days overdue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Status Distribution */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
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
            </div>
          </CardContent>
        </Card>

        {/* Payment Timeline */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Payment Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {timelineChartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineChartData}>
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
                      dataKey="amount"
                      stroke="#4CAF50"
                      strokeWidth={2}
                      name="Amount Collected"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Installment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeline_data && timeline_data.length > 0 ? (
                timeline_data
                  .slice(-10)
                  .reverse()
                  .map((payment, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell>{payment.user_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(payment.amount || 0)}
                      </TableCell>
                      <TableCell>
                        {payment.installment_number && (
                          <Badge variant="outline">
                            #{payment.installment_number}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No payment history available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

