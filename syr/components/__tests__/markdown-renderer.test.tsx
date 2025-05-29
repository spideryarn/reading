import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '../markdown-renderer';

describe('MarkdownRenderer', () => {
  it('should render plain text as-is', () => {
    render(<MarkdownRenderer content="Plain text without formatting" />);
    expect(screen.getByText('Plain text without formatting')).toBeInTheDocument();
  });

  it('should render italic text with em tags', () => {
    render(<MarkdownRenderer content="Text with *italic* words" />);
    
    const italicElement = screen.getByText('italic');
    expect(italicElement.tagName).toBe('EM');
    expect(screen.getByText(/Text with/)).toBeInTheDocument();
    expect(screen.getByText(/words/)).toBeInTheDocument();
  });

  it('should render bold text with strong tags', () => {
    render(<MarkdownRenderer content="Text with **bold** words" />);
    
    const boldElement = screen.getByText('bold');
    expect(boldElement.tagName).toBe('STRONG');
  });

  it('should render inline code with code tags', () => {
    render(<MarkdownRenderer content="Text with `inline code` example" />);
    
    const codeElement = screen.getByText('inline code');
    expect(codeElement.tagName).toBe('CODE');
    expect(codeElement).toHaveClass('font-mono', 'text-sm', 'bg-gray-100');
  });

  it('should handle multiple formatting in one text', () => {
    render(<MarkdownRenderer content="Text with *italic*, **bold**, and `code` all together" />);
    
    expect(screen.getByText('italic').tagName).toBe('EM');
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('code').tagName).toBe('CODE');
  });

  it('should handle underscore notation for italics', () => {
    render(<MarkdownRenderer content="Text with _underscore italic_ notation" />);
    
    const italicElement = screen.getByText('underscore italic');
    expect(italicElement.tagName).toBe('EM');
  });

  it('should preserve text outside of markdown markers', () => {
    render(<MarkdownRenderer content="(A technical note: Some philosophers argue that even though there is a *conceptual* gap)" />);
    
    expect(screen.getByText(/\(A technical note: Some philosophers argue that even though there is a/)).toBeInTheDocument();
    expect(screen.getByText('conceptual').tagName).toBe('EM');
    expect(screen.getByText(/gap\)/)).toBeInTheDocument();
  });

  it('should handle empty content', () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container.textContent).toBe('');
  });

  it('should apply custom className', () => {
    const { container } = render(<MarkdownRenderer content="Test" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});