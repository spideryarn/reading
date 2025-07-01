/**
 * Centralized UI Testing Utilities
 * 
 * This module consolidates all UI component mocking and test utilities,
 * replacing scattered test infrastructure files with a single source of truth.
 * 
 * @module lib/testing/ui-test-utils
 */

import React, { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { DocumentCommunicationProvider } from '@/lib/context/document-communication-context'
import { MutationProvider } from '@/lib/context/mutation-context'

/**
 * Test wrapper that provides all necessary context providers
 * for component testing
 */
export function TestWrapper({ children }: { children: ReactNode }) {
  return (
    <DocumentCommunicationProvider>
      <MutationProvider initialDocument={[]}>
        {children}
      </MutationProvider>
    </DocumentCommunicationProvider>
  )
}

/**
 * Helper function to render components with necessary providers
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: TestWrapper,
    ...options,
  })
}

/**
 * Mock Next.js router utilities
 */
export const createMockRouter = () => ({
  push: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
})

export const createMockSearchParams = (params: Record<string, string | null> = {}) => ({
  get: jest.fn((key: string) => params[key] || null),
  getAll: jest.fn(() => []),
  has: jest.fn((key: string) => key in params),
  entries: jest.fn(() => Object.entries(params)),
  keys: jest.fn(() => Object.keys(params)),
  values: jest.fn(() => Object.values(params)),
  toString: jest.fn(() => new URLSearchParams(params as any).toString()),
  forEach: jest.fn(),
  [Symbol.iterator]: jest.fn(),
})

/**
 * Mock Supabase client utilities
 */
export const createMockSupabaseClient = () => ({
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    })),
    refreshSession: jest.fn(),
    setSession: jest.fn(),
    updateUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
})

/**
 * Mock user factory with proper test isolation
 */
import { getTestNamespace, createTestEmail } from '@/lib/testing/test-isolation-utils'

export const createMockUser = (overrides = {}, namespace?: string) => {
  const testNamespace = namespace || getTestNamespace('mock-user-test')
  const testEmail = createTestEmail(testNamespace)
  
  return {
    id: `user-${testNamespace}`,
    email: testEmail,
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  }
}

/**
 * Enhanced IntersectionObserver mock for visibility testing
 */
export class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = '0px'
  readonly thresholds: ReadonlyArray<number> = [0]
  
  private callback: IntersectionObserverCallback
  private elements = new Set<Element>()
  
  static instances: MockIntersectionObserver[] = []

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    if (options?.root && options.root instanceof Element) {
      this.root = options.root
    }
    if (options?.rootMargin) this.rootMargin = options.rootMargin
    if (options?.threshold) {
      this.thresholds = Array.isArray(options.threshold) 
        ? options.threshold 
        : [options.threshold]
    }
    MockIntersectionObserver.instances.push(this)
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  unobserve(element: Element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
    const index = MockIntersectionObserver.instances.indexOf(this)
    if (index > -1) {
      MockIntersectionObserver.instances.splice(index, 1)
    }
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  /**
   * Trigger visibility changes for testing
   */
  triggerVisibility(elementOrId: Element | string, isVisible: boolean, ratio = isVisible ? 1 : 0) {
    const element = typeof elementOrId === 'string' 
      ? Array.from(this.elements).find(el => el.getAttribute('data-element-id') === elementOrId)
      : elementOrId

    if (!element || !this.elements.has(element)) return

    const entry = this.createMockEntry(element, isVisible, ratio)
    this.callback([entry], this)
  }

  private createMockEntry(element: Element, isIntersecting: boolean, ratio: number): IntersectionObserverEntry {
    const rect = element.getBoundingClientRect()
    return {
      target: element,
      isIntersecting,
      intersectionRatio: ratio,
      boundingClientRect: rect,
      intersectionRect: isIntersecting ? rect : new DOMRect(0, 0, 0, 0),
      rootBounds: this.root?.getBoundingClientRect() || null,
      time: performance.now(),
    }
  }

  static resetAll() {
    MockIntersectionObserver.instances = []
  }
}

/**
 * Setup mock Intersection Observer for testing
 */
export function setupIntersectionObserverMock() {
  const originalIO = global.IntersectionObserver
  global.IntersectionObserver = MockIntersectionObserver as any

  return () => {
    global.IntersectionObserver = originalIO
    MockIntersectionObserver.resetAll()
  }
}

/**
 * Academic content test samples for HTML prettifier testing
 */
