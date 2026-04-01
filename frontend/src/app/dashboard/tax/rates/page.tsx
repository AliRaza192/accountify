'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchTaxRates, createTaxRate, updateTaxRate } from '@/lib/api/tax-management';
import { toast } from 'sonner';
import { Plus, Edit } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export default function TaxRatesPage() {
  const router = useRouter();
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);

  useEffect(() => {
    loadRates();
  }, []);

  async function loadRates() {
    try {
      setLoading(true);
      const data = await fetchTaxRates();
      setRates(data);
    } catch (error) {
      console.error('Error loading tax rates:', error);
      toast.error('Failed to load tax rates');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(data: any) {
    try {
      if (editingRate) {
        await updateTaxRate(editingRate.id, data);
        toast.success('Tax rate updated successfully');
      } else {
        await createTaxRate(data);
        toast.success('Tax rate created successfully');
      }
      setShowDialog(false);
      setEditingRate(null);
      loadRates();
    } catch (error) {
      console.error('Error saving tax rate:', error);
      toast.error('Failed to save tax rate');
    }
  }

  function handleEdit(rate: any) {
    setEditingRate(rate);
    setShowDialog(true);
  }

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      sales_tax: 'default',
      input_tax: 'secondary',
      wht: 'outline',
      federal_excise: 'default',
    };
    return <Badge variant={variants[type] || 'default'}>{type.toUpperCase()}</Badge>;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tax Rates</h1>
            <p className="text-muted-foreground">
              Manage FBR tax rates - GST, WHT, and federal excise
            </p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Tax Rate
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Rates List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-medium">{rate.tax_name}</TableCell>
                    <TableCell>{getTypeBadge(rate.tax_type)}</TableCell>
                    <TableCell className="text-right">{rate.rate_percent}%</TableCell>
                    <TableCell>{rate.effective_date}</TableCell>
                    <TableCell>
                      <Badge variant={rate.is_active ? 'default' : 'secondary'}>
                        {rate.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(rate)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRate ? 'Edit Tax Rate' : 'Add Tax Rate'}
            </DialogTitle>
          </DialogHeader>
          <TaxRateForm
            initialData={editingRate}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowDialog(false);
              setEditingRate(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaxRateForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const form = useForm({
    defaultValues: {
      tax_name: initialData?.tax_name || '',
      rate_percent: initialData?.rate_percent?.toString() || '',
      tax_type: initialData?.tax_type || 'sales_tax',
      effective_date: initialData?.effective_date || new Date().toISOString().split('T')[0],
      is_active: initialData?.is_active ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="tax_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., GST 17%" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rate_percent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rate (%)</FormLabel>
              <FormControl>
                <Input type="number" step="0.1" placeholder="17" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tax_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sales_tax">Sales Tax (GST)</SelectItem>
                  <SelectItem value="input_tax">Input Tax</SelectItem>
                  <SelectItem value="wht">Withholding Tax (WHT)</SelectItem>
                  <SelectItem value="federal_excise">Federal Excise</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="effective_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Effective Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4 pt-4">
          <Button type="submit">
            {initialData ? 'Update' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
