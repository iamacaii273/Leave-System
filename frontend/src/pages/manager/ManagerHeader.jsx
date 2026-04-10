import { Bell, Settings, User, LogOut } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function ManagerHeader({ activePage = "dashboard", onNavigate }) {
  const { user, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "approvals", label: "Approvals" },
    { id: "history",   label: "History"   },
  ]

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <nav className="flex items-center gap-8">
          {navItems.map((item) => (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onNavigate && onNavigate(item.id)}
                className={`text-[17px] font-bold font-fredoka transition-colors tracking-wide px-2 py-4 ${
                  activePage === item.id
                    ? "text-[#1e3450]"
                    : "text-[#1e3450] opacity-70 hover:opacity-100"
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

        <div className="flex items-center gap-4">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg">
            <Bell size={20} className="text-gray-500" />
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#f05252] border border-white rounded-full" />
          </button>
          <button 
            onClick={() => onNavigate && onNavigate("settings")}
            className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
          >
            <Settings size={20} className="text-gray-500" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 pl-6 border-l border-gray-200 focus:outline-none"
            >
              <div className="text-right">
                <p className="text-[13px] font-bold font-fredoka text-[#1e3450]">
                  {user?.full_name || "Manager"}
                </p>
                <p className="text-[11px] text-[#64748b] capitalize">
                  {user?.role || "Manager"}
                </p>
              </div>
              <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                <User size={20} className="text-sky-600" />
              </div>
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-3 w-48 bg-white border border-gray-100 shadow-lg rounded-xl py-2 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-[14px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
