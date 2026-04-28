import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DepartmentProvider } from './contexts/DepartmentContext'

import Login from './pages/login/Login'
import ForgotPassword from './pages/login/ForgotPassword'
import ResetPassword from './pages/login/ResetPassword'
import ProtectedRoute from './components/ProtectedRoute'
import EmployeeApp from './pages/employee/EmployeeApp'
import HrApp from './pages/hr/HrApp'
import ManagerApp from './pages/manager/ManagerApp'
import SuperAdminApp from './pages/super_admin/SuperAdminApp'
import Unauthorized from './pages/Unauthorized'

import './index.css'

/* ── App ──────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DepartmentProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
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

            {/* HR pages */}
            <Route path="/hr/*" element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <HrApp />
              </ProtectedRoute>
            } />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </DepartmentProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
