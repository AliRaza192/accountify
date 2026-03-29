import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined, currency: string = "PKR"): string {
  if (amount === null || amount === undefined) return `${currency} 0.00`
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount
  return `${currency} ${numericAmount.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(dateString: string | null | undefined, format: "short" | "long" | "relative" = "short"): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ""

  if (format === "short") {
    return date.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })
  }
  if (format === "long") {
    return date.toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })
  }
  return date.toLocaleDateString("en-PK")
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ""
  return date.toLocaleString("en-PK", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}
