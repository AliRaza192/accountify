'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchCostCenters,
  deleteCostCenter,
} from '@/lib/api/cost-centers';
import { toast } from 'sonner';
import { Plus, Search, Eye, Edit, Trash2, BarChart3 } from 'lucide-react';

export default function CostCentersList() {
  const router = useRouter();
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadCostCenters();
  }, []);

  async function loadCostCenters() {
    try {
      setLoading(true);
      const data = await fetchCostCenters();
      setCostCenters(data);
    } catch (error) {
      console.error('Error loading cost centers:', error);
      toast.error('Failed to load cost centers');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this cost center?')) return;

    try {
      await deleteCostCenter(id);
      toast.success('Cost center deleted successfully');
      loadCostCenters();
    } catch (error) {
      console.error('Error deleting cost center:', error);
      toast.error('Failed to delete cost center');
    }
  }

  const filteredCostCenters = costCenters.filter((cc) => {
    const matchesSearch =
      cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cc.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || cc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'active' ? 'default' : 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cost Centers</CardTitle>
          <Button onClick={() => router.push('/dashboard/accounting/cost-centers/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Cost Center
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cost centers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCostCenters.map((cc) => (
                <TableRow key={cc.id}>
                  <TableCell className="font-medium">{cc.code}</TableCell>
                  <TableCell>{cc.name}</TableCell>
                  <TableCell>{cc.description || '-'}</TableCell>
                  <TableCell>{getStatusBadge(cc.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/dashboard/accounting/cost-centers/${cc.id}`)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {filteredCostCenters.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            No cost centers found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
