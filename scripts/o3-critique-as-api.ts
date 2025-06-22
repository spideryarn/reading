#!/usr/bin/env npx tsx

/**
 * O3 Critique via Direct API - Automated Code Context Generation
 * 
 * Generates comprehensive codebase context using code2prompt (Rust version), then sends to OpenAI o3 via direct API.
 * This approach provides more reliable context gathering compared to agentic Codex CLI workflows.
 * 
 * Prerequisites:
 * - Install code2prompt (Rust version): https://github.com/mufeedvh/code2prompt
 * 
 * Features:
 * - Automated file selection and filtering
 * - Token counting and cost transparency
 * - Comprehensive codebase context generation
 * - Direct OpenAI API integration
 * - Error handling and recovery guidance
 * 
 * See docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_API_APPROACH.md for complete usage guide.
 */

import { Cli, Command, Option, UsageError } from 'clipanion';
import { config } from 'dotenv';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, basename } from 'path';
import { executePrompt } from '../lib/prompts/types';
import { planningDocCritiqueTemplate, type PlanningDocCritiqueInput } from '../lib/prompts/templates/planning-doc-critique';

class O3CritiqueCommand extends Command {
  static paths = [
    ['o3-critique'],
    Command.Default,
  ];

  static usage = Command.Usage({
    description: 'Generate comprehensive codebase context and send to OpenAI o3 for planning document critique',
    details: `
      This script automates the process of critiquing planning documents using OpenAI's o3 model.
      It uses code2prompt to generate comprehensive codebase context, then sends everything
      to o3 via direct API for analysis.
      
      The script:
      - Requires code2prompt (Rust version) to be pre-installed
      - Generates filtered codebase context with optimal settings
      - Includes critique methodology and project documentation
      - Sends structured prompt to OpenAI o3 API
      - Saves both context and raw API response for reference
      
      Output files are saved to planning/critiques/ with timestamps.
    `,
    examples: [
      ['Critique a planning document', 'o3-critique planning/my-feature-plan.md'],
      ['Use OpenAI o3 model', 'o3-critique --model openai:o3:latest planning/my-plan.md'],
      ['Use Claude for critique', 'o3-critique --model anthropic:claude-opus-4:20250514 planning/my-plan.md'],
      ['Include test files in context', 'o3-critique --include-tests planning/my-plan.md'],
      ['Specify exact files to include', 'o3-critique --files app/api/route.ts --files lib/services/db.ts planning/my-plan.md'],
    ],
  });

  planningDoc = Option.String({
    required: true,
    description: 'Path to the planning document to critique',
  });

  model = Option.String('--model', 'openai:o3:latest', {
    description: 'Model to use for critique (format: provider:model:version)',
  });

  includeTests = Option.Boolean('--include-tests', false, {
    description: 'Include test files in the context (normally excluded)',
  });

  files = Option.Array('--files', [], {
    description: 'Specific files to include in the context (if not provided, uses default selection)',
  });

  maxTokens = Option.String('--max-tokens', '10000', {
    description: 'Maximum tokens for the response',
  });

  verbose = Option.Boolean('-v,--verbose', false, {
    description: 'Enable verbose output including token counts',
  });

  async execute(): Promise<number> {
    try {
      // Load environment variables from .env.local
      config({ path: resolve(process.cwd(), '.env.local') });

      // Validate inputs
      await this.validateInputs();

      // Show output locations upfront
      const docBasename = basename(this.planningDoc, '.md');
      const timestamp = new Date().toISOString().slice(2, 16).replace(/[-:]/g, '').replace('T', '_');
      const contextFile = `planning/critiques/CONTEXT_FOR__${docBasename}__${timestamp}.md`;
      const outputFile = `planning/critiques/llm-api__CRITIQUE_OF__${docBasename}__${timestamp}.json`;
      
      this.context.stdout.write('\n📁 Output files will be saved to:\n');
      this.context.stdout.write(`   Context: ${contextFile}\n`);
      this.context.stdout.write(`   Critique: ${outputFile}\n`);
      this.context.stdout.write(`   Model: ${this.model}\n\n`);

      // Generate comprehensive context
      const actualContextFile = await this.generateContext(docBasename, timestamp);

      // Send to LLM via unified system
      const result = await this.sendToLLM(actualContextFile);

      this.context.stdout.write(`\n✅ Critique completed successfully\n`);
      this.context.stdout.write(`\n📄 Files saved:\n`);
      this.context.stdout.write(`   Context: ${contextFile}\n`);
      this.context.stdout.write(`   Critique: ${result.outputFile}\n`);

      if (this.verbose && result.usage) {
        this.context.stdout.write(`💰 Token usage: ${JSON.stringify(result.usage)}\n`);
      }

      return 0;

    } catch (error) {
      if (error instanceof UsageError) {
        throw error;
      }

      this.context.stderr.write(`\n❌ Unexpected error: ${error.message}\n`);
      this.context.stderr.write(`\n🔧 Recovery options:\n`);
      this.context.stderr.write(`   • Check .env.local contains required API keys\n`);
      this.context.stderr.write(`   • Verify planning document exists and is readable\n`);
      this.context.stderr.write(`   • Check network connectivity for AI provider API\n`);
      this.context.stderr.write(`   • Run with --verbose for more details\n`);

      return 1;
    }
  }

  private async validateInputs(): Promise<void> {
    // Check if running from project root
    if (!existsSync('.env.local')) {
      throw new UsageError('Must run from project root (no .env.local found)');
    }

    // Check if planning doc exists
    if (!existsSync(this.planningDoc)) {
      throw new UsageError(`Planning document not found: ${this.planningDoc}`);
    }

    // Note: API key validation will happen when the model is instantiated
    // This allows support for different providers (OpenAI, Anthropic, Google)

    // Check if code2prompt is installed
    try {
      execSync('which code2prompt', { stdio: 'pipe' });
    } catch {
      throw new UsageError(
        'code2prompt not found. Please install the Rust version:\n' +
        '  • macOS/Linux: curl -fsSL https://raw.githubusercontent.com/mufeedvh/code2prompt/main/install.sh | sh\n' +
        '  • Or via Cargo: cargo install code2prompt\n' +
        '  • See: https://github.com/mufeedvh/code2prompt for more options'
      );
    }
  }

  private getFilesToInclude(): string[] {
    // If files were explicitly provided, use those
    if (this.files && this.files.length > 0) {
      // Validate that files exist
      const validFiles = this.files.filter(file => {
        const exists = existsSync(file);
        if (!exists) {
          this.context.stdout.write(`Warning: File not found, skipping: ${file}\n`);
        }
        return exists;
      });
      
      if (validFiles.length === 0) {
        throw new UsageError('None of the specified files exist');
      }
      
      return validFiles;
    }
    
    // Otherwise, use a sensible default set of key files
    this.context.stdout.write('No specific files provided, using default key files...\n');
    
    // Default to key configuration and documentation files
    const defaultFiles = [
      'README.md',
      'CLAUDE.md',
      'package.json',
      'tsconfig.json',
      '.env.example',
      'docs/reference/VISION.md',
      'docs/reference/ARCHITECTURE_OVERVIEW.md',
      'docs/reference/ARCHITECTURE_DECISIONS.md',
      'docs/reference/CODING_PRINCIPLES.md',
      'docs/reference/CODING_GUIDELINES.md',
    ];
    
    // Filter to only existing files
    return defaultFiles.filter(file => existsSync(file));
  }

