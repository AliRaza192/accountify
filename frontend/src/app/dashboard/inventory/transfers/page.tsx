'use client';

import { useState, useEffect } from 'react';
import { Package, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';

interface StockTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id: string;
  from_warehouse_name: string;
  to_warehouse_id: string;
  to_warehouse_name: string;
  transfer_date: string;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
  total_items: number;
  notes?: string;
  created_at: string;
}

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadTransfers();
  }, []);

  async function loadTransfers() {
    try {
      setLoading(true);
      const response = await api.get('/api/inventory/transfers');
      setTransfers(response.data);
    } catch (error: any) {
      console.error('Error loading transfers:', error);
      toast.error('Failed to load stock transfers');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/api/inventory/transfers', formData);
      toast.success('Stock transfer created successfully');
      setShowDialog(false);
      loadTransfers();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error('Failed to create stock transfer');
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.put(`/api/inventory/transfers/${id}/status`, { status });
      toast.success(`Transfer status updated to ${status}`);
      loadTransfers();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  }

  const filteredTransfers = statusFilter === 'all'
    ? transfers
    : transfers.filter(t => t.status === statusFilter);

  const statusCounts = {
    pending: transfers.filter(t => t.status === 'pending').length,
    in_transit: transfers.filter(t => t.status === 'in_transit').length,
    completed: transfers.filter(t => t.status === 'completed').length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      pending: 'secondary',
      in_transit: 'outline',
      completed: 'default',
      cancelled: 'secondary',
    };
    const labels: Record<string, string> = {
      pending: 'PENDING',
      in_transit: 'IN TRANSIT',
      completed: 'COMPLETED',
      cancelled: 'CANCELLED',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Stock Transfers</h1>
          <p className="text-muted-foreground">
            Transfer stock between warehouses
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Package className="mr-2 h-4 w-4" />
          New Transfer
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <ArrowRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statusCounts.in_transit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transfers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transfers</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Transfer List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading transfers...</div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stock transfers found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer #</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">{transfer.transfer_number}</TableCell>
                    <TableCell>{transfer.from_warehouse_name}</TableCell>
                    <TableCell>{transfer.to_warehouse_name}</TableCell>
                    <TableCell>{transfer.transfer_date}</TableCell>
                    <TableCell className="text-right">{transfer.total_items}</TableCell>
                    <TableCell>{getStatusBadge(transfer.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {transfer.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(transfer.id, 'in_transit')}
                          >
                            Ship
                          </Button>
                        )}
                        {transfer.status === 'in_transit' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(transfer.id, 'completed')}
                          >
                            Receive
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

      {/* Create Transfer Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>From Warehouse</Label>
                <Select
                  value={formData.from_warehouse_id}
                  onValueChange={(value) => setFormData({ ...formData, from_warehouse_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wh1">Main Warehouse</SelectItem>
                    <SelectItem value="wh2">Branch Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Warehouse</Label>
                <Select
                  value={formData.to_warehouse_id}
                  onValueChange={(value) => setFormData({ ...formData, to_warehouse_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wh1">Main Warehouse</SelectItem>
                    <SelectItem value="wh2">Branch Warehouse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transfer Date</Label>
                <Input
                  type="date"
                  value={formData.transfer_date}
                  onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Transfer notes"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Transfer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
