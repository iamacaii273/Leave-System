import { useState, useEffect } from "react"
import Header from "../../components/Header"
import LeaveBalanceCard from "../../components/LeaveBalanceCard"
import RecentRequests from "../../components/RecentRequests"
import TeamMembersOut from "../../components/TeamMembersOut"
import { useAuth } from "../../contexts/AuthContext"
import api from "../../services/api"

// Quote templates — {days} and {type} are replaced at runtime
const QUOTE_TEMPLATES = [
  { text: "Your pillowy sanctuary is ready. You have ", suffix: " of {type} left to spend on some sun!" },
  { text: "Time to recharge! You still have ", suffix: " of {type} waiting for you." },
  { text: "Don't forget — you've got ", suffix: " of {type} remaining. Use them wisely!" },
  { text: "Adventure awaits! You have ", suffix: " of {type} left. Where will you go?" },
  { text: "Need a breather? You have ", suffix: " of {type} you can use anytime." },
  { text: "Life's too short to skip rest. You have ", suffix: " of {type} left to enjoy!" },
]

function getTimeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth()
  const [balances, setBalances] = useState([])
  const [requests, setRequests] = useState([])
  const [teamOut, setTeamOut] = useState([])
  const [randomQuote, setRandomQuote] = useState({ text: "Loading your balance...", value: "", suffix: "" })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const balRes = await api.get('/leave-balances/me').catch(e => ({ data: { balances: [] } }));
        const reqRes = await api.get('/leave-requests/me').catch(e => ({ data: { leaveRequests: [] } }));
        const teamRes = await api.get('/leave-requests/team').catch(e => ({ data: { leaveRequests: [] } }));
        
        const availableBalances = balRes.data.balances || [];
        setBalances(availableBalances);
        setRequests(reqRes.data.leaveRequests || []);
        
        // Random quote about leave balances
        if (availableBalances.length > 0) {
          const validBalances = availableBalances.filter(b => parseFloat(b.remaining_days) > 0);
          const targets = validBalances.length > 0 ? validBalances : availableBalances;
          const b = targets[Math.floor(Math.random() * targets.length)];
          const tpl = QUOTE_TEMPLATES[Math.floor(Math.random() * QUOTE_TEMPLATES.length)];
          setRandomQuote({
            text: tpl.text,
            value: `${Math.floor(b.remaining_days)} days`,
            suffix: tpl.suffix.replace("{type}", b.leave_type_name.toLowerCase()),
          });
        } else {
          setRandomQuote({ text: "No leave balances set up yet. Contact HR to get started!", value: "", suffix: "" });
        }

        // Compute Team Out Today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const teamRequests = teamRes.data.leaveRequests || [];
        const outToday = teamRequests.filter(r => {
           if (r.status === 'rejected' || r.status === 'cancelled') return false; 
           const start = new Date(r.start_date); start.setHours(0,0,0,0);
           const end = new Date(r.end_date); end.setHours(23,59,59,999);
           return today >= start && today <= end;
        });

        // Unique profiles out today (exclude self)
        const uniqueOut = [];
        const seenIds = new Set();
        outToday.forEach(r => {
           if (!seenIds.has(r.user_id) && r.user_id !== user.id) {
               seenIds.add(r.user_id);
               uniqueOut.push(r);
           }
        });
        setTeamOut(uniqueOut);

      } catch(err) {
        console.error("Dashboard fetch error:", err);
      }
    };
    fetchData();
  }, [user]);

  const getVariantType = (name) => {
    const n = name.toLowerCase();
    if (n.includes('sick')) return 'sick';
    if (n.includes('personal')) return 'personal';
    return 'annual';
  }

  const displayName = user?.username || user?.full_name?.split(' ')[0] || 'Employee';

  return (
    <div className="min-h-screen bg-[#eef2f9] flex flex-col">
      <Header activePage="dashboard" onNavigate={onNavigate} />
      
      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-grow">
        {/* Greeting */}
        <div className="mb-14 mt-4">
          <h1 className="text-[64px] font-fredoka font-[600] text-[#3f4a51] mb-2 flex items-center gap-4">
            {getTimeGreeting()}, {displayName}!
            <span className="text-[72px]" style={{filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.15))"}}>☁️</span>
          </h1>
          <p className="text-[#64748b] text-[20px] max-w-2xl font-medium tracking-wide">
            {randomQuote.text} 
            {randomQuote.value && <span className="font-bold text-[#3f4a51]">{randomQuote.value}</span>}
            {randomQuote.suffix}
          </p>
        </div>

        {/* Leave Balance Cards */}
        <div className="flex flex-wrap gap-6 mb-16 justify-center lg:justify-start">
          {balances.length === 0 ? (
            <p className="text-[#64748b] font-medium">No leave balances found.</p>
          ) : balances.map(bal => (
            <LeaveBalanceCard 
              key={bal.id}
              title={bal.leave_type_name} 
              used={bal.used_days} 
              total={bal.total_days} 
              colorType={bal.color_type}
              iconName={bal.icon_name}
            />
          ))}
        </div>

        {/* Recent Requests & Team Members */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
          <RecentRequests requests={requests.slice(0, 5)} onNavigate={onNavigate} />
          <div className="flex flex-col gap-8">
            <TeamMembersOut teamOut={teamOut} />
          </div>
        </div>
      </main>
    </div>
  )
}