"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Factory, FileText, Package, Plus, BarChart3 } from "lucide-react"
import { fetchBOMs, fetchProductionOrders, type BOM, type ProductionOrder } from "@/lib/api/manufacturing"
import { useToast } from "@/components/ui/toaster"

export default function ManufacturingDashboardPage() {
  const { toast } = useToast()
  const [boms, setBoms] = useState<BOM[]>([])
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [bomsData, ordersData] = await Promise.all([
        fetchBOMs(),
        fetchProductionOrders(),
      ])
      setBoms(bomsData)
      setOrders(ordersData)
    } catch (error: any) {
      console.error("Failed to load manufacturing data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load manufacturing data",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const activeBOMs = boms.filter((b) => b.status === "active").length
  const inProgressOrders = orders.filter((o) => o.status === "in_progress").length
  const completedOrders = orders.filter((o) => o.status === "completed").length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manufacturing</h1>
        <p className="text-gray-500 mt-1">BOM management and production tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{boms.length}</p>
            <p className="text-sm text-gray-500">Total BOMs</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeBOMs}</p>
            <p className="text-sm text-gray-500">Active BOMs</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Factory className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{inProgressOrders}</p>
            <p className="text-sm text-gray-500">In Progress</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
            <Package className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{completedOrders}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/manufacturing/bom/new">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Create BOM</h3>
                <p className="text-sm text-gray-500">Define a new Bill of Materials</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/manufacturing/production/new">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Factory className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">New Production Order</h3>
                <p className="text-sm text-gray-500">Start a new production run</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent BOMs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent BOMs</h2>
          <Link href="/dashboard/manufacturing/bom" className="text-sm text-blue-600 hover:text-blue-700">
            View All →
          </Link>
        </div>
        {boms.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No BOMs created yet</p>
        ) : (
          <div className="space-y-2">
            {boms.slice(0, 5).map((bom) => (
              <Link key={bom.id} href={`/dashboard/manufacturing/bom/${bom.id}`} className="block">
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div>
                    <p className="font-medium text-gray-900">Product #{bom.product_id}</p>
                    <p className="text-sm text-gray-500">Version {bom.version}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      bom.status === "active"
                        ? "bg-green-100 text-green-800"
                        : bom.status === "draft"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {bom.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Production Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Production Orders</h2>
          <Link href="/dashboard/manufacturing/production" className="text-sm text-blue-600 hover:text-blue-700">
            View All →
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No production orders yet</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div>
                  <p className="font-medium text-gray-900">Order #{order.id}</p>
                  <p className="text-sm text-gray-500">Qty: {order.quantity}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    order.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : order.status === "in_progress"
                      ? "bg-yellow-100 text-yellow-800"
                      : order.status === "planned"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {order.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
