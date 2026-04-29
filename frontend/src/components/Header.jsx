import { Bell, X, CheckSquare, Clock } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import api from "../services/api"
import { useDepartment } from "../contexts/DepartmentContext"
import Avatar from "./Avatar"

// Nav items per role — single source of truth
const ROLE_NAV_ITEMS = {
  "Employee": [
    { id: "dashboard", label: "Dashboard" },
    { id: "request", label: "Request" },
    { id: "history", label: "History" },
  ],
  "Manager": [
    { id: "dashboard", label: "Dashboard" },
    { id: "approvals", label: "Approvals" },
    { id: "history", label: "History" },
  ],
  "HR": [
    { id: "dashboard", label: "Dashboard" },
    { id: "employee", label: "Employee" },
    { id: "reports", label: "Reports" },
    { id: "leave-type", label: "Leave Type" },
  ],
  "Super Admin": [
    { id: "dashboard", label: "Dashboard" },
    { id: "departments", label: "Departments" },
    { id: "positions", label: "Positions" },
  ],
}

export default function Header({ activePage = "dashboard", onNavigate }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const { selectedDepartment, setSelectedDepartment } = useDepartment()

  const navItems = ROLE_NAV_ITEMS[user?.role] || []
  const isSuperAdmin = user?.role === "Super Admin"
  const isManagerOrHR = ["Manager", "HR"].includes(user?.role)
  const hasMultipleDepartments = isManagerOrHR && (user?.managed_departments?.length > 1)

  const fetchNotifications = async () => {
    if (!user || isSuperAdmin) return
    try {
      const { data } = await api.get('/notifications')
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          {/* Logo — click to go to dashboard */}
          <button
            onClick={() => onNavigate && onNavigate("dashboard")}
            className="hover:opacity-80 transition-opacity focus:outline-none"
          >
            <img src="/logo.png" alt="Logo" className="h-9 w-auto object-contain" />
          </button>

          <nav className="flex items-center gap-8">
            {navItems.map((item) => (
              <div key={item.id} className="relative">
                <button
                  onClick={() => onNavigate && onNavigate(item.id)}
                  className={`text-[17px] font-bold font-fredoka transition-colors tracking-wide px-2 py-4 ${activePage === item.id
                    ? "text-[#1e3450]"
                    : "text-[#1e3450] opacity-80 hover:opacity-100"
                    }`}
                >
                  {item.label}
                </button>
                {activePage === item.id && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[70%] h-1 bg-[#478afb] rounded-full" />
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Department Filter (Only for HR/Manager with multiple departments) */}
          {hasMultipleDepartments && (
            <div className="relative border-r border-gray-200 pr-6 mr-2">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="appearance-none bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#1e3450] text-[13px] font-bold font-fredoka py-2 pl-4 pr-8 rounded-full border-none focus:ring-0 cursor-pointer transition-colors outline-none"
              >
                <option value="">All Departments</option>
                {user.managed_departments.map((deptName, idx) => {
                  const deptId = user.managed_department_ids[idx];
                  return (
                    <option key={deptId} value={deptId}>
                      {deptName}
                    </option>
                  )
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-10 flex items-center px-2 text-[#64748b]">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
              </div>
            </div>
          )}

          {/* Bell hidden for Super Admin */}
          {!isSuperAdmin && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`relative p-2 rounded-lg transition-colors ${showNotifDropdown ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
              >
                <Bell size={20} className="text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#f05252] border-2 border-white rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_10px_40px_rgba(31,55,71,0.15)] border border-[#f0f3f8] overflow-hidden z-50">
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-[16px] font-fredoka text-[#1f3747]">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] font-bold text-[#478afb] hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center text-gray-400">
                        <Clock size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-[13px] font-medium">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-5 py-4 border-b border-gray-50 flex gap-4 hover:bg-gray-50 transition-colors cursor-pointer relative ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                          onClick={() => {
                            if (!notif.is_read) handleMarkAsRead(notif.id)

                            // Navigate based on role and notification type
                            if (notif.reference_id) {
                              const rolePath = user?.role?.toLowerCase().replace(' ', '');
                              if (user?.role === 'Employee') {
                                if (['leave_approved', 'leave_rejected', 'leave_acknowledged'].includes(notif.type)) {
                                  onNavigate && onNavigate(`requests/${notif.reference_id}`)
                                }
                              } else if (['Manager', 'HR'].includes(user?.role)) {
                                if (notif.type === 'new_leave_request') {
                                  onNavigate && onNavigate(`requests/${notif.reference_id}`)
                                }
                              }
                            }

                            setShowNotifDropdown(false)
                          }}
                        >
                          <div className={`w-2 h-2 rounded-full absolute left-2 top-1/2 -translate-y-1/2 bg-[#478afb] transition-opacity ${notif.is_read ? 'opacity-0' : 'opacity-100'}`} />
                          <div className="flex-grow">
                            <p className={`text-[13px] font-bold text-[#1f3747] mb-0.5 ${!notif.is_read ? 'pr-2' : ''}`}>
                              {notif.title}
                            </p>
                            <p className="text-[12px] text-gray-500 leading-snug mb-2">{notif.message}</p>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{formatTime(notif.created_at)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-3 bg-gray-50 text-center">
                      <button
                        onClick={() => setShowNotifDropdown(false)}
                        className="text-[12px] font-bold text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profile — click to go to settings */}
          <button
            onClick={() => onNavigate && onNavigate("settings")}
            title="Go to Settings"
            className="flex items-center gap-3 pl-6 border-l border-gray-200 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
          >
            <div className="text-right">
              <p className="text-[13px] font-bold font-fredoka text-[#1e3450]">{user?.full_name}</p>
              <p className="text-[11px] text-[#64748b] capitalize">{user?.role}</p>
            </div>
            <Avatar
              src={user?.profile_photo}
              name={user?.full_name}
              size={40}
              style={{ border: "2px solid #e2e8f0" }}
            />
          </button>
        </div>
      </div>
    </header>
  )
}
