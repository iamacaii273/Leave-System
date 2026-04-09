import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { ShieldOff } from "lucide-react"

const ROLE_HOME = {
  "Employee": "/employee/dashboard",
  "Manager": "/manager/dashboard",
  "HR": "/hr/dashboard",
  "Super Admin": "/superadmin/dashboard",
}

export default function Unauthorized() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const home = ROLE_HOME[user?.role] || "/login"

  return (
    <div className="min-h-screen bg-[#eef2f9] flex items-center justify-center px-6">
      <div className="bg-white rounded-[40px] shadow-sm p-14 max-w-md w-full flex flex-col items-center text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-[#fef2f2] flex items-center justify-center mb-6">
          <ShieldOff size={38} className="text-[#f56464]" strokeWidth={1.8} />
        </div>

        <h1 className="text-[32px] font-fredoka font-bold text-[#2d3e50] mb-2">
          Access Denied
        </h1>
        <p className="text-[15px] font-medium text-[#64748b] mb-2 leading-relaxed">
          You don't have permission to view this page.
        </p>
        {user && (
          <p className="text-[13px] text-[#94a3b8] mb-8">
            You're logged in as{" "}
            <span className="font-bold text-[#3f4a51]">{user.full_name}</span>{" "}
            ({user.role})
          </p>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => navigate(home)}
            className="w-full py-3.5 rounded-2xl bg-[#133251] text-white font-bold text-[14px] hover:bg-[#0f2540] transition-colors cursor-pointer"
          >
            Go to My Dashboard
          </button>
          <button
            onClick={() => { logout(); navigate("/login") }}
            className="w-full py-3.5 rounded-2xl border-2 border-[#e2e8f0] text-[#64748b] font-bold text-[14px] hover:border-[#f56464] hover:text-[#f56464] transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
