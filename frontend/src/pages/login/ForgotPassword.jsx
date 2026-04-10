import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import './Login.css'

const ICON_USER = 'M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0Z'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setMessage(res.data.message || 'If that email exists, a reset link has been sent.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset.')
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
          <h1 className="lp-brand-title pb-2">Forgot Password</h1>
          <p className="lp-brand-sub max-w-[300px] text-center mx-auto" style={{lineHeight: '1.5'}}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <div className="lp-card">
          {error && <div className="lp-error">{error}</div>}
          {message && <div style={{ color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', padding: '12px', borderRadius: '12px', fontSize: '14px', marginBottom: '16px', fontWeight: '500', textAlign: 'center' }}>{message}</div>}

          <form onSubmit={handleSubmit} className="lp-form">
            <div className="lp-field">
              <label className="lp-label" htmlFor="email">Email Address</label>
              <div className="lp-input-wrap">
                <svg className="lp-input-icon" viewBox="0 0 16 16" fill="none" width="16" height="15">
                  <path d={ICON_USER} fill="#6F7883" />
                </svg>
                <input
                  id="email"
                  className="lp-input"
                  type="email"
                  placeholder="e.g. alex.smith@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="lp-submit" disabled={loading}>
              {loading ? <span className="lp-spinner" /> : 'Send Reset Link'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                type="button" 
                onClick={() => navigate('/login')}
                className="lp-forgot" 
                style={{ fontSize: '14px' }}
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
