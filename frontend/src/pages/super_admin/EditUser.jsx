import { useState, useRef, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Camera, ChevronDown, CheckCircle, Ban, Shield, Bell, Settings, User, Briefcase, Lock, Loader2, Building2 } from "lucide-react"
import api from "../../services/api"
import Header from "../../components/Header"
import Avatar from "../../components/Avatar"



const PHONE_PREFIXES = [
  { code: '+66', label: '+66 (TH)', max: 10, placeholder: "0812345678" },
  { code: '+1', label: '+1 (US)', max: 10, placeholder: "5550000000" },
  { code: '+44', label: '+44 (UK)', max: 11, placeholder: "7000000000" },
  { code: '+81', label: '+81 (JP)', max: 11, placeholder: "9000000000" },
  { code: '+65', label: '+65 (SG)', max: 8, placeholder: "80000000" }
];

export default function EditUser({ onNavigate }) {
  const navigate = useNavigate()
  const { userId } = useParams()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phonePrefix: '+66',
    phone: '',
    role: '',
    position: '',
    password: '',
    confirmPassword: '',
    status: 'Active',
    hireDate: '',
    department: '',
    managedDepartments: []
  })

  const [userData, setUserData] = useState(null)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [profileImg, setProfileImg] = useState(null)
  const [departments, setDepartments] = useState([])
  const [roles, setRoles] = useState([])
  const [positions, setPositions] = useState([])

  const isMultiSelect = form.role === 'rl000001-0000-0000-0000-000000000002' || form.role === 'rl000001-0000-0000-0000-000000000003';

  const handleDeptToggle = (deptId) => {
    if (isMultiSelect) {
      const isSelected = form.managedDepartments.includes(deptId);
      const newList = isSelected
        ? form.managedDepartments.filter(id => id !== deptId)
        : [...form.managedDepartments, deptId];

      setForm(p => ({
        ...p,
        managedDepartments: newList,
        department: newList.length > 0 ? newList[0] : ''
      }));
    } else {
      setForm(p => ({
        ...p,
        department: deptId,
        managedDepartments: [deptId]
      }));
    }
  }

  // Handle role changes to sync department selection
  useEffect(() => {
    if (!isMultiSelect && form.managedDepartments.length > 1) {
      setForm(prev => ({
        ...prev,
        managedDepartments: prev.department ? [prev.department] : []
      }));
    } else if (isMultiSelect && form.department && !form.managedDepartments.includes(form.department)) {
      setForm(prev => ({
        ...prev,
        managedDepartments: [prev.department, ...prev.managedDepartments]
      }));
    }
  }, [form.role, isMultiSelect]);

  // Filter positions based on selected role
  const filteredPositions = positions.filter(p => p.role_id === form.role)

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [deptRes, roleRes, posRes] = await Promise.all([
          api.get('/departments'),
          api.get('/metadata/roles'),
          api.get('/metadata/positions')
        ])
        setDepartments(deptRes.data.departments || [])
        setRoles(roleRes.data.roles || [])
        setPositions(posRes.data.positions || [])
      } catch (err) {
        console.error("Failed to fetch metadata:", err)
      }
    }
    fetchMetadata()
  }, [])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await api.get(`/users/${userId}`)
        const u = data.user
        setUserData({
          ...u,
          initial: u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          joinDate: u.hire_date ? new Date(u.hire_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : 'Unknown'
        })

        let pref = '+66'
        let num = u.phone || ''
        const matchedPrefix = PHONE_PREFIXES.find(p => num.startsWith(p.code + ' '))
        if (matchedPrefix) {
          pref = matchedPrefix.code
          num = num.replace(matchedPrefix.code + ' ', '')
        }

        setForm({
          fullName: u.full_name || '',
          email: u.email || '',
          phonePrefix: pref,
          phone: num,
          role: u.role_id || '',
          position: u.position_id || '',
          password: '',
          confirmPassword: '',
          status: u.is_active === 1 ? 'Active' : 'Resigned',
          hireDate: u.hire_date ? u.hire_date.split('T')[0] : '',
          department: u.department_id || '',
          managedDepartments: u.managed_department_ids || []
        })
      } catch (err) {
        console.error(err)
        setErrorMsg('Failed to load user data.')
      } finally {
        setLoadingInitial(false)
      }
    }
    if (userId) fetchUser()
  }, [userId])

  const selectedPhoneConfig = PHONE_PREFIXES.find(p => p.code === form.phonePrefix) || PHONE_PREFIXES[0]

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '')
    if (digitsOnly.length <= selectedPhoneConfig.max) {
      setForm(p => ({ ...p, phone: digitsOnly }))
    }
  }

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setProfileImg(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setErrorMsg('')
    if (form.password && form.password !== form.confirmPassword) {
      setErrorMsg("Passwords do not match!")
      return
    }

    setSaving(true)
    try {
      const payload = {
        username: form.fullName.trim(),
        full_name: form.fullName.trim(),
        email: form.email,
        phone: form.phone ? `${form.phonePrefix} ${form.phone}` : null,
        role_id: form.role,
        position_id: form.position,
        department_id: form.department,
        managed_department_ids: form.managedDepartments,
        hire_date: form.hireDate,
        is_active: form.status === 'Active' ? 1 : 0
      }
      if (form.password) payload.password = form.password

      await api.put(`/users/${userId}`, payload)
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        navigate('/superadmin/dashboard')
      }, 2000)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.response?.data?.message || 'Failed to update user profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-[#eef2f9] flex items-center justify-center font-nunito">
        <Loader2 className="w-10 h-10 animate-spin text-[#3ea8e5]" />
      </div>
    )
  }

  const fullName = form.fullName.trim()

  const shortName = form.fullName ? form.fullName.split(' ')[0] : 'this user';

  const currentRole = roles.find(r => r.id === form.role) || roles.find(r => r.name === 'Employee') || { name: 'Employee', description: `As an Employee, {name} can submit leave requests, view their personal leave balances, and track their request history.` };

  const priv = {
    title: currentRole.name,
    desc: (currentRole.description || "").replace("{name}", shortName)
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      {/* Header */}
      <Header activePage="dashboard" onNavigate={onNavigate} />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />

      <main className="max-w-[1000px] mx-auto px-6 py-12 w-full flex-grow">
        {/* Title */}
        <div className="mb-6 text-center lg:text-left">
          <h1 className="text-[42px] font-fredoka font-bold text-[#1f3747] mb-2 leading-tight">
            Edit User Profile
          </h1>
          <p className="text-[#64748b] text-[16px] font-medium">
            Update credentials and access levels for team members.
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[#fee2e2] text-[#991b1b] font-bold text-[14px] max-w-full lg:max-w-none">
            {errorMsg}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">

          {/* Left: Profile Card */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-[24px] p-8 shadow-sm flex flex-col items-center">
              {/* Avatar */}
              <div className="relative mb-4">
                <Avatar
                  src={profileImg || userData.profile_photo}
                  name={fullName}
                  size={100}
                  className="rounded-3xl border-4 border-[#eef2f9] shadow-sm"
                  style={{ backgroundColor: userData.initialBg || '#e2e8f0' }}
                />
              </div>

              <h3 className="text-[18px] font-fredoka font-bold text-[#1f3747] mb-1 text-center">{fullName}</h3>
              <p className="text-[13px] text-[#64748b] font-bold mb-6 text-center">{priv.title}</p>

              {/* Status & Join Date */}
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Status</span>
                  <span
                    className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider"
                    style={{ backgroundColor: form.status === 'Active' ? '#dcf5eb' : '#fde2e4', color: form.status === 'Active' ? '#2c7356' : '#b5283d' }}
                  >
                    {form.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Join Date</span>
                  <span className="text-[13px] font-bold text-[#1f3747]">{userData.joinDate}</span>
                </div>
              </div>
            </div>

            {/* Access Privileges */}
            <div className="rounded-[24px] p-6 shadow-sm" style={{ backgroundColor: '#f2e8de' }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield size={18} className="text-[#8b5a2b]" />
                <h4 className="font-bold text-[14px] text-[#8b5a2b] font-fredoka tracking-wide">Access Privileges</h4>
              </div>
              <p className="text-[12px] text-[#8b5a2b]/80 leading-relaxed font-medium">
                {priv.desc}
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="bg-white rounded-[32px] p-10 shadow-sm">

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
                      onChange={(e) => setForm(p => ({ ...p, phonePrefix: e.target.value, phone: '' }))}
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
                    {roles.filter(r => r.name !== 'Super Admin').map(r => (
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
                    {filteredPositions.length === 0 && <option value="">No positions for this role</option>}
                    {filteredPositions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                </div>
              </div>
              <div className="flex flex-col gap-4 md:col-span-2 bg-[#f8fafc] p-8 rounded-[32px] border border-[#edf2f7] mb-10">
                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase mb-1 block">
                    Department Assignment <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-[#64748b] font-medium mb-4">
                    {isMultiSelect ? "Select one or more departments for Manager/HR access." : "Assign a primary department to this user."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {departments.length === 0 && (
                    <p className="text-[13px] text-[#94a3b8] italic">No departments available</p>
                  )}
                  {departments.map(d => {
                    const isChecked = isMultiSelect
                      ? form.managedDepartments.includes(d.id)
                      : form.department === d.id

                    return (
                      <button
                        key={d.id}
                        type="button"
                        className={`!px-6 !py-3 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 border-2 ${isChecked
                          ? '!bg-[#4c6367] !border-[#4c6367] !text-white shadow-md'
                          : '!bg-white !border-[#edf2f7] !text-[#64748b] hover:!border-[#4c6367] hover:!text-[#4c6367]'}`}
                        onClick={() => handleDeptToggle(d.id)}
                      >
                        <Building2 size={15} />
                        {d.name}
                      </button>
                    )
                  })}
                </div>
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
                <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Email Address (Login ID) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                    className="bg-white rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all w-full shadow-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  className="bg-white rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none w-full shadow-sm focus:ring-2 focus:ring-[#567278]/20 tracking-widest placeholder:text-[#cbd5e1]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Confirm Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  className="bg-white rounded-full py-3 px-5 text-[14px] font-bold text-[#323940] outline-none w-full shadow-sm focus:ring-2 focus:ring-[#567278]/20 tracking-widest placeholder:text-[#cbd5e1]"
                />
              </div>
            </div>

            {/* Account Status */}
            <div className="mb-8">
              <label className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase mb-3 block">Account Status</label>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <button
                  onClick={() => setForm(p => ({ ...p, status: 'Active' }))}
                  className={`flex flex-col items-center gap-1.5 !py-3 rounded-2xl font-bold text-[14px] transition-all border-2 shadow-sm ${form.status === 'Active' ? 'border-[#2c7356]' : 'border-transparent'}`}
                  style={{ backgroundColor: form.status === 'Active' ? '#dcf5eb' : '#f4f7f9', color: form.status === 'Active' ? '#2c7356' : '#94a3b8' }}
                >
                  <CheckCircle size={20} />
                  Active
                </button>
                <button
                  onClick={() => setForm(p => ({ ...p, status: 'Resigned' }))}
                  className={`flex flex-col items-center gap-1.5 !py-3 rounded-2xl font-bold text-[14px] transition-all border-2 shadow-sm ${form.status === 'Resigned' ? 'border-[#b5283d]' : 'border-transparent'}`}
                  style={{ backgroundColor: form.status === 'Resigned' ? '#fde2e4' : '#f4f7f9', color: form.status === 'Resigned' ? '#b5283d' : '#94a3b8' }}
                >
                  <Ban size={20} />
                  Resigned
                </button>
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
                disabled={saving}
                className="rounded-[18px] !px-8 !py-3 font-bold text-[15px] transition-colors shadow-sm flex items-center gap-2"
                style={{ backgroundColor: saving ? '#edf2f7' : '#dcf5eb', color: saving ? '#a0aec0' : '#1a7f5a' }}
              >
                {saving ? (
                  <span>Loading...</span>
                ) : (
                  <>
                    <Shield size={16} />
                    Save Changes
                  </>
                )}
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
