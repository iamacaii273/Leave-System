import { useEffect, useMemo, useRef, useState } from "react"
import {
  PenLine,
  Trash2,
  UserCog,
  Mail,
  Briefcase,
  Calendar as CalendarIcon,
  Umbrella,
  Users,
  Thermometer,
  Folder,
  X,
  Check,
  Shield,
  Phone
} from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import Header from "../../components/Header"
import api from "../../services/api"

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

function formatDate(value) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDays(value) {
  const numeric = Number(value || 0)
  const oneDecimal = numeric.toFixed(1)
  return oneDecimal.endsWith(".0") ? String(Math.trunc(numeric)) : oneDecimal
}

function formatDateRange(startDate, endDate) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  return start === end ? start : `${start} - ${end}`
}

function formatDateShort(dateString) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function isSameDayStr(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return start.getFullYear() === end.getFullYear()
    && start.getMonth() === end.getMonth()
    && start.getDate() === end.getDate()
}

function formatDurationText(totalDays) {
  const totalHours = Number(totalDays || 0) * 8
  const days = Math.floor(totalHours / 8)
  const remainder = totalHours - (days * 8)
  const hours = Math.floor(remainder)
  const minutes = Math.round((remainder - hours) * 60)
  const parts = []

  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.join(" ") || "0h"
}

function getBarWidth(used, total) {
  const safeUsed = Number(used || 0)
  const safeTotal = Number(total || 0)
  if (safeTotal <= 0) return "0%"
  return `${Math.min((safeUsed / safeTotal) * 100, 100)}%`
}

function getBalanceKey(name = "") {
  const normalized = name.toLowerCase()
  if (normalized.includes("sick")) return "sick"
  if (normalized.includes("personal")) return "personal"
  if (normalized.includes("annual") || normalized.includes("vacation")) return "annual"
  return name
}

function getBalanceTheme(name = "") {
  const normalized = name.toLowerCase()

  if (normalized.includes("sick")) {
    return {
      Icon: Thermometer,
      cardClass: "bg-[#ffca7a]",
      textClass: "text-[#855913]",
      trackClass: "bg-[#e0a446]",
      fillClass: "bg-[#855913]",
      iconClass: "text-[#e0a446]",
    }
  }

  if (normalized.includes("personal")) {
    return {
      Icon: Users,
      cardClass: "bg-[#ff9bc9]",
      textClass: "text-[#8e3966]",
      trackClass: "bg-[#d470a1]",
      fillClass: "bg-[#8e3966]",
      iconClass: "text-[#d470a1]",
    }
  }

  if (normalized.includes("annual") || normalized.includes("vacation")) {
    return {
      Icon: Umbrella,
      cardClass: "bg-[#9cd5ff]",
      textClass: "text-[#2a6896]",
      trackClass: "bg-[#7ab2db]",
      fillClass: "bg-[#2a6896]",
      iconClass: "text-[#7ab2db]",
    }
  }

  return {
    Icon: Folder,
    cardClass: "bg-[#d9ecf7]",
    textClass: "text-[#2a617f]",
    trackClass: "bg-[#9cc6dc]",
    fillClass: "bg-[#2a617f]",
    iconClass: "text-[#9cc6dc]",
  }
}

function getRequestTheme(status = "") {
  const normalized = status.toLowerCase()
  if (normalized === "approved") return { bg: "#0cf1aa", text: "#185b48" }
  if (normalized === "rejected") return { bg: "#f56464", text: "#570008" }
  if (normalized === "acknowledged") return { bg: "#93c5fd", text: "#1e3a8a" }
  if (normalized === "cancelled") return { bg: "#e2e8f0", text: "#475569" }
  return { bg: "#fee481", text: "#6b5413" }
}

function getRequestIconData(typeName = "") {
  const normalized = typeName.toLowerCase()
  if (normalized.includes("sick")) return { Icon: Thermometer, color: "#f57a00", bg: "#fff2e5" }
  if (normalized.includes("personal")) return { Icon: Users, color: "#d06ab0", bg: "#f8e0f0" }
  return { Icon: Umbrella, color: "#1982c4", bg: "#e6f2fb" }
}

