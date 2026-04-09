import { Umbrella, Thermometer, Users, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"

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

  const tabFilters = ["All", "Approved", "Pending", "Rejected"]

  const adminNavItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "employee", label: "Employee" },
    { id: "reports", label: "Reports" },
    { id: "leave-type", label: "Leave Type" }
  ]

  const adminProfile = {
    name: "HR",
    role: "Global HR Manager"
  }

  // Card 1: Summary Data
  const leaveSummary = [
    { type: "Sick Leave", used: 11, total: 30 },
    { type: "Personal Leave", used: 3, total: 10 },
    { type: "Annual Vacation", used: 7, total: 10 }
  ]

  // Card 2: Balances Data
  const balances = [
    { name: "Jane Doe", initial: "JD", bg: "#dbeafe", sick: "3 / 30", personal: "1 / 3", annual: "0 / 6", specialBadge: null },
    { name: "Somsak Meesuk", initial: "SM", bg: "#fef08a", sick: "5 / 30", personal: "3 / 3", annual: "2 / 6", specialBadge: null },
    { name: "Kanya Kittisun", initial: "KK", bg: "#fecdd3", sick: "1 / 30", personal: "0 / 3", annual: "0 / 0", specialBadge: "NEW HIRE (< 12MO)" },
    { name: "Bob Peterson", initial: "BP", bg: "#e2e8f0", sick: "2 / 30", personal: "2 / 3", annual: "5 / 6", specialBadge: null },
    { name: "Marcus Chen", initial: "MC", bg: "#bfeadd", sick: "4 / 30", personal: "2 / 3", annual: "3 / 6", specialBadge: null },
    { name: "Elena Rodriguez", initial: "ER", bg: "#c4b5fd", sick: "0 / 30", personal: "1 / 3", annual: "1 / 6", specialBadge: null },
    { name: "James Wilson", initial: "JW", bg: "#e0f2fe", sick: "7 / 30", personal: "3 / 3", annual: "4 / 6", specialBadge: null },
    { name: "Sarah Connor", initial: "SC", bg: "#fef08a", sick: "2 / 30", personal: "0 / 3", annual: "2 / 6", specialBadge: null },
    { name: "Amanda Smith", initial: "AS", bg: "#fed7aa", sick: "6 / 30", personal: "1 / 3", annual: "5 / 6", specialBadge: null },
    { name: "David Kim", initial: "DK", bg: "#bae6fd", sick: "1 / 30", personal: "0 / 3", annual: "0 / 6", specialBadge: "NEW HIRE (< 12MO)" },
    { name: "Lisa Park", initial: "LP", bg: "#fbcfe8", sick: "3 / 30", personal: "2 / 3", annual: "1 / 6", specialBadge: null },
    { name: "Tom Hardy", initial: "TH", bg: "#a7f3d0", sick: "8 / 30", personal: "1 / 3", annual: "6 / 6", specialBadge: null },
  ]

  // Balances pagination
  const balTotalPages = Math.ceil(balances.length / balancesPerPage) || 1
  const paginatedBalances = balances.slice((balancesPage - 1) * balancesPerPage, balancesPage * balancesPerPage)
  const balStartItem = balances.length === 0 ? 0 : (balancesPage - 1) * balancesPerPage + 1
  const balEndItem = Math.min(balancesPage * balancesPerPage, balances.length)

  // Card 3: History Data
  const iconData = {
    annual: { Icon: Umbrella, color: "#1982c4", bg: "#e6f2fb" },
    sick: { Icon: Thermometer, color: "#f57a00", bg: "#fff2e5" },
    personal: { Icon: Users, color: "#d06ab0", bg: "#f8e0f0" }
  }

  const statusStyles = {
    APPROVED: { bg: "#bbf7d0", text: "#166534" },
    PENDING: { bg: "#ffedd5", text: "#9a3412" },
    REJECTED: { bg: "#fecdd3", text: "#9f1239" },
    CANCELLED: { bg: "#e2e8f0", text: "#475569" }
  }

  const history = [
    { id: 1, name: "Jane Doe", initial: "JD", bg: "#dbeafe", type: "Annual Leave", icon: "annual", dates: "Aug 14 - Aug 21, 2024", start: new Date(2024, 7, 14), end: new Date(2024, 7, 21), submitted: "Jul 02", duration: "5 Days", status: "Approved", approver: "Boss", dot: true },
    { id: 2, name: "Somsak Meesuk", initial: "SM", bg: "#fef08a", type: "Personal Leave", icon: "personal", dates: "Oct 05 - Oct 06, 2024", start: new Date(2024, 9, 5), end: new Date(2024, 9, 6), submitted: "2h ago", duration: "2 Days", status: "Pending", approver: "-", dot: true },
    { id: 3, name: "Bob Peterson", initial: "BP", bg: "#e2e8f0", type: "Sick Leave", icon: "sick", dates: "May 12, 2024", start: new Date(2024, 4, 12), end: new Date(2024, 4, 12), submitted: "May 10", duration: "4 Hr", status: "Rejected", approver: "Boss", dot: true },
    { id: 4, name: "Kanya Kittisun", initial: "KK", bg: "#fecdd3", type: "Annual Leave", icon: "annual", dates: "Mar 20 - Mar 25, 2024", start: new Date(2024, 2, 20), end: new Date(2024, 2, 25), submitted: "Feb 15", duration: "5 Days", status: "CANCELLED", approver: "-", dot: false },
    { id: 5, name: "Marcus Chen", initial: "MC", bg: "#bfeadd", type: "Sick Leave", icon: "sick", dates: "Jun 10 - Jun 11, 2024", start: new Date(2024, 5, 10), end: new Date(2024, 5, 11), submitted: "Jun 08", duration: "2 Days", status: "Approved", approver: "Boss", dot: true },
    { id: 6, name: "Elena Rodriguez", initial: "ER", bg: "#c4b5fd", type: "Annual Leave", icon: "annual", dates: "Jul 01 - Jul 05, 2024", start: new Date(2024, 6, 1), end: new Date(2024, 6, 5), submitted: "Jun 20", duration: "5 Days", status: "Approved", approver: "Boss", dot: true },
    { id: 7, name: "James Wilson", initial: "JW", bg: "#e0f2fe", type: "Personal Leave", icon: "personal", dates: "Sep 15, 2024", start: new Date(2024, 8, 15), end: new Date(2024, 8, 15), submitted: "Sep 12", duration: "1 Day", status: "Approved", approver: "HR", dot: true },
    { id: 8, name: "Sarah Connor", initial: "SC", bg: "#fef08a", type: "Sick Leave", icon: "sick", dates: "Nov 20 - Nov 22, 2024", start: new Date(2024, 10, 20), end: new Date(2024, 10, 22), submitted: "Nov 19", duration: "3 Days", status: "Pending", approver: "-", dot: true },
    { id: 9, name: "Amanda Smith", initial: "AS", bg: "#fed7aa", type: "Annual Leave", icon: "annual", dates: "Dec 23 - Dec 31, 2024", start: new Date(2024, 11, 23), end: new Date(2024, 11, 31), submitted: "Nov 01", duration: "7 Days", status: "Approved", approver: "Boss", dot: true },
    { id: 10, name: "David Kim", initial: "DK", bg: "#bae6fd", type: "Personal Leave", icon: "personal", dates: "Apr 08, 2024", start: new Date(2024, 3, 8), end: new Date(2024, 3, 8), submitted: "Apr 05", duration: "4 Hr", status: "Rejected", approver: "HR", dot: true },
    { id: 11, name: "Lisa Park", initial: "LP", bg: "#fbcfe8", type: "Sick Leave", icon: "sick", dates: "Feb 14 - Feb 16, 2024", start: new Date(2024, 1, 14), end: new Date(2024, 1, 16), submitted: "Feb 13", duration: "3 Days", status: "Approved", approver: "Boss", dot: true },
    { id: 12, name: "Tom Hardy", initial: "TH", bg: "#a7f3d0", type: "Annual Leave", icon: "annual", dates: "Jan 02 - Jan 06, 2024", start: new Date(2024, 0, 2), end: new Date(2024, 0, 6), submitted: "Dec 20", duration: "5 Days", status: "Approved", approver: "HR", dot: true },
  ]

  let filteredData = filter === "all"
    ? history
    : history.filter(item => item.status.toLowerCase() === filter)

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
        navItems={adminNavItems}
        user={adminProfile}
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
            {leaveSummary.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[13px] font-bold text-[#3f4a51]">
                  <span>{item.type}</span>
                  <span>{item.used} Days Used</span>
                </div>
                <div
                  className="w-full rounded-full overflow-hidden"
                  style={{ backgroundColor: "#e2e8f0", height: "14px" }}
                >
                  <div
                    className="rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${(item.used / item.total) * 100}%`,
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
                  <th className="py-4 px-8 text-[12px] font-bold font-fredoka text-[#64748b] tracking-widest uppercase leading-snug">Sick Leave<br />(Used/Total)</th>
                  <th className="py-4 px-8 text-[12px] font-bold font-fredoka text-[#64748b] tracking-widest uppercase leading-snug">Personal Leave<br />(Used/Total)</th>
                  <th className="py-4 px-8 text-[12px] font-bold font-fredoka text-[#64748b] tracking-widest uppercase leading-snug">Annual Vacation<br />(Used/Total)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBalances.map((row, idx) => {
                  const getQuotaStyle = (quota) => {
                    if (!quota) return "text-[#475569]";
                    const parts = quota.split(" / ");
                    if (parts.length === 2 && parts[0].trim() === parts[1].trim()) {
                      if (parts[0].trim() === "0") return "text-red-800 font-bold";
                      return "text-red-600 font-bold";
                    }
                    return "text-[#475569]";
                  };

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
                              <span
                                className="font-bold text-red-600 mt-0.5 tracking-widest uppercase opacity-90"
                                style={{ fontSize: "9px" }}
                              >
                                {row.specialBadge}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-8">
                        <span className={`text-[14px] font-medium ${getQuotaStyle(row.sick)}`}>{row.sick}</span>
                      </td>
                      <td className="py-5 px-8">
                        <span className={`text-[14px] font-medium ${getQuotaStyle(row.personal)}`}>{row.personal}</span>
                      </td>
                      <td className="py-5 px-8">
                        <span className={`text-[14px] font-medium ${getQuotaStyle(row.annual)}`}>{row.annual}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 mt-2 px-8 pb-4">
            <p className="text-[13px] text-[#94a3b8] font-bold">
              Showing {balStartItem}-{balEndItem} of {balances.length} employees
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
                    const { Icon, color, bg } = iconData[hist.icon];

                    const statusTheme = {
                      Approved: { bg: "#00e676", text: "#1f3747", dot: "#1f3747" },
                      Pending: { bg: "#fce87c", text: "#1f3747", dot: "#1f3747" },
                      Rejected: { bg: "#ff7669", text: "#1f3747", dot: "#1f3747" },
                      CANCELLED: { bg: "#e2e8f0", text: "#64748b", dot: null }
                    }
                    const theme = statusTheme[hist.status] || statusTheme.Pending;

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
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
                              <Icon color={color} size={16} strokeWidth={2.5} />
                            </div>
                            <span className="text-[14px] font-bold text-[#323940]">{hist.type}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col justify-center">
                            <span className="text-[13px] font-bold text-[#3f4a51]">{hist.dates}</span>
                            <span className="text-[11px] font-medium text-[#94a3b8] mt-0.5">Submitted on {hist.submitted}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-[#e2e8f0] text-[#475569] font-bold text-[12px] px-3 py-1.5 rounded-full inline-block whitespace-nowrap">
                            {hist.duration}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className={`inline-flex items-center ${hist.dot ? 'gap-1.5' : ''} px-3 py-1.5 rounded-full`}
                            style={{ backgroundColor: theme.bg }}
                          >
                            {hist.dot && <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: theme.dot }}></div>}
                            <span className="text-[10px] font-bold tracking-wide" style={{ color: theme.text }}>{hist.status}</span>
                          </div>
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

