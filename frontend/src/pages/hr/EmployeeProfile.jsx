import { useEffect, useMemo, useRef, useState } from "react"
import * as Icons from "lucide-react"
import { Building, Mail, Phone, Calendar as CalendarIcon, Briefcase, UserCog, User, Shield, PenLine, Bell, X, UserPlus, CheckCircle, ChevronDown, Image as ImageIcon, Trash2, Umbrella, Thermometer, Users as UsersIcon, Check, Plane, Smile, HeartHandshake, PartyPopper, MoreHorizontal, Folder } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import Header from "../../components/Header"
import api from "../../services/api"
import { resolveLeaveTypeStyle } from "../../utils/leaveTypeUtils"

// Color name → hex background (mirrors LeaveType.jsx colorStyles)
const COLOR_MAP = {
  blue: "#a3dfff",
  pink: "#ffafe3",
  orange: "#fac47f",
  green: "#B1EFD8",
}

// Icon name (stored in DB lowercase) → Lucide component
const ICON_MAP = {
  umbrella: Umbrella,
  thermometer: Thermometer,
  user: UsersIcon,
  plane: Plane,
  smile: Smile,
  heart: HeartHandshake,
  party: PartyPopper,
  more: MoreHorizontal,
}

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

function formatTime(dateString) {
  if (!dateString) return ""
  return new Date(dateString).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function isFullDay(startStr, endStr) {
  if (!startStr || !endStr) return true
  const s = new Date(startStr)
  const e = new Date(endStr)
  return s.getHours() === 9 && s.getMinutes() === 0 && e.getHours() === 17 && e.getMinutes() === 0
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
      Icon: UsersIcon,
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

// getRequestIconData replaced by resolveLeaveTypeStyle from leaveTypeUtils

export default function EmployeeProfile({ onNavigate }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const fileInputRef = useRef(null)



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
    isActive: true,
    hireDate: "",
    positionId: ""
  })
  const [positions, setPositions] = useState([])
  const [editingBalanceId, setEditingBalanceId] = useState(null)

  // Calendar for Hire Date
  const [showCalendar, setShowCalendar] = useState(false)
  const [calViewMonth, setCalViewMonth] = useState(new Date().getMonth())
  const [calViewYear, setCalViewYear] = useState(new Date().getFullYear())
  const calendarRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]

  function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
  function getFirstDayOfMonth(y, m) {
    const d = new Date(y, m, 1).getDay()
    return d === 0 ? 6 : d - 1
  }

  useEffect(() => {
    const loadEmployee = async () => {
      try {
        setLoading(true)
        setError("")

        const [userRes, balanceRes, requestRes, positionsRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/leave-balances/user/${id}`),
          api.get("/leave-requests", { params: { user_id: id } }),
          api.get("/metadata/positions")
        ])

        const loadedUser = userRes.data?.user || null
        const loadedBalances = balanceRes.data?.balances || []
        const loadedRequests = requestRes.data?.leaveRequests || []

        setEmployee(loadedUser)
        setBalances(loadedBalances)
        setRequests(loadedRequests)
        setPositions(positionsRes.data?.positions || [])
        setAccessSettings((prev) => ({
          ...prev,
          role: loadedUser?.role || prev.role,
          isActive: Boolean(loadedUser?.is_active),
          hireDate: loadedUser?.hire_date ? loadedUser.hire_date.split('T')[0] : "",
          positionId: loadedUser?.position_id || ""
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

  const [resigning, setResigning] = useState(false)

  const handleResignEmployee = async () => {
    setResigning(true)
    try {
      await api.put(`/users/${id}/resign`)
      setShowDeleteModal(false)
      navigate("/hr/employee")
    } catch (err) {
      console.error("Resign employee error:", err)
      alert(err.response?.data?.message || "Failed to mark employee as resigned.")
    } finally {
      setResigning(false)
    }
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

  const startEditLeave = (balanceId, type, totalValue) => {
    setEditingLeave(type)
    setEditValue(String(totalValue))
    setEditingBalanceId(balanceId)
  }

  const saveEditLeave = async () => {
    const newTotal = parseFloat(editValue)
    if (isNaN(newTotal) || newTotal < 0) {
      alert("Please enter a valid number of days.")
      return
    }
    try {
      const res = await api.put(`/leave-balances/${editingBalanceId}`, { total_days: newTotal })
      const updated = res.data.balance
      setBalances(prev => prev.map(b => b.id === editingBalanceId ? { ...b, total_days: updated.total_days, remaining_days: updated.remaining_days } : b))
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update leave balance.")
    } finally {
      setEditingLeave(null)
      setEditValue("")
      setEditingBalanceId(null)
    }
  }

  const cancelEditLeave = () => {
    setEditingLeave(null)
    setEditValue("")
    setEditingBalanceId(null)
  }

  const [savingAccess, setSavingAccess] = useState(false)

  const ROLE_IDS = {
    "Employee": "rl000001-0000-0000-0000-000000000001",
    "Manager": "rl000001-0000-0000-0000-000000000002",
    "HR": "rl000001-0000-0000-0000-000000000003",
    "Super Admin": "rl000001-0000-0000-0000-000000000004",
  }

  const handleSaveAccess = async () => {
    if (!accessSettings.hireDate || !accessSettings.positionId) {
      alert("Please ensure both Hire Date and Position are selected.")
      return
    }
    setSavingAccess(true)
    try {
      const payload = {
        role_id: ROLE_IDS[accessSettings.role],
        is_active: accessSettings.isActive ? 1 : 0,
        hire_date: accessSettings.hireDate,
        position_id: accessSettings.positionId,
      }
      const res = await api.put(`/users/${id}`, payload)
      const updatedUser = res.data.user
      setEmployee(updatedUser)

      // Re-fetch balances to update eligibility and auto-provision new types if tenure increased
      const balanceRes = await api.get(`/leave-balances/user/${id}`)
      setBalances(balanceRes.data?.balances || [])

      setShowAccessModal(false)
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save access settings.")
    } finally {
      setSavingAccess(false)
    }
  }

  const displayedName = employee?.full_name || "Employee"
  const headerStatusClass = employee?.is_active ? "bg-[#bfeadd] text-[#3b6661]" : "bg-[#e2e8f0] text-[#475569]"

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header
        activePage="employee"
        onNavigate={onNavigate}
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
                  className="!bg-[#ff6b6b] hover:bg-[#fa5a5a] text-white rounded-[20px] !px-6 !py-4 flex items-center gap-3 font-bold text-[16px] shadow-sm transition-colors w-44 justify-center leading-tight"
                >
                  <Icons.Trash2 size={20} />
                  Mark as<br />Resigned
                </button>
                <button
                  onClick={() => setShowAccessModal(true)}
                  className="!bg-[#757d7b] hover:bg-[#656d6b] text-white rounded-[20px] !px-6 !py-4 flex items-center gap-3 font-bold text-[16px] shadow-sm transition-colors w-44 justify-center leading-tight"
                >
                  <Icons.UserCog size={20} />
                  Manage<br />Access
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
              <div className="flex flex-col gap-8">
                <div className="flex flex-wrap gap-5">
                  {balances.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-8 shadow-sm w-full">
                      <p className="text-[16px] font-bold text-[#64748b]">No leave balance records for this year.</p>
                    </div>
                  ) : (
                    balances
                      .filter(b => b.is_eligible !== false)
                      .map((balance) => {
                        const Icon = ICON_MAP[balance.icon_name] || Umbrella
                        const bgColor = COLOR_MAP[balance.color_type] || "#e2e8f0"
                        const leaveKey = balance.id
                        const textColor = "#2d3748"

                        return (
                          <div key={balance.id} className="rounded-[40px] p-6 shadow-sm relative overflow-hidden flex flex-col justify-center" style={{ backgroundColor: bgColor, width: "185px", minHeight: "220px" }}>
                            {editingLeave === leaveKey ? (
                              <div className="absolute top-5 right-5 flex gap-1.5 z-10">
                                <button onClick={saveEditLeave} className="w-7 h-7 bg-white/60 rounded-full flex items-center justify-center text-[#2c7356] hover:bg-white/80 transition-colors"><Icons.Check size={14} /></button>
                                <button onClick={cancelEditLeave} className="w-7 h-7 bg-white/60 rounded-full flex items-center justify-center text-[#855913] hover:bg-white/80 transition-colors"><Icons.X size={14} /></button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditLeave(balance.id, leaveKey, balance.total_days)}
                                className="absolute top-6 right-6 w-8 h-8 bg-white/40 rounded-full flex items-center justify-center hover:bg-white/60 transition-colors"
                              >
                                <Icons.PenLine size={14} />
                              </button>
                            )}
                            <Icon className="absolute bottom-2 right-2 w-20 h-20 opacity-20 -rotate-12" style={{ color: textColor }} />
                            <div className="relative z-[1] px-2 mb-2">
                              <h3 className="font-bold text-[14px] font-fredoka mb-3" style={{ color: textColor }}>{balance.leave_type_name}</h3>
                              <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-[48px] font-fredoka font-bold leading-none" style={{ color: textColor }}>
                                  {formatDays(balance.used_days)}
                                </span>
                                <span style={{ color: textColor, fontSize: "14px", fontWeight: "bold", opacity: 0.8 }}>
                                  / {editingLeave === leaveKey ? (
                                    <input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={(e) => e.key === "Enter" && saveEditLeave()}
                                      className="w-16 bg-white/60 rounded-lg px-2 py-0.5 text-[16px] font-bold outline-none text-center"
                                      style={{ color: textColor }}
                                      autoFocus
                                    />
                                  ) : `${formatDays(balance.total_days)} days`}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full overflow-hidden mt-2" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                                <div className="h-full rounded-full transition-all" style={{ width: getBarWidth(balance.used_days, balance.total_days), backgroundColor: "rgba(0,0,0,0.6)" }}></div>
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
                      const { Icon, color, bg } = resolveLeaveTypeStyle(request.leave_type_icon, request.leave_type_color)
                      const statusTheme = getRequestTheme(request.status)
                      const showTime = !isFullDay(request.start_date, request.end_date)
                      const dateRange = isSameDayStr(request.start_date, request.end_date)
                        ? `${formatDateShort(request.start_date)}${showTime ? ` (${formatTime(request.start_date)} - ${formatTime(request.end_date)})` : ""}`
                        : `${formatDateShort(request.start_date)}${showTime ? ` ${formatTime(request.start_date)}` : ""} - ${formatDateShort(request.end_date)}${showTime ? ` ${formatTime(request.end_date)}` : ""}`

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
            <div className="w-16 h-16 bg-[#fff3cd] rounded-full flex items-center justify-center mb-6">
              <Trash2 size={24} className="text-[#d97706]" />
            </div>
            <h3 className="text-[24px] font-fredoka font-bold text-[#1f3747] text-center mb-2">Mark as Resigned?</h3>
            <p className="text-[#64748b] text-[15px] text-center mb-8 font-medium">
              <span className="font-bold text-[#323940]">{displayedName}</span>'s account will be deactivated and marked as resigned. Their data and history will be preserved.
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
                onClick={handleResignEmployee}
                disabled={resigning}
                className="flex-1 !py-3.5 !px-4 rounded-full font-bold transition-colors shadow-sm"
                style={{ backgroundColor: resigning ? "#e2e8f0" : "#f97316", color: resigning ? "#94a3b8" : "#ffffff", fontSize: "15px" }}
              >
                {resigning ? "Processing..." : "Yes, Resign"}
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
                  <Icons.Shield size={22} className="text-[#4c6367]" />
                </div>
                <div>
                  <h3 className="text-[22px] font-fredoka font-bold text-[#1f3747]">Manage Access</h3>
                  <p className="text-[13px] text-[#94a3b8] font-medium">{displayedName}'s permissions</p>
                </div>
              </div>
              <button onClick={() => setShowAccessModal(false)} className="w-8 h-8 rounded-full bg-[#f4f7f9] flex items-center justify-center text-[#64748b] hover:bg-[#e2e8f0] transition-colors">
                <Icons.X size={16} />
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
                  <option>Manager</option>
                  <option>HR</option>
                  <option>Super Admin</option>
                </select>
              </div>

              <div>
                <label className="text-[12px] font-bold text-[#94a3b8] tracking-widest uppercase mb-2 block">Position</label>
                <select
                  value={accessSettings.positionId}
                  onChange={(e) => setAccessSettings((prev) => ({ ...prev, positionId: e.target.value }))}
                  className="w-full bg-[#f4f7f9] rounded-2xl py-3.5 px-5 text-[15px] font-bold text-[#323940] appearance-none border-none outline-none focus:ring-2 focus:ring-[#567278]/20 cursor-pointer"
                >
                  <option value="">Select Position</option>
                  {positions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="text-[12px] font-bold text-[#94a3b8] tracking-widest uppercase mb-2 block">Hire Date</label>
                <div
                  onClick={() => {
                    const d = accessSettings.hireDate ? new Date(accessSettings.hireDate) : new Date();
                    setCalViewMonth(d.getMonth());
                    setCalViewYear(d.getFullYear());
                    setShowCalendar(!showCalendar);
                  }}
                  className="w-full bg-[#f4f7f9] rounded-2xl py-3.5 px-5 text-[15px] font-bold text-[#323940] flex items-center justify-between cursor-pointer hover:bg-[#eef2f5] transition-colors focus:ring-2 focus:ring-[#567278]/20"
                >
                  <span className="truncate">{accessSettings.hireDate ? formatDate(accessSettings.hireDate) : "Select Date"}</span>
                  <Icons.CalendarIcon size={18} className="text-[#94a3b8] shrink-0" />
                </div>

                {showCalendar && (
                  <div ref={calendarRef} className="absolute bottom-full mb-3 left-0 right-0 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(31,55,71,0.15)] p-6 border border-[#f0f3f8] z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between mb-5 gap-2">
                      <div className="flex items-center gap-1">
                        <select
                          value={calViewMonth}
                          onChange={(e) => setCalViewMonth(parseInt(e.target.value))}
                          className="bg-transparent font-bold text-[15px] text-[#1f3747] font-fredoka outline-none cursor-pointer hover:text-[#1c355e]"
                        >
                          {MONTH_NAMES.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={calViewYear}
                          onChange={(e) => setCalViewYear(parseInt(e.target.value))}
                          className="bg-transparent font-bold text-[15px] text-[#1f3747] font-fredoka outline-none cursor-pointer hover:text-[#1c355e]"
                        >
                          {Array.from({ length: 31 }, (_, i) => new Date().getFullYear() - 20 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (calViewMonth === 0) { setCalViewMonth(11); setCalViewYear(y => y - 1); }
                            else setCalViewMonth(m => m - 1);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-[#f0f3f8] flex items-center justify-center text-[#64748b] transition-colors"
                        >
                          <Icons.ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (calViewMonth === 11) { setCalViewMonth(0); setCalViewYear(y => y + 1); }
                            else setCalViewMonth(m => m + 1);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-[#f0f3f8] flex items-center justify-center text-[#64748b] transition-colors"
                        >
                          <Icons.ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 text-center mb-2">
                      {DAY_LABELS.map((d, i) => (
                        <div key={i} className="text-[11px] font-bold text-[#94a3b8] py-1 uppercase tracking-wider">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 text-center gap-1">
                      {(() => {
                        const days = getDaysInMonth(calViewYear, calViewMonth);
                        const first = getFirstDayOfMonth(calViewYear, calViewMonth);
                        const cells = [];
                        const prevMonthDays = getDaysInMonth(calViewMonth === 0 ? calViewYear - 1 : calViewYear, calViewMonth === 0 ? 11 : calViewMonth - 1);

                        for (let i = first - 1; i >= 0; i--) cells.push({ d: prevMonthDays - i, current: false });
                        for (let i = 1; i <= days; i++) cells.push({ d: i, current: true });
                        while (cells.length < 35 || cells.length % 7 !== 0) cells.push({ d: cells.length - days - first + 2, current: false });

                        return cells.map((c, idx) => {
                          if (!c.current) return <div key={idx} className="py-2 text-[12px] text-[#cbd5e1] font-semibold opacity-50">{c.d}</div>;

                          const dObj = new Date(calViewYear, calViewMonth, c.d);
                          const isSelected = accessSettings.hireDate &&
                            new Date(accessSettings.hireDate).getDate() === c.d &&
                            new Date(accessSettings.hireDate).getMonth() === calViewMonth &&
                            new Date(accessSettings.hireDate).getFullYear() === calViewYear;

                          const isToday = new Date().getDate() === c.d &&
                            new Date().getMonth() === calViewMonth &&
                            new Date().getFullYear() === calViewYear;

                          return (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                const selected = new Date(calViewYear, calViewMonth, c.d);
                                const y = selected.getFullYear();
                                const m = String(selected.getMonth() + 1).padStart(2, '0');
                                const d = String(selected.getDate()).padStart(2, '0');
                                const dateStr = `${y}-${m}-${d}`;
                                setAccessSettings(prev => ({ ...prev, hireDate: dateStr }));
                                setShowCalendar(false);
                              }}
                              className="relative py-1 flex items-center justify-center cursor-pointer group"
                            >
                              <div className={`w-8 h-8 flex items-center justify-center text-[13px] font-bold rounded-full transition-all duration-200
                                ${isSelected ? "bg-[#1c355e] text-white shadow-lg shadow-[#1c355e]/20" : isToday ? "bg-[#e9eff5] text-[#1c355e]" : "text-[#3f4a51] group-hover:bg-[#f0f3f8]"}`}>
                                {c.d}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
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
                onClick={handleSaveAccess}
                disabled={savingAccess || !accessSettings.hireDate || !accessSettings.positionId}
                className="flex-1 !py-3.5 rounded-full font-bold transition-colors"
                style={{
                  backgroundColor: (savingAccess || !accessSettings.hireDate || !accessSettings.positionId) ? "#e2e8f0" : "#dcf5eb",
                  color: (savingAccess || !accessSettings.hireDate || !accessSettings.positionId) ? "#94a3b8" : "#2c7356",
                  fontSize: "15px"
                }}
              >
                {savingAccess ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