export default function EmployeeProfile({ onNavigate }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const fileInputRef = useRef(null)

  const adminNavItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "employee", label: "Employee" },
    { id: "reports", label: "Reports" },
    { id: "leave-type", label: "Leave Type" }
  ]

  

  const [profileImg, setProfileImg] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [editingLeave, setEditingLeave] = useState(null)
  const [editValue, setEditValue] = useState("")
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [employee, setEmployee] = useState(null)
  const [balances, setBalances] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [accessSettings, setAccessSettings] = useState({
    role: "Employee",
    canApprove: false,
    canViewReports: false,
    isActive: true
  })

  useEffect(() => {
    const loadEmployee = async () => {
      try {
        setLoading(true)
        setError("")

        const [userRes, balanceRes, requestRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/leave-balances/user/${id}`),
          api.get("/leave-requests", { params: { user_id: id } }),
        ])

        const loadedUser = userRes.data?.user || null
        const loadedBalances = balanceRes.data?.balances || []
        const loadedRequests = requestRes.data?.leaveRequests || []

        setEmployee(loadedUser)
        setBalances(loadedBalances)
        setRequests(loadedRequests)
        setAccessSettings((prev) => ({
          ...prev,
          role: loadedUser?.role || prev.role,
          isActive: Boolean(loadedUser?.is_active),
        }))
      } catch (err) {
        console.error("HR employee profile error:", err)
        setError("Unable to load employee information right now.")
      } finally {
        setLoading(false)
      }
    }

    loadEmployee()
  }, [id])

  const displayedActivities = useMemo(
    () => (showAllActivities ? requests : requests.slice(0, 3)),
    [requests, showAllActivities]
  )

  const handleDeleteEmployee = () => {
    setShowDeleteModal(false)
    navigate("/hr/employee")
  }

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setProfileImg(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const startEditLeave = (type, totalValue) => {
    setEditingLeave(type)
    setEditValue(String(totalValue))
  }

  const saveEditLeave = () => {
    setEditingLeave(null)
    setEditValue("")
  }

  const cancelEditLeave = () => {
    setEditingLeave(null)
    setEditValue("")
  }

  const displayedName = employee?.full_name || "Employee"
  const headerStatusClass = employee?.is_active ? "bg-[#bfeadd] text-[#3b6661]" : "bg-[#e2e8f0] text-[#475569]"

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header
        activePage="employee"
        onNavigate={onNavigate}
        navItems={adminNavItems}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleProfilePicChange}
      />

      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">
        {error ? (
          <div className="bg-white rounded-[32px] p-10 shadow-sm">
            <p className="text-[16px] font-bold text-[#c2410c]">{error}</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-[32px] p-10 shadow-sm">
            <p className="text-[16px] font-bold text-[#64748b]">Loading employee profile...</p>
          </div>
        ) : !employee ? (
          <div className="bg-white rounded-[32px] p-10 shadow-sm">
            <p className="text-[16px] font-bold text-[#64748b]">Employee not found.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
              <div className="flex gap-8 group relative">
                <div className="relative">
                  {profileImg ? (
                    <img src={profileImg} alt={displayedName} className="w-40 h-40 object-cover rounded-[32px] border-4 border-white shadow-sm" />
                  ) : (
                    <div className="w-40 h-40 rounded-[32px] border-4 border-white shadow-sm bg-[#d9ecf7] text-[#2a617f] flex items-center justify-center font-fredoka font-bold text-[52px]">
                      {getInitials(displayedName)}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-white rounded-full p-2.5 shadow-md text-[#64748b] hover:text-[#3f4a51] transition-colors border border-gray-50"
                  >
                    <PenLine size={18} />
                  </button>
                </div>
                <div className="flex flex-col justify-center pt-2">
                  <div className="flex items-center gap-4 mb-4">
                    <h1 className="text-[44px] font-fredoka font-bold text-[#323940] m-0 leading-none">
                      {displayedName}
                    </h1>
                    <span className={`${headerStatusClass} px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-widest self-start mt-1`}>
                      {employee.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-[#64748b] font-medium text-[15px]">
                      <Briefcase size={18} /> {employee.position}
                    </div>
                    <div className="flex items-center gap-3 text-[#64748b] font-medium text-[15px]">
                      <CalendarIcon size={18} /> Hire Date: {formatDate(employee.hire_date)}
                    </div>
                    <div className="flex items-center gap-3 text-[#64748b] font-medium text-[15px]">
                      <Shield size={18} /> Role: {employee.role}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="!bg-[#ff6b6b] hover:bg-[#fa5a5a] text-white rounded-[20px] !px-6 !py-4 flex items-center gap-3 font-bold text-[16px] shadow-sm transition-colors w-40 justify-center leading-tight"
                >
                  <Trash2 size={20} />
                  Delete<br />Employee
                </button>
                <button
                  onClick={() => setShowAccessModal(true)}
                  className="!bg-[#757d7b] hover:bg-[#656d6b] text-white rounded-[20px] !px-6 !py-4 flex items-center gap-3 font-bold text-[16px] shadow-sm transition-colors w-44 justify-center leading-tight"
                >
                  <UserCog size={20} />
                  Manage<br />Access
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
              <div className="flex flex-col gap-8">
                <div className={`grid ${balances.length > 2 ? "grid-cols-3" : balances.length === 2 ? "grid-cols-2" : "grid-cols-1"} gap-6`}>
                  {balances.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-8 shadow-sm">
                      <p className="text-[16px] font-bold text-[#64748b]">No leave balance records for this year.</p>
                    </div>
                  ) : (
                    balances.map((balance) => {
                      const theme = getBalanceTheme(balance.leave_type_name)
                      const leaveKey = getBalanceKey(balance.leave_type_name)
                      const Icon = theme.Icon

                      return (
                        <div key={balance.id} className={`${theme.cardClass} rounded-[40px] p-6 shadow-sm relative overflow-hidden aspect-[4/5] flex flex-col justify-center`}>
                          {editingLeave === leaveKey ? (
                            <div className="absolute top-5 right-5 flex gap-1.5 z-10">
                              <button onClick={saveEditLeave} className="w-7 h-7 bg-white/60 rounded-full flex items-center justify-center text-[#2c7356] hover:bg-white/80 transition-colors"><Check size={14} /></button>
                              <button onClick={cancelEditLeave} className="w-7 h-7 bg-white/60 rounded-full flex items-center justify-center text-[#855913] hover:bg-white/80 transition-colors"><X size={14} /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditLeave(leaveKey, balance.total_days)}
                              className="absolute top-6 right-6 w-8 h-8 bg-white/40 rounded-full flex items-center justify-center hover:bg-white/60 transition-colors"
                            >
                              <PenLine size={14} />
                            </button>
                          )}
                          <Icon className={`absolute bottom-4 right-4 w-28 h-28 ${theme.iconClass} opacity-30 -rotate-12`} />
                          <div className="relative z-[1] px-2 mb-2">
                            <h3 className={`font-bold text-[17px] font-fredoka ${theme.textClass} mb-4`}>{balance.leave_type_name}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                              <span className={`text-[64px] font-fredoka font-bold ${theme.textClass} leading-none`}>
                                {formatDays(balance.used_days)}
                              </span>
                              <span className={`text-[18px] font-bold ${theme.textClass} opacity-80`}>
                                / {editingLeave === leaveKey ? (
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && saveEditLeave()}
                                    className={`w-16 bg-white/60 rounded-lg px-2 py-0.5 text-[16px] font-bold ${theme.textClass} outline-none text-center`}
                                    autoFocus
                                  />
                                ) : `${formatDays(balance.total_days)} days`}
                              </span>
                            </div>
                            <div className={`w-full ${theme.trackClass} h-2.5 rounded-full overflow-hidden`}>
                              <div className={`${theme.fillClass} h-full rounded-full transition-all`} style={{ width: getBarWidth(balance.used_days, balance.total_days) }}></div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="bg-white rounded-[40px] p-8 pb-10 shadow-sm flex flex-col w-full h-full">
                  <div className="flex items-start justify-between mb-8 px-2 mt-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-bold text-[22px] font-fredoka text-[#3f4a51] tracking-wide m-0">Recent Leave Requests</h3>
                        <p className="text-[14px] font-medium text-[#94a3b8] mt-1">Latest leave request activity</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAllActivities(!showAllActivities)}
                      className="text-[15px] font-bold text-[#5e6c7e] hover:text-[#3f4a51] transition-colors pt-1"
                    >
                      {showAllActivities ? "Show Less" : "View All"}
                    </button>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {displayedActivities.length === 0 ? (
                      <p className="text-[14px] font-medium text-center text-[#94a3b8] py-8">No leave request history yet.</p>
                    ) : displayedActivities.map((request) => {
                      const { Icon, color, bg } = getRequestIconData(request.leave_type_name)
                      const statusTheme = getRequestTheme(request.status)
                      const dateRange = isSameDayStr(request.start_date, request.end_date)
                        ? formatDateShort(request.start_date)
                        : `${formatDateShort(request.start_date)} - ${formatDateShort(request.end_date)}`

                      return (
                        <div key={request.id} className="flex items-center gap-4 p-4 bg-[#f9fafb] rounded-[22px] hover:bg-[#f1f5f9] transition-colors">
                          <div className="flex items-center gap-2 min-w-[130px]">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                              <Icon size={15} color={color} strokeWidth={2.5} />
                            </div>
                            <div>
                              <p className="text-[10px] font-[800] tracking-widest uppercase text-[#94a3b8]">Type</p>
                              <p className="font-bold text-[13px] text-[#3f4a51]">{request.leave_type_name}</p>
                            </div>
                          </div>

                          <div className="min-w-[140px]">
                            <p className="text-[10px] font-[800] tracking-widest uppercase text-[#94a3b8]">Duration</p>
                            <p className="font-bold text-[13px] text-[#3f4a51]">{dateRange}</p>
                            <p className="text-[11px] text-[#94a3b8]">{formatDurationText(request.total_days)}</p>
                          </div>

                          <div className="ml-auto">
                            <span
                              className="px-4 py-1.5 rounded-full text-[11px] font-[800] tracking-wide uppercase whitespace-nowrap"
                              style={{
                                backgroundColor: statusTheme.bg,
                                color: statusTheme.text
                              }}
                            >
                              {request.status}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="bg-white rounded-[32px] p-8 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-[#d1ebdf]"></div>
                  <h3 className="font-bold text-[19px] font-fredoka text-[#323940] tracking-wide mb-8">Contact Details</h3>

                  <div className="space-y-8">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-full bg-[#eef2f9] flex items-center justify-center text-[#4d6b63]">
                        <Mail size={20} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase mb-1">Work Email</p>
                        <p className="font-bold text-[15px] text-[#323940]">{employee.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-full bg-[#eef2f9] flex items-center justify-center text-[#4d6b63]">
                        <Phone size={20} />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase mb-1">Contact Number</p>
                        <p className="font-bold text-[15px] text-[#323940]">{employee.phone || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] p-8 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-[19px] font-fredoka text-[#323940] tracking-wide">Leave Activity Overview</h3>
                    <span className="bg-[#f0f3f8] text-[#64748b] px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase">All Time</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#f8fafc] p-4 rounded-[20px] flex flex-col justify-center">
                      <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Total</p>
                      <p className="text-[28px] font-fredoka font-bold text-[#3f4a51] leading-none">{requests.length}</p>
                    </div>
                    <div className="bg-[#f0fdf4] p-4 rounded-[20px] flex flex-col justify-center">
                      <p className="text-[11px] font-bold text-[#4ade80] uppercase tracking-widest mb-1">Approved</p>
                      <p className="text-[28px] font-fredoka font-bold text-[#16a34a] leading-none">
                        {requests.filter(r => r.status.toLowerCase() === 'approved').length}
                      </p>
                    </div>
                    <div className="bg-[#fef2f2] p-4 rounded-[20px] flex flex-col justify-center">
                      <p className="text-[11px] font-bold text-[#f87171] uppercase tracking-widest mb-1">Rejected</p>
                      <p className="text-[28px] font-fredoka font-bold text-[#dc2626] leading-none">
                        {requests.filter(r => r.status.toLowerCase() === 'rejected').length}
                      </p>
                    </div>
                    <div className="bg-[#eff6ff] p-4 rounded-[20px] flex flex-col justify-center">
                      <p className="text-[11px] font-bold text-[#60a5fa] uppercase tracking-widest mb-1">Pending</p>
                      <p className="text-[28px] font-fredoka font-bold text-[#2563eb] leading-none">
                        {requests.filter(r => ['pending', 'acknowledged'].includes(r.status.toLowerCase())).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f3747]/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full mx-6 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 bg-[#ffe2e5] rounded-full flex items-center justify-center mb-6">
              <Trash2 size={24} className="text-[#f05252]" />
            </div>
            <h3 className="text-[24px] font-fredoka font-bold text-[#1f3747] text-center mb-2">Delete Employee?</h3>
            <p className="text-[#64748b] text-[15px] text-center mb-8 font-medium">
              This will permanently remove <span className="font-bold text-[#323940]">{displayedName}</span>'s profile and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 !py-3.5 !px-4 rounded-full font-bold transition-colors"
                style={{ backgroundColor: "#e9eff5", color: "#4c6367", fontSize: "15px" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                className="flex-1 !py-3.5 !px-4 rounded-full font-bold transition-colors shadow-sm"
                style={{ backgroundColor: "#f05252", color: "#ffffff", fontSize: "15px" }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f3747]/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full mx-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#e9eff5" }}>
                  <Shield size={22} className="text-[#4c6367]" />
                </div>
                <div>
                  <h3 className="text-[22px] font-fredoka font-bold text-[#1f3747]">Manage Access</h3>
                  <p className="text-[13px] text-[#94a3b8] font-medium">{displayedName}'s permissions</p>
                </div>
              </div>
              <button onClick={() => setShowAccessModal(false)} className="w-8 h-8 rounded-full bg-[#f4f7f9] flex items-center justify-center text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[12px] font-bold text-[#94a3b8] tracking-widest uppercase mb-2 block">Role</label>
                <select
                  value={accessSettings.role}
                  onChange={(e) => setAccessSettings((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-[#f4f7f9] rounded-2xl py-3.5 px-5 text-[15px] font-bold text-[#323940] appearance-none border-none outline-none focus:ring-2 focus:ring-[#567278]/20 cursor-pointer"
                >
                  <option>Employee</option>
                  <option>Admin</option>
                  <option>HR</option>
                  <option>Super Admin</option>
                </select>
              </div>

              {[
                { key: "canApprove", label: "Can Approve Requests", desc: "Allow this user to approve leave requests" },
                { key: "canViewReports", label: "Can View Reports", desc: "Grant access to company-wide reports" },
                { key: "isActive", label: "Account Active", desc: "Enable or disable this account" },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between p-4 bg-[#f9fafb] rounded-2xl">
                  <div>
                    <p className="font-bold text-[14px] text-[#323940]">{setting.label}</p>
                    <p className="text-[12px] text-[#94a3b8] font-medium">{setting.desc}</p>
                  </div>
                  <button
                    onClick={() => setAccessSettings((prev) => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                    className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${accessSettings[setting.key] ? "justify-end" : "justify-start"}`}
                    style={{ backgroundColor: accessSettings[setting.key] ? "#2c7356" : "#cbd5e1" }}
                  >
                    <div className="w-5 h-5 bg-white rounded-full shadow-sm transition-transform" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowAccessModal(false)}
                className="flex-1 !py-3.5 rounded-full font-bold transition-colors"
                style={{ backgroundColor: "#e9eff5", color: "#4c6367", fontSize: "15px" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAccessModal(false)}
                className="flex-1 !py-3.5 rounded-full font-bold transition-colors"
                style={{ backgroundColor: "#dcf5eb", color: "#2c7356", fontSize: "15px" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
