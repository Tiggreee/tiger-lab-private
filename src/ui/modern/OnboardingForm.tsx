export default function OnboardingForm() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h2 className="text-2xl font-bold mb-6">Cuéntanos sobre tu negocio.</h2>
      <form className="space-y-4 w-full max-w-sm">
        <input className="w-full border p-3 rounded" placeholder="¿Qué vendes?" />
        <input className="w-full border p-3 rounded" placeholder="¿A quién?" />
        <input className="w-full border p-3 rounded" placeholder="¿Qué quieres automatizar primero?" />
        <button className="w-full bg-black text-white py-3 rounded font-bold mt-4">Crear mi sistema</button>
      </form>
    </div>
  );
}
