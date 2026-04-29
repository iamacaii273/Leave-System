import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import SuperAdminDashboard from "./Dashboard"
import EditUser from "./EditUser"
import AddUser from "./AddUser"
import Departments from "./Departments"
import Positions from "./Positions"
import Settings from "../shared/Settings"
import Header from "../../components/Header"
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
      <Route path="departments" element={<Departments onNavigate={handleNavigate} />} />
      <Route path="positions" element={<Positions onNavigate={handleNavigate} />} />
      <Route path="settings" element={<Settings onNavigate={handleNavigate} HeaderComponent={Header} />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}
