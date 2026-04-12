import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRegistrations, blockIP, type Registration } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, ChevronLeft, ChevronRight, CheckCircle2, ShieldBan, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 15;
const CHECKS_STORAGE_KEY = 'gdg_admin_user_checks';

const UsersPage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
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
    return (
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.studentNumber?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.department?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleCheck = (id: string) => {
    const newMap = { ...checkedMap, [id]: !checkedMap[id] };
    setCheckedMap(newMap);
    localStorage.setItem(CHECKS_STORAGE_KEY, JSON.stringify(newMap));
  };

  const exportCSV = () => {
    const headers = ['S.No', 'Verified', 'Name', 'Email', 'Phone', 'Student Number', 'College', 'Year', 'Department', 'Day 1', 'Day 2', 'Day 3'];
    const rows = filtered.map((r, index) => [
      index + 1,
      checkedMap[r.studentNumber] ? 'YES' : 'NO',
      r.name, r.email, r.phone, r.studentNumber, r.college, r.year, r.department,
      r.isPresentDay1 ? 'Present' : 'Absent',
      r.isPresentDay2 ? 'Present' : 'Absent',
      r.isPresentDay3 ? 'Present' : 'Absent',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, student #..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportCSV} className="gap-2 flex-1 sm:flex-none">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-12 px-2 text-center">
                    <CheckCircle2 className="w-4 h-4 mx-auto text-muted-foreground" />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Student #</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Year</TableHead>
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
                      No registrations found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((r, index) => (
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
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                      <TableCell className="font-mono text-sm">{r.studentNumber}</TableCell>
                      <TableCell>{r.department}</TableCell>
                      <TableCell>{r.year}</TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filtered.length} registrations</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span>Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="icon" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const AttendanceBadge = ({ present }: { present: boolean }) => (
  <Badge variant={present ? 'default' : 'secondary'} className={present ? 'bg-success text-success-foreground' : ''}>
    {present ? 'Present' : 'Absent'}
  </Badge>
);

export default UsersPage;
