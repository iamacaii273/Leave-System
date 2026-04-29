import { useState, useMemo, useEffect } from "react"
import Header from "../../components/Header"
import { Umbrella, Thermometer, Users, Plane, Smile, HeartHandshake, PartyPopper, MoreHorizontal, ChevronLeft, ChevronRight, Upload, X, Send, CalendarDays, FileText, AlertTriangle } from "lucide-react"
import api from "../../services/api"
import { useAuth } from "../../contexts/AuthContext"
import { resolveLeaveTypeStyle } from "../../utils/leaveTypeUtils"

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

const statusColors = {
  approved: { bg: "#0cf1aa", text: "#185b48" },
  pending: { bg: "#fee481", text: "#6b5413" },
  default: { bg: "#eef2f9", text: "#3f4a51" }
}

/**
 * Calculate leave duration.
 * - Counts working days (Mon-Fri) in the selected date range
 * - Uses start/end time to compute total hours
 * - Returns { days, hours, totalHours, label }
 *   label: "X Days" if >= 1 day, or "X Hours" if < 1 day
 */
function calcDuration(start, end, sH, sM, sAP, eH, eM, eAP, isAllDay) {
  if (!start || !end) return { days: 0, hours: 0, minutes: 0, totalHours: 0, label: "" }

  let workDays = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const last = new Date(end)
  last.setHours(0, 0, 0, 0)

  const sameDay = cur.getTime() === last.getTime()

  while (cur <= last) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) workDays++
    cur.setDate(cur.getDate() + 1)
  }

  let totalHours = 0

  if (isAllDay) {
    totalHours = workDays * 8;
  } else {
    const to24 = (h, ap) => {
      let hr = parseInt(h, 10) || 0
      if (ap === "PM" && hr < 12) hr += 12
      if (ap === "AM" && hr === 12) hr = 0
      return hr
    }
    const sTime = to24(sH, sAP) + (parseInt(sM, 10) || 0) / 60
    const eTime = to24(eH, eAP) + (parseInt(eM, 10) || 0) / 60

    if (workDays === 0) {
      totalHours = 0
    } else if (sameDay) {
      totalHours = Math.max(0, eTime - sTime)
    } else {
      totalHours = (workDays - 1) * 8 + (eTime - sTime)
      if (totalHours < 0) totalHours = 0
    }
  }

  const fullDays = Math.floor(totalHours / 8);
  const remainder = totalHours - (fullDays * 8);
  const fullHours = Math.floor(remainder);
  const remainMins = Math.round((remainder - fullHours) * 60);

  let labelParts = [];
  if (fullDays > 0) labelParts.push(`${fullDays} Day${fullDays !== 1 ? 's' : ''}`);
  if (fullHours > 0 || (fullDays === 0 && remainMins === 0)) labelParts.push(`${fullHours} Hour${fullHours !== 1 ? 's' : ''}`);
  if (remainMins > 0) labelParts.push(`${remainMins} Min${remainMins !== 1 ? 's' : ''}`);

  const label = labelParts.length > 0 ? labelParts.join(', ') : '0 Hours';

  return { days: fullDays, hours: fullHours, minutes: remainMins, totalHours, label }
}

/* ──────────────────────── main component ──────────────────────── */

