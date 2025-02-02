import { describe, it, expect } from 'vitest';
import { getSummarizePrompt } from '$lib/prompts/summarize';
import { PromptError } from '$lib/prompts/index';

/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
describe('Nunjucks Template Validation', () => {
    describe('undefined variables', () => {
        it('throws error when using undefined variables in template context', () => {
            // @ts-expect-error - Testing runtime behavior with invalid type
            expect(() => getSummarizePrompt({ text: 'Hello world', unknownVar: 'test' }))
                .toThrow(PromptError);
            // @ts-expect-error - Testing runtime behavior with invalid type
            expect(() => getSummarizePrompt({ text: 'Hello world', unknownVar: 'test' }))
                .toThrow('Unknown fields provided: unknownVar');
        });
    });

    describe('required variables', () => {
        it('throws error when missing required variables', () => {
            // @ts-expect-error - Testing runtime behavior with invalid type
            expect(() => getSummarizePrompt({}))
                .toThrow(PromptError);
            // @ts-expect-error - Testing runtime behavior with invalid type
            expect(() => getSummarizePrompt({}))
                .toThrow('Missing required field: text');
        });
    });
});
/* eslint-enable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */ 