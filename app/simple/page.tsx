export default function SimplePage() {
  return (
    <html lang="en">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#f3f4f6'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#059669', marginBottom: '1rem' }}>✅ Sales AI is Working</h1>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              This is a simple test page to verify deployment.
            </p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Timestamp: {new Date().toISOString()}
            </p>
            <div style={{ marginTop: '1.5rem' }}>
              <a href="/" style={{ color: '#2563eb', textDecoration: 'none' }}>
                ← Back to Main App
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}