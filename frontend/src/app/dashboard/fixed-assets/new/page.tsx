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
import { createFixedAsset, fetchAssetCategories } from '@/lib/api/fixed-assets';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { ArrowLeft } from 'lucide-react';

export default function NewFixedAssetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, useState<any[]>([]);

  const form = useForm({
    defaultValues: {
      asset_code: '',
      name: '',
      category_id: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_cost: '',
      useful_life_months: '',
      residual_value_percent: '10',
      depreciation_method: 'SLM',
      location: '',
    },
  });

  async function onSubmit(data: any) {
    try {
      setLoading(true);
      await createFixedAsset({
        ...data,
        purchase_cost: parseFloat(data.purchase_cost),
        useful_life_months: parseInt(data.useful_life_months),
        residual_value_percent: parseFloat(data.residual_value_percent),
      });
      toast.success('Asset created successfully');
      router.push('/dashboard/fixed-assets');
    } catch (error) {
      console.error('Error creating asset:', error);
      toast.error('Failed to create asset');
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
        <h1 className="text-3xl font-bold mb-2">Add New Fixed Asset</h1>
        <p className="text-muted-foreground">
          Register a new fixed asset for depreciation tracking
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="asset_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Code</FormLabel>
                      <FormControl>
                        <Input placeholder="FA-2025-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Toyota Corolla 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Buildings (5%, SLM)</SelectItem>
                          <SelectItem value="2">Plant & Machinery (15%, WDV)</SelectItem>
                          <SelectItem value="3">Vehicles (20%, WDV)</SelectItem>
                          <SelectItem value="4">Computers & IT (30%, WDV)</SelectItem>
                          <SelectItem value="5">Furniture (10%, SLM)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchase_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Cost (PKR)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="2000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="useful_life_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Useful Life (Months)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="residual_value_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Residual Value (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="depreciation_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depreciation Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SLM">Straight Line (SLM)</SelectItem>
                          <SelectItem value="WDV">Written Down Value (WDV)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Head Office, Karachi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Asset'}
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
