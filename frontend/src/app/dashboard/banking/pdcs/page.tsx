'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  fetchPDCs,
  updatePDCStatus,
  fetchPDCMaturityReport,
} from '@/lib/api/bank-reconciliation';
import { toast } from 'sonner';
import { Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function PDCManagementPage() {
  const router = useRouter();
  const [pdcs, setPdcs] = useState<any[]>([]);
  const [maturityAlerts, setMaturityAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [partyTypeFilter, setPartyTypeFilter] = useState<string>('all');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedPDC, setSelectedPDC] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [bounceReason, setBounceReason] = useState('');

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
    } catch (error) {
      console.error('Error loading PDC data:', error);
      toast.error('Failed to load PDC data');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus() {
    try {
      if (!selectedPDC || !newStatus) return;
      
      await updatePDCStatus(
        selectedPDC.id,
        newStatus as any,
        newStatus === 'bounced' ? bounceReason : undefined
      );
      toast.success('PDC status updated successfully');
      setShowStatusDialog(false);
      setSelectedPDC(null);
      setNewStatus('');
      setBounceReason('');
      loadData();
    } catch (error) {
      console.error('Error updating PDC status:', error);
      toast.error('Failed to update PDC status');
    }
  }

  function openStatusDialog(pdc: any, status: string) {
    setSelectedPDC(pdc);
    setNewStatus(status);
    setShowStatusDialog(true);
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'default',
      deposited: 'secondary',
      cleared: 'default',
      bounced: 'destructive',
      returned: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">PDC Management</h1>
            <p className="text-muted-foreground">
              Track post-dated cheques from customers and to vendors
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/banking/pdcs/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add New PDC
          </Button>
        </div>
      </div>

      {/* Maturity Alerts */}
      {maturityAlerts.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {maturityAlerts.map((pdc) => (
                  <TableRow key={pdc.id}>
                    <TableCell className="font-medium">{pdc.cheque_number}</TableCell>
                    <TableCell>{pdc.party_name}</TableCell>
                    <TableCell>{pdc.party_type.toUpperCase()}</TableCell>
                    <TableCell className="text-right">
                      PKR {pdc.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{pdc.cheque_date}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{pdc.days_until_maturity} days</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
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
          </div>
        </CardContent>
      </Card>

      {/* PDC List */}
      <Card>
        <CardHeader>
          <CardTitle>PDC List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cheque Number</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Party Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pdcs.map((pdc) => (
                  <TableRow key={pdc.id}>
                    <TableCell className="font-medium">{pdc.cheque_number}</TableCell>
                    <TableCell>{pdc.bank_name}</TableCell>
                    <TableCell>{pdc.cheque_date}</TableCell>
                    <TableCell>{pdc.party_type.toUpperCase()}</TableCell>
                    <TableCell className="text-right">
                      PKR {pdc.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(pdc.status)}</TableCell>
                    <TableCell className="text-right">
                      {pdc.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openStatusDialog(pdc, 'deposited')}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openStatusDialog(pdc, 'bounced')}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                      {pdc.status === 'deposited' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStatusDialog(pdc, 'cleared')}
                        >
                          Mark Cleared
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

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update PDC Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
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
                <Label>Bounce Reason</Label>
                <Input
                  value={bounceReason}
                  onChange={(e) => setBounceReason(e.target.value)}
                  placeholder="e.g., Insufficient funds"
                />
              </div>
            )}
            <div className="flex gap-4">
              <Button onClick={handleUpdateStatus} className="flex-1">
                Update Status
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowStatusDialog(false)}
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
