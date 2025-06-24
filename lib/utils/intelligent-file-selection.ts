/**
 * Intelligent File Selection Utility
 * 
 * Analyzes planning documents to intelligently identify relevant codebase files.
 * Used by critique tools to generate focused context for LLM analysis.
 * 
 * Core capabilities:
 * - Extract file paths explicitly mentioned in planning documents
 * - Identify contextually relevant files based on document topic
 * - Prioritize files by relevance (explicit mentions first, then contextual)
 * - Filter to only existing files in the codebase
 */

import { existsSync, readFileSync } from 'fs';

export interface FileSelectionOptions {
  includeTests?: boolean;
  includeClaude?: boolean;
}

export interface FileSelectionResult {
  explicitPaths: string[];
  contextualFiles: string[];
  allFiles: string[];
  existingFiles: string[];
}

/**
 * Get relevant files for a planning document
 */
export function getRelevantFiles(
  planningDocPath: string, 
  options: FileSelectionOptions = {}
): FileSelectionResult {
  const planningContent = readFileSync(planningDocPath, 'utf8');
  
  // Extract file paths mentioned in the document
  const explicitPaths = extractFilePathsFromText(planningContent);
  
  // Get contextually relevant files based on the planning document topic
  const contextualFiles = getContextualFilesForTopic(planningContent, options);
  
  // Combine and deduplicate (explicit paths first for priority)
  const allFiles = [...new Set([...explicitPaths, ...contextualFiles])];
  
  // Filter to only existing files
  const existingFiles = allFiles.filter(file => existsSync(file));
  
  return {
    explicitPaths,
    contextualFiles,
    allFiles,
    existingFiles
  };
}

/**
 * Extract file paths from planning document text
 */
export function extractFilePathsFromText(text: string): string[] {
  const paths: string[] = [];
  
  // Match various file path patterns in markdown
  const patterns = [
    // Backtick-quoted paths: `app/api/route.ts`
    /`([^`]+\.[a-z]{1,4})`/g,
    // Markdown link paths: [text](path/to/file.ext)
    /\]\(([^)]+\.[a-z]{1,4})\)/g,
    // Plain file paths with extensions
    /(?:^|\s)([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*\.[a-z]{1,4})(?:\s|$)/gm,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const path = match[1];
      if (path && !path.startsWith('http') && !path.startsWith('mailto:')) {
        paths.push(path);
      }
    }
  });
  
  return paths;
}

/**
 * Get contextually relevant files based on planning document topic
 */
export function getContextualFilesForTopic(
  planningContent: string, 
  options: FileSelectionOptions = {}
): string[] {
  const docLower = planningContent.toLowerCase();
  
  // Base files that are usually relevant
  const baseFiles = ['package.json'];
  
  // Conditionally include CLAUDE.md
  if (options.includeClaude !== false) {
    baseFiles.unshift('CLAUDE.md');
  }
  
  const contextualFiles: string[] = [];
  
  // Glossary-related files
  if (docLower.includes('glossary')) {
    contextualFiles.push(
      'app/api/glossary/route.ts',
      'lib/prompts/templates/glossary.ts',
      'lib/prompts/templates/glossary.njk',
      'lib/services/database/enhancements.ts',
      'components/unified-left-pane.tsx',
      'docs/reference/TOOL_GLOSSARY.md',
      'lib/types/database.ts',
    );
  }
  
  // LLM/AI-related files
  if (docLower.includes('llm') || docLower.includes('ai') || docLower.includes('prompt')) {
    contextualFiles.push(
      'lib/services/llm-provider.ts',
      'lib/config/models.ts',
      'docs/reference/LLM_PROMPT_TEMPLATES.md',
    );
  }
  
  // Database-related files
  if (docLower.includes('database') || docLower.includes('storage') || docLower.includes('supabase')) {
    contextualFiles.push(
      'lib/services/database/documents.ts',
      'lib/services/database/ai-calls.ts',
      'docs/reference/DATABASE_OVERVIEW.md',
    );
  }
  
  // Authentication-related files
  if (docLower.includes('auth') || docLower.includes('user') || docLower.includes('login')) {
    contextualFiles.push(
      'lib/auth/server-auth.ts',
      'lib/auth/route-protection.ts',
      'docs/reference/AUTHENTICATION_OVERVIEW.md',
    );
  }
  
  // Testing-related files
  if (docLower.includes('test') || docLower.includes('testing') || options.includeTests) {
    contextualFiles.push(
      'docs/reference/TESTING_OVERVIEW.md',
      'lib/testing/rls-database-test-utils.ts',
    );
  }
  
  // Configuration and architecture
  contextualFiles.push(
    'lib/config.ts',
    'docs/reference/ARCHITECTURE_OVERVIEW.md',
    'docs/reference/CODING_PRINCIPLES.md',
  );
  
  return [...baseFiles, ...contextualFiles];
}

/**
 * Get prioritized file list (explicit mentions first, then contextual)
 */
export function getPrioritizedFiles(planningDocPath: string, options: FileSelectionOptions = {}): string[] {
  const result = getRelevantFiles(planningDocPath, options);
  return result.existingFiles;
}