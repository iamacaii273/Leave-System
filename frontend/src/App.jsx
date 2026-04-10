import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

import Login from './pages/login/Login'
import ProtectedRoute from './components/ProtectedRoute'
import EmployeeApp from './pages/employee/EmployeeApp'
import ManagerApp from './pages/manager/ManagerApp'
import SuperAdminApp from './pages/super_admin/SuperAdminApp'
import Unauthorized from './pages/Unauthorized'

import './index.css'
import './App.css'

/* ── App ──────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Employee pages — Employee role only */}
          <Route path="/employee/*" element={
            <ProtectedRoute allowedRoles={["Employee"]}>
              <EmployeeApp />
            </ProtectedRoute>
          } />

          {/* Manager pages — Manager role only */}
          <Route path="/manager/*" element={
            <ProtectedRoute allowedRoles={["Manager"]}>
              <ManagerApp />
            </ProtectedRoute>
          } />

          {/* Super Admin pages — Super Admin role only */}
          <Route path="/superadmin/*" element={
            <ProtectedRoute allowedRoles={["Super Admin"]}>
              <SuperAdminApp />
            </ProtectedRoute>
          } />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
