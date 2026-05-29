export default function Checkout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="bg-gray-100 rounded-lg p-8 w-full max-w-md text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Starter — $49/mes</h3>
        <ul className="text-lg mb-6 space-y-1">
          <li>• 1 bot inteligente</li>
          <li>• 1 funnel autónomo</li>
          <li>• 1 generador de contenido</li>
          <li>• 1 pipeline de automatización</li>
        </ul>
        <button className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg">Activar ahora</button>
      </div>
    </div>
  );
}