export default function Request({ onNavigate }) {
  const { user } = useAuth()
  const [leaveBalances, setLeaveBalances] = useState([])
  const [dbLeaveTypes, setDbLeaveTypes] = useState([])
  const [myRequests, setMyRequests] = useState([])

  useEffect(() => {
    Promise.all([
      api.get('/leave-balances/me'),
      api.get('/leave-types'),
      api.get('/leave-requests/me')
    ]).then(([balRes, typeRes, reqRes]) => {
      setLeaveBalances(balRes.data.balances || [])
      setDbLeaveTypes(typeRes.data.leaveTypes || [])
      setMyRequests(reqRes.data.leaveRequests || [])
    }).catch(console.error)
  }, [])

  const activeLeaveDays = useMemo(() => {
    const map = new Map()
    myRequests.forEach(r => {
      const status = r.status.toLowerCase()
      if (status !== 'approved' && status !== 'pending') return
      
      const s = new Date(r.start_date)
      s.setHours(0, 0, 0, 0)
      const e = new Date(r.end_date)
      e.setHours(23, 59, 59, 999)
      
      let cur = new Date(s)
      while (cur <= e) {
        const dow = cur.getDay()
        if (dow !== 0 && dow !== 6) {
          const dateStr = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`
          map.set(dateStr, { 
            type: r.leave_type_name, 
            status: r.status,
            iconName: r.leave_type_icon,
            colorType: r.leave_type_color
          })
        }
        cur.setDate(cur.getDate() + 1)
      }
    })
    return map
  }, [myRequests])

  /* leave type */
  const [leaveType, setLeaveType] = useState("")

  /* calendar nav */
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  /* selected range */
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)

  /* time */
  const [isAllDay, setIsAllDay] = useState(true)
  const [startHour, setStartHour] = useState("09")
  const [startMin, setStartMin] = useState("00")
  const [startAmPm, setStartAmPm] = useState("AM")
  const [endHour, setEndHour] = useState("05")
  const [endMin, setEndMin] = useState("00")
  const [endAmPm, setEndAmPm] = useState("PM")

  /* reason */
  const [reason, setReason] = useState("")

  /* submit error */
  const [submitError, setSubmitError] = useState("")

  /* files */
  const [files, setFiles] = useState([])
  function handleFileChange(e) {
    const newFiles = Array.from(e.target.files)
    setFiles(prev => [...prev, ...newFiles])
    e.target.value = ""
  }
  function removeFile(index) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  /* exceed quota modal */
  const [showExceedModal, setShowExceedModal] = useState(false)
  const [exceedDetails, setExceedDetails] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /* computed step (auto from selections) */
  const currentStep = leaveType ? (startDate && endDate ? 3 : 2) : 1

  /* duration — recalculates when dates or times change */
  const duration = useMemo(() => {
    return calcDuration(startDate, endDate, startHour, startMin, startAmPm, endHour, endMin, endAmPm, isAllDay)
  }, [startDate, endDate, startHour, startMin, startAmPm, endHour, endMin, endAmPm, isAllDay])

  const handleSubmit = () => {
    setSubmitError("");
    if (!startDate || !endDate) return setSubmitError("Please select dates");
    if (!reason.trim()) return setSubmitError("Please provide a reason for your leave");
    if (duration.totalHours <= 0) return setSubmitError("Duration must be greater than 0");

    // Check if exceeding quota
    const balanceObj = leaveBalances.find(b => b.leave_type_id === leaveType);
    if (balanceObj) {
      const requestedDays = duration.totalHours / 8;
      const parsedRemaining = Number(balanceObj.remaining_days);
      if (parsedRemaining < requestedDays) {
        setExceedDetails({
          requested: requestedDays,
          remaining: parsedRemaining
        });
        setShowExceedModal(true);
        return;
      }
    }

    doSubmit();
  }

  const doSubmit = async () => {
    setShowExceedModal(false);
    setIsSubmitting(true);
    setSubmitError("");

    const sDateBase = `${startDate.getFullYear()}-${pad2(startDate.getMonth() + 1)}-${pad2(startDate.getDate())}`;
    const eDateBase = `${endDate.getFullYear()}-${pad2(endDate.getMonth() + 1)}-${pad2(endDate.getDate())}`;

    let finalStart = `${sDateBase}T09:00:00`;
    let finalEnd = `${eDateBase}T17:00:00`;

    if (!isAllDay) {
      const to24 = (h, ap) => pad2((parseInt(h, 10) % 12) + (ap === "PM" ? 12 : 0));
      finalStart = `${sDateBase}T${to24(startHour, startAmPm)}:${startMin}:00`;
      finalEnd = `${eDateBase}T${to24(endHour, endAmPm)}:${endMin}:00`;
    }

    const formData = new FormData();
    formData.append('leave_type_id', leaveType);
    formData.append('start_date', finalStart);
    formData.append('end_date', finalEnd);
    formData.append('total_days', String(duration.totalHours / 8));
    formData.append('reason', reason);
    files.forEach(f => formData.append('files', f));

    try {
      await api.post('/leave-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onNavigate && onNavigate('dashboard');
    } catch (e) {
      console.error(e);
      setSubmitError(e.response?.data?.message || "Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ─── leave types ─── */
  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'umbrella': return Umbrella
      case 'thermometer': return Thermometer
      case 'user': return Users
      case 'plane': return Plane
      case 'smile': return Smile
      case 'heart': return HeartHandshake
      case 'party': return PartyPopper
      case 'more': return MoreHorizontal
      default: return Umbrella
    }
  }

  const getColorConfig = (colorType) => {
    switch (colorType) {
      case 'blue': return { color: "#006dae", bg: "#d6efff" }
      case 'orange': return { color: "#b86814", bg: "#ffe3c2" }
      case 'pink': return { color: "#8c2d68", bg: "#ffd6ee" }
      case 'green': return { color: "#0a5c3e", bg: "#d0f5e5" }
      default: return { color: "#0172b1", bg: "#d6efff" }
    }
  }

  const parsedLeaveTypes = useMemo(() => {
    // We only show leave types that the user is actually eligible for
    return leaveBalances
      .filter(bal => bal.is_eligible)
      .map(bal => {
        const dbType = dbLeaveTypes.find(t => t.id === bal.leave_type_id)
        const colors = getColorConfig(dbType?.color_type)
        return {
          id: bal.leave_type_id,
          label: bal.leave_type_name,
          desc: dbType?.description || "Request time off for this category.",
          Icon: getIconComponent(dbType?.icon_name),
          color: colors.color,
          bg: colors.bg
        }
      })
  }, [leaveBalances, dbLeaveTypes])

  /* ─── calendar grid ─── */
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)

  const prevMonthDays = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  )

  const calCells = useMemo(() => {
    const cells = []
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, current: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, current: true })
    }
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

      {/* Exceed Quota Modal */}
      {showExceedModal && exceedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-xl text-center">
            <div className="mx-auto w-16 h-16 bg-[#fff1f2] rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} color="#e11d48" strokeWidth={2.5} />
            </div>
            <h2 className="font-fredoka font-bold text-[22px] text-[#2d3e50] mb-2">Exceeds Quota Warning</h2>
            <p className="text-[14px] text-[#64748b] font-medium mb-6">
              You are requesting <span className="font-bold text-[#e11d48]">{exceedDetails.requested} days</span>, but you only have <span className="font-bold text-[#3f4a51]">{exceedDetails.remaining} days</span> remaining.
              <br /><br />
              If you proceed, this request will be flagged as "Exceeds Quota" for your manager's special review.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExceedModal(false)}
                className="flex-1 py-3.5 rounded-2xl border-2 border-[#e2e8f0] text-[#64748b] font-bold text-[14px] hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={doSubmit}
                disabled={isSubmitting}
                className="!flex-1 !py-3.5 rounded-2xl !bg-[#e11d48] text-white font-bold text-[14px] hover:bg-[#be123c] transition-colors shadow-lg shadow-[#e11d48]/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Yes, Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <span className={`text-[13px] mt-2 font-bold ${currentStep >= s.num ? "text-[#1c355e]" : "text-[#94a3b8]"}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-36 h-[3px] rounded-full -mt-5 ${currentStep > s.num ? "bg-[#1c355e]" : "bg-[#dde3ec]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Main Content: 3 columns ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 mb-6">

          {/* ← Leave Types */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm self-start">
            <h3 className="font-bold text-[15px] text-[#3f4a51] mb-5 flex items-center gap-2">
              <CalendarDays size={16} /> Leave Types
            </h3>
            <div className="space-y-3">
              {parsedLeaveTypes.map(({ id, label, desc, Icon, color, bg }) => (
                <button
                  key={id}
                  onClick={() => setLeaveType(id)}
                  className="w-full py-4 px-5 rounded-[40px] text-left transition-all flex items-center gap-4 border-2 outline-none cursor-pointer hover:opacity-90"
                  style={{
                    backgroundColor: leaveType === id ? "#9ab8cf" : "#f2f4f6",
                    borderColor: leaveType === id ? "#0f3557" : "transparent"
                  }}
                >
                  <div className="w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: bg }}>
                    <Icon size={22} color={color} strokeWidth={2.2} />
                  </div>
                  <div>
                    <p className="font-[800] text-[15px]"
                      style={{ color: leaveType === id ? "#2c3b4a" : "#2b3c4f" }}>
                      {label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ─ Calendar ─ */}
          <div className={`bg-white rounded-[32px] p-6 shadow-sm self-start transition-opacity ${currentStep < 2 ? "opacity-50 pointer-events-none" : ""}`}>
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

                let cellClass = "py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-all relative group "
                if (isStart || isEnd) {
                  cellClass += "bg-[#1c355e] text-white z-10 "
                } else if (inRange) {
                  cellClass += "bg-[#d6e6f5] text-[#1c355e] "
                } else if (isToday) {
                  cellClass += "text-[#1c355e] font-extrabold "
                } else {
                  cellClass += "text-[#3f4a51] hover:bg-[#eef3fa] "
                }

                const dateStr = `${viewYear}-${viewMonth}-${cell.day}`
                const leaveInfo = activeLeaveDays.get(dateStr)

                return (
                  <div
                    key={idx}
                    className={cellClass}
                    onClick={() => handleDayClick(cell.day)}
                  >
                    {cell.day}
                    {(isToday || leaveInfo) && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center justify-center gap-[3px]">
                        {isToday && <div className="w-1.5 h-1.5 rounded-full bg-[#478afb]" title="Today" />}
                        {leaveInfo && <div className="w-1.5 h-1.5 rounded-full bg-[#f57a00]" />}
                      </div>
                    )}
                    {leaveInfo && (() => {
                      const { Icon, color, bg } = resolveLeaveTypeStyle(leaveInfo.iconName, leaveInfo.colorType)
                      const stColor = statusColors[leaveInfo.status.toLowerCase()] || statusColors.default
                      const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"

                      return (
                        <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 hidden group-hover:flex z-50 pointer-events-none">
                          <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#eef2f9] p-2 flex items-center gap-3 min-w-max">
                            <div className="w-10 h-10 rounded-full bg-[#eaf4fe] text-[#0070c0] flex items-center justify-center font-bold text-[16px] shrink-0">
                              {userInitial}
                            </div>
                            <div className="flex flex-col justify-center text-left min-w-[100px] mr-2">
                              <span className="text-[#1f3747] font-bold text-[14px] leading-tight block truncate">
                                {user?.full_name || "Employee"}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                                  <Icon size={9} color={color} strokeWidth={3} />
                                </div>
                                <span className="text-[#94a3b8] text-[13px] font-medium truncate">
                                  {leaveInfo.type}
                                </span>
                              </div>
                            </div>
                            <div 
                              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0"
                              style={{ backgroundColor: stColor.bg, color: stColor.text }}
                            >
                              {leaveInfo.status}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          </div>

          {/* → Time & Duration */}
          <div className="flex flex-col gap-5 self-start">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${isAllDay ? "bg-[#1c355e] border-[#1c355e]" : "border-[#ccd5df] bg-transparent"}`}>
                  {isAllDay && <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 9.4L0 5.4L1.4 4L4 6.6L10.6 0L12 1.4L4 9.4Z" fill="white" /></svg>}
                </div>
                <span className="text-[13px] font-[800] text-[#6a7c92] tracking-wider uppercase select-none">
                  ALL DAY LEAVE
                </span>
                <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="hidden" />
              </label>
            </div>

            {!isAllDay && (
              <>
                {/* Start time */}
                <div className="mt-2">
                  <p className="text-[12px] font-[800] tracking-widest uppercase mb-3" style={{ color: "#6a7c92" }}>
                    START TIME {startDate ? `(${MONTH_NAMES[startDate.getMonth()].slice(0, 3).toUpperCase()} ${startDate.getDate()})` : ""}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-[10px] px-2 h-[42px] flex-1 border" style={{ backgroundColor: "#f3f4f6", borderColor: "#ccd5df" }}>
                      <select
                        value={startHour}
                        onChange={e => setStartHour(e.target.value)}
                        className="w-1/2 h-full bg-transparent text-center text-[16px] font-bold focus:outline-none appearance-none cursor-pointer"
                        style={{ color: "#1d2f3e" }}
                      >
                        {Array.from({ length: 12 }, (_, i) => pad2(i + 1)).map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="font-bold mx-0.5 pb-0.5" style={{ color: "#c9d1db" }}>:</span>
                      <select
                        value={startMin}
                        onChange={e => setStartMin(e.target.value)}
                        className="w-1/2 h-full bg-transparent text-center text-[16px] font-bold focus:outline-none appearance-none cursor-pointer pl-1"
                        style={{ color: "#1d2f3e" }}
                      >
                        {Array.from({ length: 60 }, (_, i) => pad2(i)).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center rounded-[10px] p-[3.5px] h-[42px] border" style={{ backgroundColor: "#f3f4f6", borderColor: "#cdd5df" }}>
                      <button
                        onClick={() => setStartAmPm("AM")}
                        className="w-11 h-full text-[13px] font-bold rounded-[7px] transition-colors flex items-center justify-center cursor-pointer"
                        style={{
                          backgroundColor: startAmPm === "AM" ? "#00a2fa" : "transparent",
                          color: startAmPm === "AM" ? "#ffffff" : "#7e8c9b"
                        }}
                      >AM</button>
                      <button
                        onClick={() => setStartAmPm("PM")}
                        className="w-11 h-full text-[13px] font-bold rounded-[7px] transition-colors flex items-center justify-center cursor-pointer"
                        style={{
                          backgroundColor: startAmPm === "PM" ? "#00a2fa" : "transparent",
                          color: startAmPm === "PM" ? "#ffffff" : "#7e8c9b"
                        }}
                      >PM</button>
                    </div>
                  </div>
                </div>

                {/* End time */}
                <div>
                  <p className="text-[12px] font-[800] tracking-widest uppercase mb-3 mt-1" style={{ color: "#6a7c92" }}>
                    END TIME {endDate ? `(${MONTH_NAMES[endDate.getMonth()].slice(0, 3).toUpperCase()} ${endDate.getDate()})` : ""}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-[10px] px-2 h-[42px] flex-1 border" style={{ backgroundColor: "#f3f4f6", borderColor: "#ccd5df" }}>
                      <select
                        value={endHour}
                        onChange={e => setEndHour(e.target.value)}
                        className="w-1/2 h-full bg-transparent text-center text-[16px] font-bold focus:outline-none appearance-none cursor-pointer"
                        style={{ color: "#1d2f3e" }}
                      >
                        {Array.from({ length: 12 }, (_, i) => pad2(i + 1)).map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="font-bold mx-0.5 pb-0.5" style={{ color: "#c9d1db" }}>:</span>
                      <select
                        value={endMin}
                        onChange={e => setEndMin(e.target.value)}
                        className="w-1/2 h-full bg-transparent text-center text-[16px] font-bold focus:outline-none appearance-none cursor-pointer pl-1"
                        style={{ color: "#1d2f3e" }}
                      >
                        {Array.from({ length: 60 }, (_, i) => pad2(i)).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center rounded-[10px] p-[3.5px] h-[42px] border" style={{ backgroundColor: "#f3f4f6", borderColor: "#cdd5df" }}>
                      <button
                        onClick={() => setEndAmPm("AM")}
                        className="w-11 h-full text-[13px] font-bold rounded-[7px] transition-colors flex items-center justify-center cursor-pointer"
                        style={{
                          backgroundColor: endAmPm === "AM" ? "#00a2fa" : "transparent",
                          color: endAmPm === "AM" ? "#ffffff" : "#7e8c9b"
                        }}
                      >AM</button>
                      <button
                        onClick={() => setEndAmPm("PM")}
                        className="w-11 h-full text-[13px] font-bold rounded-[7px] transition-colors flex items-center justify-center cursor-pointer"
                        style={{
                          backgroundColor: endAmPm === "PM" ? "#00a2fa" : "transparent",
                          color: endAmPm === "PM" ? "#ffffff" : "#7e8c9b"
                        }}
                      >PM</button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Duration */}
            {startDate && endDate && (
              <div className="mt-8 pt-5 border-t border-[#ccd6df]">
                <p className="text-[12px] font-[800] text-[#006fab] tracking-widest uppercase mb-1">DURATION</p>
                <p className="text-[20px] font-bold text-[#1b2e3e]">
                  {duration.label}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom row: Attachments + Reason ── */}
        <div className={`grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 mb-6 transition-opacity ${currentStep < 3 ? "opacity-50 pointer-events-none" : ""}`}>
          {/* Attachments */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm">
            <h3 className="font-bold text-[15px] text-[#3f4a51] mb-5 flex items-center gap-2">
              <Upload size={16} /> Attachments
            </h3>
            <input
              type="file"
              id="fileUpload"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <label
              htmlFor="fileUpload"
              className="border-2 border-dashed border-[#dde3ec] rounded-2xl py-10 px-4 text-center hover:bg-[#f9fafb] transition-colors cursor-pointer block"
            >
              <div className="mx-auto w-12 h-12 bg-[#f0f3f8] rounded-full flex items-center justify-center text-[#94a3b8] mb-3">
                <Upload size={22} />
              </div>
              <p className="text-[14px] font-bold text-[#3f4a51]">Upload Files</p>
              <p className="text-[12px] text-[#94a3b8] mt-1">Drag files or click to browse</p>
            </label>
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#f4f7fb] rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="text-[#64748b] shrink-0" />
                      <span className="text-[13px] font-medium text-[#3f4a51] truncate">{file.name}</span>
                      <span className="text-[11px] text-[#94a3b8] shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-[#f56464] hover:text-red-600 shrink-0 ml-2">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          <button onClick={() => onNavigate && onNavigate('dashboard')} className="text-[#f56464] font-bold text-[14px] hover:text-red-600 flex items-center gap-2 transition-colors cursor-pointer">
            <X size={18} strokeWidth={2.5} />
            Discard Request
          </button>

          <div className="flex flex-col items-end gap-3 flex-1">
            {leaveType && startDate && endDate && duration.totalHours > 0 && (() => {
              const balanceObj = leaveBalances.find(b => b.leave_type_id === leaveType);
              if (balanceObj && Number(balanceObj.remaining_days) < (duration.totalHours / 8)) {
                return (
                  <div className="flex items-center gap-2 bg-[#fff1f2] border border-[#fecaca] px-4 py-2 rounded-xl text-[#e11d48] text-[12px] font-bold">
                    <Umbrella size={14} className="shrink-0" />
                    <span>Warning: Requested days exceed your remaining quota.</span>
                  </div>
                )
              }
              return null;
            })()}

            <div className="flex items-center gap-4">
              {submitError && (
                <span className="text-[#f56464] text-[13px] font-bold">
                  {submitError}
                </span>
              )}
              <button
                onClick={handleSubmit}
                disabled={!leaveType || !startDate || !endDate || duration.totalHours <= 0 || !reason.trim() || isSubmitting}
                className="!bg-[#133251] text-white !px-8 !py-4 rounded-full text-[14px] font-bold hover:bg-[#081830] transition-colors flex items-center gap-2.5 shadow-lg shadow-[#0a1e3d]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Request"}
                {!isSubmitting && <Send size={16} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}