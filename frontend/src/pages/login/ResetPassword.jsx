import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import './Login.css'

const ICON_LOCK = 'M2 21C1.45 21 0.979167 20.8042 0.5875 20.4125C0.195833 20.0208 0 19.55 0 19V9C0 8.45 0.195833 7.97917 0.5875 7.5875C0.979167 7.19583 1.45 7 2 7H3V5C3 3.61667 3.4875 2.4375 4.4625 1.4625C5.4375 0.4875 6.61667 0 8 0C9.38333 0 10.5625 0.4875 11.5375 1.4625C12.5125 2.4375 13 3.61667 13 5V7H14C14.55 7 15.0208 7.19583 15.4125 7.5875C15.8042 7.97917 16 8.45 16 9V19C16 19.55 15.8042 20.0208 15.4125 20.4125C15.0208 20.8042 14.55 21 14 21H2ZM5 7H11V5C11 4.16667 10.7083 3.45833 10.125 2.875C9.54167 2.29167 8.83333 2 8 2C7.16667 2 6.45833 2.29167 5.875 2.875C5.29167 3.45833 5 4.16667 5 5V7Z'
const ICON_EYE = 'M11 15C8.56667 15 6.35 14.3208 4.35 12.9625C2.35 11.6042 0.9 9.78333 0 7.5C0.9 5.21667 2.35 3.39583 4.35 2.0375C6.35 0.679167 8.56667 0 11 0C13.4333 0 15.65 0.679167 17.65 2.0375C19.65 3.39583 21.1 5.21667 22 7.5C21.1 9.78333 19.65 11.6042 17.65 12.9625C15.65 14.3208 13.4333 15 11 15ZM11 13C12.8833 13 14.6125 12.5042 16.1875 11.5125C17.7625 10.5208 18.9667 9.18333 19.8 7.5C18.9667 5.81667 17.7625 4.47917 16.1875 3.4875C14.6125 2.49583 12.8833 2 11 2C9.11667 2 7.3875 2.49583 5.8125 3.4875C4.2375 4.47917 3.03333 5.81667 2.2 7.5C3.03333 9.18333 4.2375 10.5208 5.8125 11.5125C7.3875 12.5042 9.11667 13 11 13ZM11 12C12.25 12 13.3125 11.5625 14.1875 10.6875C15.0625 9.8125 15.5 8.75 15.5 7.5C15.5 6.25 15.0625 5.1875 14.1875 4.3125C13.3125 3.4375 12.25 3 11 3C9.75 3 8.6875 3.4375 7.8125 4.3125C6.9375 5.1875 6.5 6.25 6.5 7.5C6.5 8.75 6.9375 9.8125 7.8125 10.6875C8.6875 11.5625 9.75 12 11 12ZM11 10.2C10.25 10.2 9.6125 9.9375 9.0875 9.4125C8.5625 8.8875 8.3 8.25 8.3 7.5C8.3 6.75 8.5625 6.1125 9.0875 5.5875C9.6125 5.0625 10.25 4.8 11 4.8C11.75 4.8 12.3875 5.0625 12.9125 5.5875C13.4375 6.1125 13.7 6.75 13.7 7.5C13.7 8.25 13.4375 8.8875 12.9125 9.4125C12.3875 9.9375 11.75 10.2 11 10.2Z'

export default function ResetPassword() {
  const { token } = useParams()
  const navigate = useNavigate()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link might be expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp-root">
      <div className="lp-blob lp-blob--blue" />
      <div className="lp-blob lp-blob--red" />
      <div className="lp-blob lp-blob--gold" />
      <div className="lp-corner-logo">
        <img src="/logo.png" alt="FLOW Digital" />
      </div>

      <div className="lp-column">
        <div className="lp-brand">
          <h1 className="lp-brand-title pb-2">Reset Password</h1>
          <p className="lp-brand-sub text-center mx-auto">Create a new secure password.</p>
        </div>

        <div className="lp-card">
          {error && <div className="lp-error">{error}</div>}
          {success && (
            <div style={{ color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', padding: '12px', borderRadius: '12px', fontSize: '14px', marginBottom: '16px', fontWeight: '500', textAlign: 'center' }}>
              Password reset successfully! Redirecting...
            </div>
          )}

          {!success && (
             <form onSubmit={handleSubmit} className="lp-form">
               <div className="lp-field">
                 <label className="lp-label" htmlFor="password">New Password</label>
                 <div className="lp-input-wrap">
                   <svg className="lp-input-icon" viewBox="0 0 16 21" fill="none" width="16" height="20">
                     <path d={ICON_LOCK} fill="#6F7883" />
                   </svg>
                   <input
                     id="password"
                     className="lp-input"
                     type={showPassword ? 'text' : 'password'}
                     placeholder="••••••••"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     required
                     minLength={8}
                     autoFocus
                   />
                   <button
                     type="button"
                     className="lp-eye"
                     onClick={() => setShowPassword(!showPassword)}
                     tabIndex={-1}
                   >
                     <svg viewBox="0 0 22 15" fill="none" width="22" height="14">
                       <path d={ICON_EYE} fill="#6F7883" />
                     </svg>
                   </button>
                 </div>
               </div>

               <div className="lp-field">
                 <label className="lp-label" htmlFor="confirmPassword">Confirm Password</label>
                 <div className="lp-input-wrap">
                   <svg className="lp-input-icon" viewBox="0 0 16 21" fill="none" width="16" height="20">
                     <path d={ICON_LOCK} fill="#6F7883" />
                   </svg>
                   <input
                     id="confirmPassword"
                     className="lp-input"
                     type={showPassword ? 'text' : 'password'}
                     placeholder="••••••••"
                     value={confirmPassword}
                     onChange={(e) => setConfirmPassword(e.target.value)}
                     required
                     minLength={8}
                   />
                 </div>
               </div>

               <button type="submit" className="lp-submit" disabled={loading} style={{ marginTop: '16px'}}>
                 {loading ? <span className="lp-spinner" /> : 'Set New Password'}
               </button>
               
               <div style={{ textAlign: 'center', marginTop: '16px' }}>
                 <button 
                   type="button" 
                   onClick={() => navigate('/login')}
                   className="lp-forgot" 
                   style={{ fontSize: '14px' }}
                 >
                   Cancel
                 </button>
               </div>
             </form>
          )}
        </div>
      </div>
    </div>
  )
}
