"use client"

import { useEffect } from "react"

export default function SalesCustomersPage() {
  useEffect(() => {
    window.location.href = "/dashboard/customers"
  }, [])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to Customers page...</p>
      </div>
    </div>
  )
}
