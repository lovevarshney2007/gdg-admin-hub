import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSuspiciousActivities, blockIP } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldBan, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const SuspiciousActivityPage = () => {
  const queryClient = useQueryClient();
  const { data: activities, isLoading } = useQuery({
    queryKey: ['suspiciousActivities'],
    queryFn: fetchSuspiciousActivities,
  });

  const blockMutation = useMutation({
    mutationFn: ({ ip, reason }: { ip: string; reason: string }) => blockIP(ip, reason),
    onSuccess: () => {
      toast.success('IP blocked successfully');
      queryClient.invalidateQueries({ queryKey: ['suspiciousActivities'] });
      queryClient.invalidateQueries({ queryKey: ['blockedIPs'] });
    },
    onError: () => {
      toast.error('Failed to block IP');
    },
  });

  const list = activities ?? [];

  return (
    <div className="space-y-6">
      <Card className="glass-card border-warning/20">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Detected Suspicious Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No suspicious activity detected
                  </TableCell>
                </TableRow>
              ) : (
                list.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        {item.type || 'Potential Threat'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{item.ipAddress}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.details}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        disabled={blockMutation.isPending}
                        onClick={() => blockMutation.mutate({ ip: item.ipAddress, reason: item.details })}
                      >
                        {blockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldBan className="w-4 h-4" />}
                        Block
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuspiciousActivityPage;
