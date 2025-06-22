#!/usr/bin/env npx tsx

import { Cli, Command, Option, UsageError } from 'clipanion';
import { readFileSync } from 'fs';

class ParseCritiqueCommand extends Command {
  static paths = [['parse-critique'], Command.Default];
  
  static usage = Command.Usage({
    description: 'Parse OpenAI o3-pro critique output from codex and format it nicely',
    details: `
      This script parses the JSON Lines output from OpenAI o3-pro model calls
      and extracts the final critique message, formatting it for readable display.
      
      The input should be the raw output from a codex call using o3-pro model.
    `,
    examples: [
      ['Parse from file', 'parse-critique critique-output.txt'],
      ['Parse from stdin', 'cat critique-output.txt | parse-critique'],
      ['Parse from codex command', 'codex --model o3-pro "critique planning doc" | parse-critique'],
    ],
  });

  inputFile = Option.String({
    description: 'Input file containing the critique output (or stdin if not provided)',
    required: false,
  });

  async execute(): Promise<number> {
    try {
      let input: string;
      
      if (this.inputFile) {
        // Read from file
        try {
          input = readFileSync(this.inputFile, 'utf8');
        } catch (error) {
          throw new UsageError(`Could not read file: ${this.inputFile}`);
        }
      } else {
        // Read from stdin
        input = '';
        process.stdin.setEncoding('utf8');
        
        for await (const chunk of process.stdin) {
          input += chunk;
        }
        
        if (!input.trim()) {
          throw new UsageError('No input provided. Use a file argument or pipe input to stdin.');
        }
      }

      const critique = this.extractCritique(input);
      
      if (!critique) {
        this.context.stderr.write('❌ No critique found in the input\n');
        return 1;
      }

      // Output the formatted critique
      this.context.stdout.write(critique + '\n');
      return 0;

    } catch (error) {
      if (error instanceof UsageError) {
        throw error;
      }
      
      this.context.stderr.write(`❌ Error parsing critique: ${error.message}\n`);
      return 1;
    }
  }

  private extractCritique(input: string): string | null {
    const lines = input.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const parsed = JSON.parse(line);
        
        // Look for the final message with the critique content
        if (parsed.type === 'message' && 
            parsed.content && 
            Array.isArray(parsed.content) &&
            parsed.content.length > 0) {
          
          const textContent = parsed.content.find((item: any) => item.type === 'output_text');
          if (textContent && textContent.text) {
            return textContent.text;
          }
        }
      } catch (e) {
        // Not valid JSON, skip this line
        continue;
      }
    }
    
    return null;
  }
}

// CLI setup
const cli = new Cli({
  binaryLabel: 'Parse Critique Output',
  binaryName: 'parse-critique',
  binaryVersion: '1.0.0',
});

cli.register(ParseCritiqueCommand);
cli.runExit(process.argv.slice(2));