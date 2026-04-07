import { useState, useMemo } from "react"
import Header from "../../components/Header"
import { Umbrella, Cross, Users, ChevronLeft, ChevronRight, Upload, X, Send, CalendarDays, FileText } from "lucide-react"

/* ──────────────────────── helpers ──────────────────────── */

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1            // Mon=0 … Sun=6
}
function pad2(n) { return String(n).padStart(2, "0") }

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]
const DAY_LABELS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function isBetween(d, s, e) {
  if (!s || !e) return false
  const t = d.getTime()
  return t >= s.getTime() && t <= e.getTime()
}

/**
 * Calculate leave duration.
 * - Counts working days (Mon-Fri) in the selected date range
 * - Uses start/end time to compute total hours
 * - Returns { days, hours, totalHours, label }
 *   label: "X Days" if >= 1 day, or "X Hours" if < 1 day
 */
function calcDuration(start, end, sH, sM, sAP, eH, eM, eAP) {
  if (!start || !end) return { days: 0, hours: 0, totalHours: 0, label: "" }

  // count working days (Mon-Fri, inclusive)
  let workDays = 0
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) workDays++
    cur.setDate(cur.getDate() + 1)
  }

  // convert 12h -> 24h
  const to24 = (h, ap) => {
    let hr = parseInt(h, 10) || 0
    if (ap === "PM" && hr < 12) hr += 12
    if (ap === "AM" && hr === 12) hr = 0
    return hr
  }
  const startH24 = to24(sH, sAP)
  const endH24 = to24(eH, eAP)
  const startM = parseInt(sM, 10) || 0
  const endM = parseInt(eM, 10) || 0

  const sameDay = start.getTime() === end.getTime()

  let totalHours
  if (sameDay) {
    // same day: diff between end time and start time
    totalHours = (endH24 + endM / 60) - (startH24 + startM / 60)
    if (totalHours < 0) totalHours = 0
  } else {
    // multiple days: full working days × 8h
    totalHours = workDays * 8
  }

  const fullDays = Math.floor(totalHours / 8)
  const remainHours = Math.round(totalHours % 8)

  // build label
  let label
  if (totalHours < 8) {
    // less than 1 working day → show hours
    const h = Math.round(totalHours)
    label = `${h} Hour${h !== 1 ? "s" : ""}`
  } else if (remainHours > 0) {
    label = `${fullDays} Day${fullDays !== 1 ? "s" : ""}, ${remainHours} Hour${remainHours !== 1 ? "s" : ""}`
  } else {
    label = `${fullDays} Day${fullDays !== 1 ? "s" : ""}`
  }

  return { days: fullDays, hours: remainHours, totalHours, label }
}

/* ──────────────────────── main component ──────────────────────── */

