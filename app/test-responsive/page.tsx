import { TestMediaQuery } from '@/components/test-media-query'

export default function TestResponsivePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">React Responsive Library Test</h1>
      <TestMediaQuery />
    </div>
  )
}