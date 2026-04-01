'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchFixedAsset, disposeAsset } from '@/lib/api/fixed-assets';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, FileText, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function FixedAssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDisposalDialog, setShowDisposalDialog] = useState(false);
  const [disposalData, setDisposalData] = useState({
    disposal_date: new Date().toISOString().split('T')[0],
    sale_proceeds: '0',
    disposal_reason: '',
  });

  useEffect(() => {
    if (params.id) {
      loadAsset();
    }
  }, [params.id]);

  async function loadAsset() {
    try {
      const data = await fetchFixedAsset(params.id as string);
      setAsset(data);
    } catch (error) {
      console.error('Error loading asset:', error);
      toast.error('Failed to load asset details');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisposal() {
    try {
      await disposeAsset(params.id as string, {
        ...disposalData,
        sale_proceeds: parseFloat(disposalData.sale_proceeds),
      });
      toast.success('Asset disposed successfully');
      setShowDisposalDialog(false);
      router.push('/dashboard/fixed-assets');
    } catch (error) {
      console.error('Error disposing asset:', error);
      toast.error('Failed to dispose asset');
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  if (!asset) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Asset not found</div>
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
            <h1 className="text-3xl font-bold mb-2">{asset.name}</h1>
            <p className="text-muted-foreground">Code: {asset.asset_code}</p>
          </div>
          <Badge variant={asset.status === 'active' ? 'default' : 'secondary'}>
            {asset.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Asset Details */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Category</Label>
              <p className="text-muted-foreground">
                {asset.category?.name || 'N/A'}
              </p>
            </div>
            <div>
              <Label>Purchase Date</Label>
              <p className="text-muted-foreground">{asset.purchase_date}</p>
            </div>
            <div>
              <Label>Purchase Cost</Label>
              <p className="text-muted-foreground">
                PKR {asset.purchase_cost?.toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Useful Life</Label>
              <p className="text-muted-foreground">
                {asset.useful_life_months} months ({(asset.useful_life_months / 12).toFixed(1)} years)
              </p>
            </div>
            <div>
              <Label>Residual Value</Label>
              <p className="text-muted-foreground">
                {asset.residual_value_percent}% (PKR {asset.residual_value?.toLocaleString()})
              </p>
            </div>
            <div>
              <Label>Depreciation Method</Label>
              <p className="text-muted-foreground">{asset.depreciation_method}</p>
            </div>
            <div>
              <Label>Location</Label>
              <p className="text-muted-foreground">{asset.location || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Depreciation Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Depreciation Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Depreciable Amount</Label>
              <p className="text-muted-foreground">
                PKR {asset.depreciable_amount?.toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Book Value</Label>
              <p className="text-muted-foreground">
                PKR {asset.book_value?.toLocaleString() || asset.purchase_cost.toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Monthly Depreciation (Est.)</Label>
              <p className="text-muted-foreground">
                PKR {(asset.depreciable_amount / asset.useful_life_months)?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => router.push(`/dashboard/fixed-assets/depreciation?asset=${asset.id}`)}>
              <FileText className="mr-2 h-4 w-4" />
              View Depreciation Schedule
            </Button>
            <Button variant="outline" className="w-full">
              <Wrench className="mr-2 h-4 w-4" />
              Log Maintenance
            </Button>
            {asset.status === 'active' && (
              <Dialog open={showDisposalDialog} onOpenChange={setShowDisposalDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Dispose Asset
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dispose Asset</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Disposal Date</Label>
                      <Input
                        type="date"
                        value={disposalData.disposal_date}
                        onChange={(e) =>
                          setDisposalData({ ...disposalData, disposal_date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Sale Proceeds (PKR)</Label>
                      <Input
                        type="number"
                        value={disposalData.sale_proceeds}
                        onChange={(e) =>
                          setDisposalData({ ...disposalData, sale_proceeds: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Reason</Label>
                      <Input
                        placeholder="e.g., Sold, Scrapped"
                        value={disposalData.disposal_reason}
                        onChange={(e) =>
                          setDisposalData({ ...disposalData, disposal_reason: e.target.value })
                        }
                      />
                    </div>
                    <Button onClick={handleDisposal} className="w-full">
                      Confirm Disposal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
