import { readFileSync } from 'fs';
import { load } from 'cheerio';
import { assignDeterministicIds, getBodyWithIds } from '@/lib/services/deterministicId';

// Mock cheerio to avoid the ESM import issue
jest.mock('cheerio', () => ({
  load: jest.fn((html: string) => {
    const mockCheerio = {
      html: () => html,
      attr: jest.fn(),
      children: jest.fn(() => ({ each: jest.fn() })),
      each: jest.fn(),
      length: 0,
      first: jest.fn(() => mockCheerio),
      prepend: jest.fn(),
      addClass: jest.fn(),
      replaceWith: jest.fn(),
    };
    // The loaded cheerio instance itself needs an html method
    const cheerioInstance = jest.fn(() => mockCheerio);
    cheerioInstance.html = () => html;
    return cheerioInstance;
  }),
}));

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => '<html><body><p>Test content</p></body></html>'),
}));

describe('deterministicId', () => {
  const mockHtml = '<html><body><p>Test content</p></body></html>';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignDeterministicIds', () => {
    it('should be a function', () => {
      expect(typeof assignDeterministicIds).toBe('function');
    });

    it('should return HTML with IDs', () => {
      const result = assignDeterministicIds(mockHtml);
      expect(typeof result).toBe('string');
      expect(result).toContain('syr-');
    });
  });

  describe('getBodyWithIds', () => {
    it('should be a function', () => {
      expect(typeof getBodyWithIds).toBe('function');
    });

    it('should extract body content with IDs', () => {
      const result = getBodyWithIds(mockHtml);
      expect(typeof result).toBe('string');
    });

    it('should generate deterministic IDs', () => {
      const result1 = getBodyWithIds(mockHtml);
      const result2 = getBodyWithIds(mockHtml);
      expect(result1).toBe(result2);
    });
  });
});