import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAttendance } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, CameraOff, CheckCircle2, XCircle, AlertCircle, Loader2, Hash, X } from 'lucide-react';
import { toast } from 'sonner';

interface ScanResult {
  studentNumber: string;
  name?: string;
  branch?: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

interface LatestScan {
  studentNumber: string;
  name?: string;
  branch?: string;
  success: boolean;
  message: string;
  day: 1 | 2 | 3;
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
  const [latestScan, setLatestScan] = useState<LatestScan | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<Record<string, number>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    dayRef.current = day;
    localStorage.setItem('gdg_scanner_day', day.toString());
  }, [day]);

  // Auto-dismiss top scan alert after 7 seconds
  useEffect(() => {
    if (!latestScan) return;
    const timer = setTimeout(() => {
      setLatestScan(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [latestScan]);

  const mutation = useMutation({
    mutationFn: ({ studentNumber, d }: { studentNumber: string; d: 1 | 2 | 3 }) =>
      markAttendance(studentNumber, d),
    onSuccess: (data: any, vars) => {
      const studentName = data?.data?.name || '';
      const studentBranch = data?.data?.branch || '';
      const msg = data?.message || `Day ${vars.d} attendance marked successfully!`;

      const result: ScanResult = {
        studentNumber: vars.studentNumber,
        name: studentName,
        branch: studentBranch,
        success: true,
        message: msg,
        timestamp: new Date(),
      };
      setHistory((prev) => [result, ...prev]);

      setLatestScan({
        studentNumber: vars.studentNumber,
        name: studentName,
        branch: studentBranch,
        success: true,
        message: msg,
        day: vars.d,
        timestamp: new Date(),
      });

      toast.success(msg, {
        description: studentName ? `${studentName} (${vars.studentNumber})` : vars.studentNumber,
        duration: 4000,
      });

      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
    onError: (err: any, vars) => {
      const errData = err?.response?.data;
      const msg = errData?.message || 'Failed to mark attendance';
      const studentName = errData?.data?.name || '';

      const result: ScanResult = {
        studentNumber: vars.studentNumber,
        name: studentName,
        success: false,
        message: msg,
        timestamp: new Date(),
      };
      setHistory((prev) => [result, ...prev]);

      setLatestScan({
        studentNumber: vars.studentNumber,
        name: studentName,
        success: false,
        message: msg,
        day: vars.d,
        timestamp: new Date(),
      });

      toast.error(msg, {
        description: studentName ? `${studentName} (${vars.studentNumber})` : vars.studentNumber,
        duration: 5000,
      });
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

  const isAlreadyMarked = latestScan && !latestScan.success && latestScan.message.toLowerCase().includes('already');

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* 🚀 PROMINENT TOP SCAN ALERT BANNER */}
      {latestScan && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            latestScan.success
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-900/40'
              : isAlreadyMarked
              ? 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-900/40'
              : 'bg-red-950/95 border-red-500 text-red-100 shadow-red-900/40'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
            <div
              className={`p-2.5 sm:p-3 rounded-full shrink-0 ${
                latestScan.success
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isAlreadyMarked
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {latestScan.success ? (
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
              ) : isAlreadyMarked ? (
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />
              ) : (
                <XCircle className="w-8 h-8 sm:w-10 sm:h-10" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading font-black text-lg sm:text-2xl tracking-wide uppercase">
                  {latestScan.success
                    ? 'Entry Approved'
                    : isAlreadyMarked
                    ? 'Already Marked'
                    : 'Entry Denied'}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-white/10 uppercase tracking-wider">
                  Day {latestScan.day}
                </span>
              </div>
              {latestScan.name && (
                <p className="text-base sm:text-xl font-bold mt-0.5 text-white truncate">
                  {latestScan.name}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm font-mono opacity-90">
                <span className="font-bold underline decoration-white/30">{latestScan.studentNumber}</span>
                {latestScan.branch && <span>• {latestScan.branch}</span>}
                <span>• {latestScan.timestamp.toLocaleTimeString()}</span>
              </div>
              <p className="text-xs sm:text-sm font-medium mt-1.5 opacity-90 leading-snug">
                {latestScan.message}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLatestScan(null)}
            className="self-end sm:self-center hover:bg-white/10 text-white shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Day selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/60 border border-border/50 p-3 sm:p-4 rounded-xl">
        <span className="text-sm font-medium text-muted-foreground">Marking attendance for:</span>
        <div className="flex gap-2">
          {([1, 2, 3] as const).map((d) => (
            <Button
              key={d}
              variant={day === d ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDay(d)}
              className={day === d ? 'font-bold' : ''}
            >
              Day {d}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="camera" className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="camera" className="gap-2">
            <Camera className="w-4 h-4" /> Camera Scanner
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Hash className="w-4 h-4" /> Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera">
          <Card className="glass-card overflow-hidden">
            <CardContent className="pt-6 space-y-4">
              <div
                id="qr-reader"
                className="mx-auto w-full max-w-sm rounded-xl overflow-hidden bg-muted/30 border border-border/50"
                style={{ minHeight: scanning ? '280px' : '0' }}
              />
              <div className="flex justify-center">
                {scanning ? (
                  <Button variant="destructive" onClick={stopScanner} className="gap-2 w-full sm:w-auto">
                    <CameraOff className="w-4 h-4" /> Stop Scanner
                  </Button>
                ) : (
                  <Button onClick={startScanner} className="gap-2 w-full sm:w-auto">
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
              <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Enter student number (e.g. 25153099)"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={mutation.isPending} className="gap-2 shrink-0">
                  {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Mark Present (Day {day})
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scan history */}
      {history.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="py-4">
            <CardTitle className="font-heading text-base flex items-center justify-between">
              <span>Recent Scan History</span>
              <Badge variant="outline" className="font-mono text-xs font-normal">
                {history.length} Scanned
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {history.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 border border-border/40 gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{item.studentNumber}</span>
                        {item.name && <span className="text-xs text-foreground/80 font-medium truncate">({item.name})</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.message}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">
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
