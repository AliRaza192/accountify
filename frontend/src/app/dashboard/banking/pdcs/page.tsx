'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  fetchPDCs,
  updatePDCStatus,
  depositPDC,
  fetchPDCMaturityReport,
  type PDC,
  type PDCStatus,
  type PDCMaturityItem,
} from '@/lib/api/bank-reconciliation';
import { toast } from 'sonner';
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Landmark,
  RotateCcw,
  Loader2,
  CalendarDays,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

// Format date as DD/MM/YYYY (Pakistani convention)
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

function getStatusBadge(status: PDCStatus) {
  const config: Record<PDCStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; label: string }> = {
    pending: { variant: 'secondary', icon: <CalendarDays className="h-3 w-3 mr-1" />, label: 'PENDING' },
    deposited: { variant: 'default', icon: <Landmark className="h-3 w-3 mr-1" />, label: 'DEPOSITED' },
    cleared: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" />, label: 'CLEARED' },
    bounced: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" />, label: 'BOUNCED' },
    returned: { variant: 'outline', icon: <RotateCcw className="h-3 w-3 mr-1" />, label: 'RETURNED' },
  };
  const c = config[status];
  return (
    <Badge variant={c.variant} className="inline-flex items-center">
      {c.icon}
      {c.label}
    </Badge>
  );
}

