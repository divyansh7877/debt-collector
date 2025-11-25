import React from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton"

const COLORS = ['#4CAF50', '#FFC107', '#F44336'];

const AnalyticsCard = () => {
  const analytics = useSelector((state) => state.users.analytics);

  if (!analytics) {
    return (
      <Card className="mb-4">
        <CardContent className="p-6">
          <Skeleton className="h-[200px] w-full" />
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
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Status Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[200px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                outerRadius={60}
                cx="50%"
                cy="50%"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsCard;
