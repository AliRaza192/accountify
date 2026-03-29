"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Calculator, Loader2, Mail, Lock, User, Building2 } from "lucide-react"
import api from "@/lib/api"
import { ToastProvider, useToast } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const registerSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

function RegisterFormContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      // Step 1: Register user (creates company automatically)
      const registerResponse = await api.post("/api/auth/register", {
        full_name: data.name,
        email: data.email,
        password: data.password,
        company_name: data.companyName,
      })

      const { access_token } = registerResponse.data

      // Save token and redirect
      localStorage.setItem("access_token", access_token)

      toast({
        title: "Registration successful",
        description: "Welcome to AI Accounts!",
        variant: "success",
      })

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.response?.data?.detail || error.response?.data?.message || "Something went wrong",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Full Name Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register("name")}
              type="text"
              placeholder="John Doe"
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-lg border bg-white transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                errors.name ? "border-red-300" : "border-gray-200"
              )}
            />
          </div>
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-lg border bg-white transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                errors.email ? "border-red-300" : "border-gray-200"
              )}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Company Name Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Company Name</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register("companyName")}
              type="text"
              placeholder="Acme Inc."
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-lg border bg-white transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                errors.companyName ? "border-red-300" : "border-gray-200"
              )}
            />
          </div>
          {errors.companyName && (
            <p className="text-sm text-red-500">{errors.companyName.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-lg border bg-white transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                errors.password ? "border-red-300" : "border-gray-200"
              )}
            />
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register("confirmPassword")}
              type="password"
              placeholder="••••••••"
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-lg border bg-white transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                errors.confirmPassword ? "border-red-300" : "border-gray-200"
              )}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* Login Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <ToastProvider>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg mb-4">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-500 mt-2">Start your free trial today</p>
          </div>

          <RegisterFormContent />
        </div>
      </div>
    </ToastProvider>
  )
}
