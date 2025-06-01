import * as React from "react"
import { CircleNotch } from "@phosphor-icons/react/dist/ssr/CircleNotch"
import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  className?: string
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 16, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("inline-flex items-center justify-center", className)}
        {...props}
      >
        <CircleNotch 
          size={size} 
          className="animate-spin"
          weight="bold"
        />
      </div>
    )
  }
)
Spinner.displayName = "Spinner"

export { Spinner }