import { useNavigate } from 'react-router-dom'

export default function CheckoutSuccess() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="bg-gray-100 rounded-lg p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4 text-green-700">Pago exitoso</h1>
        <p className="text-lg mb-6">
          Gracias por su pago. Su pedido ha sido recibido y estamos procesando la activación.
        </p>
        <button
          type="button"
          className="w-full bg-black text-white py-4 rounded-lg font-bold text-lg"
          onClick={() => navigate('/dashboard')}
        >
          Ver tablero
        </button>
      </div>
    </div>
  )
}
