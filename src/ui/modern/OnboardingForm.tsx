import { FormEvent, useState } from 'react';
import { AsyncStatus, OnboardingInput } from './AutonomousSystemController';

interface OnboardingFormProps {
  readonly status?: AsyncStatus;
  readonly errorMessage?: string | null;
  readonly onSubmit?: (input: OnboardingInput) => void | Promise<void>;
}

export default function OnboardingForm({ status = 'idle', errorMessage = null, onSubmit }: OnboardingFormProps) {
  const [productName, setProductName] = useState('');
  const [audience, setAudience] = useState('');
  const [firstAutomation, setFirstAutomation] = useState('');

  const productId = productName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'autonomous-product';
  const isLoading = status === 'loading';

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!onSubmit) {
      return;
    }

    await onSubmit({
      productId,
      productName,
      audience,
      firstAutomation
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h2 className="text-2xl font-bold mb-6">Cuéntanos sobre tu negocio.</h2>
      <form className="space-y-4 w-full max-w-sm" onSubmit={handleSubmit}>
        <input
          className="w-full border p-3 rounded"
          onChange={(event) => setProductName(event.target.value)}
          placeholder="¿Qué vendes?"
          value={productName}
        />
        <input
          className="w-full border p-3 rounded"
          onChange={(event) => setAudience(event.target.value)}
          placeholder="¿A quién?"
          value={audience}
        />
        <input
          className="w-full border p-3 rounded"
          onChange={(event) => setFirstAutomation(event.target.value)}
          placeholder="¿Qué quieres automatizar primero?"
          value={firstAutomation}
        />
        <button className="w-full bg-black text-white py-3 rounded font-bold mt-4 disabled:opacity-50" disabled={isLoading} type="submit">
          {isLoading ? 'Creando...' : 'Crear mi sistema'}
        </button>
        {status === 'error' && errorMessage ? <p className="text-red-600 text-sm">{errorMessage}</p> : null}
        {status === 'success' ? <p className="text-green-700 text-sm">Onboarding conectado al backend.</p> : null}
      </form>
    </div>
  );
}
