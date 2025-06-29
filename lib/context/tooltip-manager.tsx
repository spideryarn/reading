import { createContext, useContext, useState } from 'react'

interface TooltipManagerContextValue {
  openId: string | null
  setOpenId: (id: string | null) => void
}

const TooltipManagerContext = createContext<TooltipManagerContextValue | undefined>(undefined)

export function TooltipManagerProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <TooltipManagerContext.Provider value={{ openId, setOpenId }}>
      {children}
    </TooltipManagerContext.Provider>
  )
}

export function useTooltipManager() {
  const context = useContext(TooltipManagerContext)
  if (!context) {
    throw new Error('useTooltipManager must be used within a TooltipManagerProvider')
  }
  return context
} 