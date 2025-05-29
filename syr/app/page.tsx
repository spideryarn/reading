import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">Spideryarn Reading</h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-assisted document reading and analysis application
        </p>
        <Link
          href="/documents"
          className="inline-block px-6 py-3 text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Browse Documents
        </Link>
      </div>
    </div>
  )
}
