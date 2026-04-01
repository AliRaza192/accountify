'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { fetchTaxReturns, generateTaxReturn, fileTaxReturn } from '@/lib/api/tax-management';
import { toast } from 'sonner';
import { Plus, FileText, Download, Check } from 'lucide-react';

export default function TaxReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [filingData, setFilingData] = useState({
    challan_number: '',
    challan_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadReturns();
  }, []);

  async function loadReturns() {
    try {
      setLoading(true);
      const data = await fetchTaxReturns();
      setReturns(data);
    } catch (error) {
      console.error('Error loading tax returns:', error);
      toast.error('Failed to load tax returns');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    try {
      const today = new Date();
      await generateTaxReturn(today.getMonth() + 1, today.getFullYear());
      toast.success('Tax return generated successfully');
      setShowGenerateDialog(false);
      loadReturns();
    } catch (error) {
      console.error('Error generating return:', error);
      toast.error('Failed to generate tax return');
    }
  }

  async function handleFile() {
    try {
      if (!selectedReturn) return;
      await fileTaxReturn(selectedReturn.id, filingData);
      toast.success('Tax return filed successfully');
      setShowFileDialog(false);
      setSelectedReturn(null);
      loadReturns();
    } catch (error) {
      console.error('Error filing return:', error);
      toast.error('Failed to file tax return');
    }
  }

  function openFileReturn(ret: any) {
    setSelectedReturn(ret);
    setShowFileDialog(true);
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Monthly Tax Returns</h1>
            <p className="text-muted-foreground">
              Generate and file monthly sales tax returns
            </p>
          </div>
          <Button onClick={() => setShowGenerateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Return
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Returns List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Output Tax</TableHead>
                  <TableHead className="text-right">Input Tax</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead>Challan No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-medium">
                      {ret.return_period_month}/{ret.return_period_year}
                    </TableCell>
                    <TableCell className="text-right">
                      PKR {ret.output_tax_total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      PKR {ret.input_tax_total.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      PKR {ret.net_tax_payable.toLocaleString()}
                    </TableCell>
                    <TableCell>{ret.challan_number || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={ret.status === 'filed' ? 'default' : 'secondary'}>
                        {ret.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/tax/returns/${ret.id}`)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        {ret.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openFileReturn(ret)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Monthly Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will auto-calculate output tax from invoices and input tax from bills
              for the current month.
            </p>
            <div className="flex gap-4">
              <Button onClick={handleGenerate} className="flex-1">
                Generate
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowGenerateDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Dialog */}
      <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Tax Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Challan Number</Label>
              <Input
                value={filingData.challan_number}
                onChange={(e) =>
                  setFilingData({ ...filingData, challan_number: e.target.value })
                }
                placeholder="e.g., 1234567890"
              />
            </div>
            <div>
              <Label>Challan Date</Label>
              <Input
                type="date"
                value={filingData.challan_date}
                onChange={(e) =>
                  setFilingData({ ...filingData, challan_date: e.target.value })
                }
              />
            </div>
            <div className="flex gap-4">
              <Button onClick={handleFile} className="flex-1">
                File Return
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFileDialog(false)}
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
