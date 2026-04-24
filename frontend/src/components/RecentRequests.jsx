import { resolveLeaveTypeStyle } from "../utils/leaveTypeUtils"

/*file ตารางแสดงคำขอลาล่าสุด*/

export default function RecentRequests({ requests = [], onNavigate }) {
  const statusStyles = {
    approved: { bg: "#0cf1aa", text: "#185b48" },
    pending: { bg: "#fee481", text: "#6b5413" },
    rejected: { bg: "#f56464", text: "#570008" },
    cancelled: { bg: "#e2e8f0", text: "#475569" },
    acknowledged: { bg: "#93c5fd", text: "#1e3a8a" },
  }

  // getIconData replaced by resolveLeaveTypeStyle from leaveTypeUtils

  const formatDateShort = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isSameDayStr = (d1Str, d2Str) => {
    const d1 = new Date(d1Str);
    const d2 = new Date(d2Str);
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  const formatDurationText = (totalDays) => {
    const totalHours = totalDays * 8;
    const days = Math.floor(totalHours / 8);
    const remainder = totalHours - (days * 8);
    const hours = Math.floor(remainder);
    const minutes = Math.round((remainder - hours) * 60);

    const parts = [];
    if (days > 0) parts.push(`${days} Day${days !== 1 ? 's' : ''}`);
    if (hours > 0 || (days === 0 && minutes === 0)) parts.push(`${hours} Hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} Min${minutes !== 1 ? 's' : ''}`);
    return parts.join(', ');
  };

  return (
    <div className="bg-white rounded-[40px] p-8 pb-10 shadow-sm flex flex-col w-full h-full">
      <div className="flex items-start justify-between mb-8 px-2 mt-2">
        <div>
          <h3 className="font-bold text-[22px] font-fredoka text-[#3f4a51] mb-1 tracking-wide">Recent Requests</h3>
          <p className="text-[14px] font-medium text-[#94a3b8]">Keep track of your latest movements</p>
        </div>
        <button onClick={() => onNavigate && onNavigate("history")} className="text-[15px] font-bold text-[#5e6c7e] hover:text-[#3f4a51] transition-colors pt-2">View all</button>
      </div>
      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-[14px] font-medium text-center text-[#94a3b8] py-8">No recent leave requests found.</p>
        ) : (
          requests.map((req) => {
            const { Icon, color, bg } = resolveLeaveTypeStyle(req.leave_type_icon, req.leave_type_color);
            const styleLabel = statusStyles[req.status.toLowerCase()] || statusStyles.pending;

            let dateRange = formatDateShort(req.start_date);
            const sTime = new Date(req.start_date);
            const eTime = new Date(req.end_date);
            const isFractional = (req.total_days % 1) !== 0;
            const isNonStandard = sTime.getHours() !== 9 || sTime.getMinutes() !== 0 || eTime.getHours() !== 17 || eTime.getMinutes() !== 0;

            if (isFractional || isNonStandard) {
              const sTimeStr = sTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              const eTimeStr = eTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              if (isSameDayStr(req.start_date, req.end_date)) {
                dateRange = `${formatDateShort(req.start_date)} (${sTimeStr} - ${eTimeStr})`;
              } else {
                dateRange = `${formatDateShort(req.start_date)} ${sTimeStr} - ${formatDateShort(req.end_date)} ${eTimeStr}`;
              }
            } else {
              if (!isSameDayStr(req.start_date, req.end_date)) {
                dateRange += ` - ${formatDateShort(req.end_date)}`;
              }
            }

            return (
              <div key={req.id} className="flex items-center justify-between p-4 bg-[#f9fafb] rounded-[24px]">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center p-3"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon color={color} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="font-bold text-[15px] text-[#3f4a51] mb-0.5">{req.leave_type_name}</p>
                    <p className="text-[13px] font-medium text-[#94a3b8]">{dateRange} ({formatDurationText(req.total_days)})</p>
                  </div>
                </div>
                <span
                  className="px-4 py-1.5 rounded-full text-[12px] font-bold tracking-wide capitalize"
                  style={{
                    backgroundColor: styleLabel.bg,
                    color: styleLabel.text
                  }}
                >
                  {req.status}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}