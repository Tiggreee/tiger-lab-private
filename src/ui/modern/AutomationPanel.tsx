import { AsyncStatus } from './AutonomousSystemController';

interface AutomationPanelProps {
  readonly logs?: string[];
  readonly status?: AsyncStatus;
  readonly onGenerateProduct?: () => void;
  readonly onPublishContent?: () => void;
  readonly onSimulateTraffic?: () => void;
}

export default function AutomationPanel({
  logs = [],
  status = 'idle',
  onGenerateProduct,
  onPublishContent,
  onSimulateTraffic
}: AutomationPanelProps) {
  const isLoading = status === 'loading';

  return (
    <div className="min-h-screen bg-white p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-xl font-bold mb-4">Tu sistema está operando.</h2>
        <div className="space-y-4">
          <button className="w-full bg-black text-white py-3 rounded font-bold disabled:opacity-50" disabled={isLoading} onClick={onGenerateProduct} type="button">Generar producto</button>
          <button className="w-full bg-black text-white py-3 rounded font-bold disabled:opacity-50" disabled={isLoading} onClick={onPublishContent} type="button">Publicar contenido</button>
          <button className="w-full bg-black text-white py-3 rounded font-bold disabled:opacity-50" disabled={isLoading} onClick={onSimulateTraffic} type="button">Simular tráfico</button>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold mb-2">Log</h3>
        <div className="bg-gray-900 text-green-400 font-mono rounded-lg p-4 h-64 overflow-y-auto text-sm">
          {logs.length === 0 ? (
            <div>• Funnel iniciado…<br />• Lead capturado…<br />• Pricing resuelto…<br />• Contenido publicado…</div>
          ) : logs.map((l, i) => <div key={i}>• {l}</div>)}
        </div>
      </div>
    </div>
  );
}
