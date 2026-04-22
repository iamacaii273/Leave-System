import { Bell, User } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"

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
  ],
}

export default function Header({ activePage = "dashboard", onNavigate }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const navItems = ROLE_NAV_ITEMS[user?.role] || []
  const isSuperAdmin = user?.role === "Super Admin"

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
          {/* Bell hidden for Super Admin */}
          {!isSuperAdmin && (
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <Bell size={20} className="text-gray-500" />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#f05252] border border-white rounded-full" />
            </button>
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
            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center shadow-sm">
              <User size={20} className="text-sky-600" />
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}