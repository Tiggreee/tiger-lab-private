import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import AccessGate from './routes/AccessGate'
import RequireDevAccess from './routes/RequireDevAccess'
import Landing from './routes/Landing'
import Onboarding from './routes/Onboarding'
import Dashboard from './routes/Dashboard'
import Checkout from './routes/Checkout'
import CheckoutCancel from './routes/CheckoutCancel'
import CheckoutSuccess from './routes/CheckoutSuccess'
import Automation from './routes/Automation'
import DeveloperOps from './routes/DeveloperOps'

export default function App() {
  const Router = import.meta.env.PROD ? HashRouter : BrowserRouter

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AccessGate />} />
        <Route
          path="/dev/ops"
          element={(
            <RequireDevAccess>
              <DeveloperOps />
            </RequireDevAccess>
          )}
        />
        <Route
          path="/workspace"
          element={(
            <RequireDevAccess>
              <Landing />
            </RequireDevAccess>
          )}
        />
        <Route
          path="/onboarding"
          element={(
            <RequireDevAccess>
              <Onboarding />
            </RequireDevAccess>
          )}
        />
        <Route
          path="/dashboard"
          element={(
            <RequireDevAccess>
              <Dashboard />
            </RequireDevAccess>
          )}
        />
        <Route
          path="/checkout"
          element={(
            <RequireDevAccess>
              <Checkout />
            </RequireDevAccess>
          )}
        />
        <Route
          path="/checkout/success"
          element={(
            <RequireDevAccess>
              <CheckoutSuccess />
            </RequireDevAccess>
          )}
        />
        <Route
          path="/checkout/cancel"
          element={(
            <RequireDevAccess>
              <CheckoutCancel />
            </RequireDevAccess>
          )}
        />
        <Route
          path="/automation"
          element={(
            <RequireDevAccess>
              <Automation />
            </RequireDevAccess>
          )}
        />
      </Routes>
    </Router>
  )
}
