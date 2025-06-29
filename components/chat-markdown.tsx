'use client';

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";

/**
 * MarkdownText component for rendering markdown in chat messages.
 * 
 * DUAL MARKDOWN STRATEGY:
 * Spideryarn uses two different markdown approaches for different contexts:
 * 
 * 1. Chat messages (THIS component): @assistant-ui/react-markdown
 *    - Full markdown support (code blocks, tables, lists, links, etc.)
 *    - Optimized for complex AI-generated content
 *    - Built on react-markdown with security by default
 * 
 * 2. Document elements: MarkdownTextPrimitive from @assistant-ui/react-markdown
 *    - Basic markdown formatting with unified architecture
 *    - Used throughout document components for consistency
 *    - Unified ecosystem approach for all markdown rendering
 * 
 * This separation allows us to:
 * - Use appropriate complexity for each context
 * - Minimize bundle size where full markdown isn't needed
 * - Maintain different security/performance profiles
 * 
 * Usage:
 * - Pass this component to MessagePrimitive.Content's components prop
 * - Automatically handles markdown formatting like **bold**, *italic*, `code`, etc.
 * - Built on react-markdown which is secure by default (no XSS vulnerabilities)
 */
export const MarkdownText = () => (
  <div className="[&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:block [&_strong]:mt-4 [&_strong]:mb-2 [&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-4 [&_ul]:mt-3 [&_ol]:mt-3 [&_li]:mb-1">
    <MarkdownTextPrimitive 
      remarkPlugins={[remarkGfm]} 
      className="prose prose-sm max-w-none"
    />
  </div>
);