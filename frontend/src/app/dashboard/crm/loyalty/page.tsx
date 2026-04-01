'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchLoyaltyProgram, updateLoyaltyProgram, earnPoints, redeemPoints } from '@/lib/api/crm';
import { toast } from 'sonner';
import { Settings, Award, TrendingUp, TrendingDown } from 'lucide-react';

export default function LoyaltyPage() {
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showEarnDialog, setShowEarnDialog] = useState(false);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [earnData, setEarnData] = useState({ customer_id: '', amount_spent: '', description: '' });
  const [redeemData, setRedeemData] = useState({ customer_id: '', points_to_redeem: '', description: '' });

  useEffect(() => {
    loadProgram();
  }, []);

  async function loadProgram() {
    try {
      setLoading(true);
      const data = await fetchLoyaltyProgram();
      setProgram(data);
      setEditData(data);
    } catch (error) {
      console.error('Error loading loyalty program:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    try {
      await updateLoyaltyProgram(editData);
      toast.success('Loyalty program updated');
      setShowSettingsDialog(false);
      loadProgram();
    } catch (error) {
      console.error('Error updating program:', error);
      toast.error('Failed to update program');
    }
  }

  async function handleEarnPoints() {
    try {
      await earnPoints(
        earnData.customer_id,
        parseFloat(earnData.amount_spent),
        undefined,
        earnData.description
      );
      toast.success('Points earned successfully');
      setShowEarnDialog(false);
      setEarnData({ customer_id: '', amount_spent: '', description: '' });
    } catch (error) {
      console.error('Error earning points:', error);
      toast.error('Failed to earn points');
    }
  }

  async function handleRedeemPoints() {
    try {
      await redeemPoints(
        redeemData.customer_id,
        parseFloat(redeemData.points_to_redeem),
        undefined,
        redeemData.description
      );
      toast.success('Points redeemed successfully');
      setShowRedeemDialog(false);
      setRedeemData({ customer_id: '', points_to_redeem: '', description: '' });
    } catch (error) {
      console.error('Error redeeming points:', error);
      toast.error('Failed to redeem points');
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Loyalty Program</h1>
            <p className="text-muted-foreground">Manage customer loyalty points and rewards</p>
          </div>
          <Button onClick={() => setShowSettingsDialog(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Program Settings
          </Button>
        </div>
      </div>

      {/* Program Summary */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Per Rupee</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{program?.points_per_rupee}</div>
            <p className="text-xs text-muted-foreground">
              Points earned per PKR spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redemption Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{program?.redemption_rate}</div>
            <p className="text-xs text-muted-foreground">
              PKR value per point
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={program?.is_active ? 'default' : 'secondary'}>
              {program?.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => setShowEarnDialog(true)} className="w-full">
              <TrendingUp className="mr-2 h-4 w-4" />
              Award Points (Manual)
            </Button>
            <Button onClick={() => setShowRedeemDialog(true)} variant="outline" className="w-full">
              <TrendingDown className="mr-2 h-4 w-4" />
              Redeem Points
            </Button>
          </CardContent>
        </Card>

        {/* Tier Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Tier Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            {program?.tier_benefits_json?.tiers ? (
              <div className="space-y-3">
                {program.tier_benefits_json.tiers.map((tier: any, index: number) => (
                  <div key={tier.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{tier.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tier.min_points.toLocaleString()}+ points
                      </p>
                    </div>
                    <Badge variant="outline">{tier.bonus_multiplier}x Bonus</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No tier benefits configured
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Program Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Program Name</Label>
              <Input
                value={editData.program_name || ''}
                onChange={(e) => setEditData({ ...editData, program_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Points Per Rupee</Label>
              <Input
                type="number"
                step="0.1"
                value={editData.points_per_rupee || 1}
                onChange={(e) => setEditData({ ...editData, points_per_rupee: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Redemption Rate (PKR per point)</Label>
              <Input
                type="number"
                step="0.1"
                value={editData.redemption_rate || 1}
                onChange={(e) => setEditData({ ...editData, redemption_rate: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex gap-4">
              <Button onClick={handleSaveSettings} className="flex-1">
                Save Settings
              </Button>
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Earn Points Dialog */}
      <Dialog open={showEarnDialog} onOpenChange={setShowEarnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Award Points</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer ID</Label>
              <Input
                value={earnData.customer_id}
                onChange={(e) => setEarnData({ ...earnData, customer_id: e.target.value })}
                placeholder="Customer UUID"
              />
            </div>
            <div>
              <Label>Amount Spent (PKR)</Label>
              <Input
                type="number"
                value={earnData.amount_spent}
                onChange={(e) => setEarnData({ ...earnData, amount_spent: e.target.value })}
                placeholder="1000"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={earnData.description}
                onChange={(e) => setEarnData({ ...earnData, description: e.target.value })}
                placeholder="e.g., Manual adjustment"
              />
            </div>
            <div className="flex gap-4">
              <Button onClick={handleEarnPoints} className="flex-1">
                Award Points
              </Button>
              <Button variant="outline" onClick={() => setShowEarnDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redeem Points Dialog */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Points</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Customer ID</Label>
              <Input
                value={redeemData.customer_id}
                onChange={(e) => setRedeemData({ ...redeemData, customer_id: e.target.value })}
                placeholder="Customer UUID"
              />
            </div>
            <div>
              <Label>Points to Redeem</Label>
              <Input
                type="number"
                value={redeemData.points_to_redeem}
                onChange={(e) => setRedeemData({ ...redeemData, points_to_redeem: e.target.value })}
                placeholder="100"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={redeemData.description}
                onChange={(e) => setRedeemData({ ...redeemData, description: e.target.value })}
                placeholder="e.g., Discount on invoice"
              />
            </div>
            <div className="flex gap-4">
              <Button onClick={handleRedeemPoints} className="flex-1">
                Redeem Points
              </Button>
              <Button variant="outline" onClick={() => setShowRedeemDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
