'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchLeads, updateLeadStage } from '@/lib/api/crm';
import { toast } from 'sonner';
import { Plus, Search, Filter } from 'lucide-react';

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    loadLeads();
  }, [stageFilter, sourceFilter]);

  async function loadLeads() {
    try {
      setLoading(true);
      const data = await fetchLeads(
        stageFilter !== 'all' ? stageFilter : undefined,
        sourceFilter !== 'all' ? sourceFilter : undefined
      );
      setLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }

  async function handleStageChange(leadId: string, newStage: string) {
    try {
      await updateLeadStage(leadId, newStage);
      toast.success('Lead stage updated');
      loadLeads();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Failed to update stage');
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contact_email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stages = ['new', 'contacted', 'proposal', 'negotiation', 'converted', 'lost'];
  const stageColors: Record<string, string> = {
    new: 'bg-blue-100 border-blue-300',
    contacted: 'bg-yellow-100 border-yellow-300',
    proposal: 'bg-purple-100 border-purple-300',
    negotiation: 'bg-orange-100 border-orange-300',
    converted: 'bg-green-100 border-green-300',
    lost: 'bg-red-100 border-red-300',
  };

  if (viewMode === 'kanban') {
    return (
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Leads Pipeline</h1>
              <p className="text-muted-foreground">Drag and drop leads between stages</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setViewMode('list')}>
                List View
              </Button>
              <Button onClick={() => router.push('/dashboard/crm/leads/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <div className="grid grid-cols-6 gap-4">
          {stages.map((stage) => (
            <div key={stage} className={`rounded-lg border-2 ${stageColors[stage]} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold capitalize">{stage}</h3>
                <Badge variant="outline">
                  {filteredLeads.filter(l => l.stage === stage).length}
                </Badge>
              </div>
              <div className="space-y-2">
                {filteredLeads.filter(l => l.stage === stage).map((lead) => (
                  <Card key={lead.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div>
                          <p className="font-medium text-sm">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.contact_email || lead.contact_phone}</p>
                        </div>
                        {lead.estimated_value && (
                          <p className="text-xs font-medium">PKR {lead.estimated_value.toLocaleString()}</p>
                        )}
                        <div className="flex gap-1">
                          {stage !== 'converted' && stage !== 'lost' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  const prevStage = stages[stages.indexOf(stage) - 1];
                                  if (prevStage) handleStageChange(lead.id, prevStage);
                                }}
                              >
                                ←
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  const nextStage = stages[stages.indexOf(stage) + 1];
                                  if (nextStage) handleStageChange(lead.id, nextStage);
                                }}
                              >
                                →
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Leads</h1>
            <p className="text-muted-foreground">Manage and track sales leads</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setViewMode('kanban')}>
              Kanban View
            </Button>
            <Button onClick={() => router.push('/dashboard/crm/leads/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leads List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Probability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.lead_code}</TableCell>
                    <TableCell>{lead.name}</TableCell>
                    <TableCell>{lead.contact_email || lead.contact_phone || '-'}</TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.stage}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {lead.estimated_value ? `PKR ${lead.estimated_value.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>{lead.probability_percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
