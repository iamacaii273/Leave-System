import { useState, useRef, useEffect } from "react"
import Header from "../../components/Header"
import LeaveBalanceCard from "../../components/LeaveBalanceCard"
import { CalendarDays, Umbrella, Users, Thermometer, ChevronLeft, ChevronRight, X } from "lucide-react"

export default function History({ onNavigate }) {
  const [filter, setFilter] = useState("all")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [appliedRange, setAppliedRange] = useState(null)
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

  const filters = ["All", "Approved", "Pending", "Rejected"]

  const historyData = [
    { id: 1, type: "Annual Leave", dates: "Aug 14 - Aug 21, 2024", start: new Date(2024, 7, 14), end: new Date(2024, 7, 21), duration: "5 Days", status: "Approved", reason: "Summer Vacation", submitted: "Aug 10, 2024" },
    { id: 2, type: "Personal Leave", dates: "Oct 05 - Oct 06, 2024", start: new Date(2024, 9, 5), end: new Date(2024, 9, 6), duration: "2 Days", status: "Pending", reason: "Family Wedding", submitted: "Oct 01, 2024" },
    { id: 3, type: "Sick Leave", dates: "May 12, 2024", start: new Date(2024, 4, 12), end: new Date(2024, 4, 12), duration: "8 Hr", status: "Rejected", reason: "Get Sick Infected", submitted: "May 12, 2024" },
    { id: 4, type: "Annual Leave", dates: "Mar 20 - Mar 25, 2024", start: new Date(2024, 2, 20), end: new Date(2024, 2, 25), duration: "5 Days", status: "Approved", reason: "Spring Break", submitted: "Mar 15, 2024" }
  ]

  const statusColors = {
    Approved: { bg: "#0cf1aa", text: "#185b48" },
    Pending: { bg: "#fee481", text: "#6b5413" },
    Rejected: { bg: "#f56464", text: "#570008" }
  }

  const iconData = {
    "Annual Leave": { Icon: Umbrella, color: "#1982c4", bg: "#e6f2fb" },
    "Personal Leave": { Icon: Users, color: "#d06ab0", bg: "#f8e0f0" },
    "Sick Leave": { Icon: Thermometer, color: "#f57a00", bg: "#fff2e5" }
  }

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
                  className={`px-4 py-2 rounded-xl text-[14px] font-bold flex items-center gap-2 cursor-pointer transition-colors ${appliedRange
                    ? "bg-[#1c355e] text-white"
                    : "bg-[#f4f7fb] text-[#5e6c7e] hover:bg-gray-100"
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
                          className="w-full px-3 py-2.5 rounded-xl border border-[#dde3ec] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-[#3f4a51] mb-1 block">To</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={e => setEndDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-[#dde3ec] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]"
                        />
                      </div>
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
          <div className="overflow-x-auto px-2">
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
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#94a3b8] text-[15px] font-medium">
                      No leave requests found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-[#f9fafb] transition-colors rounded-[24px]">
                      <td className="py-2.5 px-4 rounded-l-[24px]">
                        <div className="flex items-center gap-4">
                          {(() => {
                            const { Icon, color, bg } = iconData[item.type]
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
                            backgroundColor: statusColors[item.status].bg,
                            color: statusColors[item.status].text
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#94a3b8] rounded-r-[24px] text-[13px]">
                        {item.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-8 px-4">
            <p className="text-[13px] text-[#94a3b8] font-bold">
              Showing {filteredData.length} of {historyData.length} requests
            </p>
            <div className="flex gap-2 items-center text-[#94a3b8] font-bold">
              <ChevronLeft size={16} className="cursor-pointer hover:text-[#3f4a51]" />
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  className={`w-8 h-8 rounded-full text-[13px] font-bold transition-all ${page === 1
                    ? "bg-[#3f4a51] text-white"
                    : "text-[#94a3b8] hover:bg-gray-100 hover:text-[#3f4a51]"
                    }`}
                >
                  {page}
                </button>
              ))}
              <ChevronRight size={16} className="cursor-pointer hover:text-[#3f4a51]" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}