import { Umbrella, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react"
import { resolveLeaveTypeStyle } from "../../utils/leaveTypeUtils"
import { useState, useRef, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"
import api from "../../services/api"
import { useDepartment } from "../../contexts/DepartmentContext"

// Utilities
function getInitials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("")
}

function formatDateShort(dateString) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

function isFullDay(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  return s.getHours() === 9 && s.getMinutes() === 0 && e.getHours() === 17 && e.getMinutes() === 0
}

function isSameDayStr(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate()
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

const PASTEL_COLORS = [
  "#dbeafe", "#fef08a", "#fecdd3", "#e2e8f0", "#bfeadd",
  "#c4b5fd", "#e0f2fe", "#fed7aa", "#bae6fd", "#fbcfe8", "#a7f3d0"
]
function getUserColor(userId) {
  if (!userId) return "#eef2f9"
  let hash = 0
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length]
}

// getRequestIconData replaced by resolveLeaveTypeStyle from leaveTypeUtils

function getRequestTheme(status = "") {
  const normalized = status.toLowerCase()
  if (normalized === "approved") return { bg: "#0cf1aa", text: "#185b48" }
  if (normalized === "rejected") return { bg: "#f56464", text: "#570008" }
  if (normalized === "acknowledged") return { bg: "#93c5fd", text: "#1e3a8a" }
  if (normalized === "cancelled") return { bg: "#e2e8f0", text: "#475569" }
  return { bg: "#fee481", text: "#6b5413" } // generic/pending
}

function formatDays(value) {
  const numeric = Number(value || 0)
  const oneDecimal = numeric.toFixed(1)
  return oneDecimal.endsWith(".0") ? String(Math.trunc(numeric)) : oneDecimal
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
function isSameDay(a, b) {
  return a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}
function stripTime(d) {
  const nd = new Date(d)
  nd.setHours(0, 0, 0, 0)
  return nd
}

export default function Reports({ onNavigate }) {
  const navigate = useNavigate()

  const [filter, setFilter] = useState("all")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [appliedRange, setAppliedRange] = useState(null)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [datePickMode, setDatePickMode] = useState("from")
  const [currentPage, setCurrentPage] = useState(1)
  const [balancesPage, setBalancesPage] = useState(1)
  const itemsPerPage = 4
  const balancesPerPage = 4
  const pickerRef = useRef(null)

  const { selectedDepartment } = useDepartment()

  const [isLoading, setIsLoading] = useState(true)
  const [summaryData, setSummaryData] = useState([])
  const [balancesData, setBalancesData] = useState([])
  const [leaveTypeColumns, setLeaveTypeColumns] = useState([]) // dynamic columns
  const [historyData, setHistoryData] = useState([])

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
    async function loadData() {
      setIsLoading(true);
      try {
        let qs = ""
        if (selectedDepartment) {
          qs = `?department_id=${selectedDepartment}`
        }

        const [sumRes, balRes, histRes] = await Promise.all([
          api.get(`/reports/leave-summary${qs}`),
          api.get(`/reports/employee-balances${qs}`),
          api.get(`/leave-requests${qs}`)
        ]);

        const loadedSummary = sumRes.data.summary.map(s => ({
          type: s.leave_type_name,
          used: parseFloat(s.total_days_used) || 0,
          total: parseFloat(s.total_allocated_days) || 0
        }));

        // Fetch leave types to build dynamic columns
        const ltRes = await api.get(`/leave-types${qs}`);
        const leaveTypes = ltRes.data.leaveTypes || [];
        const ltNames = leaveTypes.map(lt => lt.name); // ordered list of column names
        setLeaveTypeColumns(ltNames);

        const loadedBalances = [];
        for (const emp of balRes.data.employees) {
          // Build a map: leave_type_name -> { display, isEligible }
          const balMap = {};
          for (const bal of emp.balances) {
            const usedStr = formatDays(bal.used_days);
            const totalStr = formatDays(bal.total_days);
            balMap[bal.leave_type_name] = {
              display: `${usedStr} / ${totalStr}`,
              isEligible: bal.is_eligible
            };
          }
          // Build ordered column list from this employee's own balances
          const deptColumns = emp.balances.map(b => b.leave_type_name);
          loadedBalances.push({
            id: emp.user_id,
            name: emp.full_name,
            initial: getInitials(emp.full_name),
            bg: getUserColor(emp.user_id),
            department_id: emp.department_id,
            department_name: emp.department_name,
            deptColumns,
            balMap,
          });
        }

        const loadedHistory = histRes.data.leaveRequests.map(r => ({
          id: r.id,
          name: r.full_name,
          initial: getInitials(r.full_name),
          bg: getUserColor(r.user_id),
          type: r.leave_type_name,
          iconName: r.leave_type_icon,
          colorType: r.leave_type_color,
          start: new Date(r.start_date),
          end: new Date(r.end_date),
          submitted: new Date(r.submitted_at),
          duration: formatDurationText(r.total_days),
          status: r.status,
          approver: r.approved_by_name || "-"
        }));

        setSummaryData(loadedSummary);
        setBalancesData(loadedBalances);
        setHistoryData(loadedHistory);
      } catch (err) {
        console.error("Failed to load reports data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedDepartment]);

  const tabFilters = ["All", "Approved", "Pending", "Rejected", "Acknowledged", "Cancelled"]

  const adminNavItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "employee", label: "Employee" },
    { id: "reports", label: "Reports" },
    { id: "leave-type", label: "Leave Type" }
  ]



  // Balances pagination
  const balTotalPages = Math.ceil(balancesData.length / balancesPerPage) || 1
  const paginatedBalances = balancesData.slice((balancesPage - 1) * balancesPerPage, balancesPage * balancesPerPage)
  const balStartItem = balancesData.length === 0 ? 0 : (balancesPage - 1) * balancesPerPage + 1
  const balEndItem = Math.min(balancesPage * balancesPerPage, balancesData.length)

  // Filter History Data
  let filteredData = filter === "all"
    ? historyData
    : historyData.filter(item => item.status.toLowerCase() === filter)

  if (appliedRange) {
    const { from, to } = appliedRange
    filteredData = filteredData.filter(item => {
      const s = stripTime(item.start)
      const e = stripTime(item.end)
      return s >= from && e <= to
    })
  }

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, appliedRange])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const startItem = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, filteredData.length)

  function applyDateRange() {
    if (startDate && endDate) {
      let from = stripTime(startDate)
      let to = stripTime(endDate)
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
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito pb-12">
      <Header
        activePage="reports"
        onNavigate={onNavigate}
      />

      <main className="max-w-5xl mx-auto px-6 pt-12 w-full flex-grow flex flex-col gap-8">

        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-[64px] font-fredoka font-bold text-[#1f3747] mb-1">
            Reports Overview
          </h1>
          <p className="text-[#64748b] text-[24px] font-medium">
            Consolidated analytics and history of organizational leave usage.
          </p>
        </div>

        {/* Card 1: Leave Summary by Type */}
        <div className="bg-[#f4f7f9] rounded-[24px] p-8 mb-4">
          <h3 className="font-bold text-[18px] font-fredoka text-[#1f3747] mb-8">Leave Summary by Type</h3>

          <div className="space-y-6">
            {summaryData.length === 0 && !isLoading && (
              <p className="text-[#64748b] text-[14px]">No leave summary data available.</p>
            )}
            {summaryData.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[13px] font-bold text-[#3f4a51]">
                  <span>{item.type}</span>
                  <span>{formatDays(item.used)} / {formatDays(item.total)} Days Allocated</span>
                </div>
                <div
                  className="w-full rounded-full overflow-hidden"
                  style={{ backgroundColor: "#e2e8f0", height: "14px" }}
                >
                  <div
                    className="rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${item.total > 0 ? Math.min((item.used / item.total) * 100, 100) : 0}%`,
                      backgroundColor: "#ff8a7a",
                      height: "14px"
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Individual Leave Balances */}
        <div className="bg-white rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 pb-6 bg-white border-b border-[#f1f5f9]">
            <h3 className="font-bold text-[18px] font-fredoka text-[#1f3747]">Individual Leave Balances</h3>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-[#94a3b8] text-[14px] font-bold">Loading...</div>
          ) : balancesData.length === 0 ? (
            <div className="py-12 text-center text-[#94a3b8] text-[14px] font-bold">No employee data available.</div>
          ) : (() => {
            // Group employees by department
            const deptGroups = {};
            for (const emp of balancesData) {
              const key = emp.department_id || 'unknown';
              if (!deptGroups[key]) {
                deptGroups[key] = {
                  name: emp.department_name || 'Unknown Department',
                  // Derive columns from the first employee's deptColumns (all same per dept)
                  columns: emp.deptColumns || [],
                  employees: []
                };
              }
              // Merge columns in case different employees in same dept have different types
              for (const col of (emp.deptColumns || [])) {
                if (!deptGroups[key].columns.includes(col)) deptGroups[key].columns.push(col);
              }
              deptGroups[key].employees.push(emp);
            }

            return Object.values(deptGroups).map((dept, dIdx) => (
              <div key={dIdx} className={dIdx > 0 ? 'border-t border-[#f1f5f9]' : ''}>
                {/* Department header */}
                <div className="px-8 py-4 bg-[#f8fafc] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#4c6367]" />
                  <span className="text-[13px] font-bold text-[#4c6367] tracking-wider uppercase">{dept.name}</span>
                  <span className="text-[12px] text-[#94a3b8] font-bold ml-1">({dept.employees.length})</span>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#e2e8f0]">
                        <th className="py-3 px-8 text-[11px] font-bold font-fredoka text-[#64748b] tracking-widest uppercase">Employee</th>
                        {dept.columns.map(colName => (
                          <th key={colName} className="py-3 px-8 text-[11px] font-bold font-fredoka text-[#64748b] tracking-widest uppercase leading-snug">
                            {colName}<br />(Used/Total)
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dept.employees.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors bg-white">
                          <td className="py-4 px-8">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[#1f3747] text-[12px] font-fredoka shrink-0" style={{ backgroundColor: row.bg }}>
                                {row.initial}
                              </div>
                              <span
                                className="font-bold text-[14px] text-[#3f4a51] cursor-pointer hover:text-[#006dae] hover:underline transition-colors"
                                onClick={() => onNavigate && onNavigate(`employee/${row.id}`)}
                              >{row.name}</span>
                            </div>
                          </td>
                          {dept.columns.map(name => {
                            const balObj = row.balMap?.[name];
                            const isEligible = balObj ? balObj.isEligible : false;
                            const val = !balObj ? "—" : isEligible ? balObj.display : "0 / 0";

                            const getQuotaStyle = () => {
                              if (val === "—") return "text-[#94a3b8]";
                              if (!isEligible) return "text-red-500 font-bold";
                              const parts = val.split(" / ");
                              if (parts.length === 2 && parts[0].trim() === parts[1].trim()) {
                                return parts[0].trim() === "0" ? "text-red-800 font-bold" : "text-red-600 font-bold";
                              }
                              return "text-[#475569]";
                            };

                            return (
                              <td key={name} className="py-4 px-8">
                                <span className={`text-[14px] font-medium ${getQuotaStyle()}`}>{val}</span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Card 3: Full Leave History */}
        <div className="bg-white rounded-[24px] p-8 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-[20px] font-fredoka text-[#323940]">Full Leave History</h3>
            <div className="flex items-center gap-6">
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="!px-2 !py-2 rounded-lg text-[13px] font-bold flex items-center gap-2 cursor-pointer transition-colors"
                  style={appliedRange
                    ? { backgroundColor: '#1f3747', color: '#ffffff' }
                    : { backgroundColor: '#f4f7f9', color: '#64748b' }}
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
                          ? { backgroundColor: '#1f3747', color: '#ffffff' }
                          : { backgroundColor: '#f4f7f9', color: '#64748b' }}
                      >
                        From{startDate ? `: ${formatDateShort(startDate)}` : ""}
                      </button>
                      <button
                        onClick={() => setDatePickMode("to")}
                        className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-colors"
                        style={datePickMode === "to"
                          ? { backgroundColor: '#1f3747', color: '#ffffff' }
                          : { backgroundColor: '#f4f7f9', color: '#64748b' }}
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
                          if (r.status === "rejected" || r.status === "cancelled") return
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
                              <span className={`relative z-10 inline-flex items-center justify-center w-7 h-7 rounded-full transition-all
                                ${isFrom || isTo ? "bg-[#1f3747] text-white"
                                  : isInRange ? "bg-[#1f3747]/15 text-[#1f3747]"
                                    : isToday ? "bg-[#1c355e] text-white"
                                      : "text-[#3f4a51] hover:bg-[#f0f3f8]"}`}>
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
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-[#64748b] bg-[#f4f7f9] hover:bg-[#e2e8f0] transition-colors"
                      >Clear</button>
                      <button
                        onClick={applyDateRange}
                        disabled={!startDate || !endDate}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: '#1f3747', color: '#ffffff' }}
                      >Apply</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 text-[14px] font-bold">
                {tabFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f.toLowerCase())}
                    className={`transition-all pb-1 border-b-2 ${filter === f.toLowerCase()
                      ? "text-[#323940] border-[#1f3747]"
                      : "text-[#94a3b8] border-transparent hover:text-[#64748b]"
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto px-2 mt-4">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <thead>
                <tr className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">
                  <th className="pb-2 font-bold px-4">NAME</th>
                  <th className="pb-2 font-bold px-4">TYPE</th>
                  <th className="pb-2 font-bold px-4">DATES</th>
                  <th className="pb-2 font-bold px-4">DURATION</th>
                  <th className="pb-2 font-bold px-4">STATUS</th>
                  <th className="pb-2 font-bold px-4 text-right">APPROVED BY</th>
                </tr>
              </thead>
              <tbody className="text-[#3f4a51] font-medium text-[15px]">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#94a3b8] text-[15px] font-bold">
                      No leave requests found for the selected filters.
                    </td>
                  </tr>
                ) :
                  paginatedData.map((hist) => {
                    const iconInfo = resolveLeaveTypeStyle(hist.iconName, hist.colorType);
                    const Icon = iconInfo.Icon;
                    const statusTheme = getRequestTheme(hist.status);

                    const showTime = !isFullDay(hist.start, hist.end);
                    let dateRangeStr = "";
                    if (isSameDayStr(hist.start, hist.end)) {
                      dateRangeStr = formatDateShort(hist.start);
                      if (showTime) dateRangeStr += ` (${formatTime(hist.start)} - ${formatTime(hist.end)})`;
                    } else {
                      dateRangeStr = `${formatDateShort(hist.start)}${showTime ? ' ' + formatTime(hist.start) : ''} - ${formatDateShort(hist.end)}${showTime ? ' ' + formatTime(hist.end) : ''}`;
                    }

                    return (
                      <tr
                        key={hist.id}
                        className="hover:bg-[#f4f7f9] transition-colors rounded-[24px] cursor-pointer"
                        onClick={() => onNavigate && onNavigate(`requests/${hist.id}`)}
                      >
                        <td className="py-3 px-4 rounded-l-[24px]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[#1f3747] text-[11px] font-fredoka shrink-0" style={{ backgroundColor: hist.bg }}>
                              {hist.initial}
                            </div>
                            <span className="font-bold text-[14px] text-[#3f4a51]">{hist.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconInfo.bg }}>
                              <Icon color={iconInfo.color} size={16} strokeWidth={2.5} />
                            </div>
                            <span className="text-[14px] font-bold text-[#323940]">{hist.type}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col justify-center">
                            <span className="text-[13px] font-bold text-[#3f4a51]">{dateRangeStr}</span>
                            <span className="text-[11px] font-medium text-[#94a3b8] mt-0.5">Submitted on {formatDateShort(hist.submitted)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-[#e2e8f0] text-[#475569] font-bold text-[12px] px-3 py-1.5 rounded-full inline-block whitespace-nowrap">
                            {hist.duration}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-4 py-1.5 rounded-full text-[11px] font-[800] tracking-wide uppercase whitespace-nowrap"
                            style={{
                              backgroundColor: statusTheme.bg,
                              color: statusTheme.text
                            }}
                          >
                            {hist.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 rounded-r-[24px] text-right text-[13px] font-medium text-[#64748b]">
                          {hist.approver}
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 px-6 border-t border-[#f1f5f9] pt-6">
            <p className="text-[13px] text-[#94a3b8] font-bold">
              Showing {startItem}-{endItem} of {filteredData.length} requests
            </p>
            <div className="flex gap-2 items-center text-[#94a3b8] font-bold">
              <ChevronLeft
                size={16}
                className={`cursor-pointer hover:text-[#3f4a51] ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-full text-[13px] font-bold transition-all ${page === currentPage
                    ? "text-white"
                    : "text-[#94a3b8] hover:bg-gray-100 hover:text-[#323940]"
                    }`}
                  style={page === currentPage ? { backgroundColor: '#323940' } : {}}
                >
                  {page}
                </button>
              ))}
              <ChevronRight
                size={16}
                className={`cursor-pointer hover:text-[#3f4a51] ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

