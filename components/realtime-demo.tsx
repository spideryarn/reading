'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { subscribeToDocumentEnhancements } from '@/lib/supabase/realtime'
import type { Database } from '@/lib/types/database'

type DocumentEnhancement = Database['public']['Tables']['document_enhancements']['Row']

interface RealtimeDemoProps {
  documentId: string
}

export function RealtimeDemo({ documentId }: RealtimeDemoProps) {
  const [enhancements, setEnhancements] = useState<DocumentEnhancement[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to real-time updates
    const subscription = subscribeToDocumentEnhancements(
      supabase,
      documentId,
      (payload) => {
        console.log('Real-time update received:', payload)
        
        // Fetch latest enhancements when we get an update
        fetchEnhancements()
      }
    )

    // Initial fetch
    fetchEnhancements()

    async function fetchEnhancements() {
      const { data, error } = await supabase
        .from('document_enhancements')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching enhancements:', error)
        return
      }

      setEnhancements(data || [])
    }

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [documentId])

  const startDemo = async () => {
    setIsRunning(true)
    setError(null)

    try {
      const response = await fetch('/api/realtime-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      })

      if (!response.ok) {
        throw new Error('Failed to start demo')
      }

      // Demo will run for 6 seconds
      setTimeout(() => {
        setIsRunning(false)
      }, 7000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsRunning(false)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Real-time Enhancement Demo</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          This demo shows how document enhancements update in real-time as they are generated.
        </p>
        
        <button
          onClick={startDemo}
          disabled={isRunning}
          className={`px-4 py-2 rounded font-medium ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isRunning ? 'Demo Running...' : 'Start Real-time Demo'}
        </button>

        {error && (
          <p className="mt-2 text-red-600">{error}</p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Live Enhancements ({enhancements.length})</h3>
        
        {enhancements.length === 0 ? (
          <p className="text-gray-500">No enhancements yet. Click &quot;Start Real-time Demo&quot; to begin.</p>
        ) : (
          enhancements.map((enhancement) => (
            <div key={enhancement.id} className="border rounded p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-lg capitalize">
                  {enhancement.type}
                  {enhancement.subtype && ` (${enhancement.subtype})`}
                </span>
                <span className="text-sm text-gray-500">
                  {enhancement.created_at ? new Date(enhancement.created_at).toLocaleTimeString() : 'Unknown'}
                </span>
              </div>
              
              <div className="text-sm">
                <pre className="bg-white p-2 rounded border overflow-x-auto">
                  {JSON.stringify(enhancement.content, null, 2)}
                </pre>
              </div>
              
              {enhancement.updated_at !== enhancement.created_at && (
                <p className="mt-2 text-xs text-gray-500">
                  Updated: {enhancement.updated_at ? new Date(enhancement.updated_at).toLocaleTimeString() : 'Unknown'}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h4 className="font-semibold mb-2">How it works:</h4>
        <ol className="list-decimal list-inside text-sm space-y-1">
          <li>The demo creates AI calls that simulate enhancement generation</li>
          <li>Enhancements are stored/updated at different intervals (0s, 2s, 4s, 6s)</li>
          <li>Supabase Realtime broadcasts changes to all subscribed clients</li>
          <li>This component updates automatically when changes are detected</li>
        </ol>
      </div>
    </div>
  )
}