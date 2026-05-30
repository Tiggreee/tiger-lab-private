import { AsyncStatus } from './types';

interface LandingPageProps {
  readonly onStart?: () => void;
  readonly status?: AsyncStatus;
}

export default function LandingPage({ onStart, status = 'idle' }: LandingPageProps) {
  const isLoading = status === 'loading';

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-black">
      <main className="flex flex-col items-center justify-center flex-1 px-4">
        <h1 className="text-4xl font-bold mb-6 text-center">Automatiza tu negocio en minutos.<br />Sin código. Sin fricción. Sin límites.</h1>
        <button
          className="bg-black text-white px-8 py-4 rounded-lg font-bold text-lg mb-10 disabled:opacity-50"
          disabled={isLoading}
          onClick={onStart}
          type="button"
        >
          {isLoading ? 'Iniciando...' : 'Comenzar automatización'}
        </button>
        <ul className="space-y-2 text-lg font-semibold">
          <li>• Genera productos digitales automáticamente</li>
          <li>• Captura y nutre leads sin intervención</li>
          <li>• Bots, contenido y pricing inteligente</li>
        </ul>
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">© 2026 — Plataforma Autónoma</footer>
    </div>
  );
}
