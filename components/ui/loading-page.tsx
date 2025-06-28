import { Spinner } from "@/components/ui/spinner"

interface LoadingPageProps {
  title?: string
  description?: string
  spinnerSize?: number
}

export function LoadingPage({ 
  title = "Loading...", 
  description,
  spinnerSize = 32 
}: LoadingPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Spinner size={spinnerSize} className="text-spideryarn-orange" />
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-gray-900">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-gray-600">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}