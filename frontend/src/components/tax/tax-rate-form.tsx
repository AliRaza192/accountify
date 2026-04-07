'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTaxRate } from '@/lib/api/tax-management';
import { toast } from 'sonner';

interface TaxRateFormProps {
  onSuccess: () => void;
}

export function TaxRateForm({ onSuccess }: TaxRateFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tax_name: '',
    rate_percent: '',
    tax_type: 'sales_tax' as 'sales_tax' | 'input_tax' | 'wht' | 'federal_excise',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createTaxRate({
        ...formData,
        rate_percent: parseFloat(formData.rate_percent),
        end_date: formData.end_date || undefined,
      });
      toast.success('Tax rate created successfully');
      onSuccess();
      setOpen(false);
      setFormData({
        tax_name: '',
        rate_percent: '',
        tax_type: 'sales_tax',
        effective_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_active: true,
      });
    } catch (error) {
      console.error('Error creating tax rate:', error);
      toast.error('Failed to create tax rate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Tax Rate</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Tax Rate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tax_name">Tax Name</Label>
            <Input
              id="tax_name"
              value={formData.tax_name}
              onChange={(e) => setFormData({ ...formData, tax_name: e.target.value })}
              placeholder="e.g., GST 17%"
              required
            />
          </div>

          <div>
            <Label htmlFor="rate_percent">Rate (%)</Label>
            <Input
              id="rate_percent"
              type="number"
              step="0.01"
              value={formData.rate_percent}
              onChange={(e) => setFormData({ ...formData, rate_percent: e.target.value })}
              placeholder="17.0"
              required
            />
          </div>

          <div>
            <Label htmlFor="tax_type">Tax Type</Label>
            <Select
              value={formData.tax_type}
              onValueChange={(value) => setFormData({ ...formData, tax_type: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_tax">Sales Tax (GST)</SelectItem>
                <SelectItem value="input_tax">Input Tax</SelectItem>
                <SelectItem value="wht">Withholding Tax (WHT)</SelectItem>
                <SelectItem value="federal_excise">Federal Excise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="effective_date">Effective Date</Label>
            <Input
              id="effective_date"
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="end_date">End Date (Optional)</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Tax Rate'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
