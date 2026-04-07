import { useState } from "react"

// Icon Components
const BellIcon = () => (
  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

export default function Header({ activePage = "dashboard", onNavigate }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "request", label: "Request" },
    { id: "history", label: "History" }
  ]

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <nav className="flex items-center gap-8">
          {navItems.map((item) => (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onNavigate && onNavigate(item.id)}
                className={`text-[17px] font-bold font-fredoka transition-colors tracking-wide px-2 py-4 ${
                  activePage === item.id
                    ? "text-[#1e3450]"
                    : "text-[#1e3450] opacity-80 hover:opacity-100"
                }`}
              >
                {item.label}
              </button>
              {activePage === item.id && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[70%] h-1 bg-[#478afb] rounded-full" />
              )}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg">
            <BellIcon />
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-[#f05252] border border-white rounded-full"></span>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <SettingsIcon />
          </button>
          <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
            <div className="text-right">
              <p className="text-[13px] font-bold font-fredoka text-[#1e3450]">Alex Chen</p>
              <p className="text-[11px] text-[#64748b]">Software Developer</p>
            </div>
            <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
              <UserIcon />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}