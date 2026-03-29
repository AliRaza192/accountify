"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"

export interface User {
  id: string
  email: string
  full_name: string
  company_id?: string
  company_name?: string
}

export function useAuth() {
  const router = useRouter()

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
  }, [])

  const getUser = useCallback((): User | null => {
    const token = getToken()
    if (!token) return null

    try {
      const base64Url = token.split(".")[1]
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
      const payload = JSON.parse(jsonPayload)
      
      return {
        id: payload.sub || payload.id || "",
        email: payload.email || "",
        full_name: payload.full_name || payload.name || "",
        company_id: payload.company_id,
        company_name: payload.company_name,
      }
    } catch (error) {
      console.error("Failed to decode token:", error)
      return null
    }
  }, [getToken])

  const logout = useCallback(() => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    router.push("/login")
  }, [router])

  const isAuthenticated = useCallback(() => {
    return !!getToken()
  }, [getToken])

  return {
    getToken,
    getUser,
    logout,
    isAuthenticated,
  }
}

export default useAuth
