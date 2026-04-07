'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  fetchBankAccounts,
  importBankStatement,
  fetchReconciliationSessions,
  startReconciliationSession,
  matchTransactions,
  completeReconciliation,
  fetchMatchingSuggestions,
  parseCSVFile,
  autoDetectColumnMapping,
  type BankAccount,
  type ReconciliationSession,
  type CSVColumnMapping,
  type CSVParseResult,
  type BankTransaction,
  type SystemTransaction,
  type MatchingSuggestion,
} from '@/lib/api/bank-reconciliation';
import { toast } from 'sonner';
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Eye,
} from 'lucide-react';

// Pakistani bank format presets
const BANK_FORMAT_PRESETS: Record<string, CSVColumnMapping> = {
  hbl: { date: 'Date', description: 'Narration', debit: 'Debit', credit: 'Credit', balance: 'Balance', cheque_number: 'Chq No' },
  ubl: { date: 'Transaction Date', description: 'Particulars', debit: 'Withdrawal', credit: 'Deposit', balance: 'Balance', cheque_number: 'Cheque No' },
  mcb: { date: 'Value Date', description: 'Description', debit: 'Dr Amount', credit: 'Cr Amount', balance: 'Running Balance', cheque_number: 'Instrument No' },
  meezan: { date: 'Date', description: 'Description', debit: 'Debit', credit: 'Credit', balance: 'Balance', cheque_number: 'Cheque No' },
  custom: {},
};