export default function PDCManagementPage() {
  const router = useRouter();

  // Data state
  const [pdcs, setPdcs] = useState<PDC[]>([]);
  const [maturityAlerts, setMaturityAlerts] = useState<PDCMaturityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [partyTypeFilter, setPartyTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Status update dialog
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedPDC, setSelectedPDC] = useState<PDC | null>(null);
  const [newStatus, setNewStatus] = useState<PDCStatus>('deposited');
  const [bounceReason, setBounceReason] = useState('');
  const [updating, setUpdating] = useState(false);

  // Summary stats
  const [summary, setSummary] = useState({
    totalPending: 0,
    totalDeposited: 0,
    totalCleared: 0,
    totalBounced: 0,
    pendingAmount: 0,
  });

  useEffect(() => {
    loadData();
  }, [statusFilter, partyTypeFilter]);

  async function loadData() {
    try {
      setLoading(true);
      const [pdcsData, maturityData] = await Promise.all([
        fetchPDCs(
          statusFilter !== 'all' ? statusFilter : undefined,
          partyTypeFilter !== 'all' ? partyTypeFilter : undefined
        ),
        fetchPDCMaturityReport(7),
      ]);
      setPdcs(pdcsData);
      setMaturityAlerts(maturityData);

      // Calculate summary
      const allPdcs = await fetchPDCs();
      setSummary({
        totalPending: allPdcs.filter((p) => p.status === 'pending').length,
        totalDeposited: allPdcs.filter((p) => p.status === 'deposited').length,
        totalCleared: allPdcs.filter((p) => p.status === 'cleared').length,
        totalBounced: allPdcs.filter((p) => p.status === 'bounced').length,
        pendingAmount: allPdcs
          .filter((p) => p.status === 'pending')
          .reduce((sum, p) => sum + p.amount, 0),
      });
    } catch (error) {
      console.error('Error loading PDC data:', error);
      toast.error('Failed to load PDC data');
    } finally {
      setLoading(false);
    }
  }

  // Deposit PDC
  async function handleDepositPDC(id: string) {
    try {
      setDepositing(id);
      await depositPDC(id);
      toast.success('PDC deposited successfully');
      loadData();
    } catch (error) {
      console.error('Error depositing PDC:', error);
      toast.error('Failed to deposit PDC');
    } finally {
      setDepositing(null);
    }
  }

  // Open status update dialog
  function openStatusDialog(pdc: PDC, status: PDCStatus) {
    setSelectedPDC(pdc);
    setNewStatus(status);
    setBounceReason('');
    setShowStatusDialog(true);
  }

  // Submit status update
  async function handleUpdateStatus() {
    if (!selectedPDC) return;

    try {
      setUpdating(true);
      await updatePDCStatus(
        selectedPDC.id,
        newStatus,
        newStatus === 'bounced' ? bounceReason : undefined
      );
      toast.success(`PDC marked as ${newStatus}`);
      setShowStatusDialog(false);
      setSelectedPDC(null);
      setNewStatus('deposited');
      setBounceReason('');
      loadData();
    } catch (error) {
      console.error('Error updating PDC status:', error);
      toast.error('Failed to update PDC status');
    } finally {
      setUpdating(false);
    }
  }

  // Filtered PDCs by search
  const filteredPdcs = pdcs.filter((pdc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      pdc.cheque_number.toLowerCase().includes(q) ||
      pdc.bank_name.toLowerCase().includes(q) ||
      (pdc.party_name && pdc.party_name.toLowerCase().includes(q)) ||
      pdc.party_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PDC Management</h1>
          <p className="text-muted-foreground mt-1">
            Track post-dated cheques from customers and to vendors
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/banking/pdcs/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add New PDC
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CalendarDays className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalPending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
            <p className="text-sm font-mono mt-2">{formatPKR(summary.pendingAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Landmark className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalDeposited}</p>
                <p className="text-xs text-muted-foreground">Deposited</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalCleared}</p>
                <p className="text-xs text-muted-foreground">Cleared</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalBounced}</p>
                <p className="text-xs text-muted-foreground">Bounced</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maturity Alerts */}
      {maturityAlerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              PDCs Maturing in Next 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cheque Number</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maturityAlerts.map((pdc) => (
                  <TableRow key={pdc.id}>
                    <TableCell className="font-medium">{pdc.cheque_number}</TableCell>
                    <TableCell>{pdc.party_name}</TableCell>
                    <TableCell>
                      <Badge variant={pdc.party_type === 'customer' ? 'default' : 'outline'}>
                        {pdc.party_type === 'customer' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {pdc.party_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPKR(pdc.amount)}
                    </TableCell>
                    <TableCell>{formatDatePKR(pdc.cheque_date)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{pdc.days_until_maturity} days</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {pdc.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDepositPDC(pdc.id)}
                        >
                          <Landmark className="h-4 w-4 mr-1" />
                          Deposit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Search</Label>
              <Input
                placeholder="Cheque no, bank, party..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="deposited">Deposited</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Party Type</Label>
              <Select value={partyTypeFilter} onValueChange={setPartyTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="customer">Receivable (Customer)</SelectItem>
                  <SelectItem value="vendor">Payable (Vendor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={loadData} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDC List */}
      <Card>
        <CardHeader>
          <CardTitle>PDC List</CardTitle>
          <CardDescription>{filteredPdcs.length} cheques found</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPdcs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No PDCs found matching your filters
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cheque Number</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Party Type</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPdcs.map((pdc) => (
                  <TableRow key={pdc.id}>
                    <TableCell className="font-medium">{pdc.cheque_number}</TableCell>
                    <TableCell>{pdc.bank_name}</TableCell>
                    <TableCell>{formatDatePKR(pdc.cheque_date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={pdc.party_type === 'customer' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {pdc.party_type === 'customer' ? 'Receivable' : 'Payable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pdc.party_name || pdc.party_id}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatPKR(pdc.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(pdc.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {pdc.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Deposit"
                              onClick={() => handleDepositPDC(pdc.id)}
                              disabled={depositing === pdc.id}
                            >
                              {depositing === pdc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Landmark className="h-4 w-4 text-blue-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Mark Bounced"
                              onClick={() => openStatusDialog(pdc, 'bounced')}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {pdc.status === 'deposited' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Mark Cleared"
                            onClick={() => openStatusDialog(pdc, 'cleared')}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {pdc.status === 'bounced' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Return"
                            onClick={() => openStatusDialog(pdc, 'returned')}
                          >
                            <RotateCcw className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update PDC Status</DialogTitle>
            <DialogDescription>
              {selectedPDC && (
                <span>
                  Cheque #{selectedPDC.cheque_number} - {formatPKR(selectedPDC.amount)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select
                value={newStatus}
                onValueChange={(v) => setNewStatus(v as PDCStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposited">Deposited</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStatus === 'bounced' && (
              <div>
                <Label>Bounce Reason <span className="text-red-500">*</span></Label>
                <Input
                  value={bounceReason}
                  onChange={(e) => setBounceReason(e.target.value)}
                  placeholder="e.g., Insufficient funds, Account closed, Signature mismatch"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Common: Insufficient funds, Account closed, Signature mismatch, Funds insufficient
                </p>
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleUpdateStatus} disabled={updating || (newStatus === 'bounced' && !bounceReason)}>
                {updating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Update Status
              </Button>
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
