import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Dashboard from './Dashboard'

import EmployeeList from './EmployeeList'
import EmployeeProfile from './EmployeeProfile'
import AddEmployee from './AddEmployee'
import Reports from './Reports'
import LeaveType from './LeaveType'
import Settings from '../shared/Settings'
import Header from '../../components/Header'

export default function HrApp() {
  const navigate = useNavigate()

  const handleNavigate = (path) => {
    navigate(`/hr/${path}`)
  }

  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard onNavigate={handleNavigate} />} />
      <Route path="employee" element={<EmployeeList onNavigate={handleNavigate} />} />
      <Route path="employee/add" element={<AddEmployee onNavigate={handleNavigate} />} />
      <Route path="employee/:id" element={<EmployeeProfile onNavigate={handleNavigate} />} />
      <Route path="reports" element={<Reports onNavigate={handleNavigate} />} />
      <Route path="leave-type" element={<LeaveType onNavigate={handleNavigate} />} />
      <Route path="settings" element={<Settings onNavigate={handleNavigate} HeaderComponent={Header} />} />
      <Route path="/" element={<Navigate to="dashboard" replace />} />
    </Routes>
  )
}
