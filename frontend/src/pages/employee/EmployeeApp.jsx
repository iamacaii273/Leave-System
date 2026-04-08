import { useState } from "react"
import Dashboard from "./Dashboard"
import Request from "./Request"
import History from "./History"

export default function EmployeeApp() {
  const [currentPage, setCurrentPage] = useState("dashboard")

  const handleNavigate = (page) => {
    setCurrentPage(page)
  }

  return (
    <>
      {currentPage === "dashboard" && <Dashboard onNavigate={handleNavigate} />}
      {currentPage === "request" && <Request onNavigate={handleNavigate} />}
      {currentPage === "history" && <History onNavigate={handleNavigate} />}
    </>
  )
}
