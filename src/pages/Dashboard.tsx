import { useQuery } from '@tanstack/react-query';
import { fetchRegistrations } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, CalendarDays, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = [
  'hsl(217, 89%, 61%)',  // GDG Blue
  'hsl(4, 82%, 56%)',    // GDG Red
  'hsl(43, 96%, 50%)',   // GDG Yellow
  'hsl(142, 69%, 45%)',  // GDG Green
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
  const verifiedCount = regs.filter((r) => r.isVerified).length;
  const day1Present = regs.filter((r) => r.isPresentDay1).length;
  const day2Present = regs.filter((r) => r.isPresentDay2).length;
  const day3Present = regs.filter((r) => r.isPresentDay3).length;
  const attendanceRate = totalRegistrations > 0 ? Math.round(((day1Present + day2Present + day3Present) / (totalRegistrations * 3)) * 100) : 0;

  const stats = [
    { label: 'Total Registrations', value: totalRegistrations, icon: Users, color: 'text-gdg-blue' },
    { label: 'Verified (Email)', value: verifiedCount, icon: UserCheck, color: 'text-emerald-500' },
    { label: 'Day 1 Present', value: day1Present, icon: CalendarDays, color: 'text-gdg-green' },
    { label: 'Day 2 Present', value: day2Present, icon: CalendarDays, color: 'text-gdg-yellow' },
    { label: 'Day 3 Present', value: day3Present, icon: CalendarDays, color: 'text-gdg-blue' },
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

  // Gender breakdown
  const genderMap = new Map<string, number>();
  regs.forEach((r) => {
    const gender = r.gender || 'Unknown';
    genderMap.set(gender, (genderMap.get(gender) ?? 0) + 1);
  });
  const genderData = Array.from(genderMap.entries()).map(([name, value]) => ({ name, value }));

  // Detailed Residence stats
  const femaleHostellers = regs.filter(r => r.gender === 'Female' && r.residence === 'Hosteller').length;
  const femaleDayScholars = regs.filter(r => r.gender === 'Female' && r.residence === 'Day Scholar').length;
  const maleHostellers = regs.filter(r => r.gender === 'Male' && r.residence === 'Hosteller').length;
  const maleDayScholars = regs.filter(r => r.gender === 'Male' && r.residence === 'Day Scholar').length;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
            <CardTitle className="font-heading text-base">Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {genderData.map((entry, i) => (
                    <Cell key={i} fill={entry.name === 'Male' ? COLORS[0] : entry.name === 'Female' ? COLORS[1] : COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Residence Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gdg-red" />
              Female Residence Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Hosteller</p>
              <p className="text-2xl font-heading font-bold">{femaleHostellers}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Day Scholar</p>
              <p className="text-2xl font-heading font-bold">{femaleDayScholars}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gdg-blue" />
              Male Residence Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Hosteller</p>
              <p className="text-2xl font-heading font-bold">{maleHostellers}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Day Scholar</p>
              <p className="text-2xl font-heading font-bold">{maleDayScholars}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
