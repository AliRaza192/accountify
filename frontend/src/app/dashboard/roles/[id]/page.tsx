'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Shield, Check } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import axios from 'axios';

interface Role {
  id: number;
  name: string;
  is_system: boolean;
  permissions_json: {
    modules: string[];
    actions: Record<string, string[]>;
  };
}

export default function RoleDetailPage() {
  const params = useParams();
  const roleId = params.id as string;
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRole();
  }, [roleId]);

  const loadRole = async () => {
    try {
      const response = await axios.get(`/api/roles/${roleId}`);
      setRole(response.data);
    } catch (error) {
      console.error('Failed to load role:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !role) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/dashboard/roles">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Roles
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6" />
              <CardTitle>{role.name}</CardTitle>
              {role.is_system && <Badge variant="secondary">System Role</Badge>}
            </div>
            <CardDescription>Role permissions and access control</CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">Module Access</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {role.permissions_json?.modules?.map((module: string) => (
                <div key={module} className="flex items-center gap-2 p-2 border rounded">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="capitalize">{module}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action Permissions</CardTitle>
            <CardDescription>Detailed action-level permissions per module</CardDescription>
          </CardHeader>
          <CardContent>
            {role.permissions_json?.actions && Object.entries(role.permissions_json.actions).map(([module, actions]) => (
              <div key={module} className="mb-4">
                <h4 className="font-semibold capitalize mb-2">{module}</h4>
                <div className="flex flex-wrap gap-2">
                  {actions.map((action: string) => (
                    <Badge key={action} variant="outline">
                      {action}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
