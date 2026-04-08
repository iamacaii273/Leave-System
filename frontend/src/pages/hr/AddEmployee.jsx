import { UserPlus, Briefcase, Lock, Save, ChevronDown } from "lucide-react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"

export default function AddEmployee({ onNavigate }) {
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

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header
        activePage="employee"
        onNavigate={onNavigate}
        navItems={adminNavItems}
        user={adminProfile}
      />

      <main className="max-w-4xl mx-auto px-6 py-12 w-full flex-grow">

        {/* Header Title */}
        <div className="mb-10 w-full">
          <h1 className="text-[52px] font-fredoka font-bold text-[#1f3747] mb-2 leading-tight flex items-center gap-4">
            <UserPlus size={48} className="text-[#3b596f]" strokeWidth={2.5} />
            Add New Employee
          </h1>
          <p className="text-[#5c6e7e] text-[20px] font-medium tracking-wide leading-relaxed max-w-2xl">
            Welcome a new member to the Sanctuary family. Let's get their profile set up perfectly.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-[40px] p-10 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <form className="flex flex-col gap-10">

            {/* Personal Identity */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#dcf5eb] text-[#36956f] flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <h3 className="font-bold text-[18px] font-fredoka text-[#323940]">Personal Identity</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Employee ID</label>
                  <input type="text" placeholder="e.g. EMP-2024-001" className="w-full bg-[#f4f7f9] rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">First Name</label>
                  <input type="text" placeholder="Enter first name" className="w-full bg-[#f4f7f9] rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Last Name</label>
                  <input type="text" placeholder="Enter last name" className="w-full bg-[#f4f7f9] rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all" />
                </div>
              </div>
            </section>

            {/* Professional Details */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#fcece0] text-[#c9743a] flex items-center justify-center">
                  <Briefcase size={16} />
                </div>
                <h3 className="font-bold text-[18px] font-fredoka text-[#323940]">Professional Details</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Email Address</label>
                  <input type="email" placeholder="name@company.com" className="w-full bg-[#f4f7f9] rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Phone Number</label>
                  <input type="tel" placeholder="+1 (555) 000-0000" className="w-full bg-[#f4f7f9] rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Role</label>
                  <div className="relative">
                    <select className="w-full bg-[#f4f7f9] rounded-2xl py-4 px-6 text-[15px] text-[#323940] appearance-none border-none outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all cursor-pointer">
                      <option>Employee</option>
                      <option>Admin</option>
                      <option>HR</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Position</label>
                  <input type="text" placeholder="e.g. Senior Developer" className="w-full bg-[#f4f7f9] rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all" />
                </div>
              </div>
            </section>

            {/* Access Credentials */}
            <section className="bg-[#f4f7f9] rounded-[32px] p-8 mt-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#e2e8f0] text-[#64748b] flex items-center justify-center">
                  <Lock size={16} />
                </div>
                <h3 className="font-bold text-[18px] font-fredoka text-[#323940]">Access Credentials</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Username</label>
                  <input type="text" placeholder="Choose a unique username" className="w-full bg-white rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-white transition-all shadow-sm" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Password</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-white rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-white transition-all shadow-sm tracking-widest" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Confirm Password</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-white rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-white transition-all shadow-sm tracking-widest" />
                </div>
              </div>
            </section>

            <div className="w-full h-px bg-gray-100 my-2"></div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-6 mb-2">
              <button
                type="button"
                onClick={() => navigate('/hr/employee')}
                className="font-bold text-[15px] text-[#64748b] hover:text-[#323940] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-[#dcf5eb] hover:bg-[#c2e4e1] text-[#2c7356] rounded-full px-8 py-4 flex items-center gap-2 font-bold text-[16px] transition-colors shadow-sm"
              >
                <Save size={18} />
                Save Employee
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  )
}
