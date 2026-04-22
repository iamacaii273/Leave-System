import { Umbrella, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react"
import { resolveLeaveTypeStyle } from "../../utils/leaveTypeUtils"
import { useState, useRef, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"
import api from "../../services/api"

// Utilities
function getInitials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("")
}

function formatDateShort(dateString) {
  if (!dateString) return "-"
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
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

export default function Reports({ onNavigate }) {
  const navigate = useNavigate()

  const [filter, setFilter] = useState("all")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [appliedRange, setAppliedRange] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [balancesPage, setBalancesPage] = useState(1)
  const itemsPerPage = 4
  const balancesPerPage = 4
  const pickerRef = useRef(null)

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
    async function loadData() {
      setIsLoading(true);
      try {
        const [sumRes, balRes, histRes] = await Promise.all([
          api.get("/reports/leave-summary"),
          api.get("/reports/employee-balances"),
          api.get("/leave-requests") // HR gets all requests
        ]);

        const loadedSummary = sumRes.data.summary.map(s => ({
          type: s.leave_type_name,
          used: parseFloat(s.total_days_used) || 0,
          total: parseFloat(s.total_allocated_days) || 0
        }));

        // Fetch leave types to build dynamic columns
        const ltRes = await api.get("/leave-types");
        const leaveTypes = ltRes.data.leaveTypes || [];
        const ltNames = leaveTypes.map(lt => lt.name); // ordered list of column names
        setLeaveTypeColumns(ltNames);

        const loadedBalances = {};
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
          loadedBalances[emp.user_id] = {
            id: emp.user_id,
            name: emp.full_name,
            initial: getInitials(emp.full_name),
            bg: getUserColor(emp.user_id),
            specialBadge: null,
            balMap, // all balances keyed by leave type name
          };
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
        setBalancesData(Object.values(loadedBalances));
        setHistoryData(loadedHistory);
      } catch (err) {
        console.error("Failed to load reports data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

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
      return item.start >= from && item.end <= to
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
      setAppliedRange({ from: new Date(startDate), to: new Date(endDate) })
    }
    setShowDatePicker(false)
  }

  function clearDateRange() {
    setStartDate("")
    setEndDate("")
    setAppliedRange(null)
    setShowDatePicker(false)
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
          <div className="p-8 pb-6 bg-white border-b border-transparent">
            <h3 className="font-bold text-[18px] font-fredoka text-[#1f3747]">Individual Leave Balances</h3>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#e2e8f0]">
                  <th className="py-4 px-8 text-[12px] font-bold font-fredoka text-[#64748b] tracking-widest uppercase">Employee Name</th>
                  {leaveTypeColumns.map(name => (
                    <th key={name} className="py-4 px-8 text-[12px] font-bold font-fredoka text-[#64748b] tracking-widest uppercase leading-snug">
                      {name}<br />(Used/Total)
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedBalances.map((row, idx) => {
                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors bg-white">
                      <td className="py-5 px-8">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[#1f3747] text-[12px] font-fredoka shrink-0" style={{ backgroundColor: row.bg }}>
                            {row.initial}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[14px] text-[#3f4a51]">{row.name}</span>
                            {row.specialBadge && (
                              <span className="font-bold text-red-600 mt-0.5 tracking-widest uppercase opacity-90" style={{ fontSize: "9px" }}>
                                {row.specialBadge}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {leaveTypeColumns.map(name => {
                        const balObj = row.balMap?.[name];
                        const isEligible = balObj ? balObj.isEligible : true; // default true for types not in balance map if any
                        const val = isEligible ? (balObj?.display || "0 / 0") : "0 / 0";
                        
                        const getQuotaStyle = (quota) => {
                          if (!isEligible) return "text-red-600 font-bold";
                          const parts = quota.split(" / ");
                          if (parts.length === 2 && parts[0].trim() === parts[1].trim()) {
                            if (parts[0].trim() === "0") return "text-red-800 font-bold";
                            return "text-red-600 font-bold";
                          }
                          return "text-[#475569]";
                        };
                        return (
                          <td key={name} className="py-5 px-8">
                            <span className={`text-[14px] font-medium ${getQuotaStyle(val)}`}>{val}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 mt-2 px-8 pb-4">
            <p className="text-[13px] text-[#94a3b8] font-bold">
              Showing {balStartItem}-{balEndItem} of {balancesData.length} employees
            </p>
            <div className="flex items-center gap-2 text-[#475569] font-bold text-[13px]">
              <button
                onClick={() => setBalancesPage(p => Math.max(1, p - 1))}
                disabled={balancesPage === 1}
                className={`w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors ${balancesPage === 1 ? 'text-[#d1d5db] cursor-not-allowed' : 'text-[#94a3b8]'}`}
              >&lt;</button>
              {Array.from({ length: balTotalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setBalancesPage(page)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${page === balancesPage
                    ? "text-white"
                    : "hover:bg-gray-100 text-[#94a3b8]"
                  }`}
                  style={page === balancesPage ? { backgroundColor: '#323940' } : {}}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setBalancesPage(p => Math.min(balTotalPages, p + 1))}
                disabled={balancesPage === balTotalPages}
                className={`w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors ${balancesPage === balTotalPages ? 'text-[#d1d5db] cursor-not-allowed' : 'text-[#64748b]'}`}
              >&gt;</button>
            </div>
          </div>
        </div>

        {/* Card 3: Full Leave History */}
        <div className="bg-white rounded-[24px] p-8 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-[20px] font-fredoka text-[#323940]">Full Leave History</h3>
            <div className="flex items-center gap-6">
              <div className="relative" ref={pickerRef}>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-bold flex items-center gap-2 cursor-pointer transition-colors ${appliedRange
                    ? "bg-[#1f3747] text-white"
                    : "bg-[#f4f7f9] text-[#64748b] hover:bg-gray-100"
                    }`}
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
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-[#e2e8f0] p-5 z-50 w-[320px]">
                    <p className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase mb-3">Date Range</p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[12px] font-bold text-[#3f4a51] mb-1 block">From</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={e => setStartDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-[#dde3ec] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1f3747]"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-[#3f4a51] mb-1 block">To</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-[#dde3ec] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1f3747]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={clearDateRange}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-[#64748b] bg-[#f4f7f9] hover:bg-[#e2e8f0] transition-colors"
                      >Clear</button>
                      <button
                        onClick={applyDateRange}
                        disabled={!startDate || !endDate}
                        className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#1f3747] hover:bg-[#162a37] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

                    let dateRangeStr = "";
                    if (isSameDayStr(hist.start, hist.end)) {
                      dateRangeStr = formatDateShort(hist.start);
                    } else {
                      dateRangeStr = `${formatDateShort(hist.start)} - ${formatDateShort(hist.end)}`;
                    }

                    return (
                      <tr key={hist.id} className="hover:bg-[#f9fafb] transition-colors rounded-[24px]">
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

