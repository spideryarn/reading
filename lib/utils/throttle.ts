// Throttle utility function
// Ensures a function is called at most once per specified time period

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0
  
  return function (...args: Parameters<T>) {
    const currentTime = Date.now()
    
    const execute = () => {
      lastExecTime = Date.now()
      func(...args)
    }
    
    const timeSinceLastExec = currentTime - lastExecTime
    
    if (timeSinceLastExec >= delay) {
      // If enough time has passed, execute immediately
      execute()
    } else {
      // Otherwise, schedule execution
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      const remainingDelay = delay - timeSinceLastExec
      timeoutId = setTimeout(execute, remainingDelay)
    }
  }
}