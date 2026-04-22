import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, CheckCircle, Bell, Settings, User, Briefcase, Lock, UserPlus } from "lucide-react"
import api from "../../services/api"
import Header from "../../components/Header"

const ROLES = [
  { id: 'rl000001-0000-0000-0000-000000000001', name: 'Employee' },
  { id: 'rl000001-0000-0000-0000-000000000002', name: 'Manager' },
  { id: 'rl000001-0000-0000-0000-000000000003', name: 'HR' }
];

const POSITIONS = [
  { id: 'ps000001-0000-0000-0000-000000000001', name: 'Developer' },
  { id: 'ps000001-0000-0000-0000-000000000002', name: 'HR Officer' },
  { id: 'ps000001-0000-0000-0000-000000000010', name: 'Team Manager' }
];

const PHONE_PREFIXES = [
  { code: '+66', label: '+66 (TH)', max: 10, placeholder: "0812345678" },
  { code: '+1', label: '+1 (US)', max: 10, placeholder: "5550000000" },
  { code: '+44', label: '+44 (UK)', max: 11, placeholder: "7000000000" },
  { code: '+81', label: '+81 (JP)', max: 11, placeholder: "9000000000" },
  { code: '+65', label: '+65 (SG)', max: 8, placeholder: "80000000" }
];

