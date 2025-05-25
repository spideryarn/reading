import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Spideryarn Reading</h1>
        <p className="text-lg text-gray-600 mb-8">
          AI-assisted document reading and analysis application
        </p>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Sample Documents</h2>
          <div className="grid gap-4">
            <Link
              href="/documents/chalmers"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium">Chalmers (1995) - Facing Up to the Problem of Consciousness</h3>
              <p className="text-sm text-gray-600">Philosophy of mind paper on consciousness</p>
            </Link>
            <Link
              href="/documents/rhizome"
              className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-medium">Rhizome - 1000 Plateaus Introduction</h3>
              <p className="text-sm text-gray-600">Deleuze and Guattari philosophical text</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
