import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAttendance } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, CameraOff, CheckCircle2, XCircle, Loader2, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface ScanResult {
  studentNumber: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

const ScannerPage = () => {
  const [scanning, setScanning] = useState(false);
  const [day, setDay] = useState<1 | 2 | 3>(() => {
    const saved = localStorage.getItem('gdg_scanner_day');
    if (saved === '1' || saved === '2' || saved === '3') return parseInt(saved) as 1 | 2 | 3;
    return 1;
  });
  const dayRef = useRef<1 | 2 | 3>(day);
  const [manualInput, setManualInput] = useState('');
  const [history, setHistory] = useState<ScanResult[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<Record<string, number>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    dayRef.current = day;
    localStorage.setItem('gdg_scanner_day', day.toString());
  }, [day]);

  const mutation = useMutation({
    mutationFn: ({ studentNumber, d }: { studentNumber: string; d: 1 | 2 | 3 }) =>
      markAttendance(studentNumber, d),
    onSuccess: (_, vars) => {
      const result: ScanResult = {
        studentNumber: vars.studentNumber,
        success: true,
        message: `Marked present for Day ${vars.d}`,
        timestamp: new Date(),
      };
      setHistory((prev) => [result, ...prev]);
      toast.success(`${vars.studentNumber} marked present for Day ${vars.d}`);
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
    onError: (err: any, vars) => {
      const msg = err?.response?.data?.message || 'Failed to mark attendance';
      const result: ScanResult = {
        studentNumber: vars.studentNumber,
        success: false,
        message: msg,
        timestamp: new Date(),
      };
      setHistory((prev) => [result, ...prev]);
      toast.error(msg);
    },
  });

  const handleScan = useCallback(
    (decodedText: string) => {
      const studentNumber = decodedText.trim();
      if (!studentNumber) return;

      const now = Date.now();
      const lastTime = lastScannedTimeRef.current[studentNumber] || 0;
      
      // Prevent duplicate scans within 3 seconds for the same student
      if (now - lastTime < 3000) return;
      
      lastScannedTimeRef.current[studentNumber] = now;
      mutation.mutate({ studentNumber, d: dayRef.current });
    },
    [mutation]
  );

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {}
      );
      setScanning(true);
    } catch (err) {
      toast.error('Failed to access camera. Ensure HTTPS and camera permissions.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop();
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    mutation.mutate({ studentNumber: manualInput.trim(), d: day });
    setManualInput('');
  };

  return (
    <div className="space-y-6">
      {/* Day selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Marking attendance for:</span>
        <div className="flex gap-2">
          <Button
            variant={day === 1 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDay(1)}
          >
            Day 1
          </Button>
          <Button
            variant={day === 2 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDay(2)}
          >
            Day 2
          </Button>
          <Button
            variant={day === 3 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDay(3)}
          >
            Day 3
          </Button>
        </div>
      </div>

      <Tabs defaultValue="camera" className="space-y-4">
        <TabsList>
          <TabsTrigger value="camera" className="gap-2">
            <Camera className="w-4 h-4" /> Camera
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Hash className="w-4 h-4" /> Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera">
          <Card className="glass-card">
            <CardContent className="pt-6 space-y-4">
              <div
                id="qr-reader"
                className="mx-auto max-w-sm rounded-lg overflow-hidden bg-muted/30"
                style={{ minHeight: scanning ? '300px' : '0' }}
              />
              <div className="flex justify-center">
                {scanning ? (
                  <Button variant="destructive" onClick={stopScanner} className="gap-2">
                    <CameraOff className="w-4 h-4" /> Stop Scanner
                  </Button>
                ) : (
                  <Button onClick={startScanner} className="gap-2">
                    <Camera className="w-4 h-4" /> Start Scanner
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <form onSubmit={handleManualSubmit} className="flex gap-3">
                <Input
                  placeholder="Enter student number"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="max-w-xs"
                />
                <Button type="submit" disabled={mutation.isPending} className="gap-2">
                  {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Mark Present
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scan history */}
      {history.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">Scan History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {item.success ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                    <div>
                      <span className="font-mono text-sm font-medium">{item.studentNumber}</span>
                      <p className="text-xs text-muted-foreground">{item.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScannerPage;
