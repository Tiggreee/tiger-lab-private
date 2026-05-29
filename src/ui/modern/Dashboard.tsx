function KpiBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-100 rounded-lg p-6 text-center text-2xl font-bold">{label}: <span className="block text-3xl">{value}</span></div>
  );
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white p-8">
      <h2 className="text-2xl font-bold mb-8">Tu sistema está vivo</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <KpiBlock label="Leads hoy" value={0} />
        <KpiBlock label="Contenido generado" value={0} />
        <KpiBlock label="Bots activos" value={1} />
        <KpiBlock label="Precio promedio" value="$0.00" />
      </div>
      <div className="flex items-center justify-center mb-8">
        <span className="font-mono text-lg">visit → lead → trial → checkout → paid</span>
      </div>
      <button className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg">Activar monetización</button>
    </div>
  );
}
