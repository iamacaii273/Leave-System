import { Calendar, Users, CalendarDays, CheckSquare } from "lucide-react"
import Header from "../../components/Header"

export default function Dashboard({ onNavigate }) {
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

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header
        activePage="dashboard"
        onNavigate={onNavigate}
        navItems={adminNavItems}
        user={adminProfile}
      />

      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">
        {/* Header Section */}
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
            <span className="text-[17px]">June 24, 2025</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="flex gap-6 mb-10">
          {/* Total Employees */}
          <div className="flex-1 bg-white rounded-[40px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden h-[180px]">
            <h3 className="font-bold text-[14px] font-fredoka text-[#667085] tracking-widest uppercase mb-4">Total Employees</h3>
            <p className="text-[52px] font-fredoka font-bold text-[#4c6367]">100</p>
            <Users className="absolute bottom-6 right-6 w-24 h-24 text-[#E6E6E6] opacity-50" />
          </div>

          {/* Requests Today */}
          <div className="flex-1 bg-[#fcac84] rounded-[40px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] relative overflow-hidden h-[180px]">
            <h3 className="font-bold text-[14px] font-fredoka text-[#aa6b4c] tracking-widest uppercase mb-4">Requests Today</h3>
            <p className="text-[52px] font-fredoka font-bold text-[#7d462a]">24</p>
            <CalendarDays className="absolute bottom-6 right-6 w-24 h-24 text-[#e2936a] opacity-50" />
          </div>

          {/* Pending Today */}
          <div className="flex-1 bg-[#fade56] rounded-[40px] p-8 shadow-[0_2px_10px_rgba(0,0,0,0.04)] relative overflow-hidden h-[180px]">
            <h3 className="font-bold text-[14px] font-fredoka text-[#a89025] tracking-widest uppercase mb-4">Pending Today</h3>
            <p className="text-[52px] font-fredoka font-bold text-[#705e07]">03</p>
            <CheckSquare className="absolute bottom-6 right-6 w-24 h-24 text-[#e0c641] opacity-50" />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8">
          {/* Staff Directory */}
          <div className="bg-white rounded-[40px] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-[22px] font-fredoka text-[#1f3747] tracking-wide">Employee Directory</h3>
              <button className="text-[14px] font-bold text-[#3ea8e5] hover:text-[#2d8abf] transition-colors">View All</button>
            </div>

            <div className="space-y-4">
              {/* Person 1 */}
              <div className="flex items-center justify-between p-4 bg-[#f4f7f9] rounded-[24px]">
                <div className="flex items-center gap-4">
                  <img src="https://i.pravatar.cc/150?img=11" className="w-12 h-12 rounded-full object-cover shadow-sm" alt="Marcus Chen" />
                  <div>
                    <p className="font-bold text-[16px] text-[#1f3747] mb-0.5 font-fredoka">Marcus Chen</p>
                    <p className="text-[12px] font-medium text-[#7a8c98]">Software Engineer</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-[#b4eed3] text-[#3e8964] text-[11px] font-bold rounded-full uppercase tracking-wider">Active</span>
              </div>

              {/* Person 2 */}
              <div className="flex items-center justify-between p-4 bg-[#f4f7f9] rounded-[24px]">
                <div className="flex items-center gap-4">
                  <img src="https://i.pravatar.cc/150?img=5" className="w-12 h-12 rounded-full object-cover shadow-sm" alt="Elena Rodriguez" />
                  <div>
                    <p className="font-bold text-[16px] text-[#1f3747] mb-0.5 font-fredoka">Elena Rodriguez</p>
                    <p className="text-[12px] font-medium text-[#7a8c98]">Product Designer</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-[#f0c3ae] text-[#a65d38] text-[11px] font-bold rounded-full uppercase tracking-wider">On Leave</span>
              </div>

              {/* Person 3 */}
              <div className="flex items-center justify-between p-4 bg-[#f4f7f9] rounded-[24px]">
                <div className="flex items-center gap-4">
                  <img src="https://i.pravatar.cc/150?img=8" className="w-12 h-12 rounded-full object-cover shadow-sm" alt="James Wilson" />
                  <div>
                    <p className="font-bold text-[16px] text-[#1f3747] mb-0.5 font-fredoka">James Wilson</p>
                    <p className="text-[12px] font-medium text-[#7a8c98]">Account Manager</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-[#b4eed3] text-[#3e8964] text-[11px] font-bold rounded-full uppercase tracking-wider">Active</span>
              </div>
            </div>
          </div>

          {/* Leave Trends */}
          <div className="bg-white rounded-[40px] p-8 shadow-sm flex flex-col h-full">
            <h3 className="font-bold text-[22px] font-fredoka text-[#1f3747] tracking-wide mb-1">Leave Trends</h3>
            <p className="text-[13px] font-medium text-[#7a8c98] mb-8">Monthly volume by request type</p>

            {/* Dynamic CSS Bar Chart */}
            <div className="flex-grow flex items-end justify-between px-6 pt-8 pb-2 relative h-48">
              {/* Bars mapped from data */}
              {[
                { month: "Jan", value: 45, height: "80%" },
                { month: "Feb", value: 20, height: "40%" },
                { month: "Mar", value: 30, height: "60%" },
                { month: "Apr", value: 65, height: "100%" },
                { month: "May", value: 15, height: "25%" },
                { month: "Jun", value: 30, height: "60%" }
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center gap-4 group cursor-pointer">
                  <div className="relative flex justify-center w-full h-full items-end" style={{ height: '140px' }}>
                    {/* Tooltip value */}
                    <div className="absolute -top-8 bg-[#3f4a51] text-white text-[11px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      {item.value} days
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-10 bg-[#006dae] rounded-t-[8px] hover:bg-[#3ea8e5] transition-colors"
                      style={{ height: item.height }}
                    ></div>
                  </div>
                  <span className="text-[12px] text-[#7a8c98] font-bold">{item.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
