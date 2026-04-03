"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, FileText, DollarSign, User, Calendar, MessageSquare,
  CheckCircle, XCircle, Loader2, Clock
} from "lucide-react"
import { fetchApprovalRequest, approveRequest, rejectRequest, type ApprovalRequest, type ApprovalAction } from "@/lib/api/approvals"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"

export default function ApprovalDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [request, setRequest] = useState<ApprovalRequest | null>(null)
  const [actions, setActions] = useState<ApprovalAction[]>([])
  const [comments, setComments] = useState("")
  const [showApprove, setShowApprove] = useState(false)
  const [showReject, setShowReject] = useState(false)

  useEffect(() => {
    loadApproval()
  }, [params.id])

  const loadApproval = async () => {
    try {
      const data = await fetchApprovalRequest(parseInt(params.id))
      setRequest(data.request)
      setActions(data.actions || [])
    } catch (error: any) {
      console.error("Failed to load approval request:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load approval request",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      await approveRequest(parseInt(params.id), { comments })
      toast({
        title: "Success",
        description: "Request approved successfully",
      })
      router.push("/dashboard/approvals")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "error",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!comments.trim()) {
      toast({
        title: "Error",
        description: "Comments are required when rejecting",
        variant: "error",
      })
      return
    }
    setActionLoading(true)
    try {
      await rejectRequest(parseInt(params.id), { comments })
      toast({
        title: "Success",
        description: "Request rejected successfully",
      })
      router.push("/dashboard/approvals")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "error",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatPKR = (amount?: number) => {
    if (amount === undefined) return "—"
    return `PKR ${amount.toLocaleString("en-PK")}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">Approval request not found</p>
        <Link href="/dashboard/approvals">
          <Button className="mt-4">Back to Approvals</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/approvals">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {request.document_title || `${request.document_type} #${request.document_id}`}
          </h1>
          <p className="text-gray-500 mt-1">Approval Request #{request.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Request Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Document Type</p>
                <p className="font-medium text-gray-900 capitalize">{request.document_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="font-medium text-gray-900">{formatPKR(request.document_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Requested By</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {request.requested_by_name || request.requested_by}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Requested At</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(request.requested_at)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${
                    request.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : request.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Approval Level</p>
                <p className="font-medium text-gray-900">Level {request.current_level}</p>
              </div>
            </div>
          </div>

          {/* Action History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Action History</h2>
            {actions.length === 0 ? (
              <p className="text-gray-500 text-sm">No actions yet</p>
            ) : (
              <div className="space-y-3">
                {actions.map((action) => (
                  <div key={action.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      {action.action === "approved" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : action.action === "rejected" ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 capitalize">{action.action}</p>
                        <p className="text-xs text-gray-500">{formatDate(action.actioned_at)}</p>
                      </div>
                      <p className="text-sm text-gray-600">By: {action.actioned_by}</p>
                      {action.comments && (
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {action.comments}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions Panel */}
        <div className="space-y-4">
          {request.status === "pending" && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Take Action</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MessageSquare className="h-4 w-4 inline mr-1" />
                    Comments
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Add your comments..."
                  />
                </div>

                <div className="space-y-2">
                  {showApprove ? (
                    <div className="space-y-2">
                      <Button
                        onClick={handleApprove}
                        disabled={actionLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirm Approve
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowApprove(false)}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setShowApprove(true)
                        setShowReject(false)
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  )}

                  {showReject ? (
                    <div className="space-y-2">
                      <Button
                        onClick={handleReject}
                        disabled={actionLoading}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Confirm Reject
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowReject(false)}
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setShowReject(true)
                        setShowApprove(false)
                      }}
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