export default function Request({ onNavigate }) {
  /* leave type */
  const [leaveType, setLeaveType] = useState("annual")

  /* calendar nav */
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  /* selected range */
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)

  /* time */
  const [startHour, setStartHour] = useState("09")
  const [startMin, setStartMin] = useState("00")
  const [startAmPm, setStartAmPm] = useState("AM")
  const [endHour, setEndHour] = useState("05")
  const [endMin, setEndMin] = useState("00")
  const [endAmPm, setEndAmPm] = useState("PM")

  /* reason */
  const [reason, setReason] = useState("")

  /* computed step (auto from selections) */
  const currentStep = leaveType ? (startDate && endDate ? 3 : startDate ? 2 : 1) : 1

  /* duration — recalculates when dates or times change */
  const duration = useMemo(
    () => calcDuration(startDate, endDate, startHour, startMin, startAmPm, endHour, endMin, endAmPm),
    [startDate, endDate, startHour, startMin, startAmPm, endHour, endMin, endAmPm]
  )

  /* ─── leave types ─── */
  const leaveTypes = [
    { id: "annual", label: "Annual Leave", desc: "Personal recharge", Icon: Umbrella, color: "#5ea5d4", bg: "#dbedf9" },
    { id: "sick", label: "Sick Leave", desc: "Rest & recovery", Icon: Cross, color: "#e06070", bg: "#fce4e8" },
    { id: "personal", label: "Personal", desc: "Family & errands", Icon: Users, color: "#d06ab0", bg: "#f8e0f0" },
  ]

  /* ─── calendar grid ─── */
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  )

  const calCells = useMemo(() => {
    const cells = []
    // trailing days of previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, current: false })
    }
    // current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, current: true })
    }
    // fill remaining to complete 6 rows
    const remain = 42 - cells.length
    for (let d = 1; d <= remain; d++) {
      cells.push({ day: d, current: false })
    }
    return cells
  }, [viewYear, viewMonth, daysInMonth, firstDay, prevMonthDays])

  function handleDayClick(day) {
    const clicked = new Date(viewYear, viewMonth, day)
    if (!startDate || (startDate && endDate)) {
      setStartDate(clicked)
      setEndDate(null)
    } else {
      if (clicked < startDate) {
        setEndDate(startDate)
        setStartDate(clicked)
      } else {
        setEndDate(clicked)
      }
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  /* ─── steps config ─── */
  const steps = [
    { num: 1, label: "Choose Type" },
    { num: 2, label: "Dates" },
    { num: 3, label: "Reason" },
  ]

  /* ────────────────────── render ────────────────────── */
  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col">
      <Header activePage="request" onNavigate={onNavigate} />

      <main className="max-w-5xl mx-auto px-6 py-12 w-full flex-grow">
        {/* ── Hero ── */}
        <div className="mb-12 mt-2">
          <h1 className="text-[56px] leading-tight font-fredoka font-semibold text-[#2d3e50] mb-3 flex items-center gap-3">
            Plan Your Rest <span className="text-[48px]">✨</span>
          </h1>
          <p className="text-[#64748b] text-lg font-medium max-w-xl leading-relaxed">
            Take the time you need to recharge and come back even stronger.<br />
            We've made requesting leave as soft as a cloud.
          </p>
        </div>

        {/* ── Step Indicator ── */}
        <div className="flex items-center justify-center mb-10">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center min-w-[80px]">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${currentStep >= s.num
                      ? "bg-[#1c355e] text-white"
                      : "bg-[#dde3ec] text-[#94a3b8]"
                    }`}
                >
                  {s.num}
                </div>
                <span className={`text-[12px] mt-2 font-bold ${currentStep >= s.num ? "text-[#1c355e]" : "text-[#94a3b8]"}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-28 h-[3px] rounded-full -mt-5 ${currentStep > s.num ? "bg-[#1c355e]" : "bg-[#dde3ec]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Main Content: 3 columns ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_210px] gap-6 mb-6">

          {/* ← Leave Types */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm self-start">
            <h3 className="font-bold text-[15px] text-[#3f4a51] mb-5 flex items-center gap-2">
              <CalendarDays size={16} /> Leave Types
            </h3>
            <div className="space-y-3">
              {leaveTypes.map(({ id, label, desc, Icon, color, bg }) => (
                <button
                  key={id}
                  onClick={() => setLeaveType(id)}
                  className={`w-full p-3.5 rounded-2xl text-left transition-all flex items-center gap-3 ${leaveType === id
                      ? "bg-[#c6ddf0] ring-2 ring-[#1c355e]"
                      : "bg-[#f4f7fb] hover:bg-[#eaf0f7]"
                    }`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: bg }}>
                    <Icon size={18} color={color} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="font-bold text-[13px] text-[#2d3e50]">{label}</p>
                    <p className={`text-[11px] font-semibold ${leaveType === id ? "text-[#4a6070]" : "text-[#94a3b8]"}`}>
                      {desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ─ Calendar ─ */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm self-start">
            {/* month nav */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[17px] text-[#2d3e50]">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h3>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-[#f0f3f8] flex items-center justify-center text-[#64748b]">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-[#f0f3f8] flex items-center justify-center text-[#64748b]">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* day headers */}
            <div className="grid grid-cols-7 gap-y-1 text-center mb-2">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-[11px] font-bold text-[#94a3b8] py-1">{d}</div>
              ))}
            </div>

            {/* day cells */}
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {calCells.map((cell, idx) => {
                if (!cell.current) {
                  return <div key={idx} className="py-2 text-[13px] text-[#cbd5e1] font-semibold">{cell.day}</div>
                }
                const thisDate = new Date(viewYear, viewMonth, cell.day)
                const isStart = isSameDay(thisDate, startDate)
                const isEnd = isSameDay(thisDate, endDate)
                const inRange = isBetween(thisDate, startDate, endDate)
                const isToday = isSameDay(thisDate, new Date())

                let cellClass = "py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-all relative "
                if (isStart || isEnd) {
                  cellClass += "bg-[#1c355e] text-white z-10 "
                } else if (inRange) {
                  cellClass += "bg-[#d6e6f5] text-[#1c355e] "
                } else if (isToday) {
                  cellClass += "ring-1 ring-[#1c355e] text-[#1c355e] "
                } else {
                  cellClass += "text-[#3f4a51] hover:bg-[#eef3fa] "
                }

                return (
                  <div
                    key={idx}
                    className={cellClass}
                    onClick={() => handleDayClick(cell.day)}
                  >
                    {cell.day}
                  </div>
                )
              })}
            </div>
          </div>

          {/* → Time & Duration */}
          <div className="flex flex-col gap-5 self-start">
            {/* Start time */}
            <div>
              <p className="text-[10px] font-bold text-[#94a3b8] tracking-widest uppercase mb-2">
                START TIME {startDate ? `(${MONTH_NAMES[startDate.getMonth()].slice(0, 3)} ${startDate.getDate()})` : ""}
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="text" value={startHour}
                  onChange={e => setStartHour(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  className="w-11 h-10 rounded-lg bg-white border border-[#dde3ec] text-center text-[14px] font-bold text-[#2d3e50] focus:outline-none focus:ring-2 focus:ring-[#1c355e]"
                />
                <input
                  type="text" value={startMin}
                  onChange={e => setStartMin(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  className="w-11 h-10 rounded-lg bg-white border border-[#dde3ec] text-center text-[14px] font-bold text-[#2d3e50] focus:outline-none focus:ring-2 focus:ring-[#1c355e]"
                />
                <div className="flex rounded-lg overflow-hidden border border-[#dde3ec]">
                  <button
                    onClick={() => setStartAmPm("AM")}
                    className={`px-2.5 py-2 text-[11px] font-bold transition-colors ${startAmPm === "AM" ? "bg-[#1c355e] text-white" : "bg-white text-[#94a3b8]"}`}
                  >AM</button>
                  <button
                    onClick={() => setStartAmPm("PM")}
                    className={`px-2.5 py-2 text-[11px] font-bold transition-colors ${startAmPm === "PM" ? "bg-[#1c355e] text-white" : "bg-white text-[#94a3b8]"}`}
                  >PM</button>
                </div>
              </div>
            </div>

            {/* End time */}
            <div>
              <p className="text-[10px] font-bold text-[#94a3b8] tracking-widest uppercase mb-2">
                END TIME {endDate ? `(${MONTH_NAMES[endDate.getMonth()].slice(0, 3)} ${endDate.getDate()})` : ""}
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  type="text" value={endHour}
                  onChange={e => setEndHour(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  className="w-11 h-10 rounded-lg bg-white border border-[#dde3ec] text-center text-[14px] font-bold text-[#2d3e50] focus:outline-none focus:ring-2 focus:ring-[#1c355e]"
                />
                <input
                  type="text" value={endMin}
                  onChange={e => setEndMin(e.target.value.replace(/\D/g, "").slice(0, 2))}
                  className="w-11 h-10 rounded-lg bg-white border border-[#dde3ec] text-center text-[14px] font-bold text-[#2d3e50] focus:outline-none focus:ring-2 focus:ring-[#1c355e]"
                />
                <div className="flex rounded-lg overflow-hidden border border-[#dde3ec]">
                  <button
                    onClick={() => setEndAmPm("AM")}
                    className={`px-2.5 py-2 text-[11px] font-bold transition-colors ${endAmPm === "AM" ? "bg-[#1c355e] text-white" : "bg-white text-[#94a3b8]"}`}
                  >AM</button>
                  <button
                    onClick={() => setEndAmPm("PM")}
                    className={`px-2.5 py-2 text-[11px] font-bold transition-colors ${endAmPm === "PM" ? "bg-[#1c355e] text-white" : "bg-white text-[#94a3b8]"}`}
                  >PM</button>
                </div>
              </div>
            </div>

            {/* Duration */}
            {startDate && endDate && (
              <div className="mt-1">
                <p className="text-[10px] font-bold text-[#1c355e] tracking-widest uppercase mb-1">DURATION</p>
                <p className="text-[16px] font-bold text-[#2d3e50]">
                  {duration.label}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom row: Attachments + Reason ── */}
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 mb-6">
          {/* Attachments */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm">
            <h3 className="font-bold text-[15px] text-[#3f4a51] mb-5 flex items-center gap-2">
              <CalendarDays size={16} /> Attachments
            </h3>
            <div className="border-2 border-dashed border-[#dde3ec] rounded-2xl py-10 px-4 text-center hover:bg-[#f9fafb] transition-colors cursor-pointer">
              <div className="mx-auto w-12 h-12 bg-[#f0f3f8] rounded-full flex items-center justify-center text-[#94a3b8] mb-3">
                <Upload size={22} />
              </div>
              <p className="text-[14px] font-bold text-[#3f4a51]">Upload Files</p>
              <p className="text-[12px] text-[#94a3b8] mt-1">Drag files or click to browse</p>
            </div>
          </div>

          {/* Reason */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm flex flex-col">
            <h3 className="font-bold text-[15px] text-[#3f4a51] mb-5 flex items-center gap-2">
              <FileText size={16} /> Reason for Leave
            </h3>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Tell us about your plans..."
              className="w-full flex-grow min-h-[120px] p-5 bg-[#f4f7fb] text-[#3f4a51] font-medium text-[14px] rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[#1c355e] placeholder:text-[#b0bac6]"
            />
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex justify-between items-center mt-4 mb-8 px-2">
          <button className="text-[#f56464] font-bold text-[14px] hover:text-red-600 flex items-center gap-2 transition-colors">
            <X size={18} strokeWidth={2.5} />
            Discard Request
          </button>
          <button className="bg-[#133251] text-white px-8 py-3.5 rounded-full text-[14px] font-bold hover:bg-[#152a4a] transition-colors flex items-center gap-2.5 shadow-lg shadow-[#1c355e]/20">
            Submit Request
            <Send size={16} strokeWidth={2.5} />
          </button>
        </div>
      </main>
    </div>
  )
}