import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"
import api from "../../services/api"
import {
  ChevronLeft, ChevronRight,
  CheckCircle, XCircle, ExternalLink, ChevronDown, ChevronUp
} from "lucide-react"
import { resolveLeaveTypeStyle } from "../../utils/leaveTypeUtils"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]

const STATUS_STYLES = {
  pending: { bg: "#fee481", text: "#6b5413" },
  approved: { bg: "#0cf1aa", text: "#185b48" },
  rejected: { bg: "#f56464", text: "#570008" },
  cancelled: { bg: "#e2e8f0", text: "#475569" },
  acknowledged: { bg: "#93c5fd", text: "#1e3a8a" },
}

// getIconData replaced by resolveLeaveTypeStyle from leaveTypeUtils

function formatDateShort(ds) {
  return new Date(ds).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
function isSameDayStr(a, b) {
  const d1 = new Date(a), d2 = new Date(b)
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}
function formatDurationText(totalDays) {
  const totalHours = totalDays * 8
  const days = Math.floor(totalHours / 8)
  const rem = totalHours - days * 8
  const hours = Math.floor(rem)
  const mins = Math.round((rem - hours) * 60)
  const parts = []
  if (days > 0) parts.push(`${days} Working Day${days !== 1 ? "s" : ""}`)
  else if (hours > 0) parts.push(`${hours}h`)
  if (mins > 0) parts.push(`${mins}m`)
  return parts.join(" ") || "< 1h"
}

// Sort: today first → upcoming nearest → past most recent
function sortRequests(reqs) {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return [...reqs].sort((a, b) => {
    const aStart = new Date(a.start_date); aStart.setHours(0, 0, 0, 0)
    const bStart = new Date(b.start_date); bStart.setHours(0, 0, 0, 0)
    const aEnd = new Date(a.end_date); aEnd.setHours(23, 59, 59, 999)
    const bEnd = new Date(b.end_date); bEnd.setHours(23, 59, 59, 999)
    const aToday = aStart <= now && aEnd >= now
    const bToday = bStart <= now && bEnd >= now
    const aUp = aStart > now
    const bUp = bStart > now
    if (aToday && !bToday) return -1
    if (!aToday && bToday) return 1
    if (aUp && !bUp) return -1
    if (!aUp && bUp) return 1
    if (aUp && bUp) return aStart - bStart
    return bStart - aStart
  })
}

// Does a request overlap a given Date?
function overlapsDate(req, date) {
  if (req.status === "rejected" || req.status === "cancelled") return false
  const target = new Date(date); target.setHours(12, 0, 0, 0)
  const s = new Date(req.start_date); s.setHours(0, 0, 0, 0)
  const e = new Date(req.end_date); e.setHours(23, 59, 59, 999)
  return target >= s && target <= e
}

// ─── Calendar (date-picker mode) ──────────────────────────────────────────────
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate() }
function getFirstDayOfMonth(y, m) {
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 6 : d - 1
}
function isSameDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function CalendarPicker({ requests = [], selectedDate, onSelect }) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const prevDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  )

  // Days that have at least one active request
  const activeDays = useMemo(() => {
    const set = new Set()
    requests.forEach(r => {
      if (r.status === "rejected" || r.status === "cancelled") return
      const start = new Date(r.start_date); start.setHours(0, 0, 0, 0)
      const end = new Date(r.end_date); end.setHours(23, 59, 59, 999)
      const cur = new Date(start)
      while (cur <= end) {
        if (cur.getFullYear() === viewYear && cur.getMonth() === viewMonth)
          set.add(cur.getDate())
        cur.setDate(cur.getDate() + 1)
      }
    })
    return set
  }, [requests, viewYear, viewMonth])

  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true })
  while (cells.length < 35) cells.push({ day: cells.length - daysInMonth - firstDay + 2, current: false })

  function prevMonth() {
    onSelect(null)
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    onSelect(null)
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function handleDayClick(day) {
    const clicked = new Date(viewYear, viewMonth, day)
    if (selectedDate && isSameDay(clicked, selectedDate)) {
      onSelect(null) // deselect
    } else {
      onSelect(clicked)
    }
  }

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[16px] text-[#2d3e50]">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-[#f0f3f8] flex items-center justify-center text-[#64748b] cursor-pointer">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-[#f0f3f8] flex items-center justify-center text-[#64748b] cursor-pointer">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-[10px] font-bold text-[#94a3b8] py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center gap-y-0.5">
        {cells.map((cell, idx) => {
          if (!cell.current)
            return <div key={idx} className="py-1 text-[12px] text-[#cbd5e1] font-semibold">{cell.day}</div>
          const cellDate = new Date(viewYear, viewMonth, cell.day)
          const isToday = isSameDay(cellDate, new Date())
          const isSel = selectedDate && isSameDay(cellDate, selectedDate)
          const hasLeave = activeDays.has(cell.day)
          return (
            <div
              key={idx}
              className="relative py-1 text-[12px] font-semibold cursor-pointer"
              onClick={() => handleDayClick(cell.day)}
            >
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-all
                ${isSel ? "bg-[#1c355e] text-white ring-2 ring-[#1c355e]/20"
                  : isToday ? "bg-[#dce8f5] text-[#1c355e] font-extrabold"
                    : "text-[#3f4a51] hover:bg-[#f0f3f8]"}`}>
                {cell.day}
              </span>
              {hasLeave && !isSel && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#f57a00]" />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#f0f3f8]">
        {selectedDate ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-[#1c355e]" />
            <span className="text-[11px] font-medium text-[#64748b]">
              {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()} selected
            </span>
            <button
              onClick={() => onSelect(null)}
              className="ml-auto text-[11px] font-bold text-[#94a3b8] hover:text-[#f56464] transition-colors cursor-pointer"
            >
              Clear
            </button>
          </>
        ) : (
          <>
            <span className="w-2.5 h-2.5 rounded-full bg-[#f57a00]" />
            <span className="text-[11px] font-medium text-[#64748b]">Click a date to filter</span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ request, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState("")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-xl">
        <h2 className="font-fredoka font-bold text-[22px] text-[#2d3e50] mb-1">Reject Request</h2>
        <p className="text-[13px] text-[#94a3b8] font-medium mb-5">
          Rejecting leave request from <span className="font-bold text-[#3f4a51]">{request.full_name}</span>
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for rejection (optional)…"
          rows={3}
          className="w-full p-4 bg-[#f4f7fb] text-[#3f4a51] text-[14px] font-medium rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[#f56464] placeholder:text-[#b0bac6] mb-5"
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border-2 border-[#e2e8f0] text-[#64748b] font-bold text-[14px] hover:border-[#94a3b8] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            style={{ backgroundColor: '#f56464', color: '#ffffff' }}
            className="flex-1 py-3 rounded-2xl font-bold text-[14px] transition-colors cursor-pointer disabled:opacity-60 hover:opacity-90"
          >
            {loading ? "Rejecting…" : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ req, onApprove, onReject, onAcknowledge }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)

  const { Icon, color, bg } = resolveLeaveTypeStyle(req.leave_type_icon, req.leave_type_color)
  const statusStyle = STATUS_STYLES[req.status?.toLowerCase()] || STATUS_STYLES.pending
  const dateRange = isSameDayStr(req.start_date, req.end_date)
    ? formatDateShort(req.start_date)
    : `${formatDateShort(req.start_date)} – ${formatDateShort(req.end_date)}`

  const now = new Date(); now.setHours(0, 0, 0, 0)
  const startD = new Date(req.start_date); startD.setHours(0, 0, 0, 0)
  const endD = new Date(req.end_date); endD.setHours(23, 59, 59, 999)
  const isToday = startD <= now && endD >= now
  const isUpcoming = startD > now
  const diffDays = Math.round((startD - now) / (1000 * 60 * 60 * 24))

  const timeBadge = isToday
    ? { label: "Today", color: "#1c355e", bg: "#dce8f5" }
    : isUpcoming
      ? { label: `In ${diffDays}d`, color: "#166534", bg: "#bbf7d0" }
      : { label: `${Math.abs(diffDays)}d ago`, color: "#475569", bg: "#e2e8f0" }

  const isPending = req.status === "pending"
  const isAcknowledged = req.status === "acknowledged"

  async function handleApprove() {
    setActionLoading("approve")
    try {
      await api.put(`/leave-requests/${req.id}/approve`)
      onApprove(req.id)
    } catch (e) {
      alert(e.response?.data?.message || "Failed to approve.")
    } finally { setActionLoading(null) }
  }

  async function handleAcknowledge() {
    setActionLoading("acknowledge")
    try {
      await api.put(`/leave-requests/${req.id}/approve`)   // acknowledged → approved
      onApprove(req.id)   // remove from list / update status to approved
    } catch (e) {
      alert(e.response?.data?.message || "Failed to acknowledge.")
    } finally { setActionLoading(null) }
  }

  async function handleRejectConfirm(reason) {
    setActionLoading("reject")
    try {
      await api.put(`/leave-requests/${req.id}/reject`, { reject_reason: reason })
      setShowRejectModal(false)
      onReject(req.id)
    } catch (e) {
      alert(e.response?.data?.message || "Failed to reject.")
    } finally { setActionLoading(null) }
  }

  return (
    <>
      {showRejectModal && (
        <RejectModal
          request={req}
          onConfirm={handleRejectConfirm}
          onCancel={() => setShowRejectModal(false)}
          loading={actionLoading === "reject"}
        />
      )}

      <div className={`bg-white rounded-[28px] shadow-sm overflow-hidden transition-all duration-200 ${expanded ? "ring-2 ring-[#1c355e]/10" : "hover:shadow-md"}`}>

        {/* ── Main row ── */}
        <div className="flex items-center gap-4 p-5 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center shrink-0 text-sky-600 font-bold text-[16px] relative">
            {(req.full_name || "?")[0].toUpperCase()}
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-[#94a3b8]" />
          </div>

          {/* Name + email */}
          <div className="min-w-[140px]">
            <p className="font-bold text-[15px] text-[#2d3e50]">{req.full_name}</p>
            <p className="text-[12px] text-[#94a3b8] font-medium">{req.email}</p>
          </div>

          {/* Leave type */}
          <div className="flex items-center gap-2 min-w-[140px]">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
              <Icon size={16} color={color} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-[800] tracking-widest uppercase text-[#94a3b8]">TYPE</p>
              <p className="font-bold text-[13px] text-[#3f4a51]">{req.leave_type_name}</p>
            </div>
          </div>

          {/* Duration */}
          <div className="min-w-[160px]">
            <p className="text-[10px] font-[800] tracking-widest uppercase text-[#94a3b8]">DURATION</p>
            <p className="font-bold text-[14px] text-[#2d3e50]">{dateRange}</p>
            <p className="text-[11px] text-[#94a3b8]">{formatDurationText(req.total_days)}</p>
          </div>

          {/* Time badge */}
          <span
            className="hidden md:inline-block px-2.5 py-1 rounded-full text-[11px] font-[800] tracking-wide shrink-0"
            style={{ backgroundColor: timeBadge.bg, color: timeBadge.color }}
          >
            {timeBadge.label}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <span
              className="px-4 py-1.5 rounded-full text-[11px] font-[800] tracking-wide uppercase whitespace-nowrap"
              style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
            >
              {req.status}
            </span>
            <div className="text-[#94a3b8]">
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </div>

        {/* ── Expanded panel ── */}
        {expanded && (
          <div className="px-5 pb-5 border-t border-[#f0f4f9]">
            {/* Reason */}
            <div className="mt-4 mb-5 bg-[#f7f9fc] rounded-2xl px-5 py-4 border-l-4 border-[#c8d8e8]">
              <p className="text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-1.5">Reason</p>
              {req.reason ? (
                <p className="text-[13px] text-[#3f4a51] font-medium italic leading-relaxed">
                  "{req.reason}"
                </p>
              ) : (
                <p className="text-[13px] text-[#b0bac6] italic">No reason provided.</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              {isPending && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#bbf7d0] text-[#166534] text-[13px] font-[800] hover:bg-[#86efac] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle size={15} strokeWidth={2.5} />
                    {actionLoading === "approve" ? "Approving…" : "Approve"}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#fecaca] text-[#991b1b] text-[13px] font-[800] hover:bg-[#fca5a5] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle size={15} strokeWidth={2.5} />
                    Reject
                  </button>
                </>
              )}

              {isAcknowledged && (
                <button
                  onClick={handleAcknowledge}
                  disabled={!!actionLoading}
                  style={{ backgroundColor: '#bfdbfe', color: '#1e3a8a' }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[13px] font-[800] hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle size={15} strokeWidth={2.5} />
                  {actionLoading === "acknowledge" ? "Approving…" : "Approve (Acknowledge)"}
                </button>
              )}

              <button
                onClick={() => navigate(`/manager/requests/${req.id}`)}
                className="flex items-center gap-1.5 ml-auto text-[13px] font-[800] text-[#478afb] hover:text-[#1c355e] transition-colors cursor-pointer"
                style={{ background: 'none', border: 'none' }}
              >
                <ExternalLink size={14} strokeWidth={2.5} />
                View Details
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Approvals Page ───────────────────────────────────────────────────────────
export default function Approvals({ onNavigate }) {
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [selectedDate, setSelectedDate] = useState(null) // Date | null

  // Load only pending + acknowledged (already approved/rejected go to History)
  useEffect(() => {
    Promise.all([
      api.get("/leave-requests/team?status=pending").catch(() => ({ data: { leaveRequests: [] } })),
      api.get("/leave-requests/team?status=acknowledged").catch(() => ({ data: { leaveRequests: [] } })),
    ]).then(([pRes, aRes]) => {
      const combined = sortRequests([
        ...(pRes.data.leaveRequests || []),
        ...(aRes.data.leaveRequests  || []),
      ])
      setAllRequests(combined)
    }).finally(() => setLoading(false))
  }, [])

  function handleApproved(id) {
    setAllRequests(prev => prev.filter(r => r.id !== id))
  }
  function handleRejected(id) {
    setAllRequests(prev => prev.filter(r => r.id !== id))
  }
  function handleAcknowledged(id) {
    setAllRequests(prev => prev.filter(r => r.id !== id))
  }

  // Count pending + acknowledged for the subtitle
  const actionableCount = allRequests.filter(r => r.status === "pending" || r.status === "acknowledged").length

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending", badgeBg: '#fee481', badgeText: '#6b5413' },
    { key: "acknowledged", label: "Acknowledged", badgeBg: '#93c5fd', badgeText: '#1e3a8a' },
  ]

  // Count per status — always reflects the current date filter too
  const dateFiltered = useMemo(() => {
    if (!selectedDate) return allRequests
    return allRequests.filter(r => overlapsDate(r, selectedDate))
  }, [allRequests, selectedDate])

  const filtered = useMemo(() => {
    return filter === "all" ? dateFiltered : dateFiltered.filter(r => r.status === filter)
  }, [dateFiltered, filter])

  const countByStatus = (s) => dateFiltered.filter(r => r.status === s).length

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col">
      <Header activePage="approvals" onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">

        {/* ── Hero ── */}
        <div className="mb-10 mt-4">
          <h1 className="text-[54px] font-fredoka font-[600] text-[#2d3e50] mb-2 leading-tight">
            Pending Approvals
          </h1>
          <p className="text-[#64748b] text-[18px] font-medium">
            {actionableCount > 0
              ? <>You have <span className="font-bold text-[#2d3e50]">{actionableCount} request{actionableCount !== 1 ? "s" : ""}</span> waiting for your review.</>
              : "All caught up! Nothing waiting for review right now. 🎉"}
          </p>
        </div>

        {/* ── Filter Tabs ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
          {FILTERS.map(f => {
            const count    = f.key === "all" ? dateFiltered.length : countByStatus(f.key)
            const isActive = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  backgroundColor: isActive ? '#466063' : '#cdecea',
                  color:           isActive ? '#ffffff' : '#1a5c54',
                  height:     '36px',
                  padding:    '0 24px',
                  borderRadius: '9999px',
                  fontSize:   '13px',
                  fontWeight: '700',
                  cursor:     'pointer',
                  whiteSpace: 'nowrap',
                  border:     'none',
                  display:    'inline-flex',
                  alignItems: 'center',
                  gap:        '8px',
                  transition: 'opacity 0.15s',
                }}
              >
                {f.label}
                {f.badgeBg && count > 0 && (
                  <span style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : f.badgeBg,
                    color:           isActive ? '#ffffff' : f.badgeText,
                    fontSize:   '11px',
                    fontWeight: '900',
                    padding:    '2px 7px',
                    borderRadius: '9999px',
                    lineHeight: '1',
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          {/* Date filter chip */}
          {selectedDate && (
            <span style={{
              backgroundColor: '#dce8f5',
              color:           '#1c355e',
              height:     '36px',
              padding:    '0 24px',
              borderRadius: '9999px',
              fontSize:   '13px',
              fontWeight: '700',
              display:    'inline-flex',
              alignItems: 'center',
              gap:        '8px',
            }}>
              {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}
              <button
                onClick={() => setSelectedDate(null)}
                style={{ fontSize: '16px', lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', opacity: 0.7 }}
              >×</button>
            </span>
          )}
        </div>



        {/* ── Grid: List + Calendar ── */}
        <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">

          {/* Request list */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-[28px] p-12 text-center text-[#94a3b8] font-medium shadow-sm">
                Loading requests…
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-[28px] p-12 text-center shadow-sm">
                <p className="text-[#94a3b8] font-medium">
                  {selectedDate ? `No requests on ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getDate()}.` : "No requests found."}
                </p>
              </div>
            ) : (
              filtered.map(req => (
                <RequestCard
                  key={req.id}
                  req={req}
                  onApprove={handleApproved}
                  onReject={handleRejected}
                  onAcknowledge={handleAcknowledged}
                />
              ))
            )}
          </div>

          {/* Calendar date-picker */}
          <CalendarPicker
            requests={allRequests}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
        </div>
      </main>
    </div>
  )
}

