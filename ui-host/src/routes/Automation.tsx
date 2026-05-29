import AutomationPanel from '../components/AutomationPanel'
import { useUiStore } from '../state/uiStore'

export default function Automation() {
  const status = useUiStore((state) => state.automationStatus)
  const logs = useUiStore((state) => state.logs)
  const runAutomationAction = useUiStore((state) => state.runAutomationAction)

  return (
    <AutomationPanel
      status={status}
      logs={logs}
      onGenerateProduct={async () => {
        await runAutomationAction('product')
      }}
      onPublishContent={async () => {
        await runAutomationAction('content')
      }}
      onSimulateTraffic={async () => {
        await runAutomationAction('traffic')
      }}
    />
  )
}
