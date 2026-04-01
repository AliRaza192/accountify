'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchCRMDashboard, fetchLeads, fetchTickets } from '@/lib/api/crm';
import { toast } from 'sonner';
import { Users, FileText, TrendingUp, AlertCircle, Plus } from 'lucide-react';

export default function CRMDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [openTickets, setOpenTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [dashboardData, leadsData, ticketsData] = await Promise.all([
        fetchCRMDashboard(),
        fetchLeads(),
        fetchTickets('open'),
      ]);
      setDashboard(dashboardData);
      setRecentLeads(leadsData.slice(0, 5));
      setOpenTickets(ticketsData.slice(0, 5));
    } catch (error) {
      console.error('Error loading CRM data:', error);
      toast.error('Failed to load CRM data');
    } finally {
      setLoading(false);
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
            <h1 className="text-3xl font-bold mb-2">CRM Dashboard</h1>
            <p className="text-muted-foreground">
              Manage leads, support tickets, and customer loyalty
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard/crm/leads/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.total_leads || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.leads_by_stage?.new || 0} new, {dashboard?.leads_by_stage?.contacted || 0} contacted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PKR {dashboard?.pipeline_value?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Weighted: PKR {dashboard?.weighted_pipeline_value?.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.open_tickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.critical_tickets || 0} critical priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.conversion_rate?.toFixed(1) || '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.leads_by_stage?.converted || 0} converted from {dashboard?.total_leads || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads & Open Tickets */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.source}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.stage}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {lead.estimated_value ? `PKR ${lead.estimated_value.toLocaleString()}` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Open Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                    <TableCell>{ticket.issue_category}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.priority === 'critical' ? 'destructive' : 'default'}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ticket.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button onClick={() => router.push('/dashboard/crm/leads')}>
              Manage Leads
            </Button>
            <Button onClick={() => router.push('/dashboard/crm/tickets')} variant="outline">
              Support Tickets
            </Button>
            <Button onClick={() => router.push('/dashboard/crm/loyalty')} variant="outline">
              Loyalty Program
            </Button>
            <Button onClick={() => router.push('/dashboard/crm/leads/new')} variant="outline">
              Add New Lead
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
