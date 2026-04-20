import { useState, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Camera, ChevronDown, Eye, EyeOff, CheckCircle, Ban, Shield, Bell, Settings, User } from "lucide-react"

export default function EditUser({ onNavigate }) {
  const navigate = useNavigate()
  const { userId } = useParams()
  const fileInputRef = useRef(null)

  // Mock user data (in production, fetch by userId)
  const mockUsers = {
    1: { name: "Alex Thompson", email: "alex.t@happyhub.com", username: "a.thompson", role: "HR", status: "Active", img: "3", joinDate: "Mar 08, 2021" },
    2: { name: "Jordan Smith", email: "j.smith@happyhub.com", username: "j.smith", role: "Employee", status: "Resigned", img: null, initial: "JS", initialBg: "#fef08a", joinDate: "Jun 15, 2022" },
    3: { name: "Marcus Chen", email: "m.chen@happyhub.com", username: "m.chen", role: "Manager", status: "Active", img: "11", joinDate: "Jan 10, 2020" },
    4: { name: "Sarah Jenkins", email: "sarah.jenkins@sanctuary.hr", username: "s.jenkins", role: "HR", status: "Resigned", img: "5", joinDate: "Jan 12, 2022" },
    5: { name: "Emily Watson", email: "e.watson@happyhub.com", username: "e.watson", role: "Employee", status: "Active", img: "9", joinDate: "Sep 22, 2023" },
    6: { name: "David Park", email: "d.park@happyhub.com", username: "d.park", role: "Manager", status: "Active", img: "12", joinDate: "Feb 05, 2021" },
    7: { name: "Lisa Chang", email: "l.chang@happyhub.com", username: "l.chang", role: "Employee", status: "Active", img: "1", joinDate: "Apr 18, 2022" },
    8: { name: "Robert Kim", email: "r.kim@happyhub.com", username: "r.kim", role: "HR", status: "Active", img: "8", joinDate: "Nov 30, 2020" },
  }

  const userData = mockUsers[userId] || mockUsers[4] // fallback to Sarah Jenkins like mockup

  const [form, setForm] = useState({
    fullName: userData.name,
    username: userData.username,
    email: userData.email,
    role: userData.role,
    password: '********',
    status: userData.status
  })

  const [showPassword, setShowPassword] = useState(false)
  const [profileImg, setProfileImg] = useState(userData.img ? `https://i.pravatar.cc/250?img=${userData.img}` : null)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setProfileImg(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      navigate('/superadmin/dashboard')
    }, 2000)
  }

  // Privilege descriptions based on role
  const privilegeDesc = {
    'HR': { title: 'HR Admin', desc: `As an HR Admin, ${form.fullName.split(' ')[0]} can manage employee records, approve leave requests, and view payroll summaries.` },
    'Manager': { title: 'Manager', desc: `As a Manager, ${form.fullName.split(' ')[0]} can approve team leave requests, view team reports, and manage direct reports.` },
    'Employee': { title: 'Employee', desc: `As an Employee, ${form.fullName.split(' ')[0]} can submit leave requests, view their own leave balance, and update personal information.` },
    'Super Admin': { title: 'Super Admin', desc: `As a Super Admin, ${form.fullName.split(' ')[0]} has full system access including user management, system configuration, and all administrative functions.` },
  }

  const priv = privilegeDesc[form.role] || privilegeDesc.Employee

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

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />

      <main className="max-w-5xl mx-auto px-6 py-12 w-full flex-grow">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-[48px] font-fredoka font-bold text-[#1f3747] mb-1 leading-tight">
            Edit User Profile
          </h1>
          <p className="text-[#64748b] text-[18px] font-medium">
            Update credentials and access levels for team members.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[320px_1fr] gap-8">

          {/* Left: Profile Card */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-[32px] p-8 shadow-sm flex flex-col items-center">
              {/* Avatar */}
              <div className="relative mb-4">
                {profileImg ? (
                  <img src={profileImg} alt={form.fullName} className="w-32 h-32 rounded-full object-cover border-4 border-[#eef2f9] shadow-sm" />
                ) : (
                  <div className="w-32 h-32 rounded-full flex items-center justify-center font-bold text-[36px] font-fredoka text-[#323940] border-4 border-[#eef2f9] shadow-sm" style={{ backgroundColor: userData.initialBg || '#e2e8f0' }}>
                    {userData.initial || form.fullName.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 right-1 w-9 h-9 rounded-full flex items-center justify-center shadow-md border-2 border-white"
                  style={{ backgroundColor: '#3ea8e5' }}
                >
                  <Camera size={14} className="text-white" />
                </button>
              </div>

              <h3 className="text-[20px] font-fredoka font-bold text-[#323940] mb-0.5">{form.fullName}</h3>
              <p className="text-[14px] text-[#94a3b8] font-medium mb-6">{priv.title}</p>

              {/* Status & Join Date */}
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between bg-[#f9fafb] rounded-2xl px-5 py-3.5">
                  <span className="text-[12px] font-bold text-[#94a3b8] tracking-widest uppercase">Status</span>
                  <span
                    className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider"
                    style={{ backgroundColor: form.status === 'Active' ? '#d1f2e8' : '#fde2e4', color: form.status === 'Active' ? '#1a7f5a' : '#b5283d' }}
                  >
                    {form.status}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-[#f9fafb] rounded-2xl px-5 py-3.5">
                  <span className="text-[12px] font-bold text-[#94a3b8] tracking-widest uppercase">Join Date</span>
                  <span className="text-[14px] font-bold text-[#4c6367]">{userData.joinDate}</span>
                </div>
              </div>
            </div>

            {/* Access Privileges */}
            <div className="rounded-[32px] p-6 shadow-sm" style={{ backgroundColor: '#f5ece2' }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={18} className="text-[#b5651d]" />
                <h4 className="font-bold text-[16px] text-[#1f3747] font-fredoka">Access Privileges</h4>
              </div>
              <p className="text-[13px] text-[#5c6e7e] leading-relaxed font-medium">
                {priv.desc}
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm">
            {/* Identity Details */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#1f3747' }}></div>
              <h3 className="text-[20px] font-fredoka font-bold text-[#1f3747]">Identity Details</h3>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Full Name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
                  className="bg-[#f4f7f9] rounded-xl py-3.5 px-5 text-[15px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8] font-bold text-[14px]">@</span>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
                    className="bg-[#f4f7f9] rounded-xl py-3.5 pl-9 pr-5 text-[15px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  className="bg-[#f4f7f9] rounded-xl py-3.5 px-5 text-[15px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all"
                />
              </div>
            </div>

            {/* Account Control */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#3ea8e5' }}></div>
              <h3 className="text-[20px] font-fredoka font-bold text-[#1f3747]">Account Control</h3>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">System Role</label>
                <div className="relative">
                  <select
                    value={form.role}
                    onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
                    className="bg-[#f4f7f9] rounded-xl py-3.5 px-5 text-[15px] font-bold text-[#323940] outline-none appearance-none cursor-pointer w-full focus:ring-2 focus:ring-[#567278]/20"
                  >
                    <option>Employee</option>
                    <option>HR</option>
                    <option>Manager</option>
                    <option>Super Admin</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                    className="bg-[#f4f7f9] rounded-xl py-3.5 px-5 pr-12 text-[15px] font-bold text-[#323940] outline-none w-full focus:ring-2 focus:ring-[#567278]/20 tracking-widest"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="mb-8">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase mb-3 block">Account Status</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setForm(p => ({ ...p, status: 'Active' }))}
                  className={`flex flex-col items-center gap-2 !py-3 rounded-2xl font-bold text-[15px] transition-all border-2 ${form.status === 'Active' ? 'border-[#2c7356]' : 'border-transparent'}`}
                  style={{ backgroundColor: form.status === 'Active' ? '#dcf5eb' : '#f4f7f9', color: form.status === 'Active' ? '#2c7356' : '#94a3b8' }}
                >
                  <CheckCircle size={22} />
                  Active
                </button>
                <button
                  onClick={() => setForm(p => ({ ...p, status: 'Resigned' }))}
                  className={`flex flex-col items-center gap-2 !py-3 rounded-2xl font-bold text-[15px] transition-all border-2 ${form.status === 'Resigned' ? 'border-[#b5283d]' : 'border-transparent'}`}
                  style={{ backgroundColor: form.status === 'Resigned' ? '#fde2e4' : '#f4f7f9', color: form.status === 'Resigned' ? '#b5283d' : '#94a3b8' }}
                >
                  <Ban size={22} />
                  Resigned
                </button>
              </div>
            </div>

            <div className="h-px bg-[#f1f5f9] mb-6"></div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-6">
              <button
                onClick={() => navigate('/superadmin/dashboard')}
                className="font-bold text-[15px] text-[#64748b] hover:text-[#323940] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-full !px-8 !py-3.5 font-bold text-[15px] transition-colors shadow-sm"
                style={{ backgroundColor: '#1f3747', color: '#ffffff' }}
              >
                Save Changes
              </button>
            </div>
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
          User profile updated successfully!
        </div>
      )}
    </div>
  )
}
