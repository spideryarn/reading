import React, { ReactNode } from 'react';
import { DocumentCommunicationProvider } from '@/lib/context/document-communication-context';
import { MutationProvider } from '@/lib/context/mutation-context';

interface TestWrapperProps {
  children: ReactNode;
}

/**
 * Test wrapper that provides all necessary context providers
 * for component testing
 */
export function TestWrapper({ children }: TestWrapperProps) {
  return (
    <DocumentCommunicationProvider>
      <MutationProvider>
        {children}
      </MutationProvider>
    </DocumentCommunicationProvider>
  );
}

/**
 * Helper function to render components with necessary providers
 */
import { render } from '@testing-library/react';

export function renderWithProviders(ui: React.ReactElement, options = {}) {
  
  return render(ui, {
    wrapper: TestWrapper,
    ...options,
  });
}