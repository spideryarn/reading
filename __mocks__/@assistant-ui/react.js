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
  },
  
  ComposerPrimitive: {
    Root: ({ children, className }) => {
      const React = require('react');
      return React.createElement('form', { className }, children);
    },
    Send: ({ children, className, disabled }) => {
      const React = require('react');
      return React.createElement('button', { 
        type: 'submit', 
        className, 
        disabled 
      }, children);
    },
  },
  
  MessagePrimitive: {
    Root: ({ children, className }) => {
      const React = require('react');
      return React.createElement('div', { className }, children);
    },
    Content: ({ components }) => null,
    If: ({ children }) => children || null,
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
  }
};