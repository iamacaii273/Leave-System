import { useState, useEffect } from "react"
import { UserPlus, Briefcase, Lock, Save, ChevronDown, CheckCircle } from "lucide-react"
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

  

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    countryCode: '+66',
    phoneNumberOnly: '',
    hire_date: '',
    role_id: '',
    position_id: '',
    password: '',
    confirmPassword: ''
  })

  const [roles, setRoles] = useState([])
  const [positions, setPositions] = useState([])
  const [filteredPositions, setFilteredPositions] = useState([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }
        
        const [rolesRes, posRes] = await Promise.all([
          fetch('http://localhost:5000/api/metadata/roles', { headers }).then(r => r.json()),
          fetch('http://localhost:5000/api/metadata/positions', { headers }).then(r => r.json())
        ])
        
        const allowedRoles = (rolesRes.roles || []).filter(r => r.name === 'Employee' || r.name === 'Manager')
        setRoles(allowedRoles)
        setPositions(posRes.positions || [])
        
        if (allowedRoles.length > 0) {
          updateField('role_id', allowedRoles[0].id)
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchMetadata()
  }, [])

  useEffect(() => {
    if (form.role_id) {
      const filtered = positions.filter(p => p.role_id === form.role_id)
      setFilteredPositions(filtered)
      if (filtered.length > 0) {
        if (!filtered.find(p => p.id === form.position_id)) {
          updateField('position_id', filtered[0].id)
        }
      } else {
        updateField('position_id', '')
      }
    }
  }, [form.role_id, positions])

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const expectedPhoneLength = {
    '+1': 10,
    '+44': 10,
    '+66': 9,
    '+91': 10,
    '+61': 9
  }[form.countryCode] || 10;

  const isFormValid =
    form.fullName.trim() &&
    form.email.trim() &&
    form.phoneNumberOnly.length === expectedPhoneLength &&
    form.hire_date &&
    form.role_id &&
    form.position_id &&
    form.password.trim() &&
    form.confirmPassword.trim() &&
    form.password === form.confirmPassword

  const handleSave = async () => {
    if (!isFormValid) return
    setError('')

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: form.fullName,
          email: form.email,
          phone: `${form.countryCode}${form.phoneNumberOnly}`,
          hire_date: form.hire_date,
          password: form.password,
          role_id: form.role_id,
          position_id: form.position_id
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.message || 'Failed to save')
        return
      }

      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        navigate('/hr/employee')
      }, 2000)
    } catch (err) {
      console.error(err)
      setError('An error occurred while saving.')
    }
  }

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    const stripped = val.startsWith('0') ? val.substring(1) : val;
    if (stripped.length <= expectedPhoneLength) {
      updateField('phoneNumberOnly', stripped);
    }
  }

  const inputClass = "w-full bg-[#f4f7f9] rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all"
  const credInputClass = "w-full bg-white rounded-2xl py-4 px-6 text-[15px] text-[#323940] placeholder-[#a6b6c5] border-none outline-none focus:ring-2 focus:ring-white transition-all shadow-sm"

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header
        activePage="employee"
        onNavigate={onNavigate}
        navItems={adminNavItems}
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
          <form className="flex flex-col gap-10" onSubmit={(e) => e.preventDefault()}>

            {/* Personal Identity */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-[#dcf5eb] text-[#36956f] flex items-center justify-center">
                  <UserPlus size={16} />
                </div>
                <h3 className="font-bold text-[18px] font-fredoka text-[#323940]">Personal Identity</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Full Name <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="Enter full name" value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} className={inputClass} />
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
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Phone Number <span className="text-red-400">*</span></label>
                  <div className="flex gap-2">
                    <div className="relative w-[35%]">
                      <select value={form.countryCode} onChange={(e) => updateField('countryCode', e.target.value)} className={`${inputClass} !px-3 !pr-8 appearance-none cursor-pointer`}>
                        <option value="+1">+1 (US)</option>
                        <option value="+44">+44 (UK)</option>
                        <option value="+66">+66 (TH)</option>
                        <option value="+91">+91 (IN)</option>
                        <option value="+61">+61 (AU)</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none" />
                    </div>
                    <input type="tel" placeholder="(555) 000-0000" value={form.phoneNumberOnly} onChange={handlePhoneChange} className={`${inputClass} w-[65%]`} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Hire Date <span className="text-red-400">*</span></label>
                  <input type="date" value={form.hire_date} onChange={(e) => updateField('hire_date', e.target.value)} className={inputClass} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Role <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <select value={form.role_id} onChange={(e) => updateField('role_id', e.target.value)} className={`${inputClass} appearance-none cursor-pointer`}>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Position <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <select value={form.position_id} onChange={(e) => updateField('position_id', e.target.value)} className={`${inputClass} appearance-none cursor-pointer`}>
                      {filteredPositions.length === 0 && <option value="">No positions found</option>}
                      {filteredPositions.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#64748b] pointer-events-none" />
                  </div>
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
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Email Address (Login ID) <span className="text-red-400">*</span></label>
                  <input type="email" placeholder="name@company.com" value={form.email} onChange={(e) => updateField('email', e.target.value)} className={credInputClass} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Password <span className="text-red-400">*</span></label>
                  <input type="password" placeholder="••••••••" value={form.password} onChange={(e) => updateField('password', e.target.value)} className={`${credInputClass} tracking-widest`} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-1">Confirm Password <span className="text-red-400">*</span></label>
                  <input type="password" placeholder="••••••••" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} className={`${credInputClass} tracking-widest`} />
                  {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-red-500 text-[12px] font-bold ml-1 mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>
            </section>

            <div className="w-full h-px bg-gray-100 my-2"></div>

            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-xl text-[14px] font-bold text-center">
                {error}
              </div>
            )}
            
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
                onClick={handleSave}
                disabled={!isFormValid}
                className={`rounded-full !px-8 !py-4 flex items-center gap-2 font-bold text-[16px] transition-all shadow-sm ${isFormValid
                    ? 'text-[#2c7356] cursor-pointer hover:opacity-90'
                    : 'text-[#94a3b8] cursor-not-allowed opacity-50'
                  }`}
                style={{ backgroundColor: isFormValid ? '#dcf5eb' : '#e2e8f0' }}
              >
                <Save size={18} />
                Save Employee
              </button>
            </div>

          </form>
        </div>
      </main>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl text-white font-bold text-[15px] animate-in slide-in-from-bottom-4"
          style={{ backgroundColor: '#2c7356' }}
        >
          <CheckCircle size={20} />
          Employee saved successfully!
        </div>
      )}
    </div>
  )
}
