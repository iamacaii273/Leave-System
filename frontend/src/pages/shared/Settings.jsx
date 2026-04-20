import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import api from "../../services/api"
import { ShieldAlert, User, KeyRound, Save, BadgeCheck, Bell, Smartphone, Lock } from "lucide-react"

export default function Settings({ onNavigate, HeaderComponent, ...props }) {
  const { user, updateUser } = useAuth()
  
  // States
  const [activeTab, setActiveTab] = useState("profile")
  const [successMsg, setSuccessMsg] = useState("")
  const [errMsg, setErrMsg] = useState("")

  // Form State
  const [profileData, setProfileData] = useState({
    username: user?.username || "",
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || ""
  })
  
  const [passData, setPassData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  })

  // Handlers
  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSuccessMsg("")
    setErrMsg("")
    try {
      const res = await api.put("/users/me", profileData)
      setSuccessMsg("Profile updated successfully!")
      // Update local context
      updateUser(res.data.user)
    } catch (err) {
      setErrMsg(err.response?.data?.message || "Failed to update profile.")
    }
  }

  const handlePasswordEmailRequest = async () => {
    setSuccessMsg("")
    setErrMsg("")
    try {
      await api.post('/auth/forgot-password', { email: user?.email })
      setSuccessMsg("Password reset link sent to your email!")
    } catch (err) {
      setErrMsg(err.response?.data?.message || "Failed to send reset link.")
    }
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col">
      <HeaderComponent activePage="settings" onNavigate={onNavigate} {...props} />

      <main className="max-w-4xl mx-auto px-6 py-12 w-full flex-grow">
        
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[54px] font-fredoka font-bold text-[#2d3e50] mb-2 leading-tight">Settings</h1>
          <p className="text-[#64748b] text-[17px] font-medium">Manage your personal information and preferences.</p>
        </div>

        {/* Layout */}
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-white rounded-[24px] p-3 shadow-sm flex flex-col gap-2">
              <button 
                onClick={() => {setActiveTab("profile"); setSuccessMsg(""); setErrMsg("")}}
                className={`flex items-center gap-3 px-4 py-3 rounded-[16px] text-[14px] font-bold transition-all ${activeTab === 'profile' ? 'bg-[#f0f3f8] text-[#1c355e]' : 'text-[#64748b] hover:bg-[#f8fafc]'}`}
              >
                <User size={18} /> Personal Info
              </button>
              <button 
                onClick={() => {setActiveTab("security"); setSuccessMsg(""); setErrMsg("")}}
                className={`flex items-center gap-3 px-4 py-3 rounded-[16px] text-[14px] font-bold transition-all ${activeTab === 'security' ? 'bg-[#f0f3f8] text-[#1c355e]' : 'text-[#64748b] hover:bg-[#f8fafc]'}`}
              >
                <Lock size={18} /> Password & Security
              </button>
              <button 
                onClick={() => {setActiveTab("notifications"); setSuccessMsg(""); setErrMsg("")}}
                className={`flex items-center gap-3 px-4 py-3 rounded-[16px] text-[14px] font-bold transition-all ${activeTab === 'notifications' ? 'bg-[#f0f3f8] text-[#1c355e]' : 'text-[#64748b] hover:bg-[#f8fafc]'}`}
              >
                <Bell size={18} /> Notifications
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-grow">
            
            {/* Status Messages */}
            {errMsg && (
              <div className="mb-6 p-4 bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] rounded-[20px] flex items-center gap-3 font-medium text-[14px]">
                <ShieldAlert size={20} /> {errMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-4 bg-[#f0fdf4] border border-[#86efac] text-[#16a34a] rounded-[20px] flex items-center gap-3 font-medium text-[14px]">
                <BadgeCheck size={20} /> {successMsg}
              </div>
            )}

            {activeTab === "profile" && (
              <form onSubmit={handleProfileSave} className="bg-white rounded-[32px] p-8 shadow-sm">
                <h2 className="text-[22px] font-bold font-fredoka text-[#2d3e50] mb-6">Personal Information</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">Username</label>
                    <input 
                       type="text" 
                       value={profileData.username} 
                       onChange={e => setProfileData({...profileData, username: e.target.value})} 
                       required
                       className="w-full h-12 px-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">Full Name</label>
                    <input 
                       type="text" 
                       value={profileData.full_name} 
                       onChange={e => setProfileData({...profileData, full_name: e.target.value})} 
                       required
                       className="w-full h-12 px-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">Email Address</label>
                    <input 
                       type="email" 
                       value={profileData.email} 
                       onChange={e => setProfileData({...profileData, email: e.target.value})} 
                       required
                       className="w-full h-12 px-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20" 
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">Phone Number</label>
                    <div className="relative">
                      <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                      <input 
                         type="tel" 
                         value={profileData.phone} 
                         onChange={e => setProfileData({...profileData, phone: e.target.value})} 
                         className="w-full h-12 pl-12 pr-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20" 
                         placeholder="+1234567890"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3">
                  <button type="submit" className="px-6 py-3 bg-[#1c355e] text-white rounded-[16px] text-[14px] font-bold hover:bg-[#122340] transition-colors flex items-center gap-2">
                    <Save size={18} /> Save Changes
                  </button>
                </div>
              </form>
            )}

            {activeTab === "security" && (
              <div className="bg-white rounded-[32px] p-8 shadow-sm">
                <h2 className="text-[22px] font-bold font-fredoka text-[#2d3e50] mb-3">Password & Security</h2>
                <p className="text-[#64748b] text-[15px] font-medium mb-6">
                  For your security, we handle password changes via secure email links. Click the button below and we will send a password reset link directly to your email address: <strong>{user?.email}</strong>.
                </p>
                <div className="mt-6 flex justify-start gap-3">
                  <button 
                    type="button" 
                    onClick={handlePasswordEmailRequest}
                    className="px-6 py-3 bg-[#f0fdf4] text-[#16a34a] border border-[#86efac] rounded-[16px] text-[14px] font-bold hover:bg-[#dcfce7] transition-colors flex items-center gap-2"
                  >
                    <KeyRound size={18} /> Request Password Reset Link
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
               <div className="bg-white rounded-[32px] p-8 shadow-sm">
                 <h2 className="text-[22px] font-bold font-fredoka text-[#2d3e50] mb-6">Notification Preferences</h2>
                 <p className="text-[#64748b] text-[15px] font-medium mb-6">Manage how you receive alerts and updates.</p>
                 
                 <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 border border-[#eef2f9] rounded-[20px] bg-[#f8fafc]">
                     <div>
                       <p className="font-bold text-[14px] text-[#2d3e50] mb-0.5">Email Notifications</p>
                       <p className="text-[12px] text-[#94a3b8] font-medium">Receive direct emails about your request status</p>
                     </div>
                     <div className="w-12 h-6 bg-[#16a34a] rounded-full relative cursor-pointer">
                       <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                     </div>
                   </div>
                   
                   <div className="flex items-center justify-between p-4 border border-[#eef2f9] rounded-[20px]">
                     <div>
                       <p className="font-bold text-[14px] text-[#2d3e50] mb-0.5">In-App Alerts</p>
                       <p className="text-[12px] text-[#94a3b8] font-medium">Get real-time pings when your manager approves time off</p>
                     </div>
                     <div className="w-12 h-6 bg-[#16a34a] rounded-full relative cursor-pointer">
                       <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
                     </div>
                   </div>
                   
                   <div className="flex items-center justify-between p-4 border border-[#eef2f9] rounded-[20px]">
                     <div>
                       <p className="font-bold text-[14px] text-[#2d3e50] mb-0.5">Weekly Digest</p>
                       <p className="text-[12px] text-[#94a3b8] font-medium">A summary of team availability for the upcoming week</p>
                     </div>
                     <div className="w-12 h-6 bg-[#cbd5e1] rounded-full relative cursor-pointer">
                       <div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1"></div>
                     </div>
                   </div>
                 </div>
               </div>
            )}

          </div>
        </div>

      </main>
    </div>
  )
}