  private async generateContext(docBasename: string, timestamp: string): Promise<string> {
    // Create critiques directory
    const critiquesDir = 'planning/critiques';
    if (!existsSync(critiquesDir)) {
      mkdirSync(critiquesDir, { recursive: true });
    }

    // Generate output filename
    const contextFile = `${critiquesDir}/CONTEXT_FOR__${docBasename}__${timestamp}.md`;

    // Get files to include (either from command line or defaults)
    const filesToInclude = this.getFilesToInclude();
    
    this.context.stdout.write(`Including ${filesToInclude.length} files in context\n`);
    if (this.verbose) {
      this.context.stdout.write('Files to include:\n');
      filesToInclude.forEach(file => this.context.stdout.write(`  - ${file}\n`));
    }

    // Generate context with the selected files
    this.context.stdout.write('Generating targeted codebase context with code2prompt...\n');

    // Build command with explicit file list
    const baseCmd = [
      'code2prompt',
      '--path .',
      '--line-number',
      '--tokens',
      '--gitignore .gitignore',  // Still respect gitignore for basic exclusions
    ];

    // Add each selected file as an include pattern
    filesToInclude.forEach(file => {
      baseCmd.push(`--include "${file}"`);
    });

    baseCmd.push(`--output "${contextFile}"`);

    const code2promptCmd = baseCmd.join(' ');

    try {
      execSync(code2promptCmd, { 
        stdio: this.verbose ? 'inherit' : 'pipe',
        encoding: 'utf8'
      });
    } catch (error) {
      throw new UsageError(`code2prompt failed: ${error.message}`);
    }

    this.context.stdout.write(`Context generated: ${contextFile}\n`);

    // Display token count if verbose
    if (this.verbose) {
      try {
        const contextContent = readFileSync(contextFile, 'utf8');
        const tokenMatch = contextContent.match(/Token count: (\d+)/);
        if (tokenMatch) {
          this.context.stdout.write(`Token count: ${tokenMatch[1]}\n`);
        }
      } catch {
        // Token count extraction failed, continue anyway
      }
    }

    return contextFile;
  }

  private async sendToLLM(contextFile: string): Promise<{outputFile: string, usage?: any}> {
    // Read files
    const planningContent = readFileSync(this.planningDoc, 'utf8');
    const codebaseContext = readFileSync(contextFile, 'utf8');

    // Read critique methodology if available
    const critiqueMethodologyFile = 'docs/instructions/CRITIQUE_OF_PLANNING_DOC.md';
    const critiqueMethodology = existsSync(critiqueMethodologyFile)
      ? readFileSync(critiqueMethodologyFile, 'utf8')
      : '(Critique methodology file not found - please provide systematic analysis)';

    // Generate output filename
    const docBasename = basename(this.planningDoc, '.md');
    const timestamp = new Date().toISOString().slice(2, 16).replace(/[-:]/g, '').replace('T', '_');
    const outputFile = `planning/critiques/llm-api__CRITIQUE_OF__${docBasename}__${timestamp}.json`;

    this.context.stdout.write(`Sending critique request to ${this.model}...\n`);

    // Prepare input for prompt template
    const promptInput: PlanningDocCritiqueInput = {
      planningDocPath: this.planningDoc,
      planningDocContent: planningContent,
      critiqueMethodology: critiqueMethodology,
      codebaseContext: codebaseContext,
    };

    try {
      // Use the unified LLM system with custom model and settings
      const result = await executePrompt(
        planningDocCritiqueTemplate,
        promptInput,
        {
          modelString: this.model,
          temperature: 0.1,
          maxTokens: parseInt(this.maxTokens),
        }
      );

      // Save detailed response including usage info
      const responseData = {
        model: this.model,
        critique: result.text,
        usage: result.usage,
        finishReason: result.finishReason,
        timestamp: new Date().toISOString(),
        planningDoc: this.planningDoc,
        contextFile: contextFile,
      };

      writeFileSync(outputFile, JSON.stringify(responseData, null, 2));

      // Display the critique
      this.context.stdout.write('\n=== LLM CRITIQUE ===\n\n');
      this.context.stdout.write(result.text);
      this.context.stdout.write('\n\n');

      return {
        outputFile,
        usage: result.usage
      };

    } catch (error) {
      if (error.message.includes('Unknown model')) {
        throw new UsageError(`Model "${this.model}" is not available. Check model configuration in lib/config/models.ts`);
      }
      if (error.message.includes('API_KEY')) {
        throw new UsageError(`API key missing for model ${this.model}. Check .env.local configuration.`);
      }
      throw new UsageError(`LLM request failed: ${error.message}`);
    }
  }
}

// CLI setup
const cli = new Cli({
  binaryLabel: 'LLM Planning Document Critique Tool',
  binaryName: 'llm-critique',
  binaryVersion: '1.0.0',
});

cli.register(O3CritiqueCommand);
cli.runExit(process.argv.slice(2));