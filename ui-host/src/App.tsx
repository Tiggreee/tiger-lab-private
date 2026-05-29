import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Landing from './routes/Landing'
import Onboarding from './routes/Onboarding'
import Dashboard from './routes/Dashboard'
import Checkout from './routes/Checkout'
import Automation from './routes/Automation'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/automation" element={<Automation />} />
      </Routes>
    </BrowserRouter>
  )
}
