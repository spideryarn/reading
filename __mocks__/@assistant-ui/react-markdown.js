// Mock for @assistant-ui/react-markdown
module.exports = {
  MarkdownTextPrimitive: ({ text }) => {
    const React = require('react');
    return React.createElement('div', null, text);
  }
};