export const ACADEMIC_TEST_SAMPLES = {
  arxiv: `
<div class="ltx_document">
  <article class="ltx_document_content">
    <h1 class="ltx_title">Deep Learning Architectures</h1>
    <p>We present a novel approach with complexity <math><mi>O</mi><mo>(</mo><msup><mi>n</mi><mn>2</mn></msup><mo>)</mo></math>.</p>
  </article>
</div>`.trim(),

  pubmed: `
<article>
  <front>
    <article-meta>
      <title-group>
        <article-title>Machine Learning in Clinical Diagnosis</article-title>
      </title-group>
    </article-meta>
  </front>
  <body>
    <p>Recent advances (<xref ref-type="bibr" rid="ref1">Smith et al., 2023</xref>).</p>
  </body>
</article>`.trim(),

  ieee: `
<div class="article-content">
  <h1>Efficient Algorithms for Large-Scale Data Processing</h1>
  <pre><code class="language-python">
def efficient_sort(data):
    """Efficient sorting algorithm"""
    return sorted(data)
</code></pre>
</div>`.trim(),
}

/**
 * Wait for async updates in tests
 */
export const waitForUpdates = (ms = 10): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Create a mock DOM element with data-element-id
 */
export const createMockElement = (elementId: string, tagName = 'div'): HTMLElement => {
  const element = document.createElement(tagName)
  element.setAttribute('data-element-id', elementId)
  return element
}

/**
 * Mock shadcn/ui components
 * These are simplified versions for testing that preserve essential props
 */
export const mockShadcnComponents = {
  Form: ({ children, ...props }: any) => 
    React.createElement('form', { 'data-testid': 'form', ...props }, children),
  
  FormField: ({ render, name }: any) => {
    const field = { value: '', onChange: jest.fn(), onBlur: jest.fn(), name }
    return render({ field })
  },
  
  FormControl: ({ children }: any) => 
    React.createElement('div', { 'data-testid': 'form-control' }, children),
  
  FormItem: ({ children }: any) => 
    React.createElement('div', { 'data-testid': 'form-item' }, children),
  
  FormLabel: ({ children }: any) => 
    React.createElement('label', { 'data-testid': 'form-label' }, children),
  
  FormMessage: () => 
    React.createElement('div', { 'data-testid': 'form-message' }),
  
  Button: ({ children, ...props }: any) => 
    React.createElement('button', { 'data-testid': 'button', ...props }, children),
  
  Input: (props: any) => 
    React.createElement('input', { 'data-testid': 'input', ...props }),
  
  Alert: ({ children }: any) => 
    React.createElement('div', { role: 'alert', 'data-testid': 'alert' }, children),
  
  AlertDescription: ({ children }: any) => 
    React.createElement('div', { 'data-testid': 'alert-description' }, children),
}

/**
 * Setup all UI mocks for a test suite
 * Call this in beforeEach() to ensure clean mock state
 */
export function setupUIMocks() {
  // Mock Next.js navigation
  jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => createMockRouter()),
    useSearchParams: jest.fn(() => createMockSearchParams()),
    usePathname: jest.fn(() => '/'),
    redirect: jest.fn(),
  }))

  // Mock Supabase client
  jest.mock('@/lib/supabase/client', () => ({
    createClient: jest.fn(() => createMockSupabaseClient()),
  }))

  // Mock shadcn/ui components
  jest.mock('@/components/ui/form', () => mockShadcnComponents)
  jest.mock('@/components/ui/button', () => ({ 
    Button: mockShadcnComponents.Button 
  }))
  jest.mock('@/components/ui/input', () => ({ 
    Input: mockShadcnComponents.Input 
  }))
  jest.mock('@/components/ui/alert', () => ({
    Alert: mockShadcnComponents.Alert,
    AlertDescription: mockShadcnComponents.AlertDescription,
  }))

  // Setup IntersectionObserver mock
  const cleanupIO = setupIntersectionObserverMock()

  // Return cleanup function
  return () => {
    cleanupIO()
    jest.unmock('next/navigation')
    jest.unmock('@/lib/supabase/client')
    jest.unmock('@/components/ui/form')
    jest.unmock('@/components/ui/button')
    jest.unmock('@/components/ui/input')
    jest.unmock('@/components/ui/alert')
  }
}

// Re-export test isolation utilities for convenience
export { getTestNamespace, createTestEmail } from '@/lib/testing/test-isolation-utils'