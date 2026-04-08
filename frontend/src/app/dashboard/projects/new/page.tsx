'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createProject } from '@/lib/api/projects';

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    project_code: '',
    project_name: '',
    client_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: '',
    status: 'active',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const projectData: any = {
        project_code: formData.project_code,
        project_name: formData.project_name,
        start_date: formData.start_date,
        budget: parseFloat(formData.budget) || 0,
        status: formData.status,
        description: formData.description,
      };

      if (formData.client_id) projectData.client_id = formData.client_id;
      if (formData.end_date) projectData.end_date = formData.end_date;

      await createProject(projectData);
      router.push('/dashboard/projects');
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/dashboard/projects" className="text-blue-600 hover:text-blue-800">
          ← Back to Projects
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Project</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Code *</label>
              <input
                type="text"
                required
                value={formData.project_code}
                onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="PROJ-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
              <input
                type="text"
                required
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Construction Project Alpha"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
              <input
                type="text"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget (PKR) *</label>
              <input
                type="number"
                required
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="1000000"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              placeholder="Project description..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
            <Link
              href="/dashboard/projects"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
