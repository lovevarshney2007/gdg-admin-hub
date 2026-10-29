import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRegistrations, blockIP, type Registration } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, ChevronLeft, ChevronRight, CheckCircle2, ShieldBan, Loader2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 15;
const CHECKS_STORAGE_KEY = 'gdg_admin_user_checks';

// Helper to determine year based on student number
export const getStudentYear = (studentNumber?: string): string => {
  if (!studentNumber) return 'Unknown';
  const clean = studentNumber.trim();
  if (clean.startsWith('26')) return '1st Year';
  if (clean.startsWith('25')) return '2nd Year';
  return 'Other';
};

// Helper to map branch to department
export const getStudentDepartment = (branch?: string, department?: string): string => {
  if (department && department.trim() && department !== 'Unknown' && department !== '-') {
    return department.trim();
  }
  if (!branch) return 'Unknown';
  const b = branch.toUpperCase().trim();
  if (b.startsWith('CSE') || b === 'CSE') return 'CSE';
  if (b === 'IT' || b === 'CSIT') return 'IT';
  if (b === 'CS') return 'CS';
  if (b === 'AIML') return 'AIML';
  if (b === 'ECE') return 'ECE';
  if (b === 'EN') return 'EN';
  if (b === 'ME') return 'ME';
  if (b.includes('CIVIL')) return 'Civil';
  return b;
};

const UsersPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterResidence, setFilterResidence] = useState<string>('all');
  const queryClient = useQueryClient();
  
  const blockMutation = useMutation({
    mutationFn: ({ ip, reason }: { ip: string; reason: string }) => blockIP(ip, reason),
    onSuccess: () => {
      toast.success('IP blocked successfully');
      queryClient.invalidateQueries({ queryKey: ['blockedIPs'] });
    },
    onError: () => {
      toast.error('Failed to block IP');
    },
  });
  
  // Local state for checkboxes, initialized from localStorage
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(CHECKS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const { data: registrations, isLoading } = useQuery({
    queryKey: ['registrations'],
    queryFn: fetchRegistrations,
  });

  const filtered = (registrations ?? []).filter((r) => {
    const q = search.toLowerCase();
    const dept = getStudentDepartment(r.branch, r.department);
    const year = getStudentYear(r.studentNumber);

    const matchesSearch = (
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.studentNumber?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.branch?.toLowerCase().includes(q) ||
      r.domain?.toLowerCase().includes(q) ||
      dept.toLowerCase().includes(q)
    );

    // Filter Year: 26 -> 1st Year, 25 -> 2nd Year
    const matchesYear = filterYear === 'all' ||
      (filterYear === '1st' && r.studentNumber?.startsWith('26')) ||
      (filterYear === '2nd' && r.studentNumber?.startsWith('25'));

    // Filter Department
    const matchesDepartment = filterDepartment === 'all' || dept.toLowerCase() === filterDepartment.toLowerCase();

    // Filter Gender & Residence
    const matchesGender = filterGender === 'all' || r.gender?.toLowerCase() === filterGender.toLowerCase();
    const matchesResidence = filterResidence === 'all' || r.residence?.toLowerCase() === filterResidence.toLowerCase();

    return matchesSearch && matchesYear && matchesDepartment && matchesGender && matchesResidence;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleCheck = (id: string) => {
    const newMap = { ...checkedMap, [id]: !checkedMap[id] };
    setCheckedMap(newMap);
    localStorage.setItem(CHECKS_STORAGE_KEY, JSON.stringify(newMap));
  };

  const exportCSV = () => {
    const headers = [
      'S.No', 'Verified (Export)', 'Name', 'Email', 'Phone', 'Student Number', 
      'Year', 'Department', 'Branch', 'Domain', 'Gender', 'Residence', 
      'GitHub ID', 'HackerRank ID', 'Unstop ID', 'Verified (System)', 'IP Address', 
      'Registered At', 'Day 1', 'Day 2', 'Day 3'
    ];
    const rows = filtered.map((r, index) => [
      index + 1,
      checkedMap[r.studentNumber] ? 'YES' : 'NO',
      r.name, r.email, r.phone, r.studentNumber,
      getStudentYear(r.studentNumber),
      getStudentDepartment(r.branch, r.department),
      r.branch || '', r.domain || '', r.gender || '', r.residence || '', 
      r.githubId || '', r.hackerrankId || '', r.unstopId || '',
      r.isVerified ? 'YES' : 'NO', r.ipAddress || '', 
      r.registeredAt ? new Date(r.registeredAt).toLocaleString() : '',
      r.isPresentDay1 ? 'Present' : 'Absent',
      r.isPresentDay2 ? 'Present' : 'Absent',
      r.isPresentDay3 ? 'Present' : 'Absent',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gdg-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Header (Fully Responsive) */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
        <div className="flex flex-col lg:flex-row flex-wrap gap-2.5 items-stretch lg:items-center w-full xl:w-auto">
          {/* Search Bar */}
          <div className="relative w-full sm:w-72 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, roll #, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
            {/* Year Filter: 26 -> 1st Year, 25 -> 2nd Year */}
            <Select value={filterYear} onValueChange={(val) => { setFilterYear(val); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[140px] font-medium">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="1st">1st Year (26...)</SelectItem>
                <SelectItem value="2nd">2nd Year (25...)</SelectItem>
              </SelectContent>
            </Select>

            {/* Department Filter */}
            <Select value={filterDepartment} onValueChange={(val) => { setFilterDepartment(val); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[150px] font-medium">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                <SelectItem value="cse">CSE</SelectItem>
                <SelectItem value="it">IT</SelectItem>
                <SelectItem value="cs">CS</SelectItem>
                <SelectItem value="aiml">AIML</SelectItem>
                <SelectItem value="ece">ECE</SelectItem>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="me">ME</SelectItem>
                <SelectItem value="civil">Civil</SelectItem>
              </SelectContent>
            </Select>

            {/* Gender Filter */}
            <Select value={filterGender} onValueChange={(val) => { setFilterGender(val); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>

            {/* Residence Filter */}
            <Select value={filterResidence} onValueChange={(val) => { setFilterResidence(val); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[135px]">
                <SelectValue placeholder="Residence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Residence</SelectItem>
                <SelectItem value="hosteller">Hosteller</SelectItem>
                <SelectItem value="day scholar">Day Scholar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
          <span className="text-xs text-muted-foreground font-mono">
            {filtered.length} found
          </span>
          <Button variant="outline" onClick={exportCSV} className="gap-2 shrink-0">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-12 px-2 text-center">
                    <CheckCircle2 className="w-4 h-4 mx-auto text-muted-foreground" />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll # / Year</TableHead>
                  <TableHead>Dept / Branch</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Gender &amp; Residence</TableHead>
                  <TableHead className="text-center">Day 1</TableHead>
                  <TableHead className="text-center">Day 2</TableHead>
                  <TableHead className="text-center">Day 3</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      No registrations found matching the filters
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((r, index) => {
                    const year = getStudentYear(r.studentNumber);
                    const dept = getStudentDepartment(r.branch, r.department);

                    return (
                      <TableRow key={r._id || r.id || r.studentNumber}>
                        <TableCell className="text-muted-foreground text-xs">
                          {page * PAGE_SIZE + index + 1}
                        </TableCell>
                        <TableCell className="text-center px-2">
                          <Checkbox 
                            checked={!!checkedMap[r.studentNumber]}
                            onCheckedChange={() => toggleCheck(r.studentNumber)}
                            className="data-[state=checked]:bg-success data-[state=checked]:border-success transition-colors"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm flex items-center gap-1.5">
                            {r.name}
                            {r.isVerified && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-mono font-medium">
                                Verified
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{r.email}</div>
                          {r.phone && <div className="text-[11px] text-muted-foreground font-mono">{r.phone}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm font-semibold">{r.studentNumber}</div>
                          <span
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5 ${
                              r.studentNumber?.startsWith('26')
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : r.studentNumber?.startsWith('25')
                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {year}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-xs text-foreground">{r.branch || '-'}</div>
                          <span className="text-[11px] text-muted-foreground">{dept} Dept</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">{r.domain || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">{r.gender || '-'}</div>
                          <div className="text-[11px] text-muted-foreground">{r.residence || '-'}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <AttendanceBadge present={r.isPresentDay1} />
                        </TableCell>
                        <TableCell className="text-center">
                          <AttendanceBadge present={r.isPresentDay2} />
                        </TableCell>
                        <TableCell className="text-center">
                          <AttendanceBadge present={r.isPresentDay3} />
                        </TableCell>
                        <TableCell className="text-right">
                          {r.ipAddress && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              disabled={blockMutation.isPending}
                              onClick={() => blockMutation.mutate({ ip: r.ipAddress! as string, reason: `Blocked manually for ${r.name}` })}
                              title="Block IP"
                            >
                              <ShieldBan className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length} registrations
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <span className="text-xs font-mono">Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const AttendanceBadge = ({ present }: { present: boolean }) => (
  <Badge variant={present ? 'default' : 'secondary'} className={present ? 'bg-success text-success-foreground font-semibold' : ''}>
    {present ? 'Present' : 'Absent'}
  </Badge>
);

export default UsersPage;