export default function AddUser({ onNavigate }) {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '',
    employeeId: '',
    email: '',
    phonePrefix: '+66',
    phone: '',
    role: 'rl000001-0000-0000-0000-000000000001',
    position: 'ps000001-0000-0000-0000-000000000001',
    department: '',
    password: '',
    confirmPassword: '',
    hireDate: '',
    managedDepartments: []
  })

  const [departments, setDepartments] = useState([])

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const { data } = await api.get('/departments')
        const depts = data.departments || []
        setDepartments(depts)
        if (depts.length > 0) {
          setForm(p => ({ ...p, department: depts[0].id }))
        }
      } catch (err) {
        console.error("Failed to fetch departments:", err)
      }
    }
    fetchDepts()
  }, [])

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [showSuccess, setShowSuccess] = useState(false)

  const selectedPhoneConfig = PHONE_PREFIXES.find(p => p.code === form.phonePrefix) || PHONE_PREFIXES[0]

  const handlePhoneChange = (e) => {
    // Only allow digits
    const digitsOnly = e.target.value.replace(/\D/g, '');
    
    if (digitsOnly.length <= selectedPhoneConfig.max) {
      setForm(p => ({ ...p, phone: digitsOnly }));
    }
  }

  const handleSave = async () => {
    setErrorMsg('')
    if (form.password !== form.confirmPassword) {
      setErrorMsg("Passwords do not match!")
      return
    }

    setLoading(true)
    try {
      const payload = {
        username: form.fullName.trim(), // Use Full Name for username as requested
        full_name: form.fullName.trim(),
        email: form.email,
        password: form.password,
        phone: form.phone ? `${form.phonePrefix} ${form.phone}` : null,
        role_id: form.role,
        position_id: form.position,
        department_id: form.department,
        managed_department_ids: form.managedDepartments,
        hire_date: form.hireDate || new Date().toISOString().split('T')[0]
      }

      await api.post('/users', payload)
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        navigate('/superadmin/dashboard')
      }, 2000)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.response?.data?.message || 'Failed to create user. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      {/* Header */}
      <Header activePage="dashboard" onNavigate={onNavigate} />

      <main className="max-w-[800px] mx-auto px-6 py-12 w-full flex-grow flex flex-col items-center">
        
        <div className="bg-white rounded-[32px] p-10 w-full shadow-sm">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-[36px] font-fredoka font-bold text-[#1f3747] mb-1">
              Add New User
            </h1>
            <p className="text-[#64748b] text-[15px] font-medium">
              Create a new profile and assign permissions within the Happy Hub ecosystem.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-[#fee2e2] text-[#991b1b] font-bold text-[14px]">
              {errorMsg}
            </div>
          )}

          {/* Personal Identity */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-[#dcf5eb] flex items-center justify-center">
              <User size={16} className="text-[#2c7356]" />
            </div>
            <h3 className="text-[18px] font-fredoka font-bold text-[#1f3747]">Personal Identity</h3>
          </div>

          <div className="grid grid-cols-1 mb-10">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Enter full name"
                value={form.fullName}
                onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
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
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Phone Number <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <div className="relative w-[110px]">
                  <select
                    value={form.phonePrefix}
                    onChange={(e) => setForm(p => ({ ...p, phonePrefix: e.target.value, phone: '' }))} // Reset phone on prefix change
                    className="bg-[#f4f7f9] rounded-full py-3 pl-4 pr-8 text-[14px] font-bold text-[#323940] outline-none appearance-none cursor-pointer w-full focus:ring-2 focus:ring-[#567278]/20"
                  >
                    {PHONE_PREFIXES.map(pf => (
                      <option key={pf.code} value={pf.code}>{pf.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                </div>
                <input
                  type="text"
                  placeholder={selectedPhoneConfig.placeholder}
                  value={form.phone}
                  onChange={handlePhoneChange}
                  className="bg-[#f4f7f9] flex-1 rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all placeholder:text-[#cbd5e1] placeholder:font-semibold"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Hire Date <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => setForm(p => ({ ...p, hireDate: e.target.value }))}
                  className="bg-[#f4f7f9] rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full placeholder:text-[#cbd5e1] placeholder:font-semibold appearance-none"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Role <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={form.role}
                  onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
                  className="bg-[#f4f7f9] rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none appearance-none cursor-pointer w-full focus:ring-2 focus:ring-[#567278]/20"
                >
                  {ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Position <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={form.position}
                  onChange={(e) => setForm(p => ({ ...p, position: e.target.value }))}
                  className="bg-[#f4f7f9] rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none appearance-none cursor-pointer w-full focus:ring-2 focus:ring-[#567278]/20"
                >
                  {POSITIONS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Department <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={form.department}
                  onChange={(e) => setForm(p => ({ ...p, department: e.target.value }))}
                  className="bg-[#f4f7f9] rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none appearance-none cursor-pointer w-full focus:ring-2 focus:ring-[#567278]/20"
                >
                  {departments.length === 0 && <option value="">No departments available</option>}
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
              </div>
            </div>

            {/* Managed Departments for Manager/HR */}
            {(form.role === 'rl000001-0000-0000-0000-000000000002' || form.role === 'rl000001-0000-0000-0000-000000000003') && (
              <div className="flex flex-col gap-2 md:col-span-2 bg-[#f8fafb] p-6 rounded-3xl border border-[#edf2f7]">
                <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Department Access <span className="text-[9px] lowercase italic font-normal">(Managers/HR can manage multiple)</span></label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {departments.map(d => (
                    <label key={d.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#edf2f7] cursor-pointer transition-colors border border-transparent hover:border-[#cbd5e1]">
                      <input
                        type="checkbox"
                        checked={form.managedDepartments.includes(d.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm(p => ({
                            ...p,
                            managedDepartments: checked
                              ? [...p.managedDepartments, d.id]
                              : p.managedDepartments.filter(id => id !== d.id)
                          }));
                        }}
                        className="w-4 h-4 rounded border-[#cbd5e1] text-[#3ea8e5] focus:ring-[#3ea8e5]"
                      />
                      <span className="text-[14px] font-bold text-[#323940]">{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
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
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Email Address (Login ID) <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  className="bg-white rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full shadow-sm placeholder:text-[#cbd5e1] placeholder:font-semibold"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Password <span className="text-red-500">*</span></label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                className="bg-white rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none w-full shadow-sm focus:ring-2 focus:ring-[#567278]/20 tracking-widest placeholder:text-[#cbd5e1] placeholder:font-semibold"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Confirm Password <span className="text-red-500">*</span></label>
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
              disabled={loading}
              className="rounded-[18px] !px-8 !py-3 font-bold text-[15px] transition-colors shadow-sm flex items-center gap-2"
              style={{ backgroundColor: loading ? '#edf2f7' : '#dcf5eb', color: loading ? '#a0aec0' : '#1a7f5a' }}
            >
              {loading ? (
                <span>Loading...</span>
              ) : (
                <>
                  <UserPlus size={16} />
                  Save Employee
                </>
              )}
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
