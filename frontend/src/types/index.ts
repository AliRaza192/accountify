export interface User {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'accountant' | 'viewer'
  company_id: string | null
  created_at: string
}

export interface Company {
  id: string
  name: string
  ntn: string | null
  address: string | null
  phone: string | null
  email: string | null
  currency: string
  logo_url: string | null
  created_at: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}
