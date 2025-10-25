export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">404</h2>
        <p className="text-gray-600 mb-6">Page not found</p>
        <a href="/" className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Go back home
        </a>
      </div>
    </div>
  )
}
