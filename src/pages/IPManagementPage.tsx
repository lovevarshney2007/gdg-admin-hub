import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBlockedIPs, blockIP, unblockIP } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldBan, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const IPManagementPage = () => {
  const [newIP, setNewIP] = useState('');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const { data: blockedIPs, isLoading } = useQuery({
    queryKey: ['blockedIPs'],
    queryFn: fetchBlockedIPs,
  });

  const blockMutation = useMutation({
    mutationFn: ({ ip, reason }: { ip: string; reason: string }) => blockIP(ip, reason),
    onSuccess: () => {
      toast.success('IP blocked successfully');
      setNewIP('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['blockedIPs'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to block IP');
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => unblockIP(id),
    onSuccess: () => {
      toast.success('IP unblocked');
      queryClient.invalidateQueries({ queryKey: ['blockedIPs'] });
    },
    onError: () => {
      toast.error('Failed to unblock IP');
    },
  });

  const handleBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIP.trim()) return;
    blockMutation.mutate({ ip: newIP.trim(), reason: reason.trim() });
  };

  const ips = (blockedIPs as any[]) ?? [];

  return (
    <div className="space-y-6">
      {/* Block new IP */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <ShieldBan className="w-5 h-5 text-destructive" />
            Block IP Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBlock} className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="IP address (e.g., 192.168.1.1)"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              className="sm:max-w-xs"
            />
            <Input
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="sm:max-w-xs"
            />
            <Button type="submit" variant="destructive" disabled={blockMutation.isPending} className="gap-2">
              {blockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Block
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Blocked IPs list */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Blocked IPs
            {ips.length > 0 && (
              <Badge variant="secondary" className="ml-2">{ips.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Blocked At</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : ips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No blocked IPs
                  </TableCell>
                </TableRow>
              ) : (
                ips.map((ip: any) => (
                  <TableRow key={ip.id || ip.ip}>
                    <TableCell className="font-mono">{ip.ip}</TableCell>
                    <TableCell className="text-muted-foreground">{ip.reason || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ip.blockedAt ? new Date(ip.blockedAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => unblockMutation.mutate(ip.id)}
                        disabled={unblockMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
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

export default IPManagementPage;
