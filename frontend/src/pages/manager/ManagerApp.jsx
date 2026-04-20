import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import Dashboard from "./Dashboard"
import Approvals from "./Approvals"
import History from "./History"
import RequestDetail from "./RequestDetail"
import Settings from "../shared/Settings"
import Header from "../../components/Header"

export default function ManagerApp() {
  const navigate = useNavigate()
  const handleNavigate = (page) => navigate(`/manager/${page}`)

  return (
    <Routes>
      <Route path="dashboard"        element={<Dashboard     onNavigate={handleNavigate} />} />
      <Route path="approvals"        element={<Approvals     onNavigate={handleNavigate} />} />
      <Route path="history"          element={<History       onNavigate={handleNavigate} />} />
      <Route path="requests/:id"     element={<RequestDetail onNavigate={handleNavigate} />} />
      <Route path="settings"         element={<Settings      onNavigate={handleNavigate} HeaderComponent={Header} />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}

