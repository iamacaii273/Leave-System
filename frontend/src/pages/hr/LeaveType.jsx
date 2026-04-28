import { useState, useEffect } from 'react'
import {
  Umbrella,
  Users,
  Thermometer,
  Home,
  Plane,
  Smile,
  HeartHandshake,
  PartyPopper,
  MoreHorizontal,
  Edit2,
  Plus,
  Calendar,
  Building2,
  PowerOff,
  Power
} from 'lucide-react'
import Header from '../../components/Header'
import api from '../../services/api'
import { useDepartment } from '../../contexts/DepartmentContext'

export default function LeaveType({ onNavigate }) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)

  const [leaveTypes, setLeaveTypes] = useState([])
  const [departments, setDepartments] = useState([])

  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null
  const isHR = user?.role === 'HR'
  const isSuperAdmin = user?.role === 'Super Admin'

  const { selectedDepartment } = useDepartment()

  // Map abstract colors to Tailwind styles
  const colorStyles = {
    blue: {
      bg: 'bg-[#a3dfff]',
      iconBg: 'bg-[#d6efff]',
      iconColor: 'text-[#006dae]',
      btnBg: 'bg-[#d6efff]',
      title: 'text-[#006dae]',
      desc: 'text-[#1e3450]',
      footer: 'border-[#7bbbee]',
      footerText: 'text-[#005a91]'
    },
    pink: {
      bg: 'bg-[#ffafe3]',
      iconBg: 'bg-[#ffd6ee]',
      iconColor: 'text-[#8c2d68]',
      btnBg: 'bg-[#ffd6ee]',
      title: 'text-[#8c2d68]',
      desc: 'text-[#5a1c43]',
      footer: 'border-[#df8ebf]',
      footerText: 'text-[#7a2559]'
    },
    orange: {
      bg: 'bg-[#fac47f]',
      iconBg: 'bg-[#ffe3c2]',
      iconColor: 'text-[#b86814]',
      btnBg: 'bg-[#ffe3c2]',
      title: 'text-[#3E4249]',
      desc: 'text-[#8d5415]',
      footer: 'border-[#e0a863]',
      footerText: 'text-[#9e5910]'
    },
    green: {
      bg: 'bg-[#B1EFD8]',
      iconBg: 'bg-[#d0f5e5]',
      iconColor: 'text-[#0a5c3e]',
      btnBg: 'bg-[#d0f5e5]',
      title: 'text-[#0e7c53]',
      desc: 'text-[#063322]',
      footer: 'border-[#8edcbf]',
      footerText: 'text-[#0a5c3e]'
    }
  }

  const [form, setForm] = useState({
    name: '',
    description: '',
    days: '',
    service: '',
    icon: 'umbrella',
    color: 'blue',
    reqManager: true,
    carryover: false,
    reqAttachment: false,
    department_ids: []
  })

  useEffect(() => {
    fetchLeaveTypes()
    fetchContextData()
  }, [selectedDepartment])

  const fetchContextData = async () => {
    try {
      if (isHR) {
        const res = await api.get('/departments/hr-assigned')
        setDepartments(res.data.departments || [])
      } else if (isSuperAdmin) {
        const res = await api.get('/departments')
        setDepartments(res.data.departments || [])
      }
    } catch (err) {
      console.error("Failed to fetch departments:", err)
    }
  }

  const fetchLeaveTypes = async () => {
    try {
      let url = '/leave-types/all'
      if (selectedDepartment) {
        url += `?department_id=${selectedDepartment}`
      }
      const res = await api.get(url)
      const types = res.data.leaveTypes || []
      const formatted = types.map(t => ({
        id: t.id,
        name: t.name,
        quota: t.default_days_per_year,
        description: t.description || 'No description provided.',
        colorType: t.color_type || 'blue',
        iconName: t.icon_name || 'umbrella',
        reqAttachment: !!t.requires_attachment,
        reqManager: t.requires_manager_approval !== 0,
        carryover: !!t.carryover,
        service: t.min_service_months || 0,
        department_ids: t.department_ids || [],
        isActive: t.is_active !== 0
      }))
      setLeaveTypes(formatted)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const Toggle = ({ active, onClick }) => (
    <div
      onClick={onClick}
      className={`w-12 h-6 rounded-full cursor-pointer flex items-center transition-colors px-1 ${active ? 'bg-[#265345]' : 'bg-[#d1d5db]'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
    </div>
  )

  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'umbrella': return Umbrella
      case 'thermometer': return Thermometer
      case 'user': return Users
      case 'plane': return Plane
      case 'smile': return Smile
      case 'heart': return HeartHandshake
      case 'party': return PartyPopper
      case 'more': return MoreHorizontal
      default: return Umbrella
    }
  }

  const handleToggleActive = async (leave) => {
    try {
      const res = await api.patch(`/leave-types/${leave.id}/toggle-active`)
      const updated = res.data.leaveType
      setLeaveTypes(leaveTypes.map(lt =>
        lt.id === leave.id
          ? { ...lt, isActive: updated.is_active !== 0 }
          : lt
      ))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status')
    }
  }

  const handleEdit = (leave) => {
    setForm({
      name: leave.name,
      description: leave.description,
      days: leave.quota,
      service: leave.service,
      icon: leave.iconName,
      color: leave.colorType,
      reqManager: leave.reqManager !== false,
      carryover: !!leave.carryover,
      reqAttachment: leave.reqAttachment,
      department_ids: (leave.department_ids && leave.department_ids.length > 0)
        ? leave.department_ids
        : (isHR ? departments.map(d => d.id) : [])
    })
    setEditingId(leave.id)
    setIsCreating(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert("Leave Name is required")
    if (isHR && form.department_ids.length === 0) return alert("Please select at least one department scope")

    const payload = {
      name: form.name,
      default_days_per_year: parseInt(form.days) || 0,
      description: form.description,
      color_type: form.color,
      icon_name: form.icon,
      min_service_months: parseInt(form.service) || 0,
      requires_attachment: form.reqAttachment,
      requires_manager_approval: form.reqManager,
      carryover: form.carryover,
      department_ids: form.department_ids
    }

    try {
      if (editingId) {
        const res = await api.put(`/leave-types/${editingId}`, payload)
        const updated = res.data.leaveType
        setLeaveTypes(leaveTypes.map(leave =>
          leave.id === editingId ? {
            id: updated.id,
            name: updated.name,
            quota: updated.default_days_per_year,
            description: updated.description || 'No description provided.',
            colorType: updated.color_type || 'blue',
            iconName: updated.icon_name || 'umbrella',
            reqAttachment: !!updated.requires_attachment,
            reqManager: updated.requires_manager_approval !== 0,
            carryover: !!updated.carryover,
            service: updated.min_service_months || 0,
            department_ids: updated.department_ids || form.department_ids,
            isActive: updated.is_active !== 0
          } : leave
        ))
      } else {
        const res = await api.post('/leave-types', payload)
        const created = res.data.leaveType
        setLeaveTypes([...leaveTypes, {
          id: created.id,
          name: created.name,
          quota: created.default_days_per_year,
          description: created.description || 'No description provided.',
          colorType: created.color_type || 'blue',
          iconName: created.icon_name || 'umbrella',
          reqAttachment: !!created.requires_attachment,
          reqManager: created.requires_manager_approval !== 0,
          carryover: !!created.carryover,
          service: created.min_service_months || 0,
          department_ids: created.department_ids || form.department_ids,
          isActive: created.is_active !== 0
        }])
      }

      setIsCreating(false)
      setEditingId(null)
      setForm({
        name: '', description: '', days: '', service: '', icon: 'umbrella', color: 'blue', reqManager: true, carryover: false, reqAttachment: false, department_ids: []
      })
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    }
  }

  const getDeptNames = (ids) => {
    if (!ids || ids.length === 0) return "No Department"
    const names = ids.map(id => departments.find(d => d.id === id)?.name).filter(Boolean)
    return names.length > 0 ? names.join(", ") : "Multi-Dept"
  }

  const activeTypes = leaveTypes.filter(lt => lt.isActive)
  const inactiveTypes = leaveTypes.filter(lt => !lt.isActive)

  const renderCard = (leave) => {
    const colors = colorStyles[leave.colorType] || colorStyles.blue
    const Icon = getIconComponent(leave.iconName)
    const isInactive = !leave.isActive

    return (
      <div
        key={leave.id}
        className={`rounded-[32px] p-6 flex flex-col shadow-sm min-h-[380px] transition-all ${isInactive ? 'bg-[#e8ecf0] opacity-70' : `${colors.bg}`}`}
      >
        <div className="flex justify-between items-start mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isInactive ? 'bg-white/60' : colors.iconBg}`}>
            <Icon size={24} className={isInactive ? 'text-[#94a3b8]' : colors.iconColor} />
          </div>
          <div className="flex gap-2">
            {!isInactive && (
              <button
                onClick={() => handleEdit(leave)}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.btnBg} hover:opacity-80 transition-opacity`}
                title="Edit"
              >
                <Edit2 size={14} className={colors.iconColor} />
              </button>
            )}
            <button
              onClick={() => handleToggleActive(leave)}
              className={`w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity ${isInactive ? 'bg-[#d0f5e5]' : colors.btnBg}`}
              title={isInactive ? 'Reactivate' : 'Deactivate'}
            >
              {isInactive
                ? <Power size={14} className="text-[#0a5c3e]" />
                : <PowerOff size={14} className={colors.iconColor} />
              }
            </button>
          </div>
        </div>

        <h3 className={`text-[24px] font-fredoka font-bold mb-1 ${isInactive ? 'text-[#94a3b8]' : colors.title}`}>
          {leave.name}
        </h3>

        <div className="flex items-center gap-1 mb-4">
          <Building2 size={12} className={isInactive ? 'text-[#94a3b8]' : colors.iconColor} />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${isInactive ? 'text-[#94a3b8]' : colors.iconColor}`}>
            {getDeptNames(leave.department_ids)}
          </span>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold w-fit mb-4 ${isInactive ? 'bg-white/60 text-[#94a3b8]' : `${colors.btnBg} ${colors.iconColor}`}`}>
          <Calendar size={14} /> {leave.quota} Days Annual Quota
        </div>

        <p className={`text-[13px] leading-relaxed mb-8 flex-grow font-medium ${isInactive ? 'text-[#94a3b8]' : colors.desc}`}>
          {leave.description}
        </p>

        <div className={`pt-4 border-t ${isInactive ? 'border-[#cbd5e1]' : colors.footer} flex justify-between items-center`}>
          <span className={`text-[12px] font-bold tracking-widest uppercase ${isInactive ? 'text-[#94a3b8]' : colors.footerText}`}>
            {isInactive ? 'Inactive Policy' : 'Active Policy'}
          </span>
          {isInactive && (
            <span className="text-[11px] font-bold text-[#64748b] bg-white/60 px-2.5 py-1 rounded-full">
              Inactive
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header
        activePage="leave-type"
        onNavigate={onNavigate}
      />

      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">
        {!isCreating ? (
          <>
            <div className="flex justify-between items-start mb-10">
              <div className="max-w-2xl">
                <h1 className="text-[44px] font-fredoka font-bold text-[#1f3747] mb-2 leading-tight">
                  Manage Leave Types
                </h1>
                <p className="text-[#59646b] text-[16px] font-medium tracking-wide">
                  Define and configure your organization's time-off rules. Adjust quotas, accrual methods, and eligibility requirements for each category.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreating(true)
                  if (isHR && departments.length === 1) {
                    setForm(prev => ({ ...prev, department_ids: [departments[0].id] }))
                  }
                }}
                className="text-white !px-8 !py-4 rounded-full font-bold flex items-center gap-2 transition-colors mt-24"
                style={{ fontSize: '18px', backgroundColor: '#4c6367' }}
              >
                <Plus size={20} /> Create New Leave Type
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20 text-[#64748b] font-bold">Loading leave types...</div>
            ) : (
              <>
                {(() => {
                  const deptsToRender = selectedDepartment
                    ? departments.filter(d => String(d.id) === String(selectedDepartment))
                    : departments;

                  if (deptsToRender.length === 0) {
                    return <div className="text-center py-20 text-[#64748b] font-medium">No departments available.</div>;
                  }

                  return deptsToRender.map(dept => {
                    const deptTypes = leaveTypes.filter(lt => lt.department_ids.includes(dept.id));
                    const activeDeptTypes = deptTypes.filter(t => t.isActive);
                    const inactiveDeptTypes = deptTypes.filter(t => !t.isActive);

                    return (
                      <div key={dept.id} className="mb-14">
                        <h3 className="text-[24px] font-fredoka font-bold text-[#1f3747] mb-6 border-b-2 border-[#e9eff5] pb-2">
                          {dept.name}
                        </h3>

                        {/* ── Active Section ── */}
                        <div className="mb-10">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#265345]" />
                            <h2 className="text-[20px] font-fredoka font-bold text-[#1f3747]">Active</h2>
                            <span className="text-[13px] font-bold text-[#64748b] bg-white px-3 py-0.5 rounded-full">
                              {activeDeptTypes.length}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {activeDeptTypes.map(leave => renderCard(leave))}

                            {/* Add New Card */}
                            <div
                              onClick={() => {
                                setIsCreating(true)
                                setForm(prev => ({ ...prev, department_ids: [dept.id] }))
                              }}
                              className="rounded-[32px] border-2 border-dashed border-[#b0b8c1] flex flex-col items-center justify-center min-h-[380px] cursor-pointer hover:bg-white transition-all group"
                            >
                              <div className="w-14 h-14 bg-[#e2e8f0] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Plus size={24} className="text-[#64748b]" />
                              </div>
                              <h3 className="text-[18px] font-fredoka font-bold text-[#1f3747] mb-1">New Leave Type</h3>
                              <p className="text-[14px] text-[#64748b] font-medium text-center px-6">Configure a custom category for your team.</p>
                            </div>
                          </div>
                        </div>

                        {/* ── Inactive Section ── */}
                        {inactiveDeptTypes.length > 0 && (
                          <div>
                            <div className="flex items-center gap-3 mb-6 mt-4">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]" />
                              <h2 className="text-[20px] font-fredoka font-bold text-[#94a3b8]">Inactive</h2>
                              <span className="text-[13px] font-bold text-[#94a3b8] bg-white px-3 py-0.5 rounded-full">
                                {inactiveDeptTypes.length}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              {inactiveDeptTypes.map(leave => renderCard(leave))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </>
            )}
          </>
        ) : (
          <div className="bg-white rounded-[40px] p-10 max-w-[850px] mx-auto shadow-sm">
            <h2 className="text-[32px] font-fredoka font-bold text-[#1f3747] mb-2 leading-tight">
              {editingId ? 'Edit Leave Type' : 'Create New Leave Type'}
            </h2>
            <p className="text-[#64748b] text-[15px] font-medium mb-10">
              Define a new category of balance for your team.
            </p>

            <div className="grid grid-cols-[1.5fr_1fr] gap-x-16 gap-y-8">
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-[12px] font-bold text-[#4c6367] tracking-wider uppercase mb-2">Leave Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Study Leave"
                    className="w-full bg-[#dee4ec] text-[#1f3747] rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-[#a3dfff] font-medium"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#4c6367] tracking-wider uppercase mb-3">Scope (Departments)</label>
                  <div className="flex flex-wrap gap-2.5">

                    {departments.map(d => {
                      const isChecked = form.department_ids.includes(d.id)
                      return (
                        <button
                          key={d.id}
                          type="button"
                          className={`!px-5 !py-2.5 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 border-2 ${isChecked
                            ? '!bg-[#4c6367] !border-[#4c6367] !text-white shadow-md'
                            : '!bg-white !border-[#e2e8f0] !text-[#909bab] hover:!border-[#4c6367] hover:!text-[#4c6367]'}`}
                          onClick={() => {
                            if (isChecked) {
                              setForm({ ...form, department_ids: form.department_ids.filter(id => id !== d.id) })
                            } else {
                              setForm({ ...form, department_ids: [...form.department_ids, d.id] })
                            }
                          }}
                        >
                          <Building2 size={14} />
                          {d.name}
                        </button>
                      )
                    })}
                  </div>
                  {isHR && departments.length === 0 && (
                    <p className="text-[12px] text-red-500 mt-2 italic flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      No departments assigned to your account.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#4c6367] tracking-wider uppercase mb-2">Description</label>
                  <textarea
                    placeholder="..."
                    rows="4"
                    className="w-full bg-[#dee4ec] text-[#1f3747] rounded-[24px] px-5 py-4 outline-none focus:ring-2 focus:ring-[#a3dfff] font-medium resize-none"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-[#4c6367] tracking-wider uppercase mb-2">Default Days Per Year</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full bg-[#dee4ec] text-[#1f3747] rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-[#a3dfff] font-medium"
                      value={form.days}
                      onChange={(e) => setForm({ ...form, days: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#4c6367] tracking-wider uppercase mb-2">Min. Service (Months)</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full bg-[#dee4ec] text-[#1f3747] rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-[#a3dfff] font-medium"
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-8">
                <div>
                  <label className="block text-[12px] font-bold text-[#4c6367] tracking-wider uppercase mb-3">Category Icon</label>
                  <div className="bg-[#e9eff5] rounded-[32px] p-5">
                    <div className="grid grid-cols-4 gap-3">
                      {[Umbrella, Thermometer, Users, Plane, Smile, HeartHandshake, PartyPopper, MoreHorizontal].map((Icon, idx) => {
                        const iconNames = ['umbrella', 'thermometer', 'user', 'plane', 'smile', 'heart', 'party', 'more']
                        const isSelected = form.icon === iconNames[idx]
                        return (
                          <button
                            key={idx}
                            onClick={() => setForm({ ...form, icon: iconNames[idx] })}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-white shadow-sm ring-2 ring-[#a3dfff]' : 'hover:bg-white/50'
                              }`}
                          >
                            <Icon size={20} className={isSelected ? 'text-[#006dae]' : 'text-[#64748b]'} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#4c6367] tracking-wider uppercase mb-3">Identity Color</label>
                  <div className="!bg-[#e9eff5] rounded-[32px] py-4 px-6 inline-flex gap-4 items-center">
                    {[
                      { id: 'green', hex: '#B1EFD8' },
                      { id: 'orange', hex: '#FFBF95' },
                      { id: 'pink', hex: '#FFAADA' },
                      { id: 'blue', hex: '#A1D9FF' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setForm({ ...form, color: c.id })}
                        className={`w-8 h-8 rounded-full transition-transform ${form.color === c.id ? 'ring-4 ring-white shadow-md scale-110' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Policy Settings */}
            <div className="mt-8 bg-[#f8fafc] rounded-[32px] p-6 lg:p-8">
              <h4 className="text-[12px] font-bold text-[#4c6367] tracking-wider uppercase mb-6">Policy Settings</h4>

              <div className="flex flex-col gap-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[15px] font-bold text-[#1f3747] mb-0.5">Requires Manager Approval</p>
                    <p className="text-[13px] text-[#64748b]">Disable will be auto approved.</p>
                  </div>
                  <Toggle active={form.reqManager} onClick={() => setForm({ ...form, reqManager: !form.reqManager })} />
                </div>

                <div className="flex justify-between items-center border-t border-gray-100 pt-5">
                  <div>
                    <p className="text-[15px] font-bold text-[#1f3747] mb-0.5">Allows Year-to-Year Carryover</p>
                    <p className="text-[13px] text-[#64748b]">Unused balance will be added to next year's quota.</p>
                  </div>
                  <Toggle active={form.carryover} onClick={() => setForm({ ...form, carryover: !form.carryover })} />
                </div>

                <div className="flex justify-between items-center border-t border-gray-100 pt-5">
                  <div>
                    <p className="text-[15px] font-bold text-[#1f3747] mb-0.5">Requires Attachment/File Upload</p>
                    <p className="text-[13px] text-[#64748b]">Mandatory proof for categories like Medical or Compassionate leave.</p>
                  </div>
                  <Toggle active={form.reqAttachment} onClick={() => setForm({ ...form, reqAttachment: !form.reqAttachment })} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-10">
              <button
                onClick={handleSubmit}
                className="!bg-[#d1ebdf] text-[#265345] !px-8 !py-4 rounded-full font-bold hover:!bg-[#b0dccc] transition-colors"
                style={{ fontSize: '18px' }}
              >
                {editingId ? 'Save Changes' : 'Create Leave Type'}
              </button>

              <button
                onClick={() => {
                  setIsCreating(false)
                  setEditingId(null)
                  setForm({
                    name: '', description: '', days: '', service: '', icon: 'umbrella', color: 'blue', reqManager: true, carryover: false, reqAttachment: false, department_ids: []
                  })
                }}
                className="!bg-gray-800 text-white !px-8 !py-4 rounded-full font-bold hover:bg-gray-700 transition-colors"
                style={{ fontSize: '18px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
