import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, CheckCircle, Bell, Settings, User, Briefcase, Lock, UserPlus } from "lucide-react"

export default function AddUser({ onNavigate }) {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    employeeId: '',
    username: '',
    email: '',
    phone: '',
    role: 'Employee',
    position: '',
    password: '',
    confirmPassword: ''
  })

  const [showSuccess, setShowSuccess] = useState(false)

  const handleSave = () => {
    // Basic validation could happen here
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      navigate('/superadmin/dashboard')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="FLOW Digital" className="h-10 object-contain" />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <Bell size={20} className="text-gray-500" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#f05252] border border-white rounded-full"></span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings size={20} className="text-gray-500" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="text-right">
                <p className="text-[13px] font-bold font-fredoka text-[#1e3450]">Alex Chen</p>
                <p className="text-[11px] text-[#64748b]">Super Admin</p>
              </div>
              <div className="w-10 h-10 bg-[#1e3450] rounded-full flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-6 py-12 w-full flex-grow flex flex-col items-center">
        
        <div className="bg-white rounded-[32px] p-10 w-full shadow-sm">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-[36px] font-fredoka font-bold text-[#1f3747] mb-1">
              Add New User
            </h1>
            <p className="text-[#64748b] text-[15px] font-medium">
              Create a new profile and assign permissions within the Happy Hub ecosystem.
            </p>
          </div>

          {/* Personal Identity */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#dcf5eb] flex items-center justify-center">
              <User size={16} className="text-[#2c7356]" />
            </div>
            <h3 className="text-[18px] font-fredoka font-bold text-[#1f3747]">Personal Identity</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Employee ID</label>
              <input
                type="text"
                placeholder="e.g. EMP-2024-001"
                value={form.employeeId}
                onChange={(e) => setForm(p => ({ ...p, employeeId: e.target.value }))}
                className="bg-[#f4f7f9] rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full placeholder:text-[#cbd5e1] placeholder:font-semibold"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">First Name</label>
              <input
                type="text"
                placeholder="Enter first name"
                value={form.firstName}
                onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))}
                className="bg-[#f4f7f9] rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full placeholder:text-[#cbd5e1] placeholder:font-semibold"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Last Name</label>
              <input
                type="text"
                placeholder="Enter last name"
                value={form.lastName}
                onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))}
                className="bg-[#f4f7f9] rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full placeholder:text-[#cbd5e1] placeholder:font-semibold"
              />
            </div>
          </div>

          {/* Professional Details */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#fae8d4] flex items-center justify-center">
              <Briefcase size={16} className="text-[#d97706]" />
            </div>
            <h3 className="text-[18px] font-fredoka font-bold text-[#1f3747]">Professional Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Email Address</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                className="bg-[#f4f7f9] rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full placeholder:text-[#cbd5e1] placeholder:font-semibold"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Phone Number</label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                className="bg-[#f4f7f9] rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full placeholder:text-[#cbd5e1] placeholder:font-semibold"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Role</label>
              <div className="relative">
                <select
                  value={form.role}
                  onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
                  className="bg-[#f4f7f9] rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none appearance-none cursor-pointer w-full focus:ring-2 focus:ring-[#567278]/20"
                >
                  <option>Employee</option>
                  <option>HR Admin</option>
                  <option>Manager</option>
                  <option>Super Admin</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Position</label>
              <input
                type="text"
                placeholder="e.g. Senior Developer"
                value={form.position}
                onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))}
                className="bg-[#f4f7f9] rounded-2xl py-3 px-4 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full placeholder:text-[#cbd5e1] placeholder:font-semibold"
              />
            </div>
          </div>

          {/* Access Credentials */}
          <div className="flex items-center gap-3 mb-6 bg-[#f4f7f9] p-4 rounded-2xl">
             <div className="flex items-center gap-3 w-full">
               <div className="w-8 h-8 rounded-full bg-[#d4f0f0] flex items-center justify-center">
                 <Lock size={16} className="text-[#0d9488]" />
               </div>
               <h3 className="text-[18px] font-fredoka font-bold text-[#1f3747]">Access Credentials</h3>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10 bg-[#f9fafb] p-6 rounded-3xl">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Username</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Choose a unique username"
                  value={form.username}
                  onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
                  className="bg-white rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full shadow-sm placeholder:text-[#cbd5e1] placeholder:font-semibold"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                className="bg-white rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none w-full shadow-sm focus:ring-2 focus:ring-[#567278]/20 tracking-widest placeholder:text-[#cbd5e1] placeholder:font-semibold"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                className="bg-white rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none w-full shadow-sm focus:ring-2 focus:ring-[#567278]/20 tracking-widest placeholder:text-[#cbd5e1] placeholder:font-semibold"
              />
            </div>
          </div>

          <div className="h-px bg-[#f1f5f9] mb-8 mt-10"></div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-5">
            <button
              onClick={() => navigate('/superadmin/dashboard')}
              className="font-bold text-[15px] text-[#64748b] hover:text-[#323940] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-[18px] !px-8 !py-3 font-bold text-[15px] transition-colors shadow-sm flex items-center gap-2"
              style={{ backgroundColor: '#dcf5eb', color: '#1a7f5a' }}
            >
              <UserPlus size={16} />
              Save Employee
            </button>
          </div>
        </div>

      </main>

      {/* Success Toast */}
      {showSuccess && (
        <div
          className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl text-white font-bold text-[15px]"
          style={{ backgroundColor: '#2c7356' }}
        >
          <CheckCircle size={20} />
          User created successfully!
        </div>
      )}
    </div>
  )
}
