import nunjucks from 'nunjucks';

// Configure Nunjucks with strict settings
nunjucks.configure({ 
    autoescape: false,
    throwOnUndefined: true  // This will make Nunjucks throw errors for undefined variables
});

// Helper function to render prompts with type safety
export function renderPrompt<T extends Record<string, unknown>>(
    template: string,
    context: T
): string {
    return nunjucks.renderString(template, context);
}

// Base error for prompt-related issues
export class PromptError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PromptError';
    }
} 