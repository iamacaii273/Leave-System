import { useState, useEffect, useRef } from "react"
import { useAuth } from "../../contexts/AuthContext"
import api from "../../services/api"
import { ShieldAlert, User, KeyRound, Save, BadgeCheck, Bell, Smartphone, Lock, LogOut, ChevronDown, Building2, Camera, Trash2, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import Avatar from "../../components/Avatar"

export default function Settings({ onNavigate, HeaderComponent }) {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)

  // States
  const [activeTab, setActiveTab] = useState("profile")
  const [successMsg, setSuccessMsg] = useState("")
  const [errMsg, setErrMsg] = useState("")
  const [notifEnabled, setNotifEnabled] = useState(true)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Form State
  const [profileData, setProfileData] = useState({
    username: user?.username || "",
    full_name: user?.full_name || "",
    email: user?.email || "",
    department: user?.department || ""
  })

  // Phone Configuration
  const PHONE_PREFIXES = [
    { code: '+66', label: '+66 (TH)', max: 9, placeholder: "893948271" },
    { code: '+1', label: '+1 (US)', max: 10, placeholder: "5550000000" },
    { code: '+44', label: '+44 (UK)', max: 11, placeholder: "7000000000" },
    { code: '+81', label: '+81 (JP)', max: 11, placeholder: "9000000000" },
    { code: '+65', label: '+65 (SG)', max: 8, placeholder: "80000000" }
  ];

  const [phoneState, setPhoneState] = useState({
    prefix: '+66',
    digits: ''
  })

  useEffect(() => {
    // Fetch latest user data to ensure phone/department are populated
    api.get("/users/me")
      .then(res => {
        const u = res.data.user

        // Parse phone: "+66 812345678" -> prefix: "+66", digits: "812345678"
        let pref = '+66'
        let digs = u.phone || ""
        if (digs.includes(' ')) {
          [pref, digs] = digs.split(' ')
        } else if (digs.startsWith('+')) {
          const foundPrefix = PHONE_PREFIXES.find(p => digs.startsWith(p.code))
          if (foundPrefix) {
            pref = foundPrefix.code
            digs = digs.substring(pref.length).trim()
          }
        }

        setProfileData({
          username: u.username || "",
          full_name: u.full_name || "",
          email: u.email || "",
          phone: u.phone || "", // keeping this as fallback or for reference
          department: u.department || ""
        })
        setPhoneState({ prefix: pref, digits: digs })
        setNotifEnabled(!!u.notifications_enabled)
        updateUser(u)
      })
      .catch(err => console.error("Failed to fetch user data:", err))
  }, [])

  const [passData, setPassData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  })

  // Handlers
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNotifToggle = async () => {
    const newValue = !notifEnabled
    setNotifEnabled(newValue)
    try {
      await api.put("/users/me", { notifications_enabled: newValue ? 1 : 0 })
      // context update (optional since not critical for UI here but good for sync)
      updateUser({ ...user, notifications_enabled: newValue ? 1 : 0 })
    } catch (err) {
      console.error("Failed to update notification settings", err)
      // revert on fail
      setNotifEnabled(!newValue)
    }
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSuccessMsg("")
    setErrMsg("")
    try {
      const finalPhone = phoneState.digits ? `${phoneState.prefix} ${phoneState.digits}` : ""
      const payload = {
        username: profileData.username,
        full_name: profileData.full_name,
        email: profileData.email,
        phone: finalPhone,
        notifications_enabled: notifEnabled ? 1 : 0
      }
      const res = await api.put("/users/me", payload)
      setSuccessMsg("Profile updated successfully!")
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

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setUploadingAvatar(true)
    setSuccessMsg("")
    setErrMsg("")
    
    // Show local preview immediately
    setAvatarPreview(URL.createObjectURL(file))
    
    try {
      const formData = new FormData()
      formData.append("avatar", file)
      const res = await api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      updateUser({ ...user, profile_photo: res.data.profile_photo })
      setSuccessMsg("Profile photo updated!")
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (err) {
      setErrMsg(err.response?.data?.message || "Failed to upload photo.")
      setAvatarPreview(null)
    } finally {
      setUploadingAvatar(false)
      if (e.target) e.target.value = ""
    }
  }



  const handleAvatarRemove = async () => {
    if (!window.confirm("Remove your profile photo?")) return
    try {
      await api.delete("/users/me/avatar")
      updateUser({ ...user, profile_photo: null })
      setAvatarPreview(null)
      setAvatarFile(null)
      setSuccessMsg("Profile photo removed.")
    } catch (err) {
      setErrMsg("Failed to remove photo.")
    }
  }

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col">
      <HeaderComponent activePage="settings" onNavigate={onNavigate} />

      <main className="max-w-4xl mx-auto px-6 py-12 w-full flex-grow">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[54px] font-fredoka font-bold text-[#2d3e50] mb-2 leading-tight">Settings</h1>
          <p className="text-[#64748b] text-[17px] font-medium">Manage your personal information and preferences.</p>
        </div>

        {/* Layout */}
        <div className="flex flex-col md:flex-row gap-8">

          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
            <div className="bg-white rounded-[24px] p-3 shadow-sm flex flex-col gap-2">
              <button
                onClick={() => { setActiveTab("profile"); setSuccessMsg(""); setErrMsg("") }}
                className={`flex items-center gap-3 px-4 py-3 rounded-[16px] text-[14px] font-bold transition-all ${activeTab === 'profile' ? 'bg-[#f0f3f8] text-[#1c355e]' : 'text-[#64748b] hover:bg-[#f8fafc]'}`}
              >
                <User size={18} /> Personal Info
              </button>
              <button
                onClick={() => { setActiveTab("security"); setSuccessMsg(""); setErrMsg("") }}
                className={`flex items-center gap-3 px-4 py-3 rounded-[16px] text-[14px] font-bold transition-all ${activeTab === 'security' ? 'bg-[#f0f3f8] text-[#1c355e]' : 'text-[#64748b] hover:bg-[#f8fafc]'}`}
              >
                <Lock size={18} /> Password & Security
              </button>
              <button
                onClick={() => { setActiveTab("notifications"); setSuccessMsg(""); setErrMsg("") }}
                className={`flex items-center gap-3 px-4 py-3 rounded-[16px] text-[14px] font-bold transition-all ${activeTab === 'notifications' ? 'bg-[#f0f3f8] text-[#1c355e]' : 'text-[#64748b] hover:bg-[#f8fafc]'}`}
              >
                <Bell size={18} /> Notifications
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-3 !px-3 !py-3 mt-auto !bg-white text-[#dc2626] border border-[#fee2e2] rounded-[24px] text-[15px] font-bold hover:bg-[#fef2f2] shadow-sm transition-all w-full"
            >
              <LogOut size={20} /> Logout
            </button>
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

                {/* Profile Photo */}
                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-[#f1f5f9]">
                  <div className="relative group">
                    <Avatar
                      src={avatarPreview || user?.profile_photo}
                      name={user?.full_name}
                      size={80}
                      radius="20px"
                      style={{ border: "3px solid #e2e8f0" }}
                    />
                    <button
                      type="button"
                      onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className={`absolute inset-0 rounded-[20px] bg-black/40 flex items-center justify-center transition-opacity ${uploadingAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      {uploadingAvatar ? (
                        <Loader2 size={24} className="text-white animate-spin" />
                      ) : (
                        <Camera size={20} className="text-white" />
                      )}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="font-bold text-[15px] text-[#2d3e50]">{user?.full_name}</p>
                    <p className="text-[12px] text-[#94a3b8] font-medium">JPG, PNG or WebP • Max 5MB</p>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="px-4 py-2 bg-[#f0f3f8] text-[#1c355e] rounded-[12px] text-[13px] font-bold hover:bg-[#e2e8f0] transition-colors disabled:opacity-50"
                      >
                        {uploadingAvatar ? "Updating..." : "Change Photo"}
                      </button>
                      {(user?.profile_photo || avatarPreview) && (
                        <button
                          type="button"
                          onClick={handleAvatarRemove}
                          disabled={uploadingAvatar}
                          className="px-4 py-2 bg-[#fef2f2] text-[#dc2626] rounded-[12px] text-[13px] font-bold hover:bg-[#fee2e2] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">Username</label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                      required
                      className="w-full h-12 px-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                      required
                      className="w-full h-12 px-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">Email Address</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                      required
                      className="w-full h-12 px-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">Phone Number</label>
                    <div className="flex gap-2">
                      <div className="relative w-[110px] flex-shrink-0">
                        <select
                          value={phoneState.prefix}
                          onChange={(e) => setPhoneState(p => ({ ...p, prefix: e.target.value, digits: '' }))}
                          className="w-full h-12 pl-4 pr-8 bg-[#f4f7fb] rounded-[16px] text-[14px] font-bold text-[#3f4a51] border-none outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-[#1c355e]/20"
                        >
                          {PHONE_PREFIXES.map(pf => (
                            <option key={pf.code} value={pf.code}>{pf.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                      </div>
                      <div className="relative flex-grow">
                        <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                        <input
                          type="text"
                          value={phoneState.digits}
                          onChange={(e) => {
                            const config = PHONE_PREFIXES.find(p => p.code === phoneState.prefix) || PHONE_PREFIXES[0]
                            let val = e.target.value.replace(/\D/g, '')
                            if (phoneState.prefix === '+66') val = val.replace(/^0+/, '')
                            if (val.length <= config.max) {
                              setPhoneState(p => ({ ...p, digits: val }))
                            }
                          }}
                          className="w-full h-12 pl-12 pr-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20"
                          placeholder={(PHONE_PREFIXES.find(p => p.code === phoneState.prefix) || PHONE_PREFIXES[0]).placeholder}
                        />
                      </div>
                    </div>
                  </div>
                  {user?.role !== "Super Admin" && (
                    <div>
                      <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-3">Managed Departments</label>
                      {user?.managed_departments && user.managed_departments.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                          {user.managed_departments.map((dept, idx) => (
                            <div key={idx} className="bg-[#4c6367] text-white px-5 py-1.5 rounded-full text-[14px] font-bold flex items-center gap-2 shadow-sm whitespace-nowrap">
                              <Building2 size={16} />
                              {dept}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={profileData.department || "General"}
                          readOnly
                          className="w-full h-12 px-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#94a3b8] cursor-not-allowed outline-none"
                        />
                      )}
                      <p className="text-[11px] text-[#94a3b8] mt-2 ml-1 italic">* Contact Super Admin to change your managed departments.</p>
                    </div>
                  )}
                </div>
                <div className="mt-12 pt-6 border-t border-[#f1f5f9] flex flex-col items-end gap-4">
                  <p className="text-[13px] text-[#64748b] font-medium italic"></p>
                  <button type="submit" className="!px-10 !py-4 !bg-[#1c355e] text-white rounded-[20px] text-[16px] font-bold hover:bg-[#122340] transition-all transform active:scale-95 shadow-xl shadow-[#1c355e]/25 flex items-center gap-3">
                    <BadgeCheck size={22} strokeWidth={2.5} /> Confirm and Save Changes
                  </button>
                </div>
              </form>
            )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                setSuccessMsg("");
                setErrMsg("");
                if (passData.new_password !== passData.confirm_password) {
                  return setErrMsg("New passwords do not match.");
                }
                if (passData.new_password.length < 6) {
                  return setErrMsg("New password must be at least 6 characters.");
                }
                try {
                  await api.put("/users/me/password", {
                    current_password: passData.current_password,
                    new_password: passData.new_password
                  });
                  setSuccessMsg("Password updated successfully!");
                  setPassData({ current_password: "", new_password: "", confirm_password: "" });
                } catch (err) {
                  setErrMsg(err.response?.data?.message || "Failed to update password.");
                }
              }} className="bg-white rounded-[32px] p-8 shadow-sm">
                <h2 className="text-[22px] font-bold font-fredoka text-[#2d3e50] mb-6">Password & Security</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passData.current_password}
                      onChange={e => setPassData({ ...passData, current_password: e.target.value })}
                      required
                      placeholder="Enter current password"
                      className="w-full h-12 px-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">New Password</label>
                    <input
                      type="password"
                      value={passData.new_password}
                      onChange={e => setPassData({ ...passData, new_password: e.target.value })}
                      required
                      placeholder="Enter new password (min. 6 characters)"
                      className="w-full h-12 px-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[800] tracking-widest uppercase text-[#94a3b8] mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={passData.confirm_password}
                      onChange={e => setPassData({ ...passData, confirm_password: e.target.value })}
                      required
                      placeholder="Re-enter new password"
                      className="w-full h-12 px-4 bg-[#f4f7fb] rounded-[16px] text-[14px] font-medium text-[#3f4a51] focus:outline-none focus:ring-2 focus:ring-[#1c355e]/20"
                    />
                  </div>
                </div>
                <div className="mt-10 pt-6 border-t border-[#f1f5f9] flex flex-col items-end gap-4">
                  <button type="submit" className="!px-10 !py-4 !bg-[#1c355e] text-white rounded-[20px] text-[16px] font-bold hover:bg-[#122340] transition-all transform active:scale-95 shadow-xl shadow-[#1c355e]/25 flex items-center gap-3">
                    <Save size={22} strokeWidth={2.5} /> Update Password
                  </button>
                </div>
              </form>

            {activeTab === "notifications" && (
              <div className="bg-white rounded-[32px] p-8 shadow-sm">
                <h2 className="text-[22px] font-bold font-fredoka text-[#2d3e50] mb-6">Notification Preferences</h2>
                <p className="text-[#64748b] text-[15px] font-medium mb-6">Manage how you receive alerts and updates.</p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 border-2 border-[#eef2f9] rounded-[24px] bg-[#f8fafc]">
                    <div>
                      <p className="font-bold text-[15px] text-[#2d3e50] mb-0.5">In-App Alerts</p>
                      <p className="text-[12px] text-[#94a3b8] font-medium">Receive real-time notifications for status updates and comments.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleNotifToggle}
                      className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${notifEnabled ? '!bg-[#16a34a]' : '!bg-[#cbd5e1]'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${notifEnabled ? 'right-1' : 'left-1'}`}></div>
                    </button>
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
