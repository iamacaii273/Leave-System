import Header from "../../components/Header"
import LeaveBalanceCard from "../../components/LeaveBalanceCard"
import RecentRequests from "../../components/RecentRequests"
import TeamMembersOut from "../../components/TeamMembersOut"
import { Cloud } from "lucide-react"

export default function Dashboard({ onNavigate }) {
  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col">
      <Header activePage="dashboard" onNavigate={onNavigate} />
      
      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">
        {/* Greeting */}
        <div className="mb-14 mt-4">
          <h1 className="text-[64px] font-fredoka font-[600] text-[#3f4a51] mb-2 flex items-center gap-4">
            Good morning, Alex!
            <span className="text-[72px]" style={{filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.15))"}}>☁️</span>
          </h1>
          <p className="text-[#64748b] text-[20px] max-w-2xl font-medium tracking-wide">
            Your pillowy sanctuary is ready. You have <span className="font-bold text-[#3f4a51]">12 days</span> of vacation leave left to spend on some sun!
          </p>
        </div>

        {/* Leave Balance Cards */}
        <div className="flex flex-wrap gap-6 mb-16 justify-center lg:justify-start">
          <LeaveBalanceCard title="Sick Leave" used={2} total={30} variant="sick" />
          <LeaveBalanceCard title="Personal Leave" used={1} total={3} variant="personal" />
          <LeaveBalanceCard title="Annual Leave" used={5} total={6} variant="annual" />
        </div>

        {/* Recent Requests & Team Members */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
          <RecentRequests />
          <div className="flex flex-col gap-8">
            <TeamMembersOut />
          </div>
        </div>
      </main>
    </div>
  )
}