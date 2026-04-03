'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface UserPermissions {
  modules: string[];
  actions: Record<string, string[]>;
}

interface PermissionGuardProps {
  children: React.ReactNode;
  module?: string;
  action?: string;
  fallback?: React.ReactNode;
}

export default function PermissionGuard({ 
  children, 
  module, 
  action,
  fallback = null 
}: PermissionGuardProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkPermission();
  }, [module, action]);

  const checkPermission = async () => {
    try {
      const response = await axios.get('/api/roles/me/permissions');
      const permissions: UserPermissions = response.data.effective_permissions;
      
      // Check if user has access to module
      if (module) {
        const hasModuleAccess = permissions.modules.includes('*') || 
                                permissions.modules.includes(module);
        
        if (!hasModuleAccess) {
          setHasPermission(false);
          setLoading(false);
          return;
        }
        
        // Check action if specified
        if (action) {
          const moduleActions = permissions.actions[module] || [];
          const allActions = permissions.actions['*'] || [];
          const hasAction = moduleActions.includes(action) || 
                           allActions.includes(action) || 
                           allActions.includes('*');
          
          setHasPermission(hasAction);
        } else {
          setHasPermission(true);
        }
      } else {
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Failed to check permissions:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Helper function to check permissions in components
export function usePermissions() {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const response = await axios.get('/api/roles/me/permissions');
        setPermissions(response.data.effective_permissions);
      } catch (error) {
        console.error('Failed to load permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const hasPermission = (module: string, action: string) => {
    if (!permissions) return false;
    
    const hasModuleAccess = permissions.modules.includes('*') || 
                            permissions.modules.includes(module);
    
    if (!hasModuleAccess) return false;
    
    const moduleActions = permissions.actions[module] || [];
    const allActions = permissions.actions['*'] || [];
    
    return moduleActions.includes(action) || 
           allActions.includes(action) || 
           allActions.includes('*');
  };

  return { permissions, hasPermission, loading };
}
