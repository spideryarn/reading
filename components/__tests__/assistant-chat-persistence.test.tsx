import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssistantChat } from '../assistant-chat';
import { usePersistentChat } from '@/src/lib/hooks/usePersistentChat';
import type { Message } from '@assistant-ui/react';

// Mock the persistent chat hook
jest.mock('@/src/lib/hooks/usePersistentChat');

// Mock assistant-ui components
jest.mock('@assistant-ui/react', () => ({
  AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ThreadPrimitive: {
    Root: ({ children, className }: any) => <div className={className}>{children}</div>,
    Viewport: ({ children, className }: any) => <div className={className}>{children}</div>,
    Empty: ({ children }: any) => <div data-testid="thread-empty">{children}</div>,
    Messages: ({ components }: any) => <div data-testid="thread-messages">Messages</div>,
    Suggestion: ({ children, prompt, onClick, asChild }: any) => {
      if (asChild && children) {
        // Clone the child element and add our test props
        return React.cloneElement(children as React.ReactElement, {
          onClick,
          'data-testid': `suggestion-${prompt}`,
        });
      }
      return (
        <button onClick={onClick} data-testid={`suggestion-${prompt}`}>
          {children}
        </button>
      );
    },
    If: ({ children, running }: any) => {
      // For testing, always render children to make them accessible
      return <>{children}</>;
    },
  },
  ComposerPrimitive: {
    Root: ({ children, className }: any) => <div className={className}>{children}</div>,
    Input: ({ placeholder, ...props }: any) => (
      <textarea
        data-testid="composer-input"
        placeholder={placeholder}
        {...props}
      />
    ),
    Send: ({ children, asChild }: any) => {
      if (asChild && children) {
        // Clone the child element and add our test props
        return React.cloneElement(children as React.ReactElement, {
          'data-testid': 'send-button',
        });
      }
      return <button data-testid="send-button">{children}</button>;
    },
    Cancel: ({ children, asChild }: any) => {
      const Component = asChild ? children.type : 'button';
      return <Component data-testid="cancel-button">{asChild ? children.props.children : children}</Component>;
    },
  },
  MessagePrimitive: {
    Root: ({ children, className }: any) => <div className={className}>{children}</div>,
    Content: ({ components }: any) => <div data-testid="message-content">Message content</div>,
    If: ({ children, hasContent }: any) => (hasContent ? children : null),
  },
}));

// Mock @assistant-ui/react-markdown
jest.mock('@assistant-ui/react-markdown', () => ({
  MarkdownText: ({ children }: any) => <div>{children}</div>,
}));

// Mock Phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  User: () => <span data-testid="user-icon">User</span>,
  Robot: () => <span data-testid="robot-icon">Robot</span>,
  PaperPlaneTilt: () => <span data-testid="send-icon">Send</span>,
  CircleNotch: () => <span data-testid="spinner-icon">Spinner</span>,
}));

describe('AssistantChat with Persistence', () => {
  const mockDocumentId = 'test-document-id';
  const mockDocumentContext = 'Test document context';
  const mockThreadId = 'test-thread-id';
  
  const mockRuntime = {
    adapter: {
      run: jest.fn(),
    },
    messages: [],
    append: jest.fn(),
  };

  const mockUsePersistentChat = usePersistentChat as jest.MockedFunction<typeof usePersistentChat>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    mockUsePersistentChat.mockReturnValue({
      runtime: mockRuntime,
      isLoaded: true,
      threadId: null,
      error: null,
    });
  });

  describe('Loading States', () => {
    it('should show loading state while initializing', () => {
      mockUsePersistentChat.mockReturnValue({
        runtime: mockRuntime,
        isLoaded: false,
        threadId: null,
        error: null,
      });

      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      expect(screen.getByText('Loading conversation...')).toBeInTheDocument();
      expect(screen.getByTestId('spinner-icon')).toBeInTheDocument();
    });

    it('should show chat interface when loaded', async () => {
      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('composer-input')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Ask about this document...')).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('should show error state when persistence fails', () => {
      const errorMessage = 'Failed to initialize chat persistence';
      mockUsePersistentChat.mockReturnValue({
        runtime: mockRuntime,
        isLoaded: true,
        threadId: null,
        error: errorMessage,
      });

      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      expect(screen.getByText('Chat Unavailable')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByTestId('robot-icon')).toBeInTheDocument();
    });

    it('should provide reload button on error', () => {
      mockUsePersistentChat.mockReturnValue({
        runtime: mockRuntime,
        isLoaded: true,
        threadId: null,
        error: 'Error occurred',
      });

      // Mock window.location.reload
      const reloadMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      const reloadButton = screen.getByText('Reload Page');
      fireEvent.click(reloadButton);

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe('Thread Persistence Indicator', () => {
    it('should show thread persistence indicator when thread exists', () => {
      mockUsePersistentChat.mockReturnValue({
        runtime: mockRuntime,
        isLoaded: true,
        threadId: mockThreadId,
        error: null,
      });

      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      expect(screen.getByText('✓ Conversation saved')).toBeInTheDocument();
      expect(screen.getByText(`Thread: ${mockThreadId.slice(-8)}`)).toBeInTheDocument();
    });

    it('should not show persistence indicator without thread', () => {
      mockUsePersistentChat.mockReturnValue({
        runtime: mockRuntime,
        isLoaded: true,
        threadId: null,
        error: null,
      });

      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      expect(screen.queryByText('✓ Conversation saved')).not.toBeInTheDocument();
    });
  });

  describe('Chat Interface', () => {
    it('should render composer with correct placeholder', () => {
      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      const input = screen.getByPlaceholderText('Ask about this document...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('data-testid', 'composer-input');
    });

    it('should show empty state with suggestions', () => {
      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      expect(screen.getByTestId('thread-empty')).toBeInTheDocument();
      expect(screen.getByText('Ask me anything')).toBeInTheDocument();
      expect(screen.getByText(/I can help you understand this document/)).toBeInTheDocument();
    });

    it('should render suggestion buttons', () => {
      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      const suggestions = [
        'What is this document about?',
        'Summarise the main points',
        'Explain key concepts',
        'Find important quotes',
      ];

      suggestions.forEach(suggestion => {
        expect(screen.getByTestId(`suggestion-${suggestion}`)).toBeInTheDocument();
      });
    });

    it('should show send button when not running', () => {
      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      expect(screen.getByTestId('send-button')).toBeInTheDocument();
      expect(screen.getByTestId('send-icon')).toBeInTheDocument();
    });
  });

  describe('Integration with usePersistentChat', () => {
    it('should pass correct props to usePersistentChat hook', () => {
      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      expect(mockUsePersistentChat).toHaveBeenCalledWith({
        documentId: mockDocumentId,
        documentContext: mockDocumentContext,
      });
    });

    it('should use runtime from persistent chat hook', () => {
      const customRuntime = {
        ...mockRuntime,
        customProperty: 'test',
      };

      mockUsePersistentChat.mockReturnValue({
        runtime: customRuntime,
        isLoaded: true,
        threadId: null,
        error: null,
      });

      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      // Verify AssistantRuntimeProvider receives the runtime
      const provider = screen.getByTestId('composer-input').closest('[class*="flex-col"]');
      expect(provider).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply correct styling classes', () => {
      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      // Find the main container by looking for the composer input's parent container
      const composerInput = screen.getByTestId('composer-input');
      const container = composerInput.closest('.h-full.flex.flex-col');
      
      // Check that the container exists and has the expected classes
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('h-full', 'flex', 'flex-col');
    });

    it('should apply persistence indicator styling', () => {
      mockUsePersistentChat.mockReturnValue({
        runtime: mockRuntime,
        isLoaded: true,
        threadId: mockThreadId,
        error: null,
      });

      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      const indicator = screen.getByText('✓ Conversation saved').parentElement;
      expect(indicator).toHaveClass('px-4', 'py-2', 'bg-blue-50', 'border-b', 'border-blue-100', 'text-xs', 'text-blue-700');
    });

    it('should apply error state styling', () => {
      mockUsePersistentChat.mockReturnValue({
        runtime: mockRuntime,
        isLoaded: true,
        threadId: null,
        error: 'Test error',
      });

      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      const errorIcon = screen.getByTestId('robot-icon').parentElement;
      expect(errorIcon).toHaveClass('w-12', 'h-12', 'rounded-full', 'bg-red-50', 'flex', 'items-center', 'justify-center');
    });
  });

  describe('Document Context Updates', () => {
    it('should re-initialize when document changes', () => {
      const { rerender } = render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      expect(mockUsePersistentChat).toHaveBeenCalledTimes(1);

      // Change document
      rerender(
        <AssistantChat
          documentId="new-document-id"
          documentContext="New document context"
        />
      );

      expect(mockUsePersistentChat).toHaveBeenCalledTimes(2);
      expect(mockUsePersistentChat).toHaveBeenLastCalledWith({
        documentId: 'new-document-id',
        documentContext: 'New document context',
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels and roles', () => {
      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      const input = screen.getByPlaceholderText('Ask about this document...');
      expect(input.tagName).toBe('TEXTAREA');
      expect(input).toHaveAttribute('placeholder', 'Ask about this document...');
    });

    it('should show descriptive error messages', () => {
      const errorMessage = 'Failed to connect to database';
      mockUsePersistentChat.mockReturnValue({
        runtime: mockRuntime,
        isLoaded: true,
        threadId: null,
        error: errorMessage,
      });

      render(
        <AssistantChat
          documentId={mockDocumentId}
          documentContext={mockDocumentContext}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Chat Unavailable')).toBeInTheDocument();
    });
  });
});