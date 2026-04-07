import { useState } from "react"
import Header from "../../components/Header"
import LeaveBalanceCard from "../../components/LeaveBalanceCard"

const CalendarIcon = ({ color }) => (
  <svg className="w-5 h-5" fill="none" stroke={color} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

export default function History({ onNavigate }) {
  const [filter, setFilter] = useState("all")

  const filters = ["All", "Approved", "Pending", "Rejected"]

  const historyData = [
    { id: 1, type: "Annual Leave", dates: "Aug 14 - Aug 21, 2024", duration: "5 Days", status: "Approved", reason: "Summer Vacation" },
    { id: 2, type: "Personal Leave", dates: "Oct 05 - Oct 06, 2024", duration: "2 Days", status: "Pending", reason: "Family Wedding" },
    { id: 3, type: "Sick Leave", dates: "May 12, 2024", duration: "8 Hr", status: "Rejected", reason: "Get Sick Infected" },
    { id: 4, type: "Annual Leave", dates: "Mar 20 - Mar 25, 2024", duration: "5 Days", status: "Approved", reason: "Spring Break" }
  ]

  const statusColors = {
    Approved: { bg: "#dcfce7", text: "#16a34a" },
    Pending: { bg: "#fef9c3", text: "#ca8a04" },
    Rejected: { bg: "#fee2e2", text: "#dc2626" }
  }

  const iconColors = {
    "Annual Leave": "#7dd3fc",
    "Personal Leave": "#fcd34d",
    "Sick Leave": "#fca5a5"
  }

  const filteredData = filter === "all"
    ? historyData
    : historyData.filter(item => item.status.toLowerCase() === filter)

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
              <div className="bg-[#f4f7fb] text-[#5e6c7e] px-4 py-2 rounded-xl text-[14px] font-bold flex items-center gap-2 cursor-pointer transition-colors hover:bg-gray-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Select Date Range
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
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f9fafb] transition-colors rounded-[24px]">
                    <td className="py-2.5 px-4 rounded-l-[24px]">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center border border-white/20"
                          style={{ backgroundColor: iconColors[item.type] + "22" }}
                        >
                          <CalendarIcon color={iconColors[item.type]} />
                        </div>
                        <span className="font-bold">{item.type}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-[13px]">
                      <div className="font-bold flex flex-col gap-0.5">
                        <span>{item.dates}</span>
                        <span className="text-[11px] text-[#94a3b8] font-medium">Submitted on Jan 01</span>
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-8 px-4">
            <p className="text-[13px] text-[#94a3b8] font-bold">Showing 1-4 of 12 requests</p>
            <div className="flex gap-2 items-center text-[#94a3b8] font-bold">
              <svg className="w-4 h-4 cursor-pointer hover:text-[#3f4a51]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
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
              <svg className="w-4 h-4 cursor-pointer hover:text-[#3f4a51]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}