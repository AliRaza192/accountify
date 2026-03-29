"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
    icon?: React.ReactNode
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  if (!action) {
    return (
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {action.href ? (
        <Link href={action.href}>
          <Button variant={action.variant || "default"} className="flex items-center gap-2">
            {action.icon}
            {action.label}
          </Button>
        </Link>
      ) : (
        <Button
          variant={action.variant || "default"}
          onClick={action.onClick}
          className="flex items-center gap-2"
        >
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  )
}
