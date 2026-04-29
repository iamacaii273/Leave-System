import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Header from "../../components/Header"
import api from "../../services/api"
import {
  Umbrella, CheckCircle, XCircle,
  ArrowLeft, Calendar, FileText, File, Mail, Phone,
  Briefcase, CalendarDays
} from "lucide-react"
import { resolveLeaveTypeStyle } from "../../utils/leaveTypeUtils"
import Avatar from "../../components/Avatar"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  pending: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  approved: { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  rejected: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  acknowledged: { bg: "#dbeafe", text: "#1e3a8a", border: "#93c5fd" },
  cancelled: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
}

// getIconData is replaced by resolveLeaveTypeStyle from leaveTypeUtils

function formatDate(ds) {
  if (!ds) return "—"
  return new Date(ds).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function formatDateLong(ds) {
  if (!ds) return "—"
  return new Date(ds).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
}
function isSameDayStr(a, b) {
  const d1 = new Date(a), d2 = new Date(b)
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()
}
function formatDurationText(totalDays) {
  if (!totalDays) return "—"
  const totalHours = totalDays * 8
  const days = Math.floor(totalHours / 8)
  const rem = totalHours - days * 8
  const hours = Math.floor(rem)
  const mins = Math.round((rem - hours) * 60)
  const parts = []
  if (days > 0) parts.push(`${days} Day${days !== 1 ? "s" : ""}`)
  if (hours > 0) parts.push(`${hours} Hour${hours !== 1 ? "s" : ""}`)
  if (mins > 0) parts.push(`${mins} Minute${mins !== 1 ? "s" : ""}`)
  return parts.join(", ") || "< 1 Hour"
}
function formatFileSize(bytes) {
  if (bytes == null) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function RequestDetail({ onNavigate }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [actionDone, setActionDone] = useState(false)

  const [cancelHover, setCancelHover] = useState(false)

  useEffect(() => {
    api.get(`/leave-requests/${id}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.message || "Failed to load request."))
      .finally(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    setCancelling(true)
    try {
      await api.put(`/leave-requests/${id}/cancel`, { cancel_reason: cancelReason })
      setData(prev => ({ ...prev, request: { ...prev.request, status: "cancelled", reject_reason: cancelReason || "Cancelled by user" } }))
      setActionDone(true)
    } catch (e) {
      alert(e.response?.data?.message || "Failed to cancel request.")
    } finally {
      setCancelling(false)
    }
  }

  const back = () => navigate(-1)

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#eef2f9", display: "flex", flexDirection: "column" }}>
      <Header activePage="history" onNavigate={onNavigate} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "16px", fontWeight: 600 }}>Loading request…</div>
    </div>
  )
  if (error || !data) return (
    <div style={{ minHeight: "100vh", background: "#eef2f9", display: "flex", flexDirection: "column" }}>
      <Header activePage="history" onNavigate={onNavigate} />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#f56464", fontSize: "16px", fontWeight: 600 }}>{error || "Request not found."}</div>
    </div>
  )

  const { request, files = [] } = data
  const statusStyle = STATUS_STYLES[request.status?.toLowerCase()] || STATUS_STYLES.pending
  const { Icon, color: iconColor, bg: iconBg } = resolveLeaveTypeStyle(request.leave_type_icon, request.leave_type_color)
  const canCancel = !actionDone && request.status === "pending"

  return (
    <div style={{ minHeight: "100vh", background: "#eef2f9", display: "flex", flexDirection: "column" }}>
      <Header activePage="history" onNavigate={onNavigate} />

      <main style={{ maxWidth: "860px", margin: "0 auto", padding: "36px 24px 60px", width: "100%" }}>
        {/* Back */}
        <button onClick={back} style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "24px", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "14px", fontWeight: 700 }}>
          <ArrowLeft size={16} strokeWidth={2.5} /> Back to History
        </button>

        {/* ── Profile & Contact (Same as Manager layout) ── */}
        <div style={{ background: "white", borderRadius: "24px", padding: "24px 28px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flex: "1 1 260px" }}>
            <div style={{ position: "relative", width: "68px", height: "68px", flexShrink: 0 }}>
              <Avatar
                src={request.profile_photo}
                name={request.full_name || "?"}
                size={68}
                radius="18px"
              />
              <span style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "16px", height: "16px", borderRadius: "50%", background: "#0cf1aa", border: "3px solid white" }} />
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

        {/* ── Request Card ── */}
        <div style={{ background: "white", borderRadius: "24px", padding: "24px 28px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon size={17} color={iconColor} strokeWidth={2.5} />
            </div>
            <div>
              <p style={{ fontSize: "17px", fontWeight: 800, color: "#2d3e50" }}>{request.leave_type_name}</p>
              <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                Submitted on {new Date(request.submitted_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "14px", marginBottom: "20px", flexWrap: "wrap", position: "relative" }}>
            {/* Watermark exactly like design reference inside the gray bubbles box! Wait, design puts watermark overlapping the status bubble. 
                I'll put it in a container. */}
            <div style={{ position: "absolute", right: "20px", top: "-20px", opacity: 0.05, pointerEvents: "none" }}>
              <Icon size={120} strokeWidth={2.5} />
            </div>

            <div style={{ background: "#f4f7fb", borderRadius: "24px", padding: "18px 22px", flex: "1 1 200px" }}>
              <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: "6px" }}>Duration</p>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "#2d3e50" }}>{formatDurationText(request.total_days)}</p>
            </div>

            <div style={{ background: statusStyle.bg, border: `2px solid ${statusStyle.border}`, borderRadius: "24px", padding: "18px 22px", flex: "1 1 200px" }}>
              <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: statusStyle.text, opacity: 0.7, marginBottom: "6px" }}>Status</p>
              <p style={{ fontSize: "19px", fontWeight: 800, color: statusStyle.text, display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: statusStyle.text, display: "inline-block" }} />
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
            <Calendar size={15} style={{ color: "#94a3b8", marginTop: "2px", flexShrink: 0 }} strokeWidth={2.5} />
            <div>
              <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#94a3b8", marginBottom: "4px" }}>Date Range</p>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#2d3e50" }}>
                {(() => {
                  const s = request.start_date;
                  const e = request.end_date;
                  if (!s || !e) return "—";

                  const sameDay = isSameDayStr(s, e);
                  const sDate = sameDay ? formatDateLong(s) : formatDate(s);
                  const eDate = formatDate(e);

                  const isFractional = (request.total_days % 1) !== 0;
                  const sTime = new Date(s);
                  const eTime = new Date(e);
                  const isNonStandard = sTime.getHours() !== 9 || sTime.getMinutes() !== 0 || eTime.getHours() !== 17 || eTime.getMinutes() !== 0;

                  if (isFractional || isNonStandard) {
                    const sTimeStr = sTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                    const eTimeStr = eTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                    if (sameDay) {
                      return `${sDate} (${sTimeStr} — ${eTimeStr})`;
                    } else {
                      return `${sDate} ${sTimeStr} — ${eDate} ${eTimeStr}`;
                    }
                  } else {
                    return sameDay ? sDate : `${sDate} — ${eDate}`;
                  }
                })()}
              </p>
            </div>
          </div>

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

          {(request.reject_reason || request.manager_note) && (
            <div style={{ marginTop: "16px", padding: "14px 18px", borderRadius: "12px", background: request.status === "rejected" || request.status === "cancelled" ? "#fee2e2" : "#f0fdf4", borderLeft: `4px solid ${request.status === "rejected" || request.status === "cancelled" ? "#f56464" : "#16a34a"}` }}>
              <p style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: request.status === "rejected" || request.status === "cancelled" ? "#991b1b" : "#166534", marginBottom: "4px" }}>
                {request.status === "cancelled" ? "Cancellation Note" : (request.status === "rejected" ? "Manager's Rejection Reason" : "Manager's Note")}
              </p>
              <p style={{ fontSize: "13px", color: request.status === "rejected" || request.status === "cancelled" ? "#991b1b" : "#166534", fontStyle: "italic" }}>
                {request.reject_reason || request.manager_note}
              </p>
            </div>
          )}
        </div>

        {/* ── Supporting Documents ── */}
        {files.length > 0 && (
          <div style={{ background: "white", borderRadius: "24px", padding: "24px 28px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "15px", fontWeight: 800, color: "#2d3e50", marginBottom: "14px" }}>Supporting Documents</p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {files.map(f => (
                <a
                  key={f.id}
                  href={f.stored_name.startsWith('http') ? f.stored_name : `${import.meta.env.VITE_API_URL?.replace('/api', '') || "http://localhost:5000"}/uploads/${f.stored_name}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{ width: "140px", background: "white", border: "2px solid #f0f4f9", borderRadius: "24px", padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", cursor: "pointer", transition: "border-color 0.15s, transform 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#cdecea"; e.currentTarget.style.transform = "translateY(-2px)" }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#f0f4f9"; e.currentTarget.style.transform = "translateY(0)" }}
                  >
                    <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: "#f4f7fb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <File size={26} color="#478afb" strokeWidth={2} />
                    </div>
                    <p style={{ fontSize: "11px", fontWeight: 800, color: "#2d3e50", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{f.original_name}</p>
                    <p style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700 }}>{formatFileSize(f.size_bytes)}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── Cancel Section ── */}
        {canCancel && (
          <div style={{ background: "white", borderRadius: "24px", padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "14px", fontWeight: 800, color: "#2d3e50", marginBottom: "12px" }}>Reason to Cancel</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              style={{ width: "100%", padding: "16px 20px", background: "#dfdfdf", border: "none", borderRadius: "20px", fontSize: "14px", color: "#3f4a51", resize: "none", outline: "none", marginBottom: "20px", boxSizing: "border-box", fontFamily: "inherit" }}
            />
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                onMouseEnter={() => setCancelHover(true)}
                onMouseLeave={() => setCancelHover(false)}
                style={{
                  width: "280px", height: "54px", borderRadius: "9999px", border: "none",
                  backgroundColor: cancelHover ? "#b91c1c" : "#cb4b4b",
                  color: "white", fontSize: "16px", fontWeight: 700, letterSpacing: "0.02em",
                  cursor: "pointer", transition: "background-color 0.18s, transform 0.12s",
                  transform: cancelHover && !cancelling ? "translateY(-1px)" : "none",
                  boxShadow: cancelHover ? "0 6px 20px rgba(203, 75, 75, 0.45)" : "none",
                  opacity: cancelling ? 0.6 : 1
                }}
              >
                {cancelling ? "Cancelling..." : "Cancel Leave"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
