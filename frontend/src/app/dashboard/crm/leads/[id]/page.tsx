'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchLead, updateLead, convertLeadToCustomer } from '@/lib/api/crm';
import { toast } from 'sonner';
import { ArrowLeft, TrendingUp, Mail, Phone, Calendar } from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    if (params.id) {
      loadLead();
    }
  }, [params.id]);

  async function loadLead() {
    try {
      setLoading(true);
      const data = await fetchLead(params.id as string);
      setLead(data);
      setEditData(data);
    } catch (error) {
      console.error('Error loading lead:', error);
      toast.error('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      await updateLead(params.id as string, editData);
      toast.success('Lead updated successfully');
      setEditing(false);
      loadLead();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    }
  }

  async function handleConvert() {
    if (!confirm('Convert this lead to customer?')) return;
    
    try {
      await convertLeadToCustomer(params.id as string);
      toast.success('Lead converted to customer successfully');
      router.push('/dashboard/crm/leads');
    } catch (error) {
      console.error('Error converting lead:', error);
      toast.error('Failed to convert lead');
    }
  }

  if (loading) {
    return <div className="container mx-auto py-6">Loading...</div>;
  }

  if (!lead) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Lead not found</div>
      </div>
    );
  }

  const stages = ['new', 'contacted', 'proposal', 'negotiation', 'converted', 'lost'];
  const currentStageIndex = stages.indexOf(lead.stage);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{lead.name}</h1>
            <p className="text-muted-foreground">{lead.lead_code}</p>
          </div>
          <div className="flex gap-2">
            {lead.stage !== 'converted' && (
              <Button onClick={handleConvert}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Convert to Customer
              </Button>
            )}
            <Button variant={editing ? 'default' : 'outline'} onClick={() => setEditing(!editing)}>
              {editing ? 'Save' : 'Edit'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Stage Progression */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {stages.map((stage, index) => (
                <div key={stage} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStageIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  {index < stages.length - 1 && (
                    <div className={`w-16 h-1 mx-2 ${
                      index < currentStageIndex ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              {stages.map((stage) => (
                <span key={stage} className="capitalize">{stage}</span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lead Details */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={editData.contact_email || ''}
                      onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={editData.contact_phone || ''}
                      onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.contact_email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.contact_phone || 'Not provided'}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label>Source</Label>
                    <Select
                      value={editData.source}
                      onValueChange={(value) => setEditData({ ...editData, source: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="walk_in">Walk-in</SelectItem>
                        <SelectItem value="cold_call">Cold Call</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estimated Value (PKR)</Label>
                    <Input
                      type="number"
                      value={editData.estimated_value || ''}
                      onChange={(e) => setEditData({ ...editData, estimated_value: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Probability (%)</Label>
                    <Input
                      type="number"
                      value={editData.probability_percent || 50}
                      onChange={(e) => setEditData({ ...editData, probability_percent: parseInt(e.target.value) })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Source</Label>
                    <p className="font-medium capitalize">{lead.source}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estimated Value</Label>
                    <p className="font-medium">
                      {lead.estimated_value ? `PKR ${lead.estimated_value.toLocaleString()}` : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Probability</Label>
                    <p className="font-medium">{lead.probability_percent}%</p>
                  </div>
                  {lead.ai_score && (
                    <div>
                      <Label className="text-xs text-muted-foreground">AI Score</Label>
                      <Badge variant={lead.ai_score > 70 ? 'default' : 'secondary'}>
                        {lead.ai_score}/100
                      </Badge>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Activity & Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead.follow_up_date && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Follow-up Scheduled</p>
                  <p className="text-sm text-blue-600">{lead.follow_up_date}</p>
                </div>
              </div>
            )}
            <div className="text-sm text-muted-foreground mt-4">
              <p>Created: {new Date(lead.created_at).toLocaleDateString()}</p>
              <p>Last Updated: {new Date(lead.updated_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
