import { ErrorLayout } from '@/components/error-layout'

export default function NotFound() {
  return (
    <ErrorLayout
      errorCode="404"
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
    />
  )
}