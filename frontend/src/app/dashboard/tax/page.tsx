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
import { fetchTaxSummary, fetchTaxReturns, generateTaxReturn } from '@/lib/api/tax-management';
import { toast } from 'sonner';
import { FileText, Download, Plus, TrendingUp, TrendingDown, Calculator } from 'lucide-react';

export default function TaxDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [summaryData, returnsData] = await Promise.all([
        fetchTaxSummary(),
        fetchTaxReturns(),
      ]);
      setSummary(summaryData);
      setReturns(returnsData.slice(0, 5)); // Show latest 5
    } catch (error) {
      console.error('Error loading tax data:', error);
      toast.error('Failed to load tax data');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReturn() {
    try {
      setGenerating(true);
      const today = new Date();
      await generateTaxReturn(today.getMonth() + 1, today.getFullYear());
      toast.success('Tax return generated successfully');
      loadData();
    } catch (error) {
      console.error('Error generating return:', error);
      toast.error('Failed to generate tax return');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Tax Management</h1>
        <p className="text-muted-foreground">
          FBR/SRB tax compliance - GST, WHT, and monthly returns
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Output Tax</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PKR {summary?.output_tax?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Sales tax collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Input Tax</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PKR {summary?.input_tax?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Purchase tax paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Payable</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (summary?.net_payable || 0) >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              PKR {summary?.net_payable?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Output - Input
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WHT Deducted</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PKR {summary?.wht_deducted?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Withholding tax
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={handleGenerateReturn} disabled={generating} className="w-full">
              <Calculator className="mr-2 h-4 w-4" />
              Generate Monthly Return
            </Button>
            <Button onClick={() => router.push('/dashboard/tax/returns')} variant="outline" className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              View All Returns
            </Button>
            <Button onClick={() => router.push('/dashboard/tax/rates')} variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Manage Tax Rates
            </Button>
          </CardContent>
        </Card>

        {/* Returns Status */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Tax Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Output Tax</TableHead>
                  <TableHead className="text-right">Input Tax</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell>{ret.return_period_month}/{ret.return_period_year}</TableCell>
                    <TableCell className="text-right">
                      PKR {ret.output_tax_total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      PKR {ret.input_tax_total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      PKR {ret.net_tax_payable.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ret.status === 'filed' ? 'default' : 'secondary'}>
                        {ret.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
