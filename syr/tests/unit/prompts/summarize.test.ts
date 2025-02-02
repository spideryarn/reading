import { describe, it, expect } from 'vitest';
import { getSummarizePrompt } from '$lib/prompts/summarize';
import { PromptError } from '$lib/prompts/index';

describe('getSummarizePrompt', () => {
    it('generates basic prompt with just text', () => {
        const text = 'Hello world';
        const prompt = getSummarizePrompt({ text });
        expect(prompt).toContain('Please summarize the following text concisely:');
        expect(prompt).toContain('Hello world');
    });
}); 