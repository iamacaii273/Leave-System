import { createContext, useContext, useState, useEffect } from 'react'

const DepartmentContext = createContext(null)

export function DepartmentProvider({ children }) {
    // Store the selected department_id globally.
    // "" (empty string) represents "All My Departments"
    const [selectedDepartment, setSelectedDepartment] = useState("")

    const value = { selectedDepartment, setSelectedDepartment }

    return (
        <DepartmentContext.Provider value={value}>
            {children}
        </DepartmentContext.Provider>
    )
}

export function useDepartment() {
    const ctx = useContext(DepartmentContext)
    if (!ctx) throw new Error('useDepartment must be used within DepartmentProvider')
    return ctx
}
