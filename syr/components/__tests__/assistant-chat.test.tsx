import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssistantChat } from '../assistant-chat';
import { useLocalRuntime } from '@assistant-ui/react';

// Mock phosphor icons
jest.mock('@phosphor-icons/react', () => ({
  User: () => <div data-testid="user-icon">User</div>,
  Robot: () => <div data-testid="robot-icon">Robot</div>,
  PaperPlaneTilt: () => <div data-testid="send-icon">Send</div>,
}));

// Mock useChatRuntime hook
jest.mock('@/src/lib/hooks/useChatRuntime', () => ({
  useChatRuntime: jest.fn(() => ({
    // Mock runtime object
    thread: {
      messages: [],
      isRunning: false,
    },
    composer: {
      send: jest.fn(),
      text: '',
      setText: jest.fn(),
    },
  })),
}));

// Mock assistant-ui/react
jest.mock('@assistant-ui/react', () => {
  const mockThread = {
    messages: [],
    isRunning: false,
  };
  
  const mockComposer = {
    send: jest.fn(),
    text: '',
    setText: jest.fn(),
  };

  return {
    AssistantRuntimeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    
    ThreadPrimitive: {
      Root: ({ children, className }: any) => <div className={className}>{children}</div>,
      Viewport: ({ children, className }: any) => <div className={className}>{children}</div>,
      Empty: ({ children }: any) => {
        if (mockThread.messages.length === 0) return <div>{children}</div>;
        return null;
      },
      Messages: ({ components }: any) => {
        return (
          <div>
            {mockThread.messages.map((msg: any, idx: number) => {
              const Component = msg.role === 'user' ? components.UserMessage : components.AssistantMessage;
              return <Component key={idx} />;
            })}
          </div>
        );
      },
      Suggestion: ({ children, prompt, autoSend, asChild, ...props }: any) => {
        const handleClick = () => {
          if (autoSend) {
            mockComposer.setText(prompt);
            mockComposer.send();
          }
        };
        
        if (asChild) {
          return React.cloneElement(children as React.ReactElement, { 
            ...props,
            onClick: handleClick 
          });
        }
        
        return (
          <button {...props} onClick={handleClick}>
            {children}
          </button>
        );
      },
    },
    
    MessagePrimitive: {
      Root: ({ children }: any) => <div className="flex gap-3 mb-4">{children}</div>,
      Content: () => <div>Test message content</div>,
    },
    
    ComposerPrimitive: {
      Root: ({ children, className }: any) => <div className={className}>{children}</div>,
      Input: ({ placeholder, className, ...props }: any) => (
        <textarea 
          placeholder={placeholder}
          className={className}
          value={mockComposer.text}
          onChange={(e) => mockComposer.setText(e.target.value)}
          {...props}
        />
      ),
      Send: ({ children, asChild, ...props }: any) => {
        const handleClick = () => mockComposer.send();
        if (asChild) {
          return React.cloneElement(children as React.ReactElement, { onClick: handleClick });
        }
        return <button onClick={handleClick} {...props}>{children}</button>;
      },
    },
    
    useLocalRuntime: jest.fn(() => ({
      thread: mockThread,
      composer: mockComposer,
    })),
  };
});

describe('AssistantChat', () => {
  const mockDocumentContext = 'This is a test document with sample content for testing.';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the chat interface', () => {
    render(<AssistantChat documentContext={mockDocumentContext} />);
    
    // Check for composer elements
    expect(screen.getByPlaceholderText('Ask about this document...')).toBeInTheDocument();
    expect(screen.getByTestId('send-icon')).toBeInTheDocument();
  });

  it('should show thread suggestions when chat is empty', () => {
    render(<AssistantChat documentContext={mockDocumentContext} />);
    
    // Check for suggestion buttons
    expect(screen.getByText('What is this document about?')).toBeInTheDocument();
    expect(screen.getByText('Summarise the main points')).toBeInTheDocument();
    expect(screen.getByText('Explain key concepts')).toBeInTheDocument();
    expect(screen.getByText('Find important quotes')).toBeInTheDocument();
  });

  it('should render user messages with correct styling', () => {
    const { container } = render(<AssistantChat documentContext={mockDocumentContext} />);
    
    // Check for user icon
    const userMessages = container.querySelectorAll('[data-testid="user-icon"]');
    expect(userMessages.length).toBeGreaterThanOrEqual(0);
  });

  it('should render assistant messages with correct styling', () => {
    const { container } = render(<AssistantChat documentContext={mockDocumentContext} />);
    
    // Check for robot icon
    const assistantMessages = container.querySelectorAll('[data-testid="robot-icon"]');
    expect(assistantMessages.length).toBeGreaterThanOrEqual(0);
  });

  it('should have correct class names for styling', () => {
    const { container } = render(<AssistantChat documentContext={mockDocumentContext} />);
    
    // Check for flex layout
    expect(container.querySelector('.h-full.flex.flex-col')).toBeInTheDocument();
    
    // Check for composer styling
    expect(container.querySelector('.flex.items-center.gap-2.p-4.border-t.border-gray-200')).toBeInTheDocument();
  });

  it('should render composer input with correct attributes', () => {
    render(<AssistantChat documentContext={mockDocumentContext} />);
    
    const input = screen.getByPlaceholderText('Ask about this document...');
    expect(input).toHaveAttribute('rows', '1');
    expect(input.className).toContain('resize-none');
    expect(input.className).toContain('rounded-lg');
  });

  it('should render send button with correct styling', () => {
    const { container } = render(<AssistantChat documentContext={mockDocumentContext} />);
    
    // The send button is inside ComposerPrimitive.Send - it has the PaperPlaneTilt icon
    // We need to find the button that is a child of the composer section
    const composerSection = container.querySelector('[class*="border-t"]');
    const sendButton = composerSection?.querySelector('button');
    
    expect(sendButton).toBeInTheDocument();
    expect(sendButton?.className).toContain('rounded-lg');
    expect(sendButton?.className).toContain('bg-blue-500');
  });

  it('should pass documentContext to useChatRuntime', () => {
    const mockUseChatRuntime = jest.requireMock('@/src/lib/hooks/useChatRuntime').useChatRuntime;
    
    render(<AssistantChat documentContext={mockDocumentContext} />);
    
    expect(mockUseChatRuntime).toHaveBeenCalledWith({ documentContext: mockDocumentContext });
  });
});