'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { runDepreciation } from '@/lib/api/fixed-assets';
import { toast } from 'sonner';
import { ArrowLeft, Calculator } from 'lucide-react';

export default function DepreciationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
  });

  async function handleRunDepreciation() {
    try {
      setLoading(true);
      const data = await runDepreciation(
        formData.period_month,
        formData.period_year
      );
      setResult(data);
      toast.success('Depreciation run completed');
    } catch (error) {
      console.error('Error running depreciation:', error);
      toast.error('Failed to run depreciation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold mb-2">Run Depreciation</h1>
        <p className="text-muted-foreground">
          Calculate and post monthly depreciation for all active assets
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Depreciation Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Period Month</Label>
              <Input
                type="number"
                min="1"
                max="12"
                value={formData.period_month}
                onChange={(e) =>
                  setFormData({ ...formData, period_month: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Period Year</Label>
              <Input
                type="number"
                value={formData.period_year}
                onChange={(e) =>
                  setFormData({ ...formData, period_year: parseInt(e.target.value) })
                }
              />
            </div>
            <Button onClick={handleRunDepreciation} disabled={loading} className="w-full">
              {loading ? 'Running...' : 'Run Depreciation'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Assets Depreciated</Label>
                <p className="text-2xl font-bold">{result.assets_depreciated}</p>
              </div>
              <div>
                <Label>Total Depreciation</Label>
                <p className="text-2xl font-bold text-green-600">
                  PKR {result.total_depreciation.toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Journal Entries Created</Label>
                <p className="text-2xl font-bold">{result.journal_entries_created}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Period: {result.period}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
