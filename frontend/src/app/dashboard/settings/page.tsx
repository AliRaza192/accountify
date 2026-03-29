"use client"

import { useState } from "react"
import { Building, User, CreditCard, MapPin, Phone, Mail, Upload, Save } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface CompanyData {
  id: string
  name: string
  ntn: string
  strn: string
  address: string
  phone: string
  email: string
  currency: string
  financial_year_start: string
  invoice_prefix: string
  bill_prefix: string
  date_format: string
  timezone: string
  logo_url?: string
}

type TabType = "company" | "users" | "preferences"

export default function SettingsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>("company")
  const [isLoading, setIsLoading] = useState(false)
  const [companyData, setCompanyData] = useState<CompanyData>({
    id: "",
    name: "",
    ntn: "",
    strn: "",
    address: "",
    phone: "",
    email: "",
    currency: "PKR",
    financial_year_start: "07-01",
    invoice_prefix: "INV-",
    bill_prefix: "BILL-",
    date_format: "DD/MM/YYYY",
    timezone: "Asia/Karachi",
  })

  const handleSaveCompany = async () => {
    setIsLoading(true)
    try {
      // This would call PUT /api/companies/{id}
      // For now, simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      toast({
        title: "Success",
        description: "Company settings saved successfully",
        
      })
    } catch (error: any) {
      console.error("Failed to save settings:", error)
      toast({
        title: "Error",
        description: "Failed to save company settings",
        
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogoUpload = () => {
    toast({
      title: "Info",
      description: "Logo upload coming soon",
      
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your company and application settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("company")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "company"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Company Profile
            </div>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "users"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Users
            </div>
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "preferences"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Preferences
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "company" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="name"
                    type="text"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ntn">NTN</Label>
                <input
                  id="ntn"
                  type="text"
                  value={companyData.ntn}
                  onChange={(e) => setCompanyData({ ...companyData, ntn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="strn">STRN</Label>
                <input
                  id="strn"
                  type="text"
                  value={companyData.strn}
                  onChange={(e) => setCompanyData({ ...companyData, strn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="currency">Default Currency</Label>
                <select
                  id="currency"
                  value={companyData.currency}
                  onChange={(e) => setCompanyData({ ...companyData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="PKR">PKR - Pakistani Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <div>
                <Label htmlFor="financial_year">Financial Year Start</Label>
                <input
                  id="financial_year"
                  type="month"
                  value={companyData.financial_year_start}
                  onChange={(e) => setCompanyData({ ...companyData, financial_year_start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  id="address"
                  value={companyData.address}
                  onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                  rows={3}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="phone"
                    type="tel"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Logo</h2>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                {companyData.logo_url ? (
                  <img src={companyData.logo_url} alt="Company Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <Button onClick={handleLogoUpload} variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Logo
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
            <Button
              onClick={handleSaveCompany}
              disabled={isLoading}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Users</h2>
              <p className="text-sm text-gray-500 mt-1">Manage user access and permissions</p>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <User className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>

          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">User management coming soon</p>
          </div>
        </div>
      )}

      {activeTab === "preferences" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Preferences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
                <input
                  id="invoice_prefix"
                  type="text"
                  value={companyData.invoice_prefix}
                  onChange={(e) => setCompanyData({ ...companyData, invoice_prefix: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="bill_prefix">Bill Prefix</Label>
                <input
                  id="bill_prefix"
                  type="text"
                  value={companyData.bill_prefix}
                  onChange={(e) => setCompanyData({ ...companyData, bill_prefix: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <Label htmlFor="date_format">Date Format</Label>
                <select
                  id="date_format"
                  value={companyData.date_format}
                  onChange={(e) => setCompanyData({ ...companyData, date_format: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={companyData.timezone}
                  onChange={(e) => setCompanyData({ ...companyData, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
            <Button
              onClick={handleSaveCompany}
              disabled={isLoading}
              className="px-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
