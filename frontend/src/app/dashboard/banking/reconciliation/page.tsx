'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchBankAccounts,
  importBankStatement,
  fetchReconciliationSessions,
  startReconciliationSession,
  matchTransactions,
  completeReconciliation,
} from '@/lib/api/bank-reconciliation';
import { toast } from 'sonner';
import { Upload, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function BankReconciliationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [importData, setImportData] = useState({
    statement_date: new Date().toISOString().split('T')[0],
    opening_balance: '',
    closing_balance: '',
    file: null as File | null,
  });
  const [reconcilingSession, setReconcilingSession] = useState<any>(null);

  useEffect(() => {
    loadData();
    if (searchParams.get('account')) {
      setSelectedAccount(searchParams.get('account') || '');
    }
  }, [searchParams]);

  async function loadData() {
    try {
      setLoading(true);
      const [accountsData, sessionsData] = await Promise.all([
        fetchBankAccounts(),
        fetchReconciliationSessions(),
      ]);
      setAccounts(accountsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  }

  async function handleImportStatement() {
    try {
      if (!selectedAccount || !importData.file) {
        toast.error('Please select account and upload file');
        return;
      }

      await importBankStatement(
        selectedAccount,
        importData.statement_date,
        parseFloat(importData.opening_balance),
        parseFloat(importData.closing_balance),
        importData.file
      );
      toast.success('Bank statement imported successfully');
      setShowImportDialog(false);
      setImportData({
        statement_date: new Date().toISOString().split('T')[0],
        opening_balance: '',
        closing_balance: '',
        file: null,
      });
      loadData();
    } catch (error) {
      console.error('Error importing statement:', error);
      toast.error('Failed to import bank statement');
    }
  }

  async function handleStartReconciliation() {
    try {
      if (!selectedAccount) {
        toast.error('Please select a bank account');
        return;
      }

      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) return;

      const today = new Date();
      await startReconciliationSession({
        bank_account_id: selectedAccount,
        period_month: today.getMonth() + 1,
        period_year: today.getFullYear(),
        opening_balance: account.opening_balance,
        closing_balance_per_bank: account.current_balance,
      });
      toast.success('Reconciliation session started');
      loadData();
    } catch (error) {
      console.error('Error starting reconciliation:', error);
      toast.error('Failed to start reconciliation');
    }
  }

  async function handleCompleteSession(sessionId: string) {
    try {
      await completeReconciliation(sessionId);
      toast.success('Reconciliation completed successfully');
      loadData();
    } catch (error) {
      console.error('Error completing reconciliation:', error);
      toast.error('Failed to complete reconciliation');
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bank Reconciliation</h1>
        <p className="text-muted-foreground">
          Match bank statement transactions with system entries
        </p>
      </div>

      {/* Account Selection & Import */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Start Reconciliation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Bank Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bank_name} - {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowImportDialog(true)} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Import Bank Statement (CSV)
            </Button>
            <Button onClick={handleStartReconciliation} variant="outline" className="w-full">
              Start New Reconciliation
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Reconcile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-800">
                1
              </div>
              <div>
                <p className="font-medium">Import Bank Statement</p>
                <p className="text-sm text-muted-foreground">
                  Upload CSV file from your bank (HBL, UBL, MCB, etc.)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-800">
                2
              </div>
              <div>
                <p className="font-medium">Match Transactions</p>
                <p className="text-sm text-muted-foreground">
                  System auto-matches by amount and date. Manually match remaining.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-800">
                3
              </div>
              <div>
                <p className="font-medium">Complete Reconciliation</p>
                <p className="text-sm text-muted-foreground">
                  Difference must be zero to complete.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank Account</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Bank Balance</TableHead>
                  <TableHead className="text-right">Book Balance</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.bank_account_id}
                    </TableCell>
                    <TableCell>
                      {session.period_month}/{session.period_year}
                    </TableCell>
                    <TableCell className="text-right">
                      PKR {session.closing_balance_per_bank.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      PKR {session.closing_balance_per_books.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={session.difference === 0 ? 'default' : 'destructive'}>
                        PKR {session.difference.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                        {session.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === 'in_progress' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCompleteSession(session.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Bank Statement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Statement Date</Label>
              <Input
                type="date"
                value={importData.statement_date}
                onChange={(e) => setImportData({ ...importData, statement_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Opening Balance</Label>
              <Input
                type="number"
                value={importData.opening_balance}
                onChange={(e) => setImportData({ ...importData, opening_balance: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Closing Balance</Label>
              <Input
                type="number"
                value={importData.closing_balance}
                onChange={(e) => setImportData({ ...importData, closing_balance: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setImportData({ ...importData, file: e.target.files?.[0] || null })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Columns: date, description, debit, credit, balance
              </p>
            </div>
            <div className="flex gap-4">
              <Button onClick={handleImportStatement} className="flex-1">
                Import
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
