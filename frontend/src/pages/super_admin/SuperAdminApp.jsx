import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import SuperAdminDashboard from "./Dashboard"
import EditUser from "./EditUser"
import AddUser from "./AddUser"
export default function SuperAdminApp() {
  const navigate = useNavigate()

  const handleNavigate = (page) => {
    navigate(`/superadmin/${page}`)
  }

  return (
    <Routes>
      <Route path="dashboard" element={<SuperAdminDashboard onNavigate={handleNavigate} />} />
      <Route path="edit-user/:userId" element={<EditUser onNavigate={handleNavigate} />} />
      <Route path="add-user" element={<AddUser onNavigate={handleNavigate} />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}
