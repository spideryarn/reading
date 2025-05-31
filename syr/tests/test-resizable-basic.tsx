import React from 'react'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'

export default function TestResizableBasic() {
  return (
    <div className="h-screen w-full p-4">
      <h1 className="mb-4 text-xl font-bold">Resizable Component Test</h1>
      
      <div className="h-[500px] w-full border rounded-lg">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full p-4 bg-slate-100">
              <h2 className="font-semibold">Left Panel</h2>
              <p>This panel is resizable. Drag the handle to resize.</p>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full p-4 bg-slate-200">
              <h2 className="font-semibold">Right Panel</h2>
              <p>This panel is also resizable.</p>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      <div className="mt-8">
        <p className="text-sm text-gray-600">
          ✅ If you can see two panels with a draggable handle between them, the resizable component is working correctly.
        </p>
      </div>
    </div>
  )
}