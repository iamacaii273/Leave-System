import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import Dashboard from "./Dashboard"
import Request from "./Request"
import History from "./History"

export default function EmployeeApp() {
  const navigate = useNavigate()

  const handleNavigate = (page) => {
    navigate(`/employee/${page}`)
  }

  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard onNavigate={handleNavigate} />} />
      <Route path="request" element={<Request onNavigate={handleNavigate} />} />
      <Route path="history" element={<History onNavigate={handleNavigate} />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}
