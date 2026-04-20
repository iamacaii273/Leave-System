import { Umbrella, Thermometer, Users, Plane, Smile, HeartHandshake, PartyPopper, MoreHorizontal } from "lucide-react"

// Color name → hex background (matches LeaveType.jsx colorStyles)
const COLOR_MAP = {
  blue:   "#a3dfff",
  pink:   "#ffafe3",
  orange: "#fac47f",
  green:  "#B1EFD8",
}

// Icon name (stored in DB) → Lucide component
const ICON_MAP = {
  umbrella:    Umbrella,
  thermometer: Thermometer,
  user:        Users,
  plane:       Plane,
  smile:       Smile,
  heart:       HeartHandshake,
  party:       PartyPopper,
  more:        MoreHorizontal,
}

export default function LeaveBalanceCard({ title, used, total, colorType, iconName }) {
  const safeUsed = Number(used) || 0;
  const safeTotal = Number(total) || 1; 
  const percentage = (safeUsed / safeTotal) * 100

  const Icon = ICON_MAP[iconName] || Umbrella;
  const bgColor = COLOR_MAP[colorType] || "#e2e8f0";

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
      style={{ backgroundColor: bgColor }}
    >
      <div className="relative z-10" style={{ color: "#2d3748" }}>
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
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%`, backgroundColor: "rgba(0,0,0,0.6)" }}
          />
        </div>
      </div>

      {/* Watermark Icon */}
      <div
        className="absolute -bottom-4 -right-4 opacity-15 rotate-12"
        style={{ color: "#2d3748" }}
      >
        <Icon size={120} strokeWidth={2.5} />
      </div>
    </div>
  )
}