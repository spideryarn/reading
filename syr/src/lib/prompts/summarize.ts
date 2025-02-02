import { renderPrompt, PromptError } from './index';

export interface SummarizePromptContext extends Record<string, unknown> {
    text: string;
    maxLength?: number;
    focus?: string;
}

const ALLOWED_KEYS = ['text', 'maxLength', 'focus'] as const;

const DEFAULT_SUMMARIZE_TEMPLATE = `Please summarize the following text concisely{% if maxLength %} in no more than {{ maxLength }} words{% endif %}{% if focus %}, focusing on {{ focus }}{% endif %}:

{{ text }}`;

function validateContext(context: Record<string, unknown>): void {
    // Check for required fields
    if (!context.text) {
        throw new PromptError('Missing required field: text');
    }

    // Check for unknown fields
    const unknownKeys = Object.keys(context).filter(key => !ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number]));
    if (unknownKeys.length > 0) {
        throw new PromptError(`Unknown fields provided: ${unknownKeys.join(', ')}`);
    }
}

export function getSummarizePrompt(context: SummarizePromptContext): string {
    try {
        validateContext(context);
        return renderPrompt(DEFAULT_SUMMARIZE_TEMPLATE, context);
    } catch (error) {
        if (error instanceof PromptError) {
            throw error;
        }
        throw new PromptError(`Failed to generate summarize prompt: ${error instanceof Error ? error.message : String(error)}`);
    }
} 