import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/*คอยตรวจเช็กว่า "User ล็อกอินเข้ามาหรือยัง? หากยังไม่ล็อกอิน จะกลับไปที่หน้า Login เสมอ */

/**
 * ProtectedRoute wraps pages that require authentication.
 * Optionally restricts access to specific roles.
 *
 * Usage:
 *   <Route element={<ProtectedRoute allowedRoles={['HR','Super Admin']} />}>
 *     <Route path="..." element={<Page />} />
 *   </Route>
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    )
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
