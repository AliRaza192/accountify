'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { fetchTaxReturn, fileTaxReturn } from '@/lib/api/tax-management';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Download, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function TaxReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [taxReturn, setTaxReturn] = useState<any>(null);
  const [outputTaxItems, setOutputTaxItems] = useState<any[]>([]);
  const [inputTaxItems, setInputTaxItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [filingData, setFilingData] = useState({
    challan_number: '',
    challan_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (params.id) {
      loadReturn();
    }
  }, [params.id]);

  async function loadReturn() {
    try {
      setLoading(true);
      const data = await fetchTaxReturn(params.id as string);
      setTaxReturn(data);
      // In production, would load actual invoice/bill breakdown
      setOutputTaxItems([]);
      setInputTaxItems([]);
    } catch (error) {
      console.error('Error loading tax return:', error);
      toast.error('Failed to load tax return details');
    } finally {
      setLoading(false);
    }
  }

  async function handleFile() {
    try {
      await fileTaxReturn(params.id as string, filingData);
      toast.success('Tax return filed successfully');
      setShowFileDialog(false);
      loadReturn();
    } catch (error) {
      console.error('Error filing return:', error);
      toast.error('Failed to file tax return');
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  if (!taxReturn) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Tax return not found</div>
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
            <h1 className="text-3xl font-bold mb-2">
              Tax Return - {taxReturn.return_period_month}/{taxReturn.return_period_year}
            </h1>
            <p className="text-muted-foreground">
              Sales tax return details and breakdown
            </p>
          </div>
          <Badge variant={taxReturn.status === 'filed' ? 'default' : 'secondary'}>
            {taxReturn.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 mb-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Output Tax</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                PKR {taxReturn.output_tax_total.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Sales tax collected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Input Tax</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                PKR {taxReturn.input_tax_total.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Purchase tax paid
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Net Payable</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                taxReturn.net_tax_payable >= 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                PKR {taxReturn.net_tax_payable.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Output - Input
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Output Tax Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Output Tax Breakdown (Sales Invoices)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outputTaxItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>NTN</TableHead>
                    <TableHead className="text-right">Taxable Amount</TableHead>
                    <TableHead className="text-right">Tax Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outputTaxItems.map((item) => (
                    <TableRow key={item.invoice_number}>
                      <TableCell>{item.invoice_number}</TableCell>
                      <TableCell>{item.customer_name}</TableCell>
                      <TableCell>{item.customer_ntn || '-'}</TableCell>
                      <TableCell className="text-right">
                        PKR {item.taxable_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        PKR {item.tax_amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No output tax items - breakdown not available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Input Tax Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Input Tax Breakdown (Purchase Bills)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inputTaxItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>NTN</TableHead>
                    <TableHead className="text-right">Taxable Amount</TableHead>
                    <TableHead className="text-right">Tax Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inputTaxItems.map((item) => (
                    <TableRow key={item.bill_number}>
                      <TableCell>{item.bill_number}</TableCell>
                      <TableCell>{item.vendor_name}</TableCell>
                      <TableCell>{item.vendor_ntn || '-'}</TableCell>
                      <TableCell className="text-right">
                        PKR {item.taxable_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        PKR {item.tax_amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No input tax items - breakdown not available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {taxReturn.status === 'draft' && (
              <Button onClick={() => setShowFileDialog(true)} className="w-full">
                <Check className="mr-2 h-4 w-4" />
                File Return
              </Button>
            )}
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Challan
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </CardContent>
        </Card>
      </div>

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
