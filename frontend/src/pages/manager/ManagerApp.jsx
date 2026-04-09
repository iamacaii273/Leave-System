import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import Dashboard from "./Dashboard"

export default function ManagerApp() {
  const navigate = useNavigate()
  const handleNavigate = (page) => navigate(`/manager/${page}`)

  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard onNavigate={handleNavigate} />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}
