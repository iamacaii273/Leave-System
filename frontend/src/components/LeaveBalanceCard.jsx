import { Thermometer, Users, Umbrella } from "lucide-react"

export default function LeaveBalanceCard({ title, used, total, variant }) {
  const variants = {
    sick: {
      bg: "#fcaf85ff",
      text: "#394856",
      barBg: "rgba(57, 72, 86, 0.2)",
      icon: Thermometer
    },
    personal: {
      bg: "#ffabdf",
      text: "#394856",
      barBg: "rgba(57, 72, 86, 0.2)",
      icon: Users
    },
    annual: {
      bg: "#aedffb",
      text: "#185b48",
      barBg: "rgba(24, 91, 72, 0.2)",
      icon: Umbrella
    }
  }

  const safeUsed = Number(used) || 0;
  const safeTotal = Number(total) || 1; 
  const style = variants[variant]
  const percentage = (safeUsed / safeTotal) * 100
  const Icon = style.icon

  const formattedUsed = Number(safeUsed.toFixed(1));
  const formattedTotal = Number(safeTotal.toFixed(1));

  const totalHoursUsed = safeUsed * 8;
  const daysUsed = Math.floor(totalHoursUsed / 8);
  const hrsUsed = Math.floor(totalHoursUsed - (daysUsed * 8));
  const minsUsed = Math.round((totalHoursUsed - (daysUsed * 8) - hrsUsed) * 60);

  let parts = [];
  if (daysUsed > 0) parts.push(`${daysUsed}d`);
  if (hrsUsed > 0) parts.push(`${hrsUsed}h`);
  if (minsUsed > 0) parts.push(`${minsUsed}m`);
  const usedText = parts.length > 0 ? parts.join(" ") + " used" : "0d used";

  return (
    <div
      className="relative overflow-hidden rounded-[36px] p-7 min-w-[240px] flex-1 max-w-[320px] transition-transform hover:scale-[1.02]"
      style={{ backgroundColor: style.bg }}
    >
      <div className="relative z-10" style={{ color: style.text }}>
        <p className="text-[15px] font-bold mb-2">{title}</p>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-5xl font-bold font-fredoka tracking-wide">
            {formattedUsed}
          </span>
          <span className="text-[15px] font-bold opacity-80">/ {formattedTotal} days</span>
        </div>
        <p className="text-[13px] font-bold opacity-80 tracking-wide mb-4 mt-1">
          {usedText}
        </p>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: style.barBg }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%`, backgroundColor: style.text }}
          />
        </div>
      </div>

      {/* Watermark Icon */}
      <div
        className="absolute -bottom-4 -right-4 opacity-15 rotate-12"
        style={{ color: style.text }}
      >
        <Icon size={120} strokeWidth={2.5} />
      </div>
    </div>
  )
}