'use client'

import { Dialog } from './dialog'
import { AI_CONFIG, UI_CONFIG } from '@/lib/config'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">AI Configuration</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Model:</span>
              <span className="font-mono text-gray-900">{AI_CONFIG.DEFAULT_MODEL}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Temperature:</span>
              <span className="font-mono text-gray-900">{AI_CONFIG.DEFAULT_TEMPERATURE}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Tokens:</span>
              <span className="font-mono text-gray-900">{AI_CONFIG.DEFAULT_MAX_TOKENS}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">UI Configuration</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Force Light Mode:</span>
              <span className="font-mono text-gray-900">{UI_CONFIG.FORCE_LIGHT_MODE ? 'true' : 'false'}</span>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}