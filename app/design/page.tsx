'use client'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loading } from '@/components/ui/loading'
import { Spinner } from '@/components/ui/spinner'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppHeader } from '@/components/app-header'
import { Footer } from '@/components/footer'
import { 
  House, 
  Warning,
  Info,
  CheckCircle,
  Gear,
  MagnifyingGlass,
  Download,
  Upload,
  Heart,
  Star,
  Share,
  Plus,
  X,
  CaretDown,
  CaretRight,
  ArrowLeft,
  ArrowRight
} from '@phosphor-icons/react'

export default function DesignReference() {
  const backToAppButton = (
    <Button variant="outline" size="sm">
      <ArrowLeft size={16} className="mr-2" />
      Back to App
    </Button>
  )

  return (
    <div className="min-h-screen bg-white">
      <AppHeader 
        title="Design Reference"
        actions={backToAppButton}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Introduction */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Spideryarn Design System</h2>
          <p className="text-lg text-gray-600 max-w-3xl">
            This reference guide showcases the design components, colours, typography, and patterns 
            used throughout the Spideryarn Reading application. Built on shadcn/ui with custom 
            Spideryarn theming.
          </p>
        </section>

        {/* Brand & Colors */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Brand & Colours</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 rounded-lg" style={{ backgroundColor: '#DB8A45' }}></div>
              <h4 className="font-medium text-gray-900">Spideryarn Orange</h4>
              <p className="text-sm text-gray-500">#DB8A45</p>
              <p className="text-xs text-gray-400">Primary brand colour</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 bg-blue-600 rounded-lg"></div>
              <h4 className="font-medium text-gray-900">Action Blue</h4>
              <p className="text-sm text-gray-500">#2563EB</p>
              <p className="text-xs text-gray-400">Secondary actions</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 bg-red-600 rounded-lg"></div>
              <h4 className="font-medium text-gray-900">Error Red</h4>
              <p className="text-sm text-gray-500">#DC2626</p>
              <p className="text-xs text-gray-400">Destructive actions</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-3 bg-gray-600 rounded-lg"></div>
              <h4 className="font-medium text-gray-900">Neutral Grey</h4>
              <p className="text-sm text-gray-500">#4B5563</p>
              <p className="text-xs text-gray-400">Text & secondary UI</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Logo Usage</h4>
            <div className="flex items-center gap-8">
              <div className="bg-white p-4 rounded border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/spideryarn-logo.png" alt="Spideryarn Logo" className="h-12 w-auto" />
                <p className="text-xs text-gray-500 mt-2">Primary logo</p>
              </div>
              <div className="text-sm text-gray-600">
                <p className="mb-2">• Minimum size: 32px height</p>
                <p className="mb-2">• Clear space: 2x logo height</p>
                <p>• Available formats: PNG, SVG</p>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Typography</h3>
          
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Heading 1 - Bold, 36px</h1>
              <p className="text-sm text-gray-500">Used for page titles and major sections</p>
            </div>
            
            <div>
              <h2 className="text-3xl font-semibold text-gray-900 mb-2">Heading 2 - Semibold, 30px</h2>
              <p className="text-sm text-gray-500">Used for section headers and key content areas</p>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Heading 3 - Semibold, 24px</h3>
              <p className="text-sm text-gray-500">Used for subsections and component groups</p>
            </div>
            
            <div>
              <p className="text-base text-gray-900 mb-2">Body text - Regular, 16px</p>
              <p className="text-sm text-gray-500">Standard paragraph text for content and descriptions</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-2">Small text - Regular, 14px</p>
              <p className="text-xs text-gray-500">Used for captions, metadata, and secondary information</p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Buttons</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Primary Variants</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button variant="default">Default</Button>
                  <code className="text-sm text-gray-500">variant=&quot;default&quot;</code>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="orange">Orange</Button>
                  <code className="text-sm text-gray-500">variant=&quot;orange&quot;</code>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="blue">Blue</Button>
                  <code className="text-sm text-gray-500">variant=&quot;blue&quot;</code>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="destructive">Destructive</Button>
                  <code className="text-sm text-gray-500">variant=&quot;destructive&quot;</code>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Secondary Variants</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button variant="outline">Outline</Button>
                  <code className="text-sm text-gray-500">variant=&quot;outline&quot;</code>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="secondary">Secondary</Button>
                  <code className="text-sm text-gray-500">variant=&quot;secondary&quot;</code>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost">Ghost</Button>
                  <code className="text-sm text-gray-500">variant=&quot;ghost&quot;</code>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="link">Link</Button>
                  <code className="text-sm text-gray-500">variant=&quot;link&quot;</code>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Sizes & States</h4>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon"><Heart size={16} /></Button>
              <Button disabled>Disabled</Button>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="outline" size="full" className="max-w-xs">Full Width</Button>
            </div>
          </div>
        </section>

        {/* Loading States */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Loading States</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Loading Component</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Loading variant="default" size="sm" />
                  <code className="text-sm text-gray-500">size=&quot;sm&quot;</code>
                </div>
                <div className="flex items-center gap-4">
                  <Loading variant="default" size="default" />
                  <code className="text-sm text-gray-500">size=&quot;default&quot;</code>
                </div>
                <div className="flex items-center gap-4">
                  <Loading variant="default" size="lg" />
                  <code className="text-sm text-gray-500">size=&quot;lg&quot;</code>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <Loading variant="default" text="Generating summary..." />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Standalone Spinner</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Spinner size={12} />
                  <code className="text-sm text-gray-500">size={`{12}`}</code>
                </div>
                <div className="flex items-center gap-4">
                  <Spinner size={16} />
                  <code className="text-sm text-gray-500">size={`{16}`}</code>
                </div>
                <div className="flex items-center gap-4">
                  <Spinner size={24} />
                  <code className="text-sm text-gray-500">size={`{24}`}</code>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Alerts & Feedback */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Alerts & Feedback</h3>
          
          <div className="space-y-4">
            <Alert>
              <Info size={16} />
              <AlertDescription>
                This is an informational alert with neutral styling.
              </AlertDescription>
            </Alert>
            
            <Alert variant="destructive">
              <Warning size={16} />
              <AlertDescription>
                This is an error alert for destructive actions or failures.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* Form Components */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Form Components</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Available Components</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Select Dropdown</label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    Accept terms and conditions
                  </label>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Note</h4>
              <p className="text-sm text-gray-600">
                Form components follow YAGNI principle - Select and Checkbox are available 
                but not currently used in the application. Additional form components (Input, 
                Textarea, Form) will be added when needed.
              </p>
            </div>
          </div>
        </section>

        {/* Icons */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Icons</h3>
          
          <div className="mb-4">
            <p className="text-gray-600 mb-6">
              Using Phosphor Icons library for consistent iconography throughout the application.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {[
              { icon: House, name: 'House' },
              { icon: Gear, name: 'Gear' },
              { icon: MagnifyingGlass, name: 'Search' },
              { icon: Download, name: 'Download' },
              { icon: Upload, name: 'Upload' },
              { icon: Heart, name: 'Heart' },
              { icon: Star, name: 'Star' },
              { icon: Share, name: 'Share' },
              { icon: Plus, name: 'Plus' },
              { icon: X, name: 'X' },
              { icon: CaretDown, name: 'CaretDown' },
              { icon: CaretRight, name: 'CaretRight' },
              { icon: ArrowLeft, name: 'ArrowLeft' },
              { icon: ArrowRight, name: 'ArrowRight' },
              { icon: Warning, name: 'Warning' },
              { icon: CheckCircle, name: 'CheckCircle' }
            ].map(({ icon: Icon, name }) => (
              <div key={name} className="text-center p-3 border rounded hover:bg-gray-50">
                <Icon size={24} className="mx-auto mb-2 text-gray-700" />
                <p className="text-xs text-gray-500">{name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Configuration */}
        <section className="mb-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Technical Configuration</h3>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Component Library</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>shadcn/ui</strong> - Component foundation</p>
              <p><strong>Radix UI</strong> - Accessibility primitives</p>
              <p><strong>Tailwind CSS</strong> - Utility-first styling</p>
              <p><strong>Phosphor Icons</strong> - Icon library</p>
              <p><strong>Next.js 15</strong> - React framework</p>
            </div>
          </div>
        </section>

      </div>
      
      <Footer />
    </div>
  )
}