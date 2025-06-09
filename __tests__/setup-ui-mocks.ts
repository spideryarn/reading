/**
 * Shared UI component mocks for testing
 * 
 * This file provides reusable mocks for shadcn/ui components and Next.js components
 * to avoid repeating complex mock setup across multiple test files.
 * 
 * Usage: Import this file in your test setup or individual test files
 */

import React from 'react'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  redirect: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock UI components to avoid complex shadcn/ui setup
jest.mock('@/components/ui/form', () => {
  let fieldCounter = 0
  return {
    Form: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'form', ...props }, children),
    FormControl: ({ children }: any) => React.createElement('div', {}, children),
    FormField: ({ render, control, name }: any) => {
      const fieldId = `field-${++fieldCounter}-${name}`
      const field = { value: '', onChange: jest.fn(), onBlur: jest.fn(), name }
      let labelText = name
      if (name === 'email') labelText = 'Email address'
      else if (name === 'password') labelText = 'Password'
      else if (name === 'confirmPassword') labelText = 'Confirm password'
      
      return React.createElement('div', {},
        React.createElement('label', { htmlFor: fieldId }, labelText),
        React.createElement('input', { id: fieldId, ...field })
      )
    },
    FormItem: ({ children }: any) => React.createElement('div', {}, children),
    FormLabel: ({ children }: any) => React.createElement('span', {}, children),
    FormMessage: () => React.createElement('div', { 'data-testid': 'form-message' }),
  }
})

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, asChild, variant, ...props }: any) => {
    if (asChild) {
      return React.createElement('div', props, children)
    }
    return React.createElement('button', { disabled, onClick, ...props }, children)
  },
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => React.createElement('input', props),
}))

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => React.createElement('div', { role: 'alert' }, children),
  AlertDescription: ({ children }: any) => React.createElement('div', {}, children),
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => React.createElement('div', { className, ...props }, children),
  CardContent: ({ children, className, ...props }: any) => React.createElement('div', { className, ...props }, children),
  CardHeader: ({ children, className, ...props }: any) => React.createElement('div', { className, ...props }, children),
}))

jest.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children, direction, ...props }: any) =>
    React.createElement('div', { 'data-testid': 'resizable-panel-group', 'data-direction': direction, ...props }, children),
  ResizablePanel: ({ children, defaultSize, ...props }: any) =>
    React.createElement('div', { 'data-testid': 'resizable-panel', 'data-default-size': defaultSize, ...props }, children),
  ResizableHandle: (props: any) =>
    React.createElement('div', { 'data-testid': 'resizable-handle', ...props }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, onClick, ...props }: any) =>
    React.createElement('a', { href, onClick, ...props }, children),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => React.createElement('img', { src, alt, ...props }),
}))

// Mock window.location.origin for auth redirects
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
  },
  writable: true,
})

// Export helper functions for common test setup
export const createMockRouter = () => ({
  push: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
})

export const createMockSearchParams = (params: Record<string, string | null> = {}) => ({
  get: jest.fn((key: string) => params[key] || null),
  getAll: jest.fn(),
  has: jest.fn(),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
})

export const createMockSupabaseClient = () => ({
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    })),
  },
})

export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {},
  ...overrides,
})