'use client';

import { useState, useEffect } from 'react';
import { Layers, Calendar, Search } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Batch {
  id: string;
  product_name: string;
  product_code: string;
  batch_number: string;
  quantity: number;
  unit: string;
  manufacturing_date?: string;
  expiry_date?: string;
  warehouse_name?: string;
  days_until_expiry?: number;
  status: 'active' | 'expiring_soon' | 'expired';
}

export default function BatchTrackingPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    try {
      setLoading(true);
      const response = await api.get('/api/inventory/batches');
      setBatches(response.data);
    } catch (error: any) {
      console.error('Error loading batches:', error);
      toast.error('Failed to load batch data');
    } finally {
      setLoading(false);
    }
  }

  const filteredBatches = batches.filter(batch => {
    if (statusFilter !== 'all' && batch.status !== statusFilter) return false;
    if (searchTerm) {
      return (
        batch.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const statusCounts = {
    active: batches.filter(b => b.status === 'active').length,
    expiring_soon: batches.filter(b => b.status === 'expiring_soon').length,
    expired: batches.filter(b => b.status === 'expired').length,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      expiring_soon: 'secondary',
      expired: 'destructive',
    };
    const labels: Record<string, string> = {
      active: 'ACTIVE',
      expiring_soon: 'EXPIRING SOON',
      expired: 'EXPIRED',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Batch Tracking</h1>
        <p className="text-muted-foreground">
          Track batch numbers, expiry dates, and FEFO inventory
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Batches</CardTitle>
            <Layers className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.expiring_soon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Calendar className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statusCounts.expired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batches.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product or batch number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <select
                className="w-full p-2 border rounded"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Batches</option>
                <option value="active">Active</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Details</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading batches...</div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No batches found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Mfg. Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.product_name}</TableCell>
                    <TableCell>{batch.batch_number}</TableCell>
                    <TableCell>{batch.warehouse_name || 'Main'}</TableCell>
                    <TableCell className="text-right">
                      {batch.quantity} {batch.unit}
                    </TableCell>
                    <TableCell>{batch.manufacturing_date || '-'}</TableCell>
                    <TableCell>{batch.expiry_date || '-'}</TableCell>
                    <TableCell>
                      {batch.days_until_expiry !== undefined ? (
                        <Badge
                          variant={batch.days_until_expiry <= 0 ? 'destructive' : batch.days_until_expiry <= 30 ? 'secondary' : 'default'}
                        >
                          {batch.days_until_expiry <= 0 ? 'Expired' : `${batch.days_until_expiry} days`}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
