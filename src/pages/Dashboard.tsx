import { useQuery } from '@tanstack/react-query';
import { fetchRegistrations } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, CalendarDays, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = [
  'hsl(217, 89%, 61%)',
  'hsl(4, 82%, 56%)',
  'hsl(43, 96%, 50%)',
  'hsl(142, 69%, 45%)',
];

const Dashboard = () => {
  const { data: registrations, isLoading } = useQuery({
    queryKey: ['registrations'],
    queryFn: fetchRegistrations,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const regs = registrations ?? [];
  const totalRegistrations = regs.length;
  const day1Present = regs.filter((r) => r.day1Present).length;
  const day2Present = regs.filter((r) => r.day2Present).length;
  const attendanceRate = totalRegistrations > 0 ? Math.round(((day1Present + day2Present) / (totalRegistrations * 2)) * 100) : 0;

  const stats = [
    { label: 'Total Registrations', value: totalRegistrations, icon: Users, color: 'text-gdg-blue' },
    { label: 'Day 1 Present', value: day1Present, icon: UserCheck, color: 'text-gdg-green' },
    { label: 'Day 2 Present', value: day2Present, icon: CalendarDays, color: 'text-gdg-yellow' },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: TrendingUp, color: 'text-gdg-red' },
  ];

  // Department breakdown
  const deptMap = new Map<string, number>();
  regs.forEach((r) => {
    const dept = r.department || 'Unknown';
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  });
  const deptData = Array.from(deptMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Year breakdown
  const yearMap = new Map<string, number>();
  regs.forEach((r) => {
    const yr = r.year || 'Unknown';
    yearMap.set(yr, (yearMap.get(yr) ?? 0) + 1);
  });
  const yearData = Array.from(yearMap.entries()).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-heading font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-10 h-10 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">Registrations by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 25%, 10%)',
                    border: '1px solid hsl(220, 20%, 16%)',
                    borderRadius: '8px',
                    color: 'hsl(220, 10%, 92%)',
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {deptData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">Year Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={yearData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {yearData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
