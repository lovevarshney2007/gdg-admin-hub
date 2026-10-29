import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRegistrations } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserCheck, CalendarDays, TrendingUp, GraduationCap, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { getStudentDepartment, getStudentYear } from './UsersPage';

const COLORS = [
  'hsl(217, 89%, 61%)',  // GDG Blue
  'hsl(4, 82%, 56%)',    // GDG Red
  'hsl(43, 96%, 50%)',   // GDG Yellow
  'hsl(142, 69%, 45%)',  // GDG Green
  'hsl(280, 75%, 60%)',  // Purple
  'hsl(180, 70%, 45%)',  // Cyan
  'hsl(30, 90%, 55%)',   // Orange
  'hsl(330, 80%, 55%)',  // Pink
];

const Dashboard = () => {
  const [chartView, setChartView] = useState<'dept' | 'branch'>('dept');

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
  const attendanceRate = totalRegistrations > 0 ? Math.round((day1Present / totalRegistrations) * 100) : 0;

  // Year breakdown (26... = 1st Year, 25... = 2nd Year)
  const firstYearCount = regs.filter(r => r.studentNumber?.startsWith('26')).length;
  const secondYearCount = regs.filter(r => r.studentNumber?.startsWith('25')).length;
  const otherYearCount = totalRegistrations - firstYearCount - secondYearCount;

  const stats = [
    { label: 'Total Registrations', value: totalRegistrations, icon: Users, color: 'text-gdg-blue' },
    { label: '2nd Year (25...)', value: secondYearCount, icon: GraduationCap, color: 'text-purple-400' },
    { label: '1st Year (26...)', value: firstYearCount, icon: GraduationCap, color: 'text-blue-400' },
    { label: 'Verified (Email)', value: verifiedCount, icon: UserCheck, color: 'text-emerald-500' },
    { label: 'Event Check-In', value: day1Present, icon: CalendarDays, color: 'text-gdg-green' },
    { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: TrendingUp, color: 'text-gdg-red' },
  ];

  // 1. Department Breakdown (Mapped from branch / department)
  const deptMap = new Map<string, number>();
  regs.forEach((r) => {
    const dept = getStudentDepartment(r.branch, r.department);
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  });
  const deptData = Array.from(deptMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 2. Branch Breakdown
  const branchMap = new Map<string, number>();
  regs.forEach((r) => {
    const b = r.branch || 'Unknown';
    branchMap.set(b, (branchMap.get(b) ?? 0) + 1);
  });
  const branchData = Array.from(branchMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 3. Gender breakdown
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

  const activeChartData = chartView === 'dept' ? deptData : branchData;

  return (
    <div className="space-y-6">
      {/* Stats cards (Responsive Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{stat.label}</p>
                  <p className="text-2xl sm:text-3xl font-heading font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 sm:w-10 sm:h-10 ${stat.color} opacity-80 shrink-0`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analysis Section: Department & Branch Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department / Branch Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-2">
            <div>
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gdg-blue" />
                <span>{chartView === 'dept' ? 'Department-wise Analysis' : 'Branch-wise Analysis'}</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total {deptData.length} departments across {totalRegistrations} registered students
              </p>
            </div>
            <div className="flex gap-1.5 self-start sm:self-auto bg-muted/40 p-1 rounded-lg border border-border/40">
              <Button
                variant={chartView === 'dept' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartView('dept')}
                className="text-xs h-7 px-3"
              >
                Department
              </Button>
              <Button
                variant={chartView === 'branch' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartView('branch')}
                className="text-xs h-7 px-3"
              >
                Branch
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={activeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }} 
                  angle={-25} 
                  textAnchor="end" 
                  height={50} 
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(220, 25%, 10%)',
                    border: '1px solid hsl(220, 20%, 16%)',
                    borderRadius: '8px',
                    color: 'hsl(220, 10%, 92%)',
                  }}
                  formatter={(val: number) => [
                    `${val} students (${totalRegistrations > 0 ? Math.round((val / totalRegistrations) * 100) : 0}%)`,
                    'Count'
                  ]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {activeChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Summary Table / Cards */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base flex items-center justify-between">
              <span>Department Share</span>
              <span className="text-xs font-mono text-muted-foreground font-normal">
                {deptData.length} Depts
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {deptData.map((item, i) => {
                const pct = totalRegistrations > 0 ? Math.round((item.value / totalRegistrations) * 100) : 0;
                return (
                  <div key={item.name} className="flex flex-col gap-1 p-2 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold flex items-center gap-1.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: COLORS[i % COLORS.length] }} 
                        />
                        {item.name} Department
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {item.value} <span className="text-muted-foreground font-normal">({pct}%)</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${pct}%`, 
                          backgroundColor: COLORS[i % COLORS.length] 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Year & Gender Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Year Distribution Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-400" />
              <span>Year Distribution (1st vs 2nd Year)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-300">2nd Year (25...)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                  {totalRegistrations > 0 ? Math.round((secondYearCount / totalRegistrations) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-heading font-bold mt-2 text-white">{secondYearCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Sophomore Students</p>
            </div>

            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-300">1st Year (26...)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                  {totalRegistrations > 0 ? Math.round((firstYearCount / totalRegistrations) * 100) : 0}%
                </span>
              </div>
              <p className="text-3xl font-heading font-bold mt-2 text-white">{firstYearCount}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Freshman Students</p>
            </div>
          </CardContent>
        </Card>

        {/* Gender Distribution Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
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
