import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardPage from '../components/Dashboard'
import { useUiStore } from '../state/uiStore'

export default function Dashboard() {
  const navigate = useNavigate()
  const dashboardStatus = useUiStore((state) => state.dashboardStatus)
  const dashboard = useUiStore((state) => state.dashboard)
  const loadDashboard = useUiStore((state) => state.loadDashboard)
  const activateMonetization = useUiStore((state) => state.activateMonetization)

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  return (
    <DashboardPage
      status={dashboardStatus}
      metrics={dashboard}
      onActivateMonetization={async () => {
        await activateMonetization()
        navigate('/checkout')
      }}
    />
  )
}
