import { Thermometer, Folder, Umbrella } from "lucide-react"

export default function LeaveBalanceCard({ title, used, total, variant }) {
  const variants = {
    sick: { 
      bg: "#fcd385", 
      text: "#394856", 
      barBg: "rgba(57, 72, 86, 0.2)",
      icon: Thermometer
    },
    personal: { 
      bg: "#ffabdf", 
      text: "#394856", 
      barBg: "rgba(57, 72, 86, 0.2)",
      icon: Folder
    },
    annual: { 
      bg: "#aedffb", 
      text: "#185b48", 
      barBg: "rgba(24, 91, 72, 0.2)",
      icon: Umbrella
    }
  }
  
  const style = variants[variant]
  const percentage = (used / total) * 100
  const Icon = style.icon

  return (
    <div 
      className="relative overflow-hidden rounded-[36px] p-7 min-w-[240px] flex-1 max-w-[320px] transition-transform hover:scale-[1.02]"
      style={{ backgroundColor: style.bg }}
    >
      <div className="relative z-10" style={{ color: style.text }}>
        <p className="text-[15px] font-bold mb-2">{title}</p>
        <div className="flex items-baseline gap-1 mb-8">
          <span className="text-5xl font-bold font-fredoka tracking-wide">
            {String(used).padStart(2, "0")}
          </span>
          <span className="text-[15px] font-bold opacity-80">/ {total < 10 ? total : total} {total > 9 ? 'days' : 'days'}</span>
        </div>
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