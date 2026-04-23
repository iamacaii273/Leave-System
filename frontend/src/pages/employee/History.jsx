import { useState, useRef, useEffect } from "react"
import Header from "../../components/Header"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"
import api from "../../services/api"
import { useNavigate } from "react-router-dom"
import { resolveLeaveTypeStyle } from "../../utils/leaveTypeUtils"

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

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

function formatDateShort(dateString) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function History({ onNavigate }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState("all")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [appliedRange, setAppliedRange] = useState(null)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [datePickMode, setDatePickMode] = useState("from")
  const pickerRef = useRef(null)

  const [historyData, setHistoryData] = useState([])
  const [loading, setLoading] = useState(true)

  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 4

  // Close picker when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowDatePicker(false)
      }
    }
    if (showDatePicker) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showDatePicker])

  useEffect(() => {
    if (showDatePicker) {
      if (startDate) {
        setCalMonth(startDate.getMonth())
        setCalYear(startDate.getFullYear())
      } else {
        setCalMonth(new Date().getMonth())
        setCalYear(new Date().getFullYear())
      }
      setDatePickMode("from")
    }
  }, [showDatePicker])

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.get('/leave-requests/me')
        const raw = res.data.leaveRequests || []

        const mapped = raw.map(r => {
          const sDate = new Date(r.start_date)
          const eDate = new Date(r.end_date)
          const subDate = new Date(r.submitted_at)
          const opts = { month: "short", day: "numeric", year: "numeric" }

          const status = r.status.charAt(0).toUpperCase() + r.status.slice(1);

          let durationLabel = ""
          const totalDays = parseFloat(r.total_days)
          const totalHours = totalDays * 8
          const fullDays = Math.floor(totalHours / 8)
          const remainder = totalHours - (fullDays * 8)
          const fullHours = Math.floor(remainder)
          const remainMins = Math.round((remainder - fullHours) * 60)

          let labelParts = [];
          if (fullDays > 0) labelParts.push(`${fullDays} Day${fullDays !== 1 ? 's' : ''}`);
          if (fullHours > 0 || (fullDays === 0 && remainMins === 0)) labelParts.push(`${fullHours} Hr${fullHours !== 1 ? 's' : ''}`);
          if (remainMins > 0) labelParts.push(`${remainMins} Min`);
          durationLabel = labelParts.length > 0 ? labelParts.join(' ') : '0 Hr';

          return {
            id: r.id,
            type: r.leave_type_name,
            iconName: r.leave_type_icon,
            colorType: r.leave_type_color,
            dates: isSameDay(sDate, eDate)
              ? sDate.toLocaleDateString("en-US", opts)
              : `${sDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${eDate.toLocaleDateString("en-US", opts)}`,
            start: sDate,
            end: eDate,
            duration: durationLabel,
            status: status,
            reason: r.reason || "No Reason",
            submitted: subDate.toLocaleDateString("en-US", opts)
          }
        })
        setHistoryData(mapped)
      } catch (e) {
        console.error("Failed to fetch history:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, appliedRange])

  const filters = ["All", "Approved", "Pending", "Rejected", "Cancelled", "Acknowledged"]

  const statusColors = {
    Approved: { bg: "#0cf1aa", text: "#185b48" },
    Pending: { bg: "#fee481", text: "#6b5413" },
    Rejected: { bg: "#f56464", text: "#570008" },
    Cancelled: { bg: "#e2e8f0", text: "#475569" },
    Acknowledged: { bg: "#93c5fd", text: "#1e3a8a" },
    default: { bg: "#eef2f9", text: "#3f4a51" }
  }

  const getIconData = (item) => resolveLeaveTypeStyle(item.iconName, item.colorType)

  // Filter by status
  let filteredData = filter === "all"
    ? historyData
    : historyData.filter(item => item.status.toLowerCase() === filter)

  // Filter by date range
  if (appliedRange) {
    const { from, to } = appliedRange
    filteredData = filteredData.filter(item => {
      return item.start >= from && item.end <= to
    })
  }

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE))
  const paginatedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function applyDateRange() {
    if (startDate && endDate) {
      let from = new Date(startDate)
      from.setHours(0, 0, 0, 0)
      let to = new Date(endDate)
      to.setHours(23, 59, 59, 999)
      if (to < from) { [from, to] = [to, from] }
      setAppliedRange({ from, to })
    }
    setShowDatePicker(false)
  }

  function clearDateRange() {
    setStartDate(null)
    setEndDate(null)
    setAppliedRange(null)
    setShowDatePicker(false)
    setDatePickMode("from")
  }

  function formatRange() {
    if (!appliedRange) return null
    const opts = { month: "short", day: "numeric", year: "numeric" }
    return `${appliedRange.from.toLocaleDateString("en-US", opts)} – ${appliedRange.to.toLocaleDateString("en-US", opts)}`
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col">
      <Header activePage="history" onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto px-6 py-12 flex-grow w-full">
        {/* Title */}
        <div className="mb-14 mt-4">
          <h1 className="text-[64px] font-[600] font-fredoka text-[#3f4a51] mb-2">My Leave History</h1>
          <p className="text-[#64748b] text-[20px] font-medium max-w-xl leading-relaxed">
            Track your time off, view pending requests, and manage your annual balances in one soft sanctuary.
          </p>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-[40px] p-8 pb-10 shadow-sm flex flex-col mt-4">
          <div className="flex items-center justify-between mb-8 px-2 mt-2">
            <h3 className="font-bold text-[22px] font-fredoka text-[#3f4a51]">Recent Requests</h3>
            <div className="flex gap-6 items-center">
              {/* Date Range Picker */}
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="!px-2 !py-2 rounded-xl text-[14px] font-bold flex items-center gap-2 cursor-pointer transition-colors"
                  style={appliedRange
                    ? { backgroundColor: '#1c355e', color: '#ffffff' }
                    : { backgroundColor: '#f4f7fb', color: '#5e6c7e' }}
                >
                  <CalendarDays size={16} />
                  {appliedRange ? formatRange() : "Select Date Range"}
                  {appliedRange && (
                    <span
                      onClick={(e) => { e.stopPropagation(); clearDateRange() }}
                      className="ml-1 hover:opacity-80"
                    >
                      <X size={14} />
                    </span>
                  )}
                </button>

                {showDatePicker && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-[#e2e8f0] p-5 z-50 w-[340px]">
                    {/* From / To toggles */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setDatePickMode("from")}
                        className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-colors"
                        style={datePickMode === "from"
                          ? { backgroundColor: '#1c355e', color: '#ffffff' }
                          : { backgroundColor: '#f4f7fb', color: '#5e6c7e' }}
                      >
                        From{startDate ? `: ${formatDateShort(startDate)}` : ""}
                      </button>
                      <button
                        onClick={() => setDatePickMode("to")}
                        className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-colors"
                        style={datePickMode === "to"
                          ? { backgroundColor: '#1c355e', color: '#ffffff' }
                          : { backgroundColor: '#f4f7fb', color: '#5e6c7e' }}
                      >
                        To{endDate ? `: ${formatDateShort(endDate)}` : ""}
                      </button>
                    </div>

                    {/* Month / Year nav */}
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={() => {
                          if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
                          else setCalMonth(m => m - 1)
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-[#f0f3f8] flex items-center justify-center text-[#64748b] cursor-pointer"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-[#1f3747]">{MONTH_NAMES[calMonth]}</span>
                        <select
                          value={calYear}
                          onChange={e => setCalYear(Number(e.target.value))}
                          className="text-[13px] font-bold text-[#1f3747] bg-[#f4f7f9] rounded-lg px-2 py-1 outline-none cursor-pointer"
                        >
                          {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
                          else setCalMonth(m => m + 1)
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-[#f0f3f8] flex items-center justify-center text-[#64748b] cursor-pointer"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Day labels */}
                    <div className="grid grid-cols-7 text-center mb-1">
                      {DAY_LABELS.map((d, i) => (
                        <div key={i} className="text-[10px] font-bold text-[#94a3b8] py-1">{d}</div>
                      ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 text-center gap-y-0.5">
                      {(() => {
                        const daysInMonth = getDaysInMonth(calYear, calMonth)
                        const firstDay = getFirstDayOfMonth(calYear, calMonth)
                        const prevDays = getDaysInMonth(calMonth === 0 ? calYear - 1 : calYear, calMonth === 0 ? 11 : calMonth - 1)
                        const cells = []
                        for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, current: false })
                        for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true })
                        while (cells.length < 35) cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false })

                        // Active days from history
                        const activeDays = new Set()
                        historyData.forEach(r => {
                          if (r.status.toLowerCase() === "rejected" || r.status.toLowerCase() === "cancelled") return
                          const s = new Date(r.start); s.setHours(0, 0, 0, 0)
                          const e = new Date(r.end); e.setHours(23, 59, 59, 999)
                          const cur = new Date(s)
                          while (cur <= e) {
                            if (cur.getFullYear() === calYear && cur.getMonth() === calMonth) {
                              activeDays.add(cur.getDate())
                            }
                            cur.setDate(cur.getDate() + 1)
                          }
                        })

                        return cells.map((cell, idx) => {
                          if (!cell.current) {
                            return <div key={idx} className="py-1 text-[12px] text-[#cbd5e1] font-semibold">{cell.day}</div>
                          }
                          const dayDate = new Date(calYear, calMonth, cell.day)
                          const isToday = isSameDay(dayDate, new Date())
                          const isFrom = isSameDay(dayDate, startDate)
                          const isTo = isSameDay(dayDate, endDate)
                          const isInRange = startDate && endDate && !isFrom && !isTo && dayDate > startDate && dayDate < endDate
                          const hasLeave = activeDays.has(cell.day)

                          return (
                            <div
                              key={idx}
                              className="relative py-1 text-[12px] font-semibold rounded-lg cursor-pointer"
                              onClick={() => {
                                const clicked = new Date(calYear, calMonth, cell.day)
                                clicked.setHours(0, 0, 0, 0)
                                if (datePickMode === "from") {
                                  setStartDate(clicked)
                                  if (endDate && clicked > endDate) setEndDate(null)
                                  setDatePickMode("to")
                                } else {
                                  if (!startDate || clicked < startDate) {
                                    setStartDate(clicked)
                                    setEndDate(null)
                                    setDatePickMode("to")
                                  } else {
                                    setEndDate(clicked)
                                  }
                                }
                              }}
                            >
                              <span
                                className={`relative z-10 inline-flex items-center justify-center w-7 h-7 rounded-full transition-all ${(!isFrom && !isTo && !isInRange && !isToday) ? "text-[#3f4a51] hover:bg-[#f0f3f8]" : ""
                                  }`}
                                style={{
                                  ...(isFrom || isTo ? { backgroundColor: '#1c355e', color: '#ffffff' } : {}),
                                  ...(isInRange ? { backgroundColor: 'rgba(28, 53, 94, 0.15)', color: '#1c355e' } : {}),
                                  ...(isToday && !isFrom && !isTo && !isInRange ? { backgroundColor: '#1f3747', color: '#ffffff' } : {})
                                }}
                              >
                                {cell.day}
                              </span>
                              {hasLeave && !isFrom && !isTo && !isToday && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#f57a00]" />
                              )}
                            </div>
                          )
                        })
                      })()}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={clearDateRange}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-[#64748b] !bg-[#f4f7fb] hover:bg-[#eaf0f7] transition-colors"
                      >Clear</button>
                      <button
                        onClick={applyDateRange}
                        disabled={!startDate || !endDate}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white !bg-[#1c355e] hover:bg-[#162d50] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >Apply</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                {filters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f.toLowerCase())}
                    className={`text-[14px] font-bold transition-all relative ${filter === f.toLowerCase()
                      ? "text-[#3f4a51]"
                      : "text-[#94a3b8] hover:text-[#5e6c7e]"
                      }`}
                  >
                    {f}
                    {filter === f.toLowerCase() && (
                      <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-[#3f4a51]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto px-2 min-h-[300px]">
            {loading ? (
              <div className="flex justify-center items-center h-full py-20 text-[#94a3b8] font-bold">
                Loading history...
              </div>
            ) : (
              <table className="w-full text-left border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">
                    <th className="pb-2 font-bold px-4">TYPE</th>
                    <th className="pb-2 font-bold px-4">DATES</th>
                    <th className="pb-2 font-bold px-4">DURATION</th>
                    <th className="pb-2 font-bold px-4">STATUS</th>
                    <th className="pb-2 font-bold px-4">LEAVE REASON</th>
                  </tr>
                </thead>
                <tbody className="text-[#3f4a51] font-medium text-[15px]">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#94a3b8] text-[15px] font-medium">
                        No leave requests found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-[#f9fafb] transition-colors rounded-[24px] cursor-pointer"
                        onClick={() => navigate(`/employee/requests/${item.id}`)}
                      >
                        <td className="py-2.5 px-4 rounded-l-[24px]">
                          <div className="flex items-center gap-4">
                            {(() => {
                              const { Icon, color, bg } = getIconData(item)
                              return (
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: bg }}
                                >
                                  <Icon size={20} color={color} strokeWidth={2.5} />
                                </div>
                              )
                            })()}
                            <span className="font-bold">{item.type}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-[13px]">
                          <div className="font-bold flex flex-col gap-0.5">
                            <span>{item.dates}</span>
                            <span className="text-[11px] text-[#94a3b8] font-medium">Submitted on {item.submitted}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-4 py-1.5 bg-[#ecf0f6] text-[#3f4a51] font-bold rounded-full text-[13px] inline-block">
                            {item.duration}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className="px-4 py-1.5 rounded-full text-[12px] font-bold tracking-wide inline-block"
                            style={{
                              backgroundColor: (statusColors[item.status] || statusColors.default).bg,
                              color: (statusColors[item.status] || statusColors.default).text
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[#94a3b8] rounded-r-[24px] text-[13px] max-w-[200px] truncate">
                          {item.reason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredData.length > 0 && (
            <div className="flex items-center justify-between mt-8 px-4">
              <p className="text-[13px] text-[#94a3b8] font-bold">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredData.length)} of {filteredData.length} request{filteredData.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2 items-center text-[#94a3b8] font-bold">
                <ChevronLeft
                  size={16}
                  className={`cursor-pointer hover:text-[#3f4a51] ${currentPage === 1 ? "opacity-50 pointer-events-none" : ""}`}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                />

                {/* Dynamically generate page numbers (up to 5 for simplicity but scrolling via chevrons) */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, i, arr) => (
                    <div key={page} className="flex items-center gap-1">
                      {i > 0 && arr[i - 1] !== page - 1 && <span className="px-1 tracking-widest text-[#cbd5e1]">...</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-full text-[13px] font-bold transition-all ${currentPage !== page ? "text-[#94a3b8] hover:bg-[#eef2f9] hover:text-[#3f4a51]" : ""}`}
                        style={currentPage === page ? { backgroundColor: "#3f4a51", color: "#ffffff" } : {}}
                      >
                        {page}
                      </button>
                    </div>
                  ))}

                <ChevronRight
                  size={16}
                  className={`cursor-pointer hover:text-[#3f4a51] ${currentPage === totalPages ? "opacity-50 pointer-events-none" : ""}`}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}