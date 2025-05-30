import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

const loadingVariants = cva(
  "flex items-center gap-2",
  {
    variants: {
      variant: {
        default: "text-gray-500",
        orange: "text-orange-600",
        blue: "text-blue-600",
      },
      size: {
        sm: "text-sm",
        default: "text-sm", 
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface LoadingProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {
  text?: string
  spinnerSize?: number
}

const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ className, variant, size, text = "Loading...", spinnerSize, ...props }, ref) => {
    const spinnerSizeMap = {
      sm: 16,
      default: 16,
      lg: 20,
    }
    
    const defaultSpinnerSize = size ? spinnerSizeMap[size] : 16
    
    return (
      <div
        className={cn(loadingVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <Spinner size={spinnerSize || defaultSpinnerSize} />
        <span>{text}</span>
      </div>
    )
  }
)
Loading.displayName = "Loading"

export { Loading, loadingVariants }