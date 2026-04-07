import { useState } from "react"
import Dashboard from "./page/employee/Dashboard"
import Request from "./page/employee/Request"
import History from "./page/employee/History"
import "./App.css"

function App() {
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

export default App