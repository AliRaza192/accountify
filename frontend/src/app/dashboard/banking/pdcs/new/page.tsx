'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createPDC } from '@/lib/api/bank-reconciliation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';

export default function NewPDCPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      cheque_number: '',
      bank_name: '',
      cheque_date: new Date().toISOString().split('T')[0],
      amount: '',
      party_type: 'customer',
      party_id: '',
    },
  });

  async function onSubmit(data: any) {
    try {
      setLoading(true);
      await createPDC({
        ...data,
        amount: parseFloat(data.amount),
      });
      toast.success('PDC created successfully');
      router.push('/dashboard/banking/pdcs');
    } catch (error) {
      console.error('Error creating PDC:', error);
      toast.error('Failed to create PDC');
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
        <h1 className="text-3xl font-bold mb-2">Add New PDC</h1>
        <p className="text-muted-foreground">
          Record a post-dated cheque from customer or to vendor
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PDC Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cheque_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cheque Number</FormLabel>
                      <FormControl>
                        <Input placeholder="123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., HBL, UBL, MCB" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cheque_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cheque Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (PKR)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="100000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="party_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="customer">Customer (Receivable)</SelectItem>
                          <SelectItem value="vendor">Vendor (Payable)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="party_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer or Vendor ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create PDC'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
