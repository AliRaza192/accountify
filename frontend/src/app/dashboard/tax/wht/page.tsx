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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchWHTTransactions, fetchWHTSummary } from '@/lib/api/tax-management';
import { Download } from 'lucide-react';

export default function WHTTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    fromDate: '',
    toDate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [transData, summaryData] = await Promise.all([
        fetchWHTTransactions(filters.fromDate || undefined, filters.toDate || undefined, filters.category !== 'all' ? filters.category : undefined),
        fetchWHTSummary(),
      ]);
      setTransactions(transData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading WHT data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">WHT Transactions</h1>
        <p className="text-muted-foreground">
          Withholding tax deducted at source (FBR Section 153, 153A, 155)
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters({ ...filters, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Section 153">Section 153 (Goods)</SelectItem>
                  <SelectItem value="Section 153A">Section 153A (Services)</SelectItem>
                  <SelectItem value="Section 155">Section 155 (Rent)</SelectItem>
                  <SelectItem value="Section 156">Section 156 (Professional Fees)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadData} className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary by Category */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>WHT Summary by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Total WHT</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((item) => (
                <TableRow key={item.category}>
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell className="text-right">
                    PKR {item.total_amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    PKR {item.total_wht.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{item.transaction_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>WHT Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Party Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">WHT Rate</TableHead>
                  <TableHead className="text-right">WHT Amount</TableHead>
                  <TableHead>Filer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((trans) => (
                  <TableRow key={trans.id}>
                    <TableCell>{trans.transaction_date}</TableCell>
                    <TableCell>{trans.party_type.toUpperCase()}</TableCell>
                    <TableCell>{trans.wht_category}</TableCell>
                    <TableCell className="text-right">
                      PKR {trans.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{trans.wht_rate}%</TableCell>
                    <TableCell className="text-right font-medium">
                      PKR {trans.wht_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{trans.is_filer ? 'Yes' : 'No'}</TableCell>
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
