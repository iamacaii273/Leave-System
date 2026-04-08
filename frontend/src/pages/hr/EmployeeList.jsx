import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"

export default function EmployeeList({ onNavigate }) {
  const navigate = useNavigate()

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

  const employees = [
    { id: 1, name: "Somchai", email: "somchai@happyhub.com", position: "Dev", quota: "12 / 36 Days", initial: "S", bg: "#bfeadd" },
    { id: 2, name: "Ananya", email: "ananya@happyhub.com", position: "UI Designer", quota: "08 / 36 Days", initial: "A", bg: "#f0dcb5" },
    { id: 3, name: "Kanya", email: "kanya@happyhub.com", position: "Product Lead", quota: "15 / 40 Days", initial: "K", bg: "#d5dadc" }
  ]

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header
        activePage="employee"
        onNavigate={onNavigate}
        navItems={adminNavItems}
        user={adminProfile}
      />

      <main className="max-w-5xl mx-auto px-6 py-12 w-full flex-grow">
        {/* Header Section */}
        <div className="mb-10">
          <h1 className="text-[56px] font-fredoka font-bold text-[#323940] mb-2 leading-tight tracking-wide">
            Employee Management
          </h1>
          <p className="text-[#64748b] text-[20px] font-medium tracking-wide max-w-2xl leading-relaxed">
            Nurture your team in our pillowy sanctuary. View, add, and manage your most
            valuable assets with ease.
          </p>
        </div>

        {/* Search & Add Action */}
        <div className="flex gap-4 mb-8">
          <div className="relative flex-grow">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={20} />
            <input
              type="text"
              placeholder="Search employees..."
              className="w-full bg-white rounded-full py-5 pl-14 pr-6 text-[16px] font-medium text-[#3f4a51] placeholder-[#94a3b8] shadow-sm outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all box-border"
            />
          </div>
          <button
            onClick={() => navigate('/hr/employee/add')}
            className="!bg-[#4d6b63] hover:bg-[#3d554e] text-white rounded-full !px-8 !py-5 flex items-center gap-2 font-bold text-[17px] shadow-sm transition-colors"
          >
            <Plus size={20} strokeWidth={3} />
            Add Employee
          </button>
        </div>

        {/* List Container */}
        <div className="bg-white rounded-[40px] p-10 pb-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          {/* Badge */}
          <div className="bg-[#c2e4e1] inline-block px-5 py-2 rounded-full mb-8">
            <p className="text-[#3b6661] text-[11px] font-bold font-fredoka tracking-widest text-center leading-tight">
              ALL EMPLOYEE<br />(100)
            </p>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 mb-4 px-4">
            <span className="text-[12px] font-bold font-fredoka text-[#94a3b8] tracking-widest uppercase">Name</span>
            <span className="text-[12px] font-bold font-fredoka text-[#94a3b8] tracking-widest uppercase">Position</span>
            <span className="text-[12px] font-bold font-fredoka text-[#94a3b8] tracking-widest uppercase text-center">Leave Quota</span>
            <span className="w-24"></span>
          </div>

          <div className="w-full h-px bg-gray-100 mb-2"></div>

          {/* Table Rows */}
          <div className="space-y-0">
            {employees.map((emp, idx) => (
              <div key={emp.id}>
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center py-6 px-4 hover:bg-gray-50/50 transition-colors rounded-2xl">
                  <div className="flex items-center gap-5">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-[#323940] text-[20px] font-fredoka shadow-sm"
                      style={{ backgroundColor: emp.bg }}
                    >
                      {emp.initial}
                    </div>
                    <div>
                      <p className="font-bold text-[17px] font-fredoka text-[#323940] mb-0.5">{emp.name}</p>
                      <p className="text-[13px] font-medium text-[#7a8c98]">{emp.email}</p>
                    </div>
                  </div>

                  <div className="text-[15px] font-bold text-[#566069]">
                    {emp.position}
                  </div>

                  <div className="flex justify-center">
                    <span className="bg-[#c2e4e1] text-[#3b6661] px-4 py-1.5 rounded-full text-[13px] font-bold">
                      {emp.quota}
                    </span>
                  </div>

                  <div className="flex justify-end w-24">
                    <button
                      onClick={() => navigate(`/hr/employee/${emp.id}`)}
                      className="!bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#475569] font-bold text-[14px] !px-6 !py-2 rounded-full transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
                {idx < employees.length - 1 && <div className="w-full h-px bg-gray-100"></div>}
              </div>
            ))}
          </div>

          <div className="w-full h-px bg-gray-100 mt-2 mb-8"></div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4">
            <p className="text-[13px] font-bold text-[#64748b]">Showing 1 to 3 of 42 employees</p>
            <div className="flex items-center gap-2 text-[#475569] font-bold text-[14px]">
              <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button className="w-8 h-8 rounded-full bg-[#c2e4e1] text-[#2c4c48] flex items-center justify-center">1</button>
              <button className="w-8 h-8 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors">2</button>
              <button className="w-8 h-8 rounded-full hover:bg-gray-50 flex items-center justify-center transition-colors">3</button>
              <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
