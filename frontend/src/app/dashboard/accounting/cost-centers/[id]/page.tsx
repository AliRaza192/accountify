'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { fetchCostCenter, fetchDepartmentPL } from '@/lib/api/cost-centers';
import { toast } from 'sonner';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

export default function CostCenterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [costCenter, setCostCenter] = useState<any>(null);
  const [plReport, setPlReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  async function loadData() {
    try {
      setLoading(true);
      const [ccData, plData] = await Promise.all([
        fetchCostCenter(params.id as string),
        fetchDepartmentPL(params.id as string),
      ]);
      setCostCenter(ccData);
      setPlReport(plData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load cost center details');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  if (!costCenter) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Cost center not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{costCenter.name}</h1>
            <p className="text-muted-foreground">Code: {costCenter.code}</p>
          </div>
          <Badge variant={costCenter.status === 'active' ? 'default' : 'secondary'}>
            {costCenter.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Cost Center Details */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Center Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Code</Label>
              <p className="text-muted-foreground">{costCenter.code}</p>
            </div>
            <div>
              <Label>Name</Label>
              <p className="text-muted-foreground">{costCenter.name}</p>
            </div>
            <div>
              <Label>Description</Label>
              <p className="text-muted-foreground">{costCenter.description || 'Not specified'}</p>
            </div>
            <div>
              <Label>Status</Label>
              <p className="text-muted-foreground">{costCenter.status}</p>
            </div>
          </CardContent>
        </Card>

        {/* P&L Summary */}
        {plReport && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                P&L Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Revenue</Label>
                <p className="text-2xl font-bold text-green-600">
                  PKR {plReport.revenue.toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Direct Expenses</Label>
                <p className="text-2xl font-bold text-red-600">
                  PKR {plReport.direct_expenses.toLocaleString()}
                </p>
              </div>
              <div className="border-t pt-4">
                <Label>Gross Profit</Label>
                <div className="flex items-center gap-2">
                  {plReport.gross_profit >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <p className="text-2xl font-bold">
                    PKR {plReport.gross_profit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <Label>Allocated Overhead</Label>
                <p className="text-lg text-muted-foreground">
                  PKR {plReport.allocated_overhead.toLocaleString()}
                </p>
              </div>
              <div className="border-t pt-4">
                <Label>Net Profit</Label>
                <div className="flex items-center gap-2">
                  {plReport.net_profit >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <p className="text-2xl font-bold">
                    PKR {plReport.net_profit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Period: {plReport.period}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Detailed P&L
            </Button>
            <Button variant="outline" className="w-full">
              Allocate Transaction
            </Button>
            <Button variant="outline" className="w-full">
              Allocate Overhead
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
