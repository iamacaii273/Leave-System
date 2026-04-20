import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import SuperAdminDashboard from "./Dashboard"
import EditUser from "./EditUser"

export default function SuperAdminApp() {
  const navigate = useNavigate()

  const handleNavigate = (page) => {
    navigate(`/superadmin/${page}`)
  }

  return (
    <Routes>
      <Route path="dashboard" element={<SuperAdminDashboard onNavigate={handleNavigate} />} />
      <Route path="edit-user/:userId" element={<EditUser onNavigate={handleNavigate} />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}
