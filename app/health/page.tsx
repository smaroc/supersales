export default function HealthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-green-600 mb-4">✅ App is Running</h1>
        <p className="text-gray-600">This is a simple health check page.</p>
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            Timestamp: {new Date().toISOString()}
          </p>
        </div>
      </div>
    </div>
  )
}