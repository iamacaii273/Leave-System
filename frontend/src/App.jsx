import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

import Login from './pages/login/Login'
import ProtectedRoute from './components/ProtectedRoute'
import EmployeeApp from './pages/employee/EmployeeApp'

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

          {/* Employee pages */}
          <Route path="/employee/*" element={
            <ProtectedRoute>
              <EmployeeApp />
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
