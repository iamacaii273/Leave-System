import { useEffect, useMemo, useState } from "react"
import { Calendar, Users, CalendarDays, CheckSquare } from "lucide-react"
import Header from "../../components/Header"
import api from "../../services/api"

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

function getStatusTheme(status) {
  if (status === "On Leave") {
    return {
      bg: "bg-[#f0c3ae]",
      text: "text-[#a65d38]",
    }
  }

  return {
    bg: "bg-[#b4eed3]",
    text: "text-[#3e8964]",
  }
}

export default function Dashboard({ onNavigate }) {
  const adminNavItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "employee", label: "Employee" },
    { id: "reports", label: "Reports" },
    { id: "leave-type", label: "Leave Type" }
  ]



  const [showAllEmployees, setShowAllEmployees] = useState(false)
  const [stats, setStats] = useState({
    total_employees: 0,
    requests_today: 0,
    pending_today: 0,
  })
  const [employees, setEmployees] = useState([])
  const [trendData, setTrendData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true)
        setError("")

        const [dashRes, monthlyRes] = await Promise.all([
          api.get("/reports/dashboard"),
          api.get("/reports/monthly")
        ])

        setStats({
          total_employees: Number(dashRes.data?.stats?.total_employees || 0),
          requests_today: Number(dashRes.data?.stats?.requests_today || 0),
          pending_today: Number(dashRes.data?.stats?.pending_today || 0),
        })
        setEmployees(dashRes.data?.employees || [])

        // Build full 12-month array, fill 0 for months with no data
        const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const rawMonthly = monthlyRes.data?.monthly || []
        const byMonth = {}
        rawMonthly.forEach(r => { byMonth[r.month] = Number(r.approved_days || 0) })
        const built = MONTHS.map((label, i) => ({
          month: label,
          value: byMonth[i + 1] || 0
        }))
        setTrendData(built)
      } catch (err) {
        console.error("HR dashboard error:", err)
        setError("Unable to load dashboard data right now.")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const displayedEmployees = useMemo(() => {
    return showAllEmployees ? employees : employees.slice(0, 3)
  }, [employees, showAllEmployees])

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header
        activePage="dashboard"
        onNavigate={onNavigate}
      />

      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">
        <div className="flex justify-between items-start mb-10 w-full mt-2">
          <div>
            <h1 className="text-[56px] font-fredoka font-bold text-[#4c6367] mb-0 leading-tight">
              Organization Overview
            </h1>
            <p className="text-[#59646b] text-[18px] font-medium tracking-wide">
              Your hub for high-level company pulse.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#d1ebdf] text-[#4b6b60] px-5 py-3 rounded-[20px] shadow-sm font-bold mt-2">
            <Calendar size={20} className="text-[#4b6b60]" />
            <span className="text-[17px]">{formatToday()}</span>
          </div>
        </div>

        <div className="flex gap-6 mb-10">
          <div className="flex-1 bg-white rounded-[40px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden h-[180px]">
            <h3 className="font-bold text-[14px] font-fredoka text-[#667085] tracking-widest uppercase mb-4">Total Employees</h3>
            <p className="text-[52px] font-fredoka font-bold text-[#4c6367]">
              {loading ? "--" : stats.total_employees}
            </p>
            <Users className="absolute bottom-6 right-6 w-24 h-24 text-[#E6E6E6] opacity-50" />
          </div>

          <div className="flex-1 bg-[#fcac84] rounded-[40px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] relative overflow-hidden h-[180px]">
            <h3 className="font-bold text-[14px] font-fredoka text-[#aa6b4c] tracking-widest uppercase mb-4">Requests Today</h3>
            <p className="text-[52px] font-fredoka font-bold text-[#7d462a]">
              {loading ? "--" : stats.requests_today}
            </p>
            <CalendarDays className="absolute bottom-6 right-6 w-24 h-24 text-[#e2936a] opacity-50" />
          </div>

          <div className="flex-1 bg-[#fade56] rounded-[40px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] relative overflow-hidden h-[180px]">
            <h3 className="font-bold text-[14px] font-fredoka text-[#a89025] tracking-widest uppercase mb-4">Pending Today</h3>
            <p className="text-[52px] font-fredoka font-bold text-[#705e07]">
              {loading ? "--" : stats.pending_today}
            </p>
            <CheckSquare className="absolute bottom-6 right-6 w-24 h-24 text-[#e0c641] opacity-50" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8">
          <div className="bg-white rounded-[40px] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-[22px] font-fredoka text-[#1f3747] tracking-wide">Employee Directory</h3>
              {employees.length > 3 && (
                <button
                  onClick={() => setShowAllEmployees(!showAllEmployees)}
                  className="text-[14px] font-bold text-[#3ea8e5] hover:text-[#2d8abf] transition-colors"
                >
                  {showAllEmployees ? "Show Less" : "View All"}
                </button>
              )}
            </div>

            {error ? (
              <p className="text-[14px] font-medium text-[#c2410c] bg-[#fff7ed] rounded-[20px] px-4 py-3">
                {error}
              </p>
            ) : loading ? (
              <p className="text-[14px] font-medium text-[#7a8c98]">Loading employee directory...</p>
            ) : employees.length === 0 ? (
              <p className="text-[14px] font-medium text-[#7a8c98]">No employees found.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {displayedEmployees.map((emp) => {
                  const theme = getStatusTheme(emp.status)

                  return (
                    <div key={emp.id} className="flex items-center justify-between p-4 bg-[#f4f7f9] rounded-[24px]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#d9ecf7] text-[#1f6d99] flex items-center justify-center font-fredoka font-bold text-[15px] shadow-sm">
                          {getInitials(emp.full_name)}
                        </div>
                        <div>
                          <p className="font-bold text-[16px] text-[#1f3747] mb-0.5 font-fredoka">{emp.full_name}</p>
                          <p className="text-[12px] font-medium text-[#7a8c98]">{emp.position || emp.email}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 ${theme.bg} ${theme.text} text-[11px] font-bold rounded-full uppercase tracking-wider`}>
                        {emp.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[40px] p-8 shadow-sm flex flex-col min-h-[400px] self-start w-full">
            <h3 className="font-bold text-[22px] font-fredoka text-[#1f3747] tracking-wide mb-1">Leave Trends</h3>
            <p className="text-[13px] font-medium text-[#7a8c98] mb-8">Total number of approved leave days each month.</p>

            {loading ? (
              <div className="flex-grow flex items-center justify-center text-[#94a3b8] font-bold text-[14px]">Loading chart...</div>
            ) : (() => {
              const maxVal = Math.max(...trendData.map(d => d.value), 1)
              const currentMonth = new Date().getMonth() // 0-indexed
              return (
                <div className="flex-grow flex items-end justify-between px-2 pt-8 pb-2 relative">
                  {trendData.map((item, index) => {
                    const heightPct = Math.round((item.value / maxVal) * 100)
                    const isCurrentMonth = index === currentMonth
                    const hasData = item.value > 0
                    return (
                      <div key={index} className="flex flex-col items-center gap-2 group cursor-pointer flex-1">
                        <div className="relative flex justify-center w-full items-end" style={{ height: "140px" }}>
                          {hasData && (
                            <div className="absolute -top-8 bg-[#1f3747] text-white text-[11px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap">
                              {item.value} days
                            </div>
                          )}
                          <div
                            className="w-full max-w-[32px] rounded-t-[8px] transition-colors"
                            style={{
                              height: hasData ? `${Math.max(heightPct, 6)}%` : "4px",
                              backgroundColor: isCurrentMonth ? "#fcac84" : (hasData ? "#006dae" : "#e8ecf0"),
                            }}
                          />
                        </div>
                        <span className={`text-[11px] font-bold ${isCurrentMonth ? "text-[#aa6b4c]" : "text-[#7a8c98]"}`}>
                          {item.month}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      </main>
    </div>
  )
}
