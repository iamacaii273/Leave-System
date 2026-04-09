import { useState, useEffect, useMemo } from "react"
import Header from "./ManagerHeader"
import { useAuth } from "../../contexts/AuthContext"
import api from "../../services/api"
import {
  Umbrella, Thermometer, Users, ClipboardList, CalendarCheck, UserCheck,
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock
} from "lucide-react"

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]
const DAY_LABELS = ["M","T","W","T","F","S","S"]

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

const STATUS_STYLES = {
  pending:      { bg: "#fee481", text: "#6b5413" },
  approved:     { bg: "#0cf1aa", text: "#185b48" },
  rejected:     { bg: "#f56464", text: "#570008" },
  cancelled:    { bg: "#e2e8f0", text: "#475569" },
  acknowledged: { bg: "#93c5fd", text: "#1e3a8a" },
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
  if (days  > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (mins  > 0) parts.push(`${mins}m`)
  return parts.join(" ") || "0h"
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, count, sublabel, bg, textColor, Icon, iconOpacity = 0.12 }) {
  return (
    <div
      className="relative overflow-hidden rounded-[28px] p-7 flex-1 min-w-[180px] transition-transform hover:scale-[1.02]"
      style={{ backgroundColor: bg }}
    >
      <p className="text-[11px] font-[900] tracking-[0.15em] uppercase mb-3" style={{ color: textColor, opacity: 0.75 }}>
        {label}
      </p>
      <p className="text-[56px] font-fredoka font-bold leading-none mb-2" style={{ color: textColor }}>
        {String(count).padStart(1, "0")}
      </p>
      {sublabel && (
        <span
          className="inline-block text-[10px] font-[900] tracking-widest uppercase px-3 py-1 rounded-full"
          style={{ backgroundColor: `${textColor}22`, color: textColor }}
        >
          {sublabel}
        </span>
      )}
      <div className="absolute -bottom-4 -right-4" style={{ opacity: iconOpacity, color: textColor }}>
        <Icon size={110} strokeWidth={1.5} />
      </div>
    </div>
  )
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ requests = [] }) {
  const now = new Date()
  const [viewYear,     setViewYear]     = useState(now.getFullYear())
  const [viewMonth,    setViewMonth]    = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay    = getFirstDayOfMonth(viewYear, viewMonth)
  const prevDays    = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  )

  // Build a set of days with active requests
  const activeDays = useMemo(() => {
    const set = new Set()
    requests.forEach(r => {
      if (r.status === "rejected" || r.status === "cancelled") return
      const start = new Date(r.start_date); start.setHours(0,0,0,0)
      const end   = new Date(r.end_date);   end.setHours(23,59,59,999)
      const cur   = new Date(start)
      while (cur <= end) {
        if (cur.getFullYear() === viewYear && cur.getMonth() === viewMonth) {
          set.add(cur.getDate())
        }
        cur.setDate(cur.getDate() + 1)
      }
    })
    return set
  }, [requests, viewYear, viewMonth])

  // People on leave for the selected date
  const peopleOnLeave = useMemo(() => {
    if (!selectedDate) return []
    const target = new Date(selectedDate.year, selectedDate.month, selectedDate.day)
    target.setHours(12, 0, 0, 0)
    return requests.filter(r => {
      if (r.status === "rejected" || r.status === "cancelled") return false
      const s = new Date(r.start_date); s.setHours(0,0,0,0)
      const e = new Date(r.end_date);   e.setHours(23,59,59,999)
      return target >= s && target <= e
    })
  }, [selectedDate, requests])

  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true })
  while (cells.length < 35) cells.push({ day: cells.length - daysInMonth - firstDay + 2, current: false })

  function prevMonth() {
    setSelectedDate(null)
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    setSelectedDate(null)
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  function handleDayClick(day) {
    const isSel = selectedDate && selectedDate.day === day &&
                  selectedDate.month === viewMonth && selectedDate.year === viewYear
    setSelectedDate(isSel ? null : { day, month: viewMonth, year: viewYear })
  }
  const isSelected = (day) =>
    selectedDate && selectedDate.day === day &&
    selectedDate.month === viewMonth && selectedDate.year === viewYear

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm">
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
          if (!cell.current) {
            return <div key={idx} className="py-1 text-[12px] text-[#cbd5e1] font-semibold">{cell.day}</div>
          }
          const isToday  = isSameDay(new Date(viewYear, viewMonth, cell.day), new Date())
          const hasLeave = activeDays.has(cell.day)
          const sel      = isSelected(cell.day)
          return (
            <div
              key={idx}
              className="relative py-1 text-[12px] font-semibold rounded-lg cursor-pointer"
              onClick={() => handleDayClick(cell.day)}
            >
              <span className={`relative z-10 inline-flex items-center justify-center w-7 h-7 rounded-full transition-all
                ${isToday ? "bg-[#1c355e] text-white"
                  : sel   ? "bg-[#f57a00] text-white ring-2 ring-[#f57a00]/30"
                  :         "text-[#3f4a51] hover:bg-[#f0f3f8]"}`}>
                {cell.day}
              </span>
              {hasLeave && !isToday && !sel && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#f57a00]" />
              )}
            </div>
          )
        })}
      </div>

      {/* Who's off panel */}
      {selectedDate ? (
        <div className="mt-4 pt-4 border-t border-[#f0f3f8]">
          <p className="text-[11px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">
            {MONTH_NAMES[selectedDate.month]} {selectedDate.day} — {peopleOnLeave.length === 0 ? "No one off" : `${peopleOnLeave.length} off`}
          </p>
          {peopleOnLeave.length === 0 ? (
            <p className="text-[12px] text-[#b0bac6] font-medium text-center py-2">Everyone's in! 🎉</p>
          ) : (
            <div className="space-y-2">
              {peopleOnLeave.map(r => {
                const style = STATUS_STYLES[r.status?.toLowerCase()] || STATUS_STYLES.pending
                const { Icon, color, bg } = getIconData(r.leave_type_name)
                return (
                  <div key={r.id} className="flex items-center gap-2.5 p-2.5 bg-[#f9fafb] rounded-2xl">
                    <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center shrink-0 text-sky-600 font-bold text-[11px]">
                      {(r.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[12px] text-[#2d3e50] truncate">{r.full_name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                          <Icon size={9} color={color} strokeWidth={2.5} />
                        </div>
                        <p className="text-[11px] text-[#94a3b8] truncate">{r.leave_type_name}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-[800] tracking-wide uppercase shrink-0"
                      style={{ backgroundColor: style.bg, color: style.text }}>
                      {r.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#f0f3f8]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f57a00]" />
          <span className="text-[11px] font-medium text-[#64748b]">Click any date to see who's off</span>
        </div>
      )}
    </div>
  )
}


// ─── Team Capacity ────────────────────────────────────────────────────────────
function TeamCapacity({ totalMembers, outToday }) {
  const capacity = totalMembers > 0
    ? Math.round(((totalMembers - outToday) / totalMembers) * 100)
    : 100

  const radius = 54
  const circ   = 2 * Math.PI * radius
  const offset = circ - (capacity / 100) * circ

  let label = "All green! 🎉"
  if (capacity < 70) label = "Heads up! 😬"
  else if (capacity < 90) label = "Looking good! 🙂"

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm flex flex-col items-center">
      <h3 className="font-bold text-[16px] text-[#2d3e50] mb-4 self-start">Team Capacity</h3>
      <div className="relative w-32 h-32 my-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#eef2f9" strokeWidth="12" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke={capacity >= 80 ? "#185b48" : capacity >= 60 ? "#f57a00" : "#f56464"}
            strokeWidth="12"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[22px] font-bold text-[#2d3e50] font-fredoka">{capacity}%</span>
        </div>
      </div>
      <p className="text-[14px] font-bold text-[#3f4a51] mt-1">{label}</p>
      <p className="text-[12px] text-[#94a3b8] mt-0.5">
        {outToday} of {totalMembers} members out today
      </p>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const { user } = useAuth()
  const [requests,      setRequests]      = useState([])
  const [totalMembers,  setTotalMembers]  = useState(0)
  const [outToday,      setOutToday]      = useState(0)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const teamRes = await api.get("/leave-requests/team").catch(() => ({ data: { leaveRequests: [] } }))
        const all = teamRes.data.leaveRequests || []
        setRequests(all)

        // Unique employee IDs from any request = total team members we know about
        const uniqueMembers = new Set(all.map(r => r.user_id))
        setTotalMembers(uniqueMembers.size)

        const today = new Date(); today.setHours(0, 0, 0, 0)
        const outIds = new Set()
        all.forEach(r => {
          if (r.status === "rejected" || r.status === "cancelled") return
          const s = new Date(r.start_date); s.setHours(0,0,0,0)
          const e = new Date(r.end_date);   e.setHours(23,59,59,999)
          if (today >= s && today <= e) outIds.add(r.user_id)
        })
        setOutToday(outIds.size)
      } catch (err) {
        console.error("Manager dashboard error:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const pending    = requests.filter(r => r.status === "pending")
  const approved   = requests.filter(r => r.status === "approved")
  const recent     = requests.slice(0, 5)
  const displayName = user?.full_name?.split(" ")[0] || "Boss"

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col">
      <Header activePage="dashboard" onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">

        {/* ── Greeting ── */}
        <div className="mb-12 mt-4">
          <h1 className="text-[62px] font-fredoka font-[600] text-[#3f4a51] mb-2 flex items-center gap-4">
            {getTimeGreeting()}, {displayName}!
            <span className="text-[58px]" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.15))" }}>✨</span>
          </h1>
          <p className="text-[#64748b] text-[19px] font-medium max-w-xl">
            {pending.length > 0
              ? <>You have <span className="font-bold text-[#3f4a51]">{pending.length} request{pending.length !== 1 ? "s" : ""}</span> waiting for your approval today.</>
              : "All caught up! No pending requests right now. 🎉"}
          </p>
        </div>

        {/* ── Stat Cards ── */}
        <div className="flex flex-wrap gap-5 mb-12">
          <StatCard
            label="Pending Approvals"
            count={pending.length}
            sublabel="Needs Action"
            bg="#fef08a"
            textColor="#713f12"
            Icon={ClipboardList}
          />
          <StatCard
            label="Approved"
            count={approved.length}
            sublabel="This period"
            bg="#bbf7d0"
            textColor="#166534"
            Icon={CalendarCheck}
          />
          <StatCard
            label="Team Out Today"
            count={outToday}
            bg="#ffffff"
            textColor="#3f4a51"
            Icon={UserCheck}
            iconOpacity={0.07}
          />
        </div>

        {/* ── Bottom grid: Requests + Calendar + Capacity ── */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">

          {/* Recent Leave Requests */}
          <div className="bg-white rounded-[40px] p-8 shadow-sm">
            <div className="flex items-start justify-between mb-7 px-1">
              <div>
                <h3 className="font-bold text-[22px] font-fredoka text-[#3f4a51] mb-1 tracking-wide">
                  Recent Leave Requests
                </h3>
                <p className="text-[14px] font-medium text-[#94a3b8]">Your team's latest activity</p>
              </div>
              <button
                onClick={() => onNavigate && onNavigate("approvals")}
                className="text-[14px] font-bold text-[#5e6c7e] hover:text-[#3f4a51] transition-colors pt-2 cursor-pointer"
              >
                View all
              </button>
            </div>

            {loading ? (
              <p className="text-center text-[#94a3b8] py-12 font-medium">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="text-center text-[#94a3b8] py-12 font-medium">No leave requests yet.</p>
            ) : (
              <div className="space-y-3">
                {recent.map(req => {
                  const { Icon, color, bg } = getIconData(req.leave_type_name)
                  const style = STATUS_STYLES[req.status?.toLowerCase()] || STATUS_STYLES.pending
                  const dateRange = isSameDayStr(req.start_date, req.end_date)
                    ? formatDateShort(req.start_date)
                    : `${formatDateShort(req.start_date)} – ${formatDateShort(req.end_date)}`

                  return (
                    <div key={req.id} className="flex items-center gap-4 p-4 bg-[#f9fafb] rounded-[22px] hover:bg-[#f1f5f9] transition-colors">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center shrink-0 text-sky-600 font-bold text-[15px]">
                        {(req.full_name || "?")[0].toUpperCase()}
                      </div>

                      {/* Person */}
                      <div className="min-w-[130px]">
                        <p className="font-bold text-[14px] text-[#2d3e50]">{req.full_name}</p>
                        <p className="text-[12px] text-[#94a3b8] font-medium">{req.email}</p>
                      </div>

                      {/* Leave type */}
                      <div className="flex items-center gap-2 min-w-[130px]">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                          <Icon size={15} color={color} strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="text-[10px] font-[800] tracking-widest uppercase text-[#94a3b8]">TYPE</p>
                          <p className="font-bold text-[13px] text-[#3f4a51]">{req.leave_type_name}</p>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="min-w-[140px]">
                        <p className="text-[10px] font-[800] tracking-widest uppercase text-[#94a3b8]">DURATION</p>
                        <p className="font-bold text-[13px] text-[#3f4a51]">{dateRange}</p>
                        <p className="text-[11px] text-[#94a3b8]">{formatDurationText(req.total_days)}</p>
                      </div>

                      {/* Status */}
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
                })}
              </div>
            )}
          </div>

          {/* Right column: Mini Calendar + Capacity */}
          <div className="flex flex-col gap-5">
            <MiniCalendar requests={requests} />
            <TeamCapacity totalMembers={totalMembers} outToday={outToday} />
          </div>
        </div>
      </main>
    </div>
  )
}
