'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchCashPosition, fetchPDCs, fetchReconciliationSessions } from '@/lib/api/bank-reconciliation';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Wallet, FileText, AlertCircle } from 'lucide-react';

export default function BankingDashboard() {
  const router = useRouter();
  const [cashPosition, setCashPosition] = useState<any>(null);
  const [pdcReceivable, setPdcReceivable] = useState<number>(0);
  const [pdcPayable, setPdcPayable] = useState<number>(0);
  const [pendingReconciliations, setPendingReconciliations] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [cashData, pdcData, reconData] = await Promise.all([
        fetchCashPosition(),
        Promise.all([
          fetchPDCs('pending', 'customer'),
          fetchPDCs('pending', 'vendor'),
        ]),
        fetchReconciliationSessions(undefined, 'in_progress'),
      ]);
      
      setCashPosition(cashData);
      setPdcReceivable(pdcData[0].reduce((sum, pdc) => sum + pdc.amount, 0));
      setPdcPayable(pdcData[1].reduce((sum, pdc) => sum + pdc.amount, 0));
      setPendingReconciliations(reconData.length);
    } catch (error) {
      console.error('Error loading banking data:', error);
      toast.error('Failed to load banking data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Banking Overview</h1>
        <p className="text-muted-foreground">
          Manage bank accounts, reconciliation, and PDCs
        </p>
      </div>

      {/* Cash Position Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash at Bank</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PKR {cashPosition?.total_cash_at_bank?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {cashPosition?.bank_accounts?.length || 0} active accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PDCs Receivable</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              PKR {pdcReceivable.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Customer cheques pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PDCs Payable</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              PKR {pdcPayable.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Vendor cheques pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Position</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (cashPosition?.net_cash_position || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              PKR {cashPosition?.net_cash_position?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total liquidity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => router.push('/dashboard/banking/reconciliation')} className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Bank Reconciliation
            </Button>
            <Button onClick={() => router.push('/dashboard/banking/pdcs')} variant="outline" className="w-full">
              Manage PDCs
            </Button>
            <Button onClick={() => router.push('/dashboard/banking/pdcs/new')} variant="outline" className="w-full">
              Add New PDC
            </Button>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingReconciliations > 0 && (
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="font-medium text-yellow-800">Pending Reconciliations</p>
                  <p className="text-sm text-yellow-600">
                    {pendingReconciliations} reconciliation(s) in progress
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/dashboard/banking/reconciliation')}
                >
                  View
                </Button>
              </div>
            )}
            
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium text-red-800">PDCs Due Soon</p>
                <p className="text-sm text-red-600">
                  Cheques maturing in next 7 days
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/banking/pdcs')}
              >
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashPosition?.bank_accounts?.map((account: any) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.bank_name}</TableCell>
                  <TableCell>{account.account_number}</TableCell>
                  <TableCell>{account.currency}</TableCell>
                  <TableCell className="text-right">
                    PKR {account.balance.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/banking/reconciliation?account=${account.id}`)}
                    >
                      Reconcile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
