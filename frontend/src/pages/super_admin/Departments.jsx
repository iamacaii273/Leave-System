import { useState, useEffect } from "react"
import { Building2, Plus, PenLine, Search, Loader2 } from "lucide-react"
import api from "../../services/api"
import Header from "../../components/Header"

export default function Departments({ onNavigate }) {
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentDept, setCurrentDept] = useState({ id: "", name: "", is_active: 1 })
  const [isSaving, setIsSaving] = useState(false)
  const [errorOpts, setErrorOpts] = useState("")

  const fetchDepartments = async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/departments/all')
      setDepartments(data.departments || [])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  const filtered = departments.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "active" && d.is_active === 1) || 
                          (statusFilter === "inactive" && d.is_active === 0);
    return matchesSearch && matchesStatus;
  })

  const handleOpenAdd = () => {
    setCurrentDept({ id: "", name: "", is_active: 1 })
    setErrorOpts("")
    setIsEditing(false)
    setShowModal(true)
  }

  const handleOpenEdit = (dept) => {
    setCurrentDept({ id: dept.id, name: dept.name, is_active: dept.is_active })
    setErrorOpts("")
    setIsEditing(true)
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!currentDept.name.trim()) {
      setErrorOpts("Department name is required.")
      return
    }

    setIsSaving(true)
    setErrorOpts("")
    try {
      if (isEditing) {
        await api.put(`/departments/${currentDept.id}`, {
          name: currentDept.name,
          is_active: parseInt(currentDept.is_active)
        })
      } else {
        await api.post('/departments', {
          name: currentDept.name
        })
      }
      await fetchDepartments()
      setShowModal(false)
    } catch (err) {
      setErrorOpts(err.response?.data?.message || "Failed to save department.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header activePage="departments" onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-[42px] font-fredoka font-bold text-[#1f3747] mb-1 leading-tight">
              Departments
            </h1>
            <p className="text-[#64748b] text-[16px] font-medium max-w-2xl">
              Organize your workforce and manage structural hierarchy.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-full font-bold text-[15px] transition-colors !px-7 !py-3.5 shadow-[0_4px_10px_rgba(31,55,71,0.2)] hover:shadow-none translate-y-0 hover:translate-y-px"
            style={{ backgroundColor: '#1f3747', color: '#ffffff' }}
          >
            <Plus size={18} />
            Add Department
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
            <input
              type="text"
              placeholder="Search departments by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white rounded-2xl py-4 pl-12 pr-6 text-[15px] font-medium text-[#3f4a51] placeholder-[#94a3b8] shadow-sm outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all"
            />
          </div>
          <div className="relative min-w-[180px]">
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
          <div className="grid grid-cols-[3fr_1fr_1fr] gap-4 px-8 py-5 bg-[#f8fafb] border-b border-[#eef2f5]">
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">Department Name</span>
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase text-center">Status</span>
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase text-right mx-4">Action</span>
          </div>

          {/* Table Rows */}
          <div>
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-[#94a3b8] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#3ea8e5]" />
                <p className="text-[15px] font-bold">Loading departments...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-[#94a3b8] text-[15px] font-bold">
                No departments found.
              </div>
            ) : filtered.map((dept, idx) => (
              <div key={dept.id}>
                <div className="grid grid-cols-[3fr_1fr_1fr] gap-4 items-center px-8 py-5 hover:bg-[#f9fafb] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#f0f9ff] flex items-center justify-center border border-[#e0f2fe]">
                      <Building2 size={18} className="text-[#0284c7]" />
                    </div>
                    <p className="font-bold text-[16px] text-[#323940]">{dept.name}</p>
                  </div>

                  <div className="flex justify-center">
                    <span
                      className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase"
                      style={{
                        backgroundColor: dept.is_active ? '#d1f2e8' : '#fde2e4',
                        color: dept.is_active ? '#1a7f5a' : '#b5283d'
                      }}
                    >
                      {dept.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleOpenEdit(dept)}
                      className="w-10 h-10 rounded-full bg-[#f4f7f9] hover:bg-[#e2e8f0] flex items-center justify-center text-[#64748b] transition-colors mr-2"
                    >
                      <PenLine size={16} />
                    </button>
                  </div>
                </div>
                {idx < filtered.length - 1 && <div className="h-px bg-[#f1f5f9] mx-8"></div>}
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-[#1f3747]/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl animate-fade-in-up">
            <h3 className="mb-6 text-[28px] font-fredoka font-bold text-[#1f3747]">
              {isEditing ? 'Editing Department' : 'New Department'}
            </h3>

            <form onSubmit={handleSave} className="flex flex-col gap-5">
              {errorOpts && (
                <div className="p-4 bg-red-50 text-red-700 text-[14px] font-bold rounded-2xl border border-red-100">
                  {errorOpts}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#64748b] ml-2">Department Name</label>
                <input
                  type="text"
                  value={currentDept.name}
                  onChange={(e) => setCurrentDept({ ...currentDept, name: e.target.value })}
                  placeholder="e.g. Engineering, Human Resources..."
                  className="w-full rounded-2xl border-none bg-[#f4f7f9] px-5 py-4 text-[15px] font-medium text-[#1f3747] outline-none placeholder:text-[#94a3b8] focus:ring-2 focus:ring-[#3ea8e5]/30 transition-all shadow-inner"
                  autoFocus
                />
              </div>

              {isEditing && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-[13px] font-bold text-[#64748b] ml-2">Status</label>
                  <select
                    value={currentDept.is_active}
                    onChange={(e) => setCurrentDept({ ...currentDept, is_active: e.target.value })}
                    className="w-full rounded-2xl border-none bg-[#f4f7f9] px-5 py-4 text-[15px] font-medium text-[#1f3747] outline-none focus:ring-2 focus:ring-[#3ea8e5]/30 transition-all shadow-inner appearance-none cursor-pointer"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
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
                  disabled={isSaving || !(currentDept?.name || "").trim()}
                  className="flex-1 rounded-full !px-2 !py-4 text-[15px] font-bold shadow-[0_4px_12px_rgba(62,168,229,0.3)] hover:shadow-none translate-y-0 hover:translate-y-px transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#3ea8e5', color: '#ffffff' }}
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                    </div>
                  ) : (
                    isEditing ? 'Save Changes' : 'Add Department'
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
