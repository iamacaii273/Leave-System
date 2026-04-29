import { useState, useEffect } from "react"
import { Briefcase, Plus, PenLine, Search, Loader2, Trash2, RotateCcw, ChevronDown } from "lucide-react"
import api from "../../services/api"
import Header from "../../components/Header"

export default function Positions({ onNavigate }) {
  const [positions, setPositions] = useState([])
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentPos, setCurrentPos] = useState({ id: "", name: "", role_id: "", is_active: 1 })
  const [isSaving, setIsSaving] = useState(false)
  const [errorOpts, setErrorOpts] = useState("")

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [posRes, roleRes] = await Promise.all([
        api.get('/metadata/positions/all'),
        api.get('/metadata/roles')
      ])
      setPositions(posRes.data.positions || [])
      setRoles(roleRes.data.roles || [])
    } catch (err) {
      console.error('Failed to fetch positions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = positions.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || p.role_id === roleFilter
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && !p.deleted_at) ||
      (statusFilter === "inactive" && p.deleted_at)
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleOpenAdd = () => {
    const defaultRole = roles.find(r => r.name !== 'Super Admin') || roles[0]
    setCurrentPos({ id: "", name: "", role_id: defaultRole?.id || "", is_active: 1 })
    setErrorOpts("")
    setIsEditing(false)
    setShowModal(true)
  }

  const handleOpenEdit = (pos) => {
    setCurrentPos({ id: pos.id, name: pos.name, role_id: pos.role_id, is_active: pos.deleted_at ? 0 : 1 })
    setErrorOpts("")
    setIsEditing(true)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!currentPos.name.trim()) {
      setErrorOpts("Position name is required.")
      return
    }
    if (!currentPos.role_id) {
      setErrorOpts("Please select a role.")
      return
    }

    setIsSaving(true)
    setErrorOpts("")
    try {
      if (isEditing) {
        await api.put(`/metadata/positions/${currentPos.id}`, {
          name: currentPos.name,
          role_id: currentPos.role_id
        })
        
        // Handle status change
        const originalPos = positions.find(p => p.id === currentPos.id);
        const originalIsActive = originalPos?.deleted_at ? 0 : 1;
        if (parseInt(currentPos.is_active) !== originalIsActive) {
          if (parseInt(currentPos.is_active) === 0) {
            await api.delete(`/metadata/positions/${currentPos.id}`);
          } else {
            await api.put(`/metadata/positions/${currentPos.id}/restore`);
          }
        }
      } else {
        await api.post('/metadata/positions', {
          name: currentPos.name,
          role_id: currentPos.role_id
        })
      }
      await fetchData()
      setShowModal(false)
    } catch (err) {
      setErrorOpts(err.response?.data?.message || "Failed to save position.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (pos) => {
    if (!confirm(`Delete position "${pos.name}"? This can be undone.`)) return
    try {
      await api.delete(`/metadata/positions/${pos.id}`)
      await fetchData()
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete position.")
    }
  }

  const handleRestore = async (pos) => {
    try {
      await api.put(`/metadata/positions/${pos.id}/restore`)
      await fetchData()
    } catch (err) {
      alert(err.response?.data?.message || "Failed to restore position.")
    }
  }

  // Role badge styling
  const roleBadge = {
    HR: { bg: '#fce0c8', text: '#b5651d' },
    Employee: { bg: '#d1ecf1', text: '#0c5460' },
    Manager: { bg: '#d4edda', text: '#155724' },
    'Super Admin': { bg: '#e2d9f3', text: '#563d7c' }
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header activePage="positions" onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-[42px] font-fredoka font-bold text-[#1f3747] mb-1 leading-tight">
              Positions
            </h1>
            <p className="text-[#64748b] text-[16px] font-medium max-w-2xl">
              Define and manage job positions across your organization.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-full font-bold text-[15px] transition-colors !px-7 !py-3.5 shadow-[0_4px_10px_rgba(31,55,71,0.2)] hover:shadow-none translate-y-0 hover:translate-y-px"
            style={{ backgroundColor: '#1f3747', color: '#ffffff' }}
          >
            <Plus size={18} />
            Add Position
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
            <input
              type="text"
              placeholder="Search positions by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white rounded-2xl py-4 pl-12 pr-6 text-[15px] font-medium text-[#3f4a51] placeholder-[#94a3b8] shadow-sm outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all"
            />
          </div>
          <div className="relative min-w-[160px]">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-white rounded-2xl py-4 pl-6 pr-10 text-[15px] font-bold text-[#3f4a51] shadow-sm outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all appearance-none cursor-pointer border-none"
            >
              <option value="all">All Roles</option>
              {roles.filter(r => r.name !== 'Super Admin').map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#94a3b8]">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="relative min-w-[160px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white rounded-2xl py-4 pl-6 pr-10 text-[15px] font-bold text-[#3f4a51] shadow-sm outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all appearance-none cursor-pointer border-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#94a3b8]">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-[32px] shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr] gap-4 px-8 py-5 bg-[#f8fafb] border-b border-[#eef2f5]">
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Position Name</span>
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase text-center">Role</span>
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase text-center">Status</span>
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase text-right mx-4">Action</span>
          </div>

          {/* Table Rows */}
          <div>
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-[#94a3b8] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#3ea8e5]" />
                <p className="text-[15px] font-bold">Loading positions...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-[#94a3b8] text-[15px] font-bold">
                No positions found.
              </div>
            ) : filtered.map((pos, idx) => {
              const badge = roleBadge[pos.role_name] || roleBadge.Employee
              const isDeleted = !!pos.deleted_at

              return (
                <div key={pos.id}>
                  <div className={`grid grid-cols-[2.5fr_1fr_1fr_1fr] gap-4 items-center px-8 py-5 hover:bg-[#f9fafb] transition-colors ${isDeleted ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#f0f9ff] flex items-center justify-center border border-[#e0f2fe]">
                        <Briefcase size={18} className="text-[#0284c7]" />
                      </div>
                      <p className="font-bold text-[16px] text-[#323940]">{pos.name}</p>
                    </div>

                    <div className="flex justify-center">
                      <span
                        className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {pos.role_name}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <span
                        className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase"
                        style={{
                          backgroundColor: isDeleted ? '#fde2e4' : '#d1f2e8',
                          color: isDeleted ? '#b5283d' : '#1a7f5a'
                        }}
                      >
                        {isDeleted ? 'Inactive' : 'Active'}
                      </span>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(pos)}
                        className="w-10 h-10 rounded-full bg-[#f4f7f9] hover:bg-[#e2e8f0] flex items-center justify-center text-[#64748b] transition-colors"
                        title="Edit"
                      >
                        <PenLine size={16} />
                      </button>
                    </div>
                  </div>
                  {idx < filtered.length - 1 && <div className="h-px bg-[#f1f5f9] mx-8"></div>}
                </div>
              )
            })}
          </div>
        </div>

      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-[#1f3747]/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl animate-fade-in-up">
            <h3 className="mb-6 text-[28px] font-fredoka font-bold text-[#1f3747]">
              {isEditing ? 'Edit Position' : 'New Position'}
            </h3>

            <form onSubmit={handleSave} className="flex flex-col gap-5">
              {errorOpts && (
                <div className="p-4 bg-red-50 text-red-700 text-[14px] font-bold rounded-2xl border border-red-100">
                  {errorOpts}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#64748b] ml-2">Position Name</label>
                <input
                  type="text"
                  value={currentPos.name}
                  onChange={(e) => setCurrentPos({ ...currentPos, name: e.target.value })}
                  placeholder="e.g. Developer, Designer, HR Officer..."
                  className="w-full rounded-2xl border-none bg-[#f4f7f9] px-5 py-4 text-[15px] font-medium text-[#1f3747] outline-none placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#3ea8e5]/30 transition-all shadow-inner"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#64748b] ml-2">Assigned Role</label>
                <div className="relative">
                  <select
                    value={currentPos.role_id}
                    onChange={(e) => setCurrentPos({ ...currentPos, role_id: e.target.value })}
                    className="w-full rounded-2xl border-none bg-[#f4f7f9] px-5 py-4 text-[15px] font-medium text-[#1f3747] outline-none focus:ring-2 focus:ring-[#3ea8e5]/30 transition-all shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="">Select a role</option>
                    {roles.filter(r => r.name !== 'Super Admin').map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                </div>
              </div>

              {isEditing && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-2">Status</label>
                  <div className="relative">
                    <select
                      value={currentPos.is_active}
                      onChange={(e) => setCurrentPos({ ...currentPos, is_active: parseInt(e.target.value) })}
                      className="w-full rounded-2xl border-none bg-[#f4f7f9] px-5 py-4 text-[15px] font-medium text-[#1f3747] outline-none focus:ring-2 focus:ring-[#3ea8e5]/30 transition-all shadow-inner appearance-none cursor-pointer"
                    >
                      <option value={1}>Active</option>
                      <option value={0}>Inactive</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-full bg-[#f1f5f9] px-2 py-4 text-[15px] font-bold text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#1f3747] transition-all"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !(currentPos?.name || "").trim() || !currentPos.role_id}
                  className="flex-1 rounded-full !px-2 !py-4 text-[15px] font-bold shadow-[0_4px_12px_rgba(62,168,229,0.3)] hover:shadow-none translate-y-0 hover:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#3ea8e5', color: '#ffffff' }}
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                    </div>
                  ) : (
                    isEditing ? 'Save Changes' : 'Add Position'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