export default function BankReconciliationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data state
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [sessions, setSessions] = useState<ReconciliationSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Account selection
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  // Import dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState({
    statement_date: '',
    opening_balance: '',
    closing_balance: '',
    file: null as File | null,
  });

  // CSV parsing state
  const [csvParsed, setCsvParsed] = useState<CSVParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping>({});
  const [selectedBankFormat, setSelectedBankFormat] = useState<string>('custom');
  const [csvPreviewExpanded, setCsvPreviewExpanded] = useState(false);

  // Reconciliation session state
  const [activeSession, setActiveSession] = useState<ReconciliationSession | null>(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [sessionPeriod, setSessionPeriod] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

  // Matching state
  const [matchingSuggestions, setMatchingSuggestions] = useState<MatchingSuggestion | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [autoMatchApplied, setAutoMatchApplied] = useState<Record<string, boolean>>({});

  // Manual matching state
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [selectedBankTxn, setSelectedBankTxn] = useState<BankTransaction | null>(null);
  const [selectedSystemTxnId, setSelectedSystemTxnId] = useState<string>('');
  const [availableSystemTxns, setAvailableSystemTxns] = useState<SystemTransaction[]>([]);

  // Completion state
  const [completing, setCompleting] = useState(false);
  const [reconciledCount, setReconciledCount] = useState(0);
  const [unreconciledCount, setUnreconciledCount] = useState(0);

  // Load initial data
  useEffect(() => {
    loadData();
    const accountParam = searchParams.get('account');
    if (accountParam) setSelectedAccount(accountParam);
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

  // Handle CSV file selection
  async function handleFileSelect(file: File | undefined) {
    if (!file) return;
    setImportData({ ...importData, file });

    try {
      const parsed = await parseCSVFile(file);
      setCsvParsed(parsed);

      // Auto-detect column mapping
      const detected = autoDetectColumnMapping(parsed.headers);
      setColumnMapping(detected);
      setSelectedBankFormat('custom');

      toast.success(`Parsed ${parsed.rowCount} transactions from CSV`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Failed to parse CSV file');
    }
  }

  // Apply bank format preset
  function applyBankFormat(format: string) {
    setSelectedBankFormat(format);
    const preset = BANK_FORMAT_PRESETS[format];
    if (preset && csvParsed) {
      // Map preset columns to actual CSV headers
      const mapping: CSVColumnMapping = {};
      for (const [key, presetCol] of Object.entries(preset)) {
        const found = csvParsed.headers.find(
          (h) => h.toLowerCase() === (presetCol as string)?.toLowerCase()
        );
        if (found) {
          (mapping as Record<string, string | undefined>)[key] = found;
        }
      }
      setColumnMapping(mapping);
    }
  }

  // Import bank statement
  async function handleImportStatement() {
    try {
      if (!selectedAccount) {
        toast.error('Please select a bank account');
        return;
      }
      if (!importData.file) {
        toast.error('Please select a CSV file');
        return;
      }
      if (!importData.statement_date) {
        toast.error('Please enter statement date');
        return;
      }
      if (!importData.opening_balance || !importData.closing_balance) {
        toast.error('Please enter opening and closing balances');
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
      resetImportState();
      loadData();
    } catch (error) {
      console.error('Error importing statement:', error);
      toast.error('Failed to import bank statement');
    }
  }

  function resetImportState() {
    setImportData({ statement_date: '', opening_balance: '', closing_balance: '', file: null });
    setCsvParsed(null);
    setColumnMapping({});
    setSelectedBankFormat('custom');
    setCsvPreviewExpanded(false);
  }

  // Start reconciliation session
  async function handleStartSession() {
    try {
      if (!selectedAccount) {
        toast.error('Please select a bank account');
        return;
      }

      const account = accounts.find((a) => a.id === selectedAccount);
      if (!account) return;

      await startReconciliationSession({
        bank_account_id: selectedAccount,
        period_month: sessionPeriod.month,
        period_year: sessionPeriod.year,
        opening_balance: account.opening_balance,
        closing_balance_per_bank: parseFloat(importData.closing_balance) || account.current_balance,
      });

      toast.success('Reconciliation session started');
      setShowSessionDialog(false);
      loadData();
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start reconciliation session');
    }
  }

  // Load matching suggestions
  async function loadMatchingSuggestions(sessionId: string) {
    try {
      setLoadingSuggestions(true);
      const suggestions = await fetchMatchingSuggestions(sessionId);
      setMatchingSuggestions(suggestions);

      // Apply auto-matches
      const applied: Record<string, boolean> = {};
      for (const match of suggestions.auto_matches) {
        try {
          await matchTransactions(sessionId, {
            bank_transaction_id: match.bank_transaction.id,
            system_transaction_id: match.system_transaction.id,
            match_type: 'auto',
          });
          applied[match.bank_transaction.id] = true;
        } catch (e) {
          console.error('Failed to auto-match:', e);
        }
      }
      setAutoMatchApplied(applied);
      setReconciledCount(suggestions.auto_matches.length);
      setUnreconciledCount(
        suggestions.unmatched_bank_transactions.length +
          suggestions.unmatched_system_transactions.length
      );

      toast.success(`Auto-matched ${suggestions.auto_matches.length} transactions`);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load matching suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  }

  // Open manual match dialog
  function openMatchDialog(bankTxn: BankTransaction) {
    setSelectedBankTxn(bankTxn);
    setSelectedSystemTxnId('');
    // In production, would fetch actual unmatched system transactions
    setAvailableSystemTxns([
      {
        id: 'demo-1',
        date: bankTxn.date,
        description: 'Sample payment match',
        amount: bankTxn.debit || bankTxn.credit,
        type: 'payment',
        reference: '',
        party_name: 'Demo Party',
        matched: false,
      },
    ]);
    setShowMatchDialog(true);
  }

  // Submit manual match
  async function handleManualMatch() {
    if (!selectedBankTxn || !selectedSystemTxnId || !activeSession) return;

    try {
      await matchTransactions(activeSession.id, {
        bank_transaction_id: selectedBankTxn.id,
        system_transaction_id: selectedSystemTxnId,
        match_type: 'manual',
      });

      toast.success('Transactions matched');
      setShowMatchDialog(false);
      setSelectedBankTxn(null);
      setSelectedSystemTxnId('');
      setReconciledCount((c) => c + 1);
      setUnreconciledCount((c) => Math.max(0, c - 1));

      // Reload suggestions
      loadMatchingSuggestions(activeSession.id);
    } catch (error) {
      console.error('Error matching:', error);
      toast.error('Failed to match transactions');
    }
  }

  // Complete reconciliation
  async function handleCompleteReconciliation() {
    if (!activeSession) return;

    try {
      setCompleting(true);
      await completeReconciliation(activeSession.id);
      toast.success('Reconciliation completed successfully');
      setActiveSession(null);
      loadData();
    } catch (error: any) {
      console.error('Error completing reconciliation:', error);
      const diff = error?.response?.data?.detail || 'Difference must be zero to complete';
      toast.error(`Cannot complete: ${diff}`);
    } finally {
      setCompleting(false);
    }
  }

  // Open existing session
  function openSession(session: ReconciliationSession) {
    setActiveSession(session);
    loadMatchingSuggestions(session.id);
  }

  // Format PKR currency
  function formatPKR(amount: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  // Format date DD/MM/YYYY
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-muted-foreground mt-1">
            Match bank statement transactions with system entries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Account Selection & Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bank Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Choose account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bank_name} - {account.name} ({account.account_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Statement</CardTitle>
            <CardDescription>Upload CSV from HBL, UBL, MCB, etc.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => setShowImportDialog(true)}
              disabled={!selectedAccount}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import Bank Statement
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Reconciliation</CardTitle>
            <CardDescription>Start matching for a period</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowSessionDialog(true)}
              disabled={!selectedAccount}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Start Reconciliation
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Session Panel */}
      {activeSession && matchingSuggestions && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                  Active Session: {monthNames[activeSession.period_month - 1]} {activeSession.period_year}
                </CardTitle>
                <CardDescription>
                  {reconciledCount} matched, {unreconciledCount} unmatched
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMatchingSuggestions(activeSession.id)}
                  disabled={loadingSuggestions}
                >
                  {loadingSuggestions ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh Matches
                </Button>
                <Button
                  size="sm"
                  onClick={handleCompleteReconciliation}
                  disabled={completing || unreconciledCount > 0}
                >
                  {completing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Complete Reconciliation
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto-Matched Transactions */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Auto-Matched Transactions ({matchingSuggestions.auto_matches.length})
              </h3>
              {matchingSuggestions.auto_matches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Match Confidence</TableHead>
                      <TableHead>Match Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchingSuggestions.auto_matches.map((match, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{formatDate(match.bank_transaction.date)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {match.bank_transaction.description}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatPKR(match.bank_transaction.debit || match.bank_transaction.credit)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              match.confidence === 'high'
                                ? 'default'
                                : match.confidence === 'medium'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {match.confidence}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{match.match_reason}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No auto-matches found. Try manual matching.
                </p>
              )}
            </div>

            {/* Unmatched Bank Transactions */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Unmatched Bank Transactions ({matchingSuggestions.unmatched_bank_transactions.length})
              </h3>
              {matchingSuggestions.unmatched_bank_transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Debit</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Cheque No</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchingSuggestions.unmatched_bank_transactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{formatDate(txn.date)}</TableCell>
                        <TableCell className="max-w-xs truncate">{txn.description}</TableCell>
                        <TableCell className="font-mono text-red-600">
                          {txn.debit > 0 ? formatPKR(txn.debit) : '-'}
                        </TableCell>
                        <TableCell className="font-mono text-green-600">
                          {txn.credit > 0 ? formatPKR(txn.credit) : '-'}
                        </TableCell>
                        <TableCell>{txn.cheque_number || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openMatchDialog(txn)}
                          >
                            <ArrowRightLeft className="h-4 w-4 mr-1" />
                            Match
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  All bank transactions matched
                </p>
              )}
            </div>

            {/* Unmatched System Transactions */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Unmatched System Transactions ({matchingSuggestions.unmatched_system_transactions.length})
              </h3>
              {matchingSuggestions.unmatched_system_transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Party</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchingSuggestions.unmatched_system_transactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{formatDate(txn.date)}</TableCell>
                        <TableCell className="max-w-xs truncate">{txn.description}</TableCell>
                        <TableCell className="font-mono">{formatPKR(txn.amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{txn.type}</Badge>
                        </TableCell>
                        <TableCell>{txn.party_name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  All system transactions matched
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reconciliation Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Sessions</CardTitle>
          <CardDescription>Previously completed and in-progress reconciliations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reconciliation sessions yet. Start one above.
            </div>
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
                      {accounts.find((a) => a.id === session.bank_account_id)?.bank_name || session.bank_account_id}
                    </TableCell>
                    <TableCell>
                      {monthNames[session.period_month - 1]} {session.period_year}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPKR(session.closing_balance_per_bank)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPKR(session.closing_balance_per_books)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={session.difference === 0 ? 'default' : 'destructive'}
                      >
                        {formatPKR(session.difference)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          session.status === 'completed'
                            ? 'default'
                            : session.status === 'in_progress'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {session.status === 'completed' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : null}
                        {session.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === 'in_progress' ? (
                        <Button variant="ghost" size="sm" onClick={() => openSession(session)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Continue
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => openSession(session)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
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
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) resetImportState();
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Bank Statement (CSV)</DialogTitle>
            <DialogDescription>
              Upload a CSV file from your bank. Supports HBL, UBL, MCB, and other Pakistani bank formats.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Statement details */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Statement Date</Label>
                <Input
                  type="date"
                  value={importData.statement_date}
                  onChange={(e) => setImportData({ ...importData, statement_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Opening Balance (PKR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={importData.opening_balance}
                  onChange={(e) => setImportData({ ...importData, opening_balance: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Closing Balance (PKR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={importData.closing_balance}
                  onChange={(e) => setImportData({ ...importData, closing_balance: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* File upload */}
            <div>
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Expected columns: date, description, debit, credit, balance (names vary by bank)
              </p>
            </div>

            {/* Bank format preset */}
            {csvParsed && (
              <>
                <div>
                  <Label>Bank Format Preset</Label>
                  <Select value={selectedBankFormat} onValueChange={applyBankFormat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hbl">HBL / UBL (Type A)</SelectItem>
                      <SelectItem value="mcb">MCB (Type B)</SelectItem>
                      <SelectItem value="meezan">Meezan Bank</SelectItem>
                      <SelectItem value="custom">Custom Mapping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Column mapping */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Column Mapping</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {(['date', 'description', 'debit', 'credit', 'balance', 'cheque_number'] as const).map((key) => (
                        <div key={key} className="flex items-center gap-2">
                          <Label className="text-xs capitalize whitespace-nowrap w-24">
                            {key.replace('_', ' ')}
                          </Label>
                          <Select
                            value={columnMapping[key] || ''}
                            onValueChange={(val) =>
                              setColumnMapping({ ...columnMapping, [key]: val || undefined })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Not mapped" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Not mapped</SelectItem>
                              {csvParsed.headers.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* CSV Preview */}
                <Card>
                  <CardHeader className="py-3">
                    <button
                      className="flex items-center justify-between w-full"
                      onClick={() => setCsvPreviewExpanded(!csvPreviewExpanded)}
                    >
                      <CardTitle className="text-sm">
                        CSV Preview ({csvParsed.rowCount} rows)
                      </CardTitle>
                      {csvPreviewExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </CardHeader>
                  {csvPreviewExpanded && (
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {csvParsed.headers.map((h) => (
                              <TableHead key={h} className="text-xs">{h}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvParsed.rows.slice(0, 5).map((row, idx) => (
                            <TableRow key={idx}>
                              {csvParsed.headers.map((h) => (
                                <TableCell key={h} className="text-xs font-mono">
                                  {row[h] || ''}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {csvParsed.rowCount > 5 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Showing 5 of {csvParsed.rowCount} rows
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              </>
            )}

            <DialogFooter>
              <Button
                onClick={handleImportStatement}
                disabled={!importData.file || !importData.statement_date}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Statement
              </Button>
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Session Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Reconciliation Session</DialogTitle>
            <DialogDescription>
              Select the period to reconcile
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Month</Label>
                <Select
                  value={String(sessionPeriod.month)}
                  onValueChange={(v) => setSessionPeriod({ ...sessionPeriod, month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((name, idx) => (
                      <SelectItem key={idx} value={String(idx + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select
                  value={String(sessionPeriod.year)}
                  onValueChange={(v) => setSessionPeriod({ ...sessionPeriod, year: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleStartSession}>Start Session</Button>
              <Button variant="outline" onClick={() => setShowSessionDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Match Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Transaction Match</DialogTitle>
            <DialogDescription>
              Match a bank transaction with a system entry
            </DialogDescription>
          </DialogHeader>
          {selectedBankTxn && (
            <div className="space-y-4">
              <Card className="bg-muted">
                <CardContent className="py-3">
                  <p className="text-sm font-medium">Bank Transaction</p>
                  <p className="text-xs text-muted-foreground">{selectedBankTxn.description}</p>
                  <p className="text-sm font-mono mt-1">
                    {formatPKR(selectedBankTxn.debit || selectedBankTxn.credit)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(selectedBankTxn.date)}</p>
                </CardContent>
              </Card>

              <div>
                <Label>Match With System Transaction</Label>
                <Select value={selectedSystemTxnId} onValueChange={setSelectedSystemTxnId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSystemTxns.map((txn) => (
                      <SelectItem key={txn.id} value={txn.id}>
                        {txn.description} - {formatPKR(txn.amount)} ({txn.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button onClick={handleManualMatch} disabled={!selectedSystemTxnId}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Match
                </Button>
                <Button variant="outline" onClick={() => setShowMatchDialog(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
