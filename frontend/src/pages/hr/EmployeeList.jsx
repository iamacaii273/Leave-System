import { useEffect, useMemo, useState } from "react"
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"
import api from "../../services/api"
import { useDepartment } from "../../contexts/DepartmentContext"
import Avatar from "../../components/Avatar"

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

function getAvatarColor(id = "") {
  const colors = [
    "#bfeadd",
    "#f0dcb5",
    "#d5dadc",
    "#dbeafe",
    "#fecdd3",
    "#e0f2fe",
    "#fef08a",
    "#bbf7d0",
  ]

  const total = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return colors[total % colors.length]
}

function formatQuota(used, total) {
  const f = (val) => {
    const num = Number(val || 0)
    const s = num.toFixed(1)
    return s.endsWith(".0") ? String(Math.trunc(num)) : s
  }
  return `${f(used)} / ${f(total)} Days`
}

export default function EmployeeList({ onNavigate }) {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const itemsPerPage = 5

  const { selectedDepartment } = useDepartment()

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true)
        setError("")

        let url = "/users/employees-summary"
        if (selectedDepartment) {
          url += `?department_id=${selectedDepartment}`
        }

        const { data } = await api.get(url)
        setEmployees(data?.users || [])
      } catch (err) {
        console.error("HR employee list error:", err)
        setError("Unable to load employee data right now.")
      } finally {
        setLoading(false)
      }
    }

    loadEmployees()
  }, [selectedDepartment])

  const filteredEmployees = useMemo(() => {
    const source = employees.map((emp) => ({
      ...emp,
      initial: getInitials(emp.full_name),
      bg: getAvatarColor(emp.id),
      quota: formatQuota(emp.used_leave_quota, emp.total_leave_quota),
    }))

    if (!searchTerm) return source

    const query = searchTerm.toLowerCase()
    return source.filter((emp) =>
      emp.full_name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      (emp.position || "").toLowerCase().includes(query)
    )
  }, [employees, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage))
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedEmployees = filteredEmployees.slice(startIdx, startIdx + itemsPerPage)
  const startItem = filteredEmployees.length === 0 ? 0 : startIdx + 1
  const endItem = Math.min(startIdx + itemsPerPage, filteredEmployees.length)

  const handleSearch = (val) => {
    setSearchTerm(val)
    setCurrentPage(1)
  }

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header
        activePage="employee"
        onNavigate={onNavigate}
      />

      <main className="max-w-5xl mx-auto px-6 py-12 w-full flex-grow">
        <div className="mb-10">
          <h1 className="text-[56px] font-fredoka font-bold text-[#323940] mb-2 leading-tight tracking-wide">
            Employee Management
          </h1>
          <p className="text-[#64748b] text-[20px] font-medium tracking-wide max-w-2xl leading-relaxed">
            Nurture your team in our pillowy sanctuary. View, add, and manage your most
            valuable assets with ease.
          </p>
        </div>

        <div className="flex gap-4 mb-8">
          <div className="relative flex-grow">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={20} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-white rounded-full py-5 pl-14 pr-6 text-[16px] font-medium text-[#3f4a51] placeholder-[#94a3b8] shadow-sm outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all box-border"
            />
          </div>
          <button
            onClick={() => navigate("/hr/employee/add")}
            className="!bg-[#4d6b63] hover:bg-[#3d554e] text-white rounded-full !px-8 !py-5 flex items-center gap-2 font-bold text-[17px] shadow-sm transition-colors"
          >
            <Plus size={20} strokeWidth={3} />
            Add Employee
          </button>
        </div>

        <div className="bg-white rounded-[40px] p-10 pb-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="bg-[#c2e4e1] inline-block px-5 py-2 rounded-full mb-8">
            <p className="text-[#3b6661] text-[11px] font-bold font-fredoka tracking-widest text-center leading-tight">
              ALL EMPLOYEE<br />({filteredEmployees.length})
            </p>
          </div>

          <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 mb-4 px-4">
            <span className="text-[12px] font-bold font-fredoka text-[#94a3b8] tracking-widest uppercase">Name</span>
            <span className="text-[12px] font-bold font-fredoka text-[#94a3b8] tracking-widest uppercase">Position</span>
            <span className="text-[12px] font-bold font-fredoka text-[#94a3b8] tracking-widest uppercase text-center">Leave Quota</span>
            <span className="w-24"></span>
          </div>

          <div className="w-full h-px bg-gray-100 mb-2"></div>

          {error ? (
            <div className="py-12 text-center text-[#c2410c] text-[15px] font-bold bg-[#fff7ed] rounded-[24px]">
              {error}
            </div>
          ) : loading ? (
            <div className="py-12 text-center text-[#94a3b8] text-[15px] font-bold">
              Loading employees...
            </div>
          ) : (
            <>
              <div className="space-y-0">
                {paginatedEmployees.length === 0 ? (
                  <div className="py-12 text-center text-[#94a3b8] text-[15px] font-bold">
                    No employees found.
                  </div>
                ) : paginatedEmployees.map((emp, idx) => (
                  <div key={emp.id}>
                    <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center py-6 px-4 hover:bg-gray-50/50 transition-colors rounded-2xl">
                      <div className="flex items-center gap-5">
                        <Avatar
                          src={emp.profile_photo}
                          name={emp.full_name}
                          size={56}
                          style={{ backgroundColor: emp.bg }}
                        />
                        <div>
                          <p className="font-bold text-[17px] font-fredoka text-[#323940] mb-0.5">{emp.full_name}</p>
                          <p className="text-[13px] font-medium text-[#7a8c98]">{emp.email}</p>
                        </div>
                      </div>

                      <div className="text-[15px] font-bold text-[#566069]">
                        {emp.position || "-"}
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
                    {idx < paginatedEmployees.length - 1 && <div className="w-full h-px bg-gray-100"></div>}
                  </div>
                ))}
              </div>

              <div className="w-full h-px bg-gray-100 mt-2 mb-8"></div>

              <div className="flex items-center justify-between px-4">
                <p className="text-[13px] font-bold text-[#64748b]">
                  Showing {startItem} to {endItem} of {filteredEmployees.length} employees
                </p>
                <div className="flex items-center gap-2 text-[#475569] font-bold text-[14px]">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors ${currentPage === 1 ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${page === currentPage
                        ? "text-[#2c4c48] font-bold"
                        : "hover:bg-gray-50"
                        }`}
                      style={page === currentPage ? { backgroundColor: "#c2e4e1" } : {}}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors ${currentPage === totalPages ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
