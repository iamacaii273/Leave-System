import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Header from "../../components/Header"
import api from "../../services/api"
import {
  Umbrella, CheckCircle, XCircle,
  ArrowLeft, Calendar, FileText, File, Mail, Phone,
  Briefcase, CalendarDays, ChevronLeft, ChevronRight,
  Thermometer, Users
} from "lucide-react"
import { resolveLeaveTypeStyle } from "../../utils/leaveTypeUtils"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending:      { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  approved:     { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  rejected:     { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  acknowledged: { bg: "#dbeafe", text: "#1e3a8a", border: "#93c5fd" },
  cancelled:    { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
}

// getIconData replaced by resolveLeaveTypeStyle from leaveTypeUtils

function formatDate(ds) {
  if (!ds) return "—"
  return new Date(ds).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function formatDateLong(ds) {
  if (!ds) return "—"
  return new Date(ds).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
}
function formatDateShort(ds) {
  return new Date(ds).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
function isSameDayStr(a, b) {
  const d1 = new Date(a), d2 = new Date(b)
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}
function formatDurationText(totalDays) {
  if (!totalDays) return "—"
  const totalHours = totalDays * 8
  const days  = Math.floor(totalHours / 8)
  const rem   = totalHours - days * 8
  const hours = Math.floor(rem)
  const mins  = Math.round((rem - hours) * 60)
  const parts = []
  if (days  > 0) parts.push(`${days} Day${days !== 1 ? "s" : ""}`)
  if (hours > 0) parts.push(`${hours} Hour${hours !== 1 ? "s" : ""}`)
  if (mins  > 0) parts.push(`${mins} Minute${mins !== 1 ? "s" : ""}`)
  return parts.join(", ") || "< 1 Hour"
}
function formatFileSize(bytes) {
  if (bytes == null) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState("")
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", padding: "16px" }}>
      <div style={{ backgroundColor: "#fff", borderRadius: "32px", padding: "32px", width: "100%", maxWidth: "440px", boxShadow: "0 25px 60px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: "22px", color: "#2d3e50", marginBottom: "8px" }}>Reject Request</h2>
        <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>Provide an optional reason for rejection.</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for rejection (optional)…"
          rows={3}
          style={{ width: "100%", padding: "14px 16px", backgroundColor: "#f4f7fb", color: "#3f4a51", fontSize: "14px", borderRadius: "16px", border: "none", resize: "none", outline: "none", marginBottom: "20px", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={onCancel} style={{ flex: 1, height: "48px", borderRadius: "16px", border: "2px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            style={{ flex: 1, height: "48px", borderRadius: "16px", border: "none", backgroundColor: "#f56464", color: "#ffffff", fontWeight: 700, fontSize: "14px", cursor: "pointer", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Rejecting…" : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 2

// ─── RequestDetail Page ───────────────────────────────────────────────────────
export default function RequestDetail({ onNavigate }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [comment, setComment] = useState("")
  const [histPage, setHistPage] = useState(1)

  const [actionLoading,   setActionLoading]   = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [actionDone,      setActionDone]      = useState(false)

  // Button hover state
  const [appHover, setAppHover] = useState(false)
  const [rejHover, setRejHover] = useState(false)

  useEffect(() => {
    api.get(`/leave-requests/${id}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || "Failed to load request."))
      .finally(() => setLoading(false))
  }, [id])

  async function handleApprove() {
    setActionLoading("approve")
    try {
      await api.put(`/leave-requests/${id}/approve`)
      setData(prev => ({ ...prev, request: { ...prev.request, status: "approved" } }))
      setActionDone(true)
    } catch (e) {
      alert(e.response?.data?.message || "Failed to approve.")
    } finally { setActionLoading(null) }
  }

  async function handleReject(reason) {
    setActionLoading("reject")
    try {
      await api.put(`/leave-requests/${id}/reject`, { reject_reason: reason })
      setData(prev => ({ ...prev, request: { ...prev.request, status: "rejected" } }))
      setShowRejectModal(false)
      setActionDone(true)
    } catch (e) {
      alert(e.response?.data?.message || "Failed to reject.")
    } finally { setActionLoading(null) }
  }

  const back = () => navigate(-1)

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#eef2f9", display: "flex", flexDirection: "column" }}>
      <Header activePage="approvals" onNavigate={onNavigate} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "16px", fontWeight: 600 }}>Loading request…</div>
    </div>
  )
  if (error || !data) return (
    <div style={{ minHeight: "100vh", background: "#eef2f9", display: "flex", flexDirection: "column" }}>
      <Header activePage="approvals" onNavigate={onNavigate} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#f56464", fontSize: "16px", fontWeight: 600 }}>{error || "Request not found."}</div>
    </div>
  )

  const { request, files = [], history = [], balance } = data
  const statusStyle = STATUS_STYLES[request.status?.toLowerCase()] || STATUS_STYLES.pending
  const { Icon, color: iconColor, bg: iconBg } = resolveLeaveTypeStyle(request.leave_type_icon, request.leave_type_color)
  const canAct = !actionDone && (request.status === "pending" || request.status === "acknowledged")

  // Pagination
  const totalPages = Math.ceil(history.length / PAGE_SIZE)
  const pagedHistory = history.slice((histPage - 1) * PAGE_SIZE, histPage * PAGE_SIZE)

  return (
    <div style={{ minHeight: "100vh", background: "#eef2f9", display: "flex", flexDirection: "column" }}>
      {showRejectModal && (
        <RejectModal onConfirm={handleReject} onCancel={() => setShowRejectModal(false)} loading={actionLoading === "reject"} />
      )}

      <Header activePage="approvals" onNavigate={onNavigate} />

      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "36px 24px 60px", width: "100%" }}>

        {/* Back */}
        <button onClick={back} style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "24px", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "14px", fontWeight: 700 }}>
          <ArrowLeft size={16} strokeWidth={2.5} /> Back
        </button>

        {/* ── Employee Profile ── */}
        <div style={{ background: "white", borderRadius: "24px", padding: "24px 28px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flex: "1 1 260px" }}>
            <div style={{ width: "68px", height: "68px", borderRadius: "18px", background: "#cdecea", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
              <span style={{ fontSize: "26px", fontWeight: 800, color: "#466063" }}>{(request.full_name || "?")[0].toUpperCase()}</span>
              <span style={{ position: "absolute", bottom: "4px", right: "4px", width: "14px", height: "14px", borderRadius: "50%", background: "#0cf1aa", border: "2px solid white" }} />
            </div>
            <div>
              <h2 style={{ fontFamily: "Fredoka, sans-serif", fontSize: "24px", fontWeight: 700, color: "#2d3e50", marginBottom: "6px" }}>{request.full_name}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {request.position && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>
                    <Briefcase size={12} strokeWidth={2.5} />{request.position}
                  </div>
                )}
                {request.hire_date && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "13px", fontWeight: 600 }}>
                    <CalendarDays size={12} strokeWidth={2.5} />Hire Date: {formatDate(request.hire_date)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div style={{ flex: "0 0 auto", background: "#f8fafc", borderRadius: "18px", padding: "18px 22px", minWidth: "230px" }}>
            <p style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: "12px" }}>Contact Details</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e6f2fb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Mail size={14} color="#1982c4" strokeWidth={2.5} />
                </div>
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8" }}>Work Email</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#2d3e50" }}>{request.email || "—"}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#cdecea", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Phone size={14} color="#185b48" strokeWidth={2.5} />
                </div>
                <div>
                  <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8" }}>Mobile Number</p>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#2d3e50" }}>{request.phone || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Leave Request Details ── */}
        <div style={{ background: "white", borderRadius: "24px", padding: "24px 28px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>

          {/* Type header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={17} color={iconColor} strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ fontSize: "17px", fontWeight: 800, color: "#2d3e50" }}>{request.leave_type_name}</p>
              <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                Submitted on {new Date(request.submitted_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* ── Row: [Duration | Status] + [Leave Quota] ── */}
          <div style={{ display: "flex", gap: "14px", marginBottom: "20px", flexWrap: "wrap" }}>

            {/* Left column: Duration + Status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: "1 1 280px" }}>
              {/* Duration */}
              <div style={{ background: "#f4f7fb", borderRadius: "14px", padding: "14px 18px" }}>
                <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: "6px" }}>Duration</p>
                <p style={{ fontSize: "19px", fontWeight: 800, color: "#2d3e50" }}>{formatDurationText(request.total_days)}</p>
              </div>

              {/* Status */}
              <div style={{ borderRadius: "14px", padding: "14px 18px", backgroundColor: statusStyle.bg, border: `2px solid ${statusStyle.border}` }}>
                <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: statusStyle.text, opacity: 0.7, marginBottom: "6px" }}>Status</p>
                <p style={{ fontSize: "19px", fontWeight: 800, color: statusStyle.text, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: statusStyle.text, display: "inline-block" }} />
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </p>
              </div>
            </div>

            {/* Right column: Leave Quota — same style as LeaveBalanceCard */}
            {balance && (() => {
              const typeName = request.leave_type_name?.toLowerCase() || ""
              const variant = typeName.includes("sick")
                ? { bg: "#fcaf85ff", text: "#394856", barBg: "rgba(57,72,86,0.2)", Icon: Thermometer }
                : typeName.includes("personal")
                ? { bg: "#ffabdf",   text: "#394856", barBg: "rgba(57,72,86,0.2)", Icon: Users }
                : { bg: "#aedffb",   text: "#185b48", barBg: "rgba(24,91,72,0.2)", Icon: Umbrella }
              const used  = Math.round(Number(balance.used_days))
              const total = Math.round(Number(balance.total_days))
              const pct   = total > 0 ? (used / total) * 100 : 0
              const WIcon = variant.Icon
              return (
                <div style={{
                  flex: "0 0 auto", minWidth: "200px",
                  borderRadius: "28px",
                  backgroundColor: variant.bg,
                  padding: "24px 24px 22px",
                  position: "relative", overflow: "hidden",
                  display: "flex", flexDirection: "column", justifyContent: "center",
                }}>
                  <div style={{ position: "relative", zIndex: 1, color: variant.text }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>
                       Leave Quota
                    </p>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "2px" }}>
                      <span style={{ fontSize: "48px", fontWeight: 700, fontFamily: "Fredoka, sans-serif", letterSpacing: "0.02em", lineHeight: 1 }}>
                        {used}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 700, opacity: 0.8 }}>/ {total} days</span>
                    </div>
                    <p style={{ fontSize: "12px", fontWeight: 700, opacity: 0.8, letterSpacing: "0.05em", marginBottom: "14px" }}>
                      {used} day{used !== 1 ? "s" : ""} used
                    </p>
                    {/* Progress bar */}
                    <div style={{ height: "6px", borderRadius: "9999px", overflow: "hidden", backgroundColor: variant.barBg }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: "9999px", backgroundColor: variant.text, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                  {/* Watermark icon */}
                  <div style={{ position: "absolute", bottom: "-14px", right: "-14px", opacity: 0.15, transform: "rotate(12deg)", color: variant.text }}>
                    <WIcon size={110} strokeWidth={2.5} />
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Date range */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
            <Calendar size={15} style={{ color: "#94a3b8", marginTop: "2px", flexShrink: 0 }} strokeWidth={2.5} />
            <div>
              <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: "4px" }}>Date Range</p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#2d3e50" }}>
                {isSameDayStr(request.start_date, request.end_date)
                  ? formatDateLong(request.start_date)
                  : `${formatDate(request.start_date)} — ${formatDate(request.end_date)}`}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <FileText size={15} style={{ color: "#94a3b8", marginTop: "2px", flexShrink: 0 }} strokeWidth={2.5} />
            <div>
              <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: "4px" }}>Reason / Notes</p>
              {request.reason
                ? <p style={{ fontSize: "14px", fontWeight: 500, color: "#3f4a51", fontStyle: "italic", lineHeight: "1.6" }}>"{request.reason}"</p>
                : <p style={{ fontSize: "14px", color: "#b0bac6", fontStyle: "italic" }}>No reason provided.</p>
              }
            </div>
          </div>

          {request.reject_reason && (
            <div style={{ marginTop: "16px", padding: "14px 18px", borderRadius: "12px", background: "#fee2e2", borderLeft: "4px solid #f56464" }}>
              <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#991b1b", marginBottom: "4px" }}>Rejection Reason</p>
              <p style={{ fontSize: "13px", color: "#991b1b", fontStyle: "italic" }}>{request.reject_reason}</p>
            </div>
          )}
        </div>

        {/* ── Last Submitted ── */}
        {history.length > 0 && (
          <div style={{ background: "white", borderRadius: "24px", padding: "24px 28px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "15px", fontWeight: 800, color: "#2d3e50", marginBottom: "14px" }}>Last Submitted</p>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {pagedHistory.map((h, idx) => {
                const { Icon: HIcon, color: hColor, bg: hBg } = resolveLeaveTypeStyle(h.leave_type_icon, h.leave_type_color)
                const hStyle = STATUS_STYLES[h.status?.toLowerCase()] || STATUS_STYLES.pending
                const hRange = isSameDayStr(h.start_date, h.end_date)
                  ? formatDateShort(h.start_date)
                  : `${formatDateShort(h.start_date)} – ${formatDateShort(h.end_date)}`
                return (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 0", borderBottom: idx < pagedHistory.length - 1 ? "1px solid #f0f4f9" : "none" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#cdecea", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "14px", fontWeight: 800, color: "#466063" }}>
                      {(request.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ minWidth: "110px" }}>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#2d3e50" }}>{request.full_name}</p>
                      <p style={{ fontSize: "11px", color: "#94a3b8" }}>{request.position || ""}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "120px" }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: hBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <HIcon size={13} color={hColor} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8" }}>TYPE</p>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#3f4a51" }}>{h.leave_type_name}</p>
                      </div>
                    </div>
                    <div style={{ minWidth: "130px" }}>
                      <p style={{ fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8" }}>DURATION</p>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#2d3e50" }}>{hRange}</p>
                      <p style={{ fontSize: "10px", color: "#94a3b8" }}>{formatDurationText(h.total_days)}</p>
                    </div>
                    <div style={{ marginLeft: "auto" }}>
                      <span style={{ padding: "4px 12px", borderRadius: "9999px", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", backgroundColor: hStyle.bg, color: hStyle.text }}>
                        {h.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #f0f4f9" }}>
              <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                Showing {(histPage - 1) * PAGE_SIZE + 1}–{Math.min(histPage * PAGE_SIZE, history.length)} of {history.length}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  onClick={() => setHistPage(p => Math.max(1, p - 1))}
                  disabled={histPage === 1}
                  style={{ width: "28px", height: "28px", borderRadius: "50%", border: "none", background: histPage === 1 ? "#f4f7fb" : "#eef2f9", color: histPage === 1 ? "#cbd5e1" : "#64748b", cursor: histPage === 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setHistPage(p)}
                    style={{ width: "28px", height: "28px", borderRadius: "50%", border: "none", background: p === histPage ? "#3b82f6" : "#eef2f9", color: p === histPage ? "#ffffff" : "#64748b", fontWeight: p === histPage ? 900 : 600, fontSize: "12px", cursor: "pointer" }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setHistPage(p => Math.min(totalPages, p + 1))}
                  disabled={histPage === totalPages}
                  style={{ width: "28px", height: "28px", borderRadius: "50%", border: "none", background: histPage === totalPages ? "#f4f7fb" : "#eef2f9", color: histPage === totalPages ? "#cbd5e1" : "#64748b", cursor: histPage === totalPages ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Supporting Documents ── */}
        {files.length > 0 && (
          <div style={{ background: "white", borderRadius: "24px", padding: "24px 28px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "15px", fontWeight: 800, color: "#2d3e50", marginBottom: "14px" }}>Supporting Documents</p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {files.map(f => (
                <a
                  key={f.id}
                  href={`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/uploads/${f.stored_name}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{ width: "120px", background: "#f4f7fb", borderRadius: "16px", padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#e8edf5"}
                    onMouseLeave={e => e.currentTarget.style.background = "#f4f7fb"}
                  >
                    <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <File size={22} color="#1982c4" strokeWidth={2} />
                    </div>
                    <p style={{ fontSize: "11px", fontWeight: 700, color: "#3f4a51", textAlign: "center", wordBreak: "break-all" }}>{f.original_name}</p>
                    <p style={{ fontSize: "10px", color: "#94a3b8" }}>{formatFileSize(f.size_bytes)}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Manager Comment + Actions ── */}
        {canAct && (
          <div style={{ background: "white", borderRadius: "24px", padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "15px", fontWeight: 800, color: "#2d3e50", marginBottom: "10px" }}>Manager's Comment</p>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add a comment…"
              rows={3}
              style={{ width: "100%", padding: "14px 18px", background: "#f4f7fb", border: "none", borderRadius: "16px", fontSize: "14px", color: "#3f4a51", resize: "none", outline: "none", marginBottom: "18px", boxSizing: "border-box", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", gap: "14px" }}>
              {/* Approve / Confirm Approval */}
              <button
                onClick={handleApprove}
                disabled={!!actionLoading}
                onMouseEnter={() => setAppHover(true)}
                onMouseLeave={() => setAppHover(false)}
                style={{
                  flex: 1, height: "52px", borderRadius: "9999px", border: "none",
                  backgroundColor: request.status === "acknowledged"
                    ? (appHover ? "#60a5fa" : "#93c5fd")
                    : (appHover ? "#6ee7b7" : "#bbf7d0"),
                  color: request.status === "acknowledged" ? "#1e3a8a" : "#065f46",
                  fontSize: "15px", fontWeight: 800,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: "8px",
                  opacity: actionLoading ? 0.6 : 1,
                  transition: "background-color 0.18s, transform 0.12s",
                  transform: appHover && !actionLoading ? "translateY(-1px)" : "none",
                  boxShadow: appHover && !actionLoading
                    ? request.status === "acknowledged"
                      ? "0 6px 20px rgba(96,165,250,0.45)"
                      : "0 6px 20px rgba(110,231,183,0.5)"
                    : "none",
                }}
              >
                <CheckCircle size={18} strokeWidth={2.5} />
                {actionLoading === "approve"
                  ? "Approving…"
                  : request.status === "acknowledged"
                  ? "Confirm Approval"
                  : "Approve Request"}
              </button>

              {/* Reject — hidden for acknowledged requests */}
              {request.status !== "acknowledged" && (
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={!!actionLoading}
                  onMouseEnter={() => setRejHover(true)}
                  onMouseLeave={() => setRejHover(false)}
                  style={{
                    flex: 1, height: "52px", borderRadius: "9999px", border: "none",
                    backgroundColor: rejHover ? "#f87171" : "#fda4af",
                    color: "#7f1d1d", fontSize: "15px", fontWeight: 800,
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: "8px",
                    opacity: actionLoading ? 0.6 : 1,
                    transition: "background-color 0.18s, transform 0.12s",
                    transform: rejHover && !actionLoading ? "translateY(-1px)" : "none",
                    boxShadow: rejHover && !actionLoading ? "0 6px 20px rgba(248,113,113,0.45)" : "none",
                  }}
                >
                  <XCircle size={18} strokeWidth={2.5} />
                  Reject Request
                </button>
              )}
            </div>
            <p style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8", fontWeight: 600, marginTop: "12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              An automated notification will be sent to the employee
            </p>
          </div>
        )}

        {!canAct && !actionDone && (
          <div style={{ background: "white", borderRadius: "24px", padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", textAlign: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "9999px", backgroundColor: statusStyle.bg, color: statusStyle.text, fontSize: "14px", fontWeight: 800 }}>
              This request has been <strong>{request.status}</strong>.
            </span>
          </div>
        )}
      </main>
    </div>
  )
}

