'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchProjectCosts, allocateCost, ProjectCost, fetchProject } from '@/lib/api/projects';

export default function ProjectCostsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [costs, setCosts] = useState<ProjectCost[]>([]);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    phase_id: '',
    cost_source_type: 'expense' as any,
    cost_source_id: '',
    amount: '',
    cost_category: '',
    allocated_date: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [costsData, projectData] = await Promise.all([
        fetchProjectCosts(projectId),
        fetchProject(projectId),
      ]);
      setCosts(costsData);
      setProject(projectData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const costData: any = {
        cost_source_type: formData.cost_source_type,
        cost_source_id: formData.cost_source_id || projectId,
        amount: parseFloat(formData.amount),
        cost_category: formData.cost_category,
        allocated_date: formData.allocated_date,
        description: formData.description,
      };
      if (formData.phase_id) costData.phase_id = formData.phase_id;

      await allocateCost(projectId, costData);
      setShowForm(false);
      setFormData({
        phase_id: '',
        cost_source_type: 'expense',
        cost_source_id: '',
        amount: '',
        cost_category: '',
        allocated_date: new Date().toISOString().split('T')[0],
        description: '',
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to allocate cost');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalCosts = costs.reduce((sum, cost) => sum + cost.amount, 0);

  const getCategoryColor = (category: string) => {
    const colors: any = {
      materials: 'bg-blue-100 text-blue-800',
      labor: 'bg-green-100 text-green-800',
      overhead: 'bg-purple-100 text-purple-800',
      equipment: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category.toLowerCase()] || colors.other;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/dashboard/projects/${projectId}`} className="text-blue-600 hover:text-blue-800">
          ← Back to Project
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Costs</h1>
          {project && <p className="text-gray-600 mt-1">{project.project_name} ({project.project_code})</p>}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ Allocate Cost'}
        </button>
      </div>

      {/* Cost Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Allocate Cost to Project</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost Category *</label>
                <input
                  type="text"
                  required
                  value={formData.cost_category}
                  onChange={(e) => setFormData({ ...formData, cost_category: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Materials, Labor, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (PKR) *</label>
                <input
                  type="number"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="50000"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source Type *</label>
                <select
                  value={formData.cost_source_type}
                  onChange={(e) => setFormData({ ...formData, cost_source_type: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="expense">Expense</option>
                  <option value="invoice">Invoice</option>
                  <option value="payroll">Payroll</option>
                  <option value="journal">Journal Entry</option>
                  <option value="inventory">Inventory</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.allocated_date}
                  onChange={(e) => setFormData({ ...formData, allocated_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source ID *</label>
              <input
                type="text"
                required
                value={formData.cost_source_id}
                onChange={(e) => setFormData({ ...formData, cost_source_id: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="ID of source document"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
            >
              Allocate Cost
            </button>
          </form>
        </div>
      )}

      {/* Summary Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-blue-600">Total Costs Allocated</div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalCosts)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-600">Number of Costs</div>
            <div className="text-2xl font-bold text-blue-900">{costs.length}</div>
          </div>
        </div>
      </div>

      {/* Costs Table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading costs...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {costs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No costs allocated yet. Click "Allocate Cost" to get started.
                  </td>
                </tr>
              ) : (
                costs.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(cost.cost_category)}`}>
                        {cost.cost_category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cost.cost_source_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(cost.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(cost.allocated_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                      {cost.description || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
