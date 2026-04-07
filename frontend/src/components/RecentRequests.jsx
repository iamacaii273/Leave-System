import { Umbrella, Folder, Thermometer } from "lucide-react"

export default function RecentRequests() {
  const requests = [
    { id: 1, type: "Annual Leave", date: "Aug 24 - Aug 28 (5 Days)", status: "Approved", icon: "annual" },
    { id: 2, type: "Personal Leave", date: "Sep 02 (Half Day)", status: "Pending", icon: "personal" },
    { id: 3, type: "Sick Leave", date: "Aug 10 - Aug 12 (2 Days)", status: "Rejected", icon: "sick" }
  ]

  const statusStyles = {
    Approved: { bg: "#0cf1aa", text: "#185b48" },
    Pending: { bg: "#fee481", text: "#6b5413" },
    Rejected: { bg: "#f56464", text: "#ffffff" }
  }

  const iconData = {
    annual: { Icon: Umbrella, color: "#1982c4", bg: "#e6f2fb" },
    personal: { Icon: Folder, color: "#d81159", bg: "#fcedf3" }, 
    sick: { Icon: Thermometer, color: "#f57a00", bg: "#fff2e5" }
  }

  return (
    <div className="bg-white rounded-[40px] p-8 pb-10 shadow-sm flex flex-col w-full h-full">
      <div className="flex items-start justify-between mb-8 px-2 mt-2">
        <div>
          <h3 className="font-bold text-[22px] font-fredoka text-[#3f4a51] mb-1 tracking-wide">Recent Requests</h3>
          <p className="text-[14px] font-medium text-[#94a3b8]">Keep track of your latest movements</p>
        </div>
        <button className="text-[15px] font-bold text-[#5e6c7e] hover:text-[#3f4a51] transition-colors pt-2">View all</button>
      </div>
      <div className="space-y-4">
        {requests.map((req) => {
          const { Icon, color, bg } = iconData[req.icon];
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
                  <p className="font-bold text-[15px] text-[#3f4a51] mb-0.5">{req.type}</p>
                  <p className="text-[13px] font-medium text-[#94a3b8]">{req.date}</p>
                </div>
              </div>
              <span 
                className="px-4 py-1.5 rounded-full text-[12px] font-bold tracking-wide"
                style={{ 
                  backgroundColor: statusStyles[req.status].bg, 
                  color: statusStyles[req.status].text 
                }}
              >
                {req.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}