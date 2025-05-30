import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Warning, Info, CheckCircle } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        warning: "bg-red-50 border-red-200 text-red-800 [&>svg]:text-red-600",
        success: "bg-green-50 border-green-200 text-green-800 [&>svg]:text-green-600", 
        info: "bg-blue-50 border-blue-200 text-blue-800 [&>svg]:text-blue-600",
        orange: "bg-orange-50 border-orange-200 text-orange-800 [&>svg]:text-orange-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

// Convenience components with icons
const AlertWithIcon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & 
  VariantProps<typeof alertVariants> & 
  { title?: string; description: string }
>(({ className, variant = "warning", title, description, ...props }, ref) => {
  const Icon = variant === "warning" || variant === "destructive" 
    ? Warning 
    : variant === "success" 
    ? CheckCircle 
    : Info

  return (
    <Alert ref={ref} variant={variant} className={className} {...props}>
      <Icon size={20} weight="bold" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
})
AlertWithIcon.displayName = "AlertWithIcon"

export { Alert, AlertTitle, AlertDescription, AlertWithIcon }