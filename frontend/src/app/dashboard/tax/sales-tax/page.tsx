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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  generateTaxReturn, 
  fileTaxReturn,
  fetchTaxReturns 
} from '@/lib/api/tax-management';
import { toast } from 'sonner';
import { Calculator, FileText, Check, Download } from 'lucide-react';

export default function SalesTaxPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [period, setPeriod] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [filingData, setFilingData] = useState({
    challan_number: '',
    challan_date: new Date().toISOString().split('T')[0],
  });
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    loadReturns();
  }, []);

  async function loadReturns() {
    try {
      setLoading(true);
      const data = await fetchTaxReturns();
      setReturns(data);
    } catch (error) {
      console.error('Error loading returns:', error);
      toast.error('Failed to load tax returns');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    try {
      setGenerating(true);
      const data = await generateTaxReturn(period.month, period.year);
      setReport(data);
      toast.success('Sales tax return generated successfully');
    } catch (error) {
      console.error('Error generating return:', error);
      toast.error('Failed to generate sales tax return');
    } finally {
      setGenerating(false);
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
        <h1 className="text-3xl font-bold mb-2">Sales Tax Return (SRB/FBR)</h1>
        <p className="text-muted-foreground">
          Generate and file monthly sales tax returns with FBR/SRB compliance
        </p>
      </div>

      {/* Generate Return */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Generate Monthly Sales Tax Return</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Month</Label>
              <Select
                value={period.month.toString()}
                onValueChange={(value) =>
                  setPeriod({ ...period, month: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Input
                type="number"
                value={period.year}
                onChange={(e) =>
                  setPeriod({ ...period, year: parseInt(e.target.value) })
                }
                min={2020}
                max={2030}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full"
              >
                <Calculator className="mr-2 h-4 w-4" />
                {generating ? 'Generating...' : 'Generate Return'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      {report && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Sales Tax Return Report - {period.month}/{period.year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Output Tax (Sales)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    PKR {report.output_tax_total?.toLocaleString() || '0'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Input Tax (Purchases)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    PKR {report.input_tax_total?.toLocaleString() || '0'}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Net Tax Payable
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      (report.net_tax_payable || 0) >= 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    PKR {report.net_tax_payable?.toLocaleString() || '0'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Taxable Sales Details */}
            {report.taxable_sales && report.taxable_sales.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Taxable Sales Details</h3>
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
                    {report.taxable_sales.map((sale: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{sale.invoice_number}</TableCell>
                        <TableCell>{sale.party_name}</TableCell>
                        <TableCell>{sale.party_ntn || '-'}</TableCell>
                        <TableCell className="text-right">
                          PKR {sale.taxable_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          PKR {sale.tax_amount?.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Taxable Purchases Details */}
            {report.taxable_purchases && report.taxable_purchases.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Taxable Purchases Details</h3>
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
                    {report.taxable_purchases.map((purchase: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{purchase.bill_number}</TableCell>
                        <TableCell>{purchase.party_name}</TableCell>
                        <TableCell>{purchase.party_ntn || '-'}</TableCell>
                        <TableCell className="text-right">
                          PKR {purchase.taxable_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          PKR {purchase.tax_amount?.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filed Returns */}
      <Card>
        <CardHeader>
          <CardTitle>Filed Tax Returns</CardTitle>
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
                      PKR {ret.output_tax_total?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      PKR {ret.input_tax_total?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      PKR {ret.net_tax_payable?.toLocaleString()}
                    </TableCell>
                    <TableCell>{ret.challan_number || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={ret.status === 'filed' ? 'default' : 'secondary'}
                      >
                        {ret.status?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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

      {/* File Dialog */}
      {showFileDialog && selectedReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">File Tax Return</h2>
            <div className="space-y-4">
              <div>
                <Label>Challan Number</Label>
                <Input
                  value={filingData.challan_number}
                  onChange={(e) =>
                    setFilingData({
                      ...filingData,
                      challan_number: e.target.value,
                    })
                  }
                  placeholder="Enter challan number"
                />
              </div>
              <div>
                <Label>Challan Date</Label>
                <Input
                  type="date"
                  value={filingData.challan_date}
                  onChange={(e) =>
                    setFilingData({
                      ...filingData,
                      challan_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex gap-4">
                <Button onClick={handleFile} className="flex-1">
                  <FileText className="mr-2 h-4 w-4" />
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
          </div>
        </div>
      )}
    </div>
  );
}
