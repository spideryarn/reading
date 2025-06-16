// Mock for @assistant-ui/react
module.exports = {
  AssistantRuntimeProvider: ({ children }) => children,
  
  ThreadPrimitive: {
    Root: ({ children, className }) => {
      const React = require('react');
      return React.createElement('div', { className }, children);
    },
    Viewport: ({ children, className }) => {
      const React = require('react');
      return React.createElement('div', { className }, children);
    },
    Empty: ({ children }) => {
      const React = require('react');
      return React.createElement('div', null, children);
    },
    Messages: ({ components }) => null,
    // Add Suggestion component
    Suggestion: ({ children, prompt, method, autoSend, asChild }) => {
      const React = require('react');
      const handleClick = () => {
        if (autoSend) {
          // Simulate clicking a suggestion
          console.log('Suggestion clicked:', prompt);
        }
      };
      
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, { onClick: handleClick });
      }
      
      return React.createElement('button', { onClick: handleClick }, children);
    },
    // Add If component for conditional rendering
    If: ({ children, running }) => {
      const React = require('react');
      // Simple conditional rendering based on running state
      if (running !== undefined) {
        return running ? children : null;
      }
      return children || null;
    },
  },
  
  ComposerPrimitive: {
    Root: ({ children, className }) => {
      const React = require('react');
      return React.createElement('form', { className }, children);
    },
    Send: ({ children, className, disabled, asChild }) => {
      const React = require('react');
      const props = { 
        type: 'submit', 
        className, 
        disabled 
      };
      
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, props);
      }
      
      return React.createElement('button', props, children);
    },
    // Add Input component
    Input: ({ className, placeholder, rows }) => {
      const React = require('react');
      return React.createElement('textarea', { 
        className, 
        placeholder,
        rows: rows || 1
      });
    },
    // Add Cancel component
    Cancel: ({ children, className, asChild }) => {
      const React = require('react');
      const props = { 
        type: 'button', 
        className,
        onClick: () => console.log('Cancel clicked')
      };
      
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, props);
      }
      
      return React.createElement('button', props, children);
    },
  },
  
  MessagePrimitive: {
    Root: ({ children, className }) => {
      const React = require('react');
      return React.createElement('div', { className }, children);
    },
    Content: ({ components }) => {
      const React = require('react');
      // If components.Text is provided, use it to render text content
      if (components && components.Text) {
        return React.createElement(components.Text, { text: 'Test message content' });
      }
      return React.createElement('div', null, 'Test message content');
    },
    // Update If component to handle hasContent prop
    If: ({ children, hasContent }) => {
      const React = require('react');
      // Simple conditional rendering based on hasContent
      if (hasContent !== undefined) {
        return hasContent ? children : null;
      }
      return children || null;
    },
  },
  
  useAssistantContext: () => null,
  useThreadContext: () => ({
    thread: {
      messages: [],
      isRunning: false,
    }
  }),
  useComposerContext: () => ({
    composer: {
      send: jest.fn(),
      text: '',
      setText: jest.fn(),
    }
  }),
  useMessageContext: () => ({
    message: {
      role: 'user',
      content: [],
    }
  }),
  
  ContentPartPrimitive: {
    Text: ({ text }) => {
      const React = require('react');
      return React.createElement('span', null, text);
    }
  },
  
  // Mock useLocalRuntime hook with doGenerate method
  useLocalRuntime: (adapter, options) => {
    const messages = options?.initialMessages || [];
    return {
      thread: {
        messages,
        isRunning: false,
      },
      composer: {
        send: jest.fn(),
        text: '',
        setText: jest.fn(),
      },
      doGenerate: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mocked response' }]
      }),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    };
  },
  
  // Add ChatModelAdapter type export (as a no-op for testing)
  ChatModelAdapter: function() {}
};