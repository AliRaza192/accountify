'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getPOSDailySummary, getPOSCashierSummary, listPOSShifts } from '@/lib/api/pos';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';

export default function POSReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [cashierSummary, setCashierSummary] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'cashier' | 'shifts'>('daily');

  useEffect(() => {
    loadReports();
  }, [reportDate]);

  async function loadReports() {
    try {
      setLoading(true);
      const [daily, cashier, shiftsData] = await Promise.all([
        getPOSDailySummary(reportDate),
        getPOSCashierSummary(reportDate),
        listPOSShifts(reportDate, reportDate),
      ]);
      setDailySummary(daily);
      setCashierSummary(cashier);
      setShifts(shiftsData);
    } catch (error: any) {
      console.error('Error loading POS reports:', error);
      toast.error('Failed to load POS reports');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">POS Reports</h1>
        <p className="text-muted-foreground">
          Daily sales, cashier summaries, and shift reports
        </p>
      </div>

      {/* Date Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            <Button onClick={loadReports} disabled={loading}>
              <Calendar className="mr-2 h-4 w-4" />
              {loading ? 'Loading...' : 'Load Reports'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'daily' ? 'default' : 'outline'}
          onClick={() => setActiveTab('daily')}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Daily Summary
        </Button>
        <Button
          variant={activeTab === 'cashier' ? 'default' : 'outline'}
          onClick={() => setActiveTab('cashier')}
        >
          <Users className="mr-2 h-4 w-4" />
          Cashier Summary
        </Button>
        <Button
          variant={activeTab === 'shifts' ? 'default' : 'outline'}
          onClick={() => setActiveTab('shifts')}
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Shift Reports
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading reports...</div>
      ) : (
        <>
          {/* Daily Summary Tab */}
          {activeTab === 'daily' && dailySummary && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dailySummary.total_sales}</div>
                    <p className="text-xs text-muted-foreground">transactions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(dailySummary.total_amount)}
                    </div>
                    <p className="text-xs text-muted-foreground">revenue</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Date</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportDate}</div>
                    <p className="text-xs text-muted-foreground">report date</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(dailySummary.payment_methods || {}).map(([method, data]: [string, any]) => (
                        <TableRow key={method}>
                          <TableCell className="font-medium capitalize">{method}</TableCell>
                          <TableCell className="text-right">{data.count}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(data.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cashier Summary Tab */}
          {activeTab === 'cashier' && cashierSummary && (
            <Card>
              <CardHeader>
                <CardTitle>Cashier-Wise Summary - {reportDate}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cashier</TableHead>
                      <TableHead className="text-right">Shifts</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Opening Cash</TableHead>
                      <TableHead className="text-right">Expected Cash</TableHead>
                      <TableHead className="text-right">Actual Cash</TableHead>
                      <TableHead className="text-right">Difference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(cashierSummary.cashiers || []).map((cashier: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{cashier.cashier_id}</TableCell>
                        <TableCell className="text-right">{cashier.shifts}</TableCell>
                        <TableCell className="text-right">{cashier.total_sales}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cashier.opening_cash)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cashier.expected_cash)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(cashier.actual_cash)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={cashier.difference === 0 ? 'default' : 'destructive'}
                          >
                            {formatCurrency(cashier.difference)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Shift Reports Tab */}
          {activeTab === 'shifts' && (
            <Card>
              <CardHeader>
                <CardTitle>Shift Reports - {reportDate}</CardTitle>
              </CardHeader>
              <CardContent>
                {shifts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No shifts found for this date
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shift #</TableHead>
                        <TableHead>Cashier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Opening</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.map((shift: any) => (
                        <TableRow key={shift.id}>
                          <TableCell className="font-medium">{shift.shift_number}</TableCell>
                          <TableCell>{shift.cashier_name}</TableCell>
                          <TableCell>
                            <Badge
                              variant={shift.status === 'open' ? 'default' : 'secondary'}
                            >
                              {shift.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(shift.opening_cash)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(shift.expected_cash)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(shift.actual_cash)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={shift.difference === 0 ? 'default' : 'destructive'}
                            >
                              {formatCurrency(shift.difference)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(shift.total_amount)} ({shift.total_sales})
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
