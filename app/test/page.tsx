export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">🧪 Test Page</h1>
        <p className="text-gray-600 mb-4">This page tests basic Next.js routing.</p>
        <div className="space-y-2 text-sm">
          <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
          <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
        </div>
        <div className="mt-6">
          <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
        </div>
      </div>
    </div>
  )
}