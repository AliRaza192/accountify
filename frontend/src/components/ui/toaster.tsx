"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastVariant = "success" | "error" | "info"

interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextType {
  toast: (props: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({ title, description, variant = "info" }: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = { id, title, description, variant }

    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex w-80 items-start gap-3 rounded-lg border p-4 shadow-lg transition-all animate-in slide-in-from-right",
              {
                "border-green-200 bg-green-50 text-green-900": toast.variant === "success",
                "border-red-200 bg-red-50 text-red-900": toast.variant === "error",
                "border-blue-200 bg-blue-50 text-blue-900": toast.variant === "info",
              }
            )}
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-xs opacity-80">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="rounded-md p-1 hover:bg-black/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
