'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchProject, Project } from '@/lib/api/projects';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProject(projectId);
      setProject(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Project not found'}</p>
          <Link href="/dashboard/projects" className="mt-2 inline-block text-blue-600 hover:text-blue-800">
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/dashboard/projects" className="text-blue-600 hover:text-blue-800">
          ← Back to Projects
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.project_name}</h1>
            <p className="text-gray-600 mt-1">{project.project_code}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(project.status)}`}>
            {project.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {project.description && (
          <p className="text-gray-700 mb-4">{project.description}</p>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 rounded p-4">
            <div className="text-sm text-gray-600">Budget</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(project.budget)}</div>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <div className="text-sm text-gray-600">Start Date</div>
            <div className="text-xl font-bold text-gray-900">{formatDate(project.start_date)}</div>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <div className="text-sm text-gray-600">End Date</div>
            <div className="text-xl font-bold text-gray-900">{formatDate(project.end_date || '')}</div>
          </div>
          <div className="bg-gray-50 rounded p-4">
            <div className="text-sm text-gray-600">Status</div>
            <div className="text-xl font-bold text-gray-900">{project.status.replace('_', ' ').toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href={`/dashboard/projects/${projectId}/costs`} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="text-2xl mb-2">💰</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Costs</h3>
          <p className="text-gray-600 text-sm">View and allocate costs to this project</p>
        </Link>

        <Link href={`/dashboard/projects/${projectId}/reports/profitability`} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profitability Report</h3>
          <p className="text-gray-600 text-sm">View revenue, costs, and profit margin</p>
        </Link>

        <Link href={`/dashboard/projects/${projectId}/reports/budget-vs-actual`} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
          <div className="text-2xl mb-2">📈</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Budget vs Actual</h3>
          <p className="text-gray-600 text-sm">Compare budget with actual spending</p>
        </Link>
      </div>
    </div>
  );
}
