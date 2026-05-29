import { useNavigate } from 'react-router-dom'
import LandingPage from '../components/LandingPage'
import { useUiStore } from '../state/uiStore'

export default function Landing() {
  const navigate = useNavigate()
  const onboardingStatus = useUiStore((state) => state.onboardingStatus)

  return (
    <LandingPage
      status={onboardingStatus}
      onStart={() => {
        navigate('/onboarding')
      }}
    />
  )
}
