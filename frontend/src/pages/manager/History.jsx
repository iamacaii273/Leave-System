import { useState, useEffect, useMemo } from "react"
import ManagerHeader from "./ManagerHeader"
import api from "../../services/api"
import { Umbrella, Thermometer, Users, Search } from "lucide-react"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  approved:     { bg: "#0cf1aa", text: "#185b48" },
  rejected:     { bg: "#f56464", text: "#ffffff" },
  acknowledged: { bg: "#93c5fd", text: "#1e3a8a" },
  pending:      { bg: "#fee481", text: "#6b5413" },
  cancelled:    { bg: "#e2e8f0", text: "#475569" },
}

function getIconData(typeName) {
  const t = typeName?.toLowerCase() || ""
  if (t.includes("sick"))     return { Icon: Thermometer, color: "#f57a00", bg: "#fff2e5" }
  if (t.includes("personal")) return { Icon: Users,       color: "#d06ab0", bg: "#f8e0f0" }
  return                               { Icon: Umbrella,   color: "#1982c4", bg: "#e6f2fb" }
}

function formatDateShort(ds) {
  return new Date(ds).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
function isSameDayStr(a, b) {
  const d1 = new Date(a), d2 = new Date(b)
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth()    === d2.getMonth()    &&
         d1.getDate()     === d2.getDate()
}
function formatDurationText(totalDays) {
  const totalHours = totalDays * 8
  const days  = Math.floor(totalHours / 8)
  const rem   = totalHours - days * 8
  const hours = Math.floor(rem)
  const mins  = Math.round((rem - hours) * 60)
  const parts = []
  if (days  > 0) parts.push(`${days} Working Day${days !== 1 ? "s" : ""}`)
  else if (hours > 0) parts.push(`${hours}h`)
  if (mins  > 0) parts.push(`${mins}m`)
  return parts.join(" ") || "< 1h"
}

// Left accent color per status
const ACCENT = {
  approved:     "#0cf1aa",
  rejected:     "#f56464",
  acknowledged: "#93c5fd",
  cancelled:    "#e2e8f0",
  pending:      "#fee481",
}

// ─── History Row ──────────────────────────────────────────────────────────────
function HistoryRow({ req }) {
  const { Icon, color, bg } = getIconData(req.leave_type_name)
  const style  = STATUS_STYLES[req.status?.toLowerCase()] || STATUS_STYLES.pending
  const accent = ACCENT[req.status?.toLowerCase()] || "#e2e8f0"

  const dateRange = isSameDayStr(req.start_date, req.end_date)
    ? formatDateShort(req.start_date)
    : `${formatDateShort(req.start_date)} – ${formatDateShort(req.end_date)}`

  return (
    <div className="bg-white rounded-[24px] shadow-sm flex items-center gap-4 px-5 py-4 hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[24px]" style={{ backgroundColor: accent }} />

      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center shrink-0 text-sky-600 font-bold text-[15px] relative ml-2">
        {(req.full_name || "?")[0].toUpperCase()}
        <span
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: accent === "#e2e8f0" ? "#94a3b8" : accent }}
        />
      </div>

      {/* Name + email */}
      <div className="min-w-[150px]">
        <p className="font-bold text-[14px] text-[#2d3e50]">{req.full_name}</p>
        <p className="text-[12px] text-[#94a3b8] font-medium">{req.email}</p>
      </div>

      {/* Leave type */}
      <div className="flex items-center gap-2 min-w-[150px]">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
          <Icon size={16} color={color} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[10px] font-[800] tracking-widest uppercase text-[#94a3b8]">TYPE</p>
          <p className="font-bold text-[13px] text-[#3f4a51]">{req.leave_type_name}</p>
        </div>
      </div>

      {/* Duration */}
      <div className="min-w-[180px]">
        <p className="text-[10px] font-[800] tracking-widest uppercase text-[#94a3b8]">DURATION</p>
        <p className="font-bold text-[13px] text-[#2d3e50]">{dateRange}</p>
        <p className="text-[11px] text-[#94a3b8]">{formatDurationText(req.total_days)}</p>
      </div>

      {/* Actioned by */}
      {req.approved_by_name && (
        <div className="min-w-[120px] hidden lg:block">
          <p className="text-[10px] font-[800] tracking-widest uppercase text-[#94a3b8]">
            {req.status === "approved" ? "APPROVED BY" : "REJECTED BY"}
          </p>
          <p className="font-bold text-[12px] text-[#3f4a51]">{req.approved_by_name}</p>
        </div>
      )}

      {/* Status badge */}
      <div className="ml-auto">
        <span
          className="px-4 py-1.5 rounded-full text-[11px] font-[800] tracking-wide uppercase whitespace-nowrap"
          style={{ backgroundColor: style.bg, color: style.text }}
        >
          {req.status}
        </span>
      </div>
    </div>
  )
}

