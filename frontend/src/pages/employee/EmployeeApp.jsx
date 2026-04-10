import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import Dashboard from "./Dashboard"
import Request from "./Request"
import History from "./History"
import Settings from "../shared/Settings"
import Header from "../../components/Header"

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
      <Route path="settings" element={<Settings onNavigate={handleNavigate} HeaderComponent={Header} />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}
