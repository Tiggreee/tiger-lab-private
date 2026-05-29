import { useNavigate } from 'react-router-dom'
import OnboardingForm from '../components/OnboardingForm'
import { useUiStore } from '../state/uiStore'

export default function Onboarding() {
  const navigate = useNavigate()
  const submitOnboarding = useUiStore((state) => state.submitOnboarding)
  const onboardingStatus = useUiStore((state) => state.onboardingStatus)
  const errorMessage = useUiStore((state) => state.errorMessage)

  return (
    <OnboardingForm
      status={onboardingStatus}
      errorMessage={errorMessage}
      onSubmit={async (input) => {
        await submitOnboarding(input)
        navigate('/dashboard')
      }}
    />
  )
}