// ─── History Page ─────────────────────────────────────────────────────────────
export default function History({ onNavigate }) {
  const [requests,  setRequests]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState("all")
  const [search,    setSearch]    = useState("")
  const [activeToday, setActiveToday] = useState(0)

  useEffect(() => {
    Promise.all([
      api.get("/leave-requests/team?status=approved").catch(() => ({ data: { leaveRequests: [] } })),
      api.get("/leave-requests/team?status=rejected").catch(() => ({ data: { leaveRequests: [] } })),
      api.get("/leave-requests/team").catch(() => ({ data: { leaveRequests: [] } })),
    ]).then(([appRes, rejRes, allRes]) => {
      // History list = approved + rejected, sorted newest first
      const hist = [
        ...(appRes.data.leaveRequests || []),
        ...(rejRes.data.leaveRequests || []),
      ].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
      setRequests(hist)

      // Active today = unique employees with NO active leave today
      const allReqs = allRes.data.leaveRequests || []
      const today   = new Date(); today.setHours(0,0,0,0)
      const outIds  = new Set()
      allReqs.forEach(r => {
        if (r.status === "rejected" || r.status === "cancelled") return
        const s = new Date(r.start_date); s.setHours(0,0,0,0)
        const e = new Date(r.end_date);   e.setHours(23,59,59,999)
        if (today >= s && today <= e) outIds.add(r.user_id)
      })
      // Unique total employees
      const allIds = new Set(allReqs.map(r => r.user_id))
      setActiveToday(allIds.size - outIds.size)
    }).finally(() => setLoading(false))
  }, [])

  const FILTERS = [
    { key: "all",      label: "All" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ]

  const filtered = useMemo(() => {
    let list = filter === "all" ? requests : requests.filter(r => r.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.full_name?.toLowerCase().includes(q))
    }
    return list
  }, [requests, filter, search])

  const countByStatus = (s) => requests.filter(r => r.status === s).length

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col">
      <ManagerHeader activePage="history" onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">

        {/* ── Hero row ── */}
        <div className="flex items-start justify-between mb-10 mt-4 gap-6 flex-wrap">
          <div>
            <h1 className="text-[54px] font-fredoka font-[600] text-[#2d3e50] mb-2 leading-tight">
              Team Leave History
            </h1>
            <p className="text-[#64748b] text-[17px] font-medium max-w-md">
              Review and track all time-off records for your team.
            </p>
          </div>

          {/* Active Today card */}
          <div
            className="rounded-[28px] px-8 py-5 shrink-0 min-w-[180px]"
            style={{ backgroundColor: "#bbf7d0" }}
          >
            <p className="text-[12px] font-[800] tracking-[0.12em] uppercase mb-1 text-[#166534]">
              Active Today
            </p>
            <p className="text-[38px] font-fredoka font-bold text-[#166534] leading-none">
              {activeToday}
            </p>
            <p className="text-[13px] font-semibold text-[#166534] mt-1 opacity-80">
              Member{activeToday !== 1 ? "s" : ""} in today
            </p>
          </div>
        </div>

        {/* ── Filter + Search bar ── */}
        <div className="bg-white rounded-[28px] p-5 shadow-sm mb-6 flex flex-wrap gap-6 items-center">
          {/* Status filter */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-[800] tracking-[0.14em] uppercase text-[#94a3b8]">Filter by status</p>
            <div className="flex items-center gap-2">
              {FILTERS.map(f => {
                const isActive = filter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    style={{
                      backgroundColor: isActive ? '#466063' : '#cdecea',
                      color:           isActive ? '#ffffff' : '#1a5c54',
                      height:       '36px',
                      padding:      '0 24px',
                      borderRadius: '9999px',
                      fontSize:     '13px',
                      fontWeight:   '700',
                      cursor:       'pointer',
                      whiteSpace:   'nowrap',
                      border:       'none',
                      transition:   'opacity 0.15s',
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-10 bg-[#f0f3f8] self-center hidden sm:block" />

          {/* Name search */}
          <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
            <p className="text-[10px] font-[800] tracking-[0.14em] uppercase text-[#94a3b8]">Employee name</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" strokeWidth={2.5} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Start typing name…"
                className="w-full h-8 pl-8 pr-4 bg-[#f4f7fb] rounded-full text-[13px] font-medium text-[#3f4a51] placeholder:text-[#b0bac6] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20"
              />
            </div>
          </div>
        </div>

        {/* ── Request list ── */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-[24px] p-12 text-center text-[#94a3b8] font-medium shadow-sm">
              Loading history…
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-[24px] p-12 text-center shadow-sm">
              <p className="text-[#94a3b8] font-medium">No records found.</p>
            </div>
          ) : (
            filtered.map(req => <HistoryRow key={req.id} req={req} />)
          )}
        </div>
      </main>
    </div>
  )
}
