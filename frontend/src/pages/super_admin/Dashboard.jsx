import { useState, useEffect } from "react"
import { Users, UserRoundX, UserCheck, UserCog, User, UserPlus, IdCardLanyard, ChevronLeft, ChevronRight, PenLine, Search, Bell, Settings, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import Header from "../../components/Header"
import api from "../../services/api"

export default function SuperAdminDashboard({ onNavigate }) {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const itemsPerPage = 4

  // Add user form
  const [newUser, setNewUser] = useState({ fullName: '', email: '', username: '', role: 'Employee', password: '' })

  const [allUsers, setAllUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true)
      try {
        const { data } = await api.get('/users')
        const colors = ['#fef08a', '#c4b5fd', '#a7f3d0', '#fca5a5', '#bae6fd']

        const mappedUsers = data.users.map((u, i) => {
          const nameStr = u.full_name || u.username || 'Unknown User'
          const initials = nameStr.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
          return {
            id: u.id,
            name: nameStr,
            email: u.email || '',
            role: u.role || 'Employee',
            status: u.is_active === 1 ? 'Active' : 'Resigned',
            img: null,
            initial: initials || 'XX',
            initialBg: colors[i % colors.length]
          }
        })
        setAllUsers(mappedUsers)
      } catch (err) {
        console.error('Failed to fetch users:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUsers()
  }, [])

  // Stats computed from data
  const totalUsers = allUsers.length
  const totalActive = allUsers.filter(u => u.status === 'Active').length
  const totalResigned = allUsers.filter(u => u.status === 'Resigned').length

  // Filter
  const filteredUsers = searchTerm
    ? allUsers.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : allUsers

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const startItem = filteredUsers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, filteredUsers.length)

  const handleSearch = (val) => {
    setSearchTerm(val)
    setCurrentPage(1)
  }

  // Role badge colors
  const roleBadge = {
    HR: { bg: '#fce0c8', text: '#b5651d' },
    Employee: { bg: '#d1ecf1', text: '#0c5460' },
    Manager: { bg: '#d4edda', text: '#155724' },
    'Super Admin': { bg: '#e2d9f3', text: '#563d7c' }
  }

  const statusBadge = {
    Active: { bg: '#d1f2e8', text: '#1a7f5a' },
    Resigned: { bg: '#fde2e4', text: '#b5283d' }
  }

  // Stat cards data
  const stats = [
    { label: 'TOTAL USERS', value: totalUsers.toLocaleString(), icon: Users, iconBg: '#eef2f9', iconColor: '#4c6367' },
    { label: 'TOTAL ACTIVE', value: totalActive.toLocaleString(), icon: UserCheck, iconBg: '#d1f2e8', iconColor: '#1a7f5a' },
    { label: 'TOTAL RESIGNED', value: totalResigned.toLocaleString(), icon: UserRoundX, iconBg: '#fde2e4', iconColor: '#b5283d' },
  ]

  // Get greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const handleAddUser = () => {
    if (!newUser.fullName.trim() || !newUser.email.trim() || !newUser.username.trim() || !newUser.password.trim()) return
    const initials = newUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    const colors = ['#bfeadd', '#fef08a', '#c4b5fd', '#fca5a5', '#bae6fd', '#fed7aa', '#fbcfe8']
    setAllUsers(prev => [...prev, {
      id: Date.now(),
      name: newUser.fullName,
      email: newUser.email,
      role: newUser.role,
      status: 'Active',
      img: null,
      initial: initials.slice(0, 2),
      initialBg: colors[Math.floor(Math.random() * colors.length)]
    }])
    setNewUser({ fullName: '', email: '', username: '', role: 'Employee', password: '' })
    setShowAddModal(false)
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col font-nunito">
      <Header
        activePage="dashboard"
        onNavigate={onNavigate}
        navItems={[{ id: "dashboard", label: "Dashboard" }]}
      />

      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">

        {/* Greeting */}
        <div className="mb-10">
          <h1 className="text-[56px] font-fredoka font-bold text-[#1f3747] mb-1 leading-tight">
            {greeting}
          </h1>
          <p className="text-[#64748b] text-[18px] font-medium max-w-2xl">
            Manage your global workforce and sanctuary operations from one central, atmospheric workspace.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-[24px] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.iconBg }}>
                <stat.icon size={20} style={{ color: stat.iconColor }} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase mb-1">{stat.label}</p>
                <p className="text-[36px] font-fredoka font-bold text-[#1f3747] leading-none">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Registry Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[36px] font-fredoka font-bold text-[#1f3747]">Registry</h2>
          <button
            onClick={() => navigate('/superadmin/add-user')}
            className="flex items-center gap-2 rounded-full font-bold text-[15px] transition-colors !px-7 !py-3.5"
            style={{ backgroundColor: '#1f3747', color: '#ffffff' }}
          >
            <UserPlus size={18} />
            Add New User
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
          <input
            type="text"
            placeholder="Search users by name, email or role..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-white rounded-2xl py-4 pl-12 pr-6 text-[15px] font-medium text-[#3f4a51] placeholder-[#94a3b8] shadow-sm outline-none focus:ring-2 focus:ring-[#567278]/20 transition-all"
          />
        </div>

        {/* Registry Table */}
        <div className="bg-white rounded-[32px] shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2.5fr_1fr_1fr_0.8fr] gap-4 px-8 py-5 bg-[#f8fafb] border-b border-[#eef2f5]">
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase">User Profile</span>
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase text-center">Access Role</span>
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase text-center">Status</span>
            <span className="text-[11px] font-bold text-[#94a3b8] tracking-widest uppercase text-center">Management</span>
          </div>

          {/* Table Rows */}
          <div>
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-[#94a3b8] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#3ea8e5]" />
                <p className="text-[15px] font-bold">Synchronizing user data...</p>
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="py-16 text-center text-[#94a3b8] text-[15px] font-bold">
                No users found.
              </div>
            ) : paginatedUsers.map((user, idx) => (
              <div key={user.id}>
                <div className="grid grid-cols-[2.5fr_1fr_1fr_0.8fr] gap-4 items-center px-8 py-5 hover:bg-[#f9fafb] transition-colors">
                  {/* User Profile */}
                  <div className="flex items-center gap-4">
                    {user.img ? (
                      <img src={`https://i.pravatar.cc/150?img=${user.img}`} className="w-11 h-11 rounded-full object-cover shadow-sm" alt={user.name} />
                    ) : (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[14px] font-fredoka text-[#323940] shadow-sm" style={{ backgroundColor: user.initialBg }}>
                        {user.initial}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-[15px] text-[#323940] mb-0.5">{user.name}</p>
                      <p className="text-[12px] font-medium text-[#94a3b8]">{user.email}</p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="flex justify-center">
                    <span
                      className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase"
                      style={{ backgroundColor: (roleBadge[user.role] || roleBadge.Employee).bg, color: (roleBadge[user.role] || roleBadge.Employee).text }}
                    >
                      {user.role}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    <span
                      className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase"
                      style={{ backgroundColor: statusBadge[user.status].bg, color: statusBadge[user.status].text }}
                    >
                      {user.status}
                    </span>
                  </div>

                  {/* Edit */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => navigate(`/superadmin/edit-user/${user.id}`)}
                      className="w-9 h-9 rounded-full bg-[#f4f7f9] hover:bg-[#e2e8f0] flex items-center justify-center text-[#64748b] transition-colors"
                    >
                      <PenLine size={15} />
                    </button>
                  </div>
                </div>
                {idx < paginatedUsers.length - 1 && <div className="h-px bg-[#f1f5f9] mx-8"></div>}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-8 py-5 border-t border-[#f1f5f9]">
            <p className="text-[13px] font-bold text-[#94a3b8]">
              Showing <span className="text-[#4c6367]">{endItem}</span> of <span className="text-[#4c6367]">{filteredUsers.length}</span> entries
            </p>
            <div className="flex items-center gap-2 text-[#475569] font-bold text-[14px]">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-[13px] font-bold ${page === currentPage ? "text-white" : "text-[#94a3b8] hover:bg-gray-100"
                    }`}
                  style={page === currentPage ? { backgroundColor: '#3ea8e5' } : {}}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors ${currentPage === totalPages ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
