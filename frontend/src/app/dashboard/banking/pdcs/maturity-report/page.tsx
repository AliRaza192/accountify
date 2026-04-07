'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchPDCMaturityReport,
  depositPDC,
  type PDCMaturityItem,
} from '@/lib/api/bank-reconciliation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Landmark,
  Loader2,
  RotateCcw,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';

// Format date as DD/MM/YYYY
function formatDatePKR(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format PKR currency
function formatPKR(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Group PDCs by week
function groupByWeek(pdcs: PDCMaturityItem[]): Map<string, PDCMaturityItem[]> {
  const groups = new Map<string, PDCMaturityItem[]>();
  for (const pdc of pdcs) {
    const date = new Date(pdc.cheque_date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = formatDatePKR(weekStart.toISOString());
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(pdc);
  }
  return groups;
}

export default function PDCMaturityReportPage() {
  const router = useRouter();

  const [pdcs, setPdcs] = useState<PDCMaturityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysAhead, setDaysAhead] = useState(30);
  const [depositing, setDepositing] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [daysAhead]);

  async function loadReport() {
    try {
      setLoading(true);
      const data = await fetchPDCMaturityReport(daysAhead);
      setPdcs(data);
    } catch (error) {
      console.error('Error loading maturity report:', error);
      toast.error('Failed to load maturity report');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeposit(id: string) {
    try {
      setDepositing(id);
      await depositPDC(id);
      toast.success('PDC deposited successfully');
      loadReport();
    } catch (error) {
      console.error('Error depositing PDC:', error);
      toast.error('Failed to deposit PDC');
    } finally {
      setDepositing(null);
    }
  }

  // Compute summary stats
  const totalReceivable = pdcs
    .filter((p) => p.party_type === 'customer')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPayable = pdcs
    .filter((p) => p.party_type === 'vendor')
    .reduce((sum, p) => sum + p.amount, 0);

  const dueThisWeek = pdcs.filter((p) => p.days_until_maturity <= 7).length;
  const dueThisWeekAmount = pdcs
    .filter((p) => p.days_until_maturity <= 7)
    .reduce((sum, p) => sum + p.amount, 0);

  const dueNextWeeks = pdcs.filter(
    (p) => p.days_until_maturity > 7 && p.days_until_maturity <= daysAhead
  ).length;

  const groupedByWeek = groupByWeek(pdcs);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PDC Maturity Report</h1>
            <p className="text-muted-foreground mt-1">
              Upcoming post-dated cheque maturities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Show ahead:</Label>
            <Select
              value={String(daysAhead)}
              onValueChange={(v) => setDaysAhead(parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={loadReport} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dueThisWeek}</p>
                <p className="text-xs text-muted-foreground">Due This Week</p>
              </div>
            </div>
            <p className="text-sm font-mono mt-2">{formatPKR(dueThisWeekAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarDays className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dueNextWeeks}</p>
                <p className="text-xs text-muted-foreground">Due Later</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPKR(totalReceivable)}</p>
                <p className="text-xs text-muted-foreground">Receivable (Customers)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPKR(totalPayable)}</p>
                <p className="text-xs text-muted-foreground">Payable (Vendors)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Maturity Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Maturity Schedule</CardTitle>
          <CardDescription>
            {pdcs.length} PDCs maturing in the next {daysAhead} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pdcs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No PDCs maturing in the selected period
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grouped by week */}
              {Array.from(groupedByWeek.entries()).map(([weekStart, weekPdcs]) => (
                <div key={weekStart}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Week of {weekStart} ({weekPdcs.length} cheques, {formatPKR(weekPdcs.reduce((s, p) => s + p.amount, 0))})
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cheque Number</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Maturity Date</TableHead>
                        <TableHead>Days Left</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weekPdcs
                        .sort((a, b) => a.days_until_maturity - b.days_until_maturity)
                        .map((pdc) => (
                          <TableRow key={pdc.id}>
                            <TableCell className="font-medium">{pdc.cheque_number}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {pdc.cheque_date ? 'PDC' : '-'}
                            </TableCell>
                            <TableCell>{pdc.party_name}</TableCell>
                            <TableCell>
                              <Badge
                                variant={pdc.party_type === 'customer' ? 'default' : 'outline'}
                                className="text-xs"
                              >
                                {pdc.party_type === 'customer' ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {pdc.party_type === 'customer' ? 'Receivable' : 'Payable'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatPKR(pdc.amount)}
                            </TableCell>
                            <TableCell>{formatDatePKR(pdc.cheque_date)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  pdc.days_until_maturity <= 3
                                    ? 'destructive'
                                    : pdc.days_until_maturity <= 7
                                    ? 'secondary'
                                    : 'outline'
                                }
                              >
                                {pdc.days_until_maturity} days
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {pdc.status === 'pending' && pdc.days_until_maturity <= 7 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeposit(pdc.id)}
                                  disabled={depositing === pdc.id}
                                >
                                  {depositing === pdc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Landmark className="h-4 w-4 text-blue-600" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flat list fallback (always shown for reference) */}
      {!loading && pdcs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All PDCs (Flat View)</CardTitle>
            <CardDescription>
              Complete list sorted by maturity date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cheque Number</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Maturity Date</TableHead>
                  <TableHead>Days Until Maturity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...pdcs]
                  .sort((a, b) => a.days_until_maturity - b.days_until_maturity)
                  .map((pdc) => (
                    <TableRow key={pdc.id}>
                      <TableCell className="font-medium">{pdc.cheque_number}</TableCell>
                      <TableCell>{pdc.party_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={pdc.party_type === 'customer' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {pdc.party_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPKR(pdc.amount)}
                      </TableCell>
                      <TableCell>{formatDatePKR(pdc.cheque_date)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pdc.days_until_maturity <= 3
                              ? 'destructive'
                              : pdc.days_until_maturity <= 7
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {pdc.days_until_maturity} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pdc.status === 'pending'
                              ? 'secondary'
                              : pdc.status === 'deposited'
                              ? 'default'
                              : 'outline'
                          }
                        >
                          {pdc.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
