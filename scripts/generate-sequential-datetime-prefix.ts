#!/usr/bin/env npx tsx

import { Cli, Command, Option, UsageError } from 'clipanion';
import { readdir } from 'fs/promises';
import { resolve } from 'path';

class GenerateSequentialDatetimePrefixCommand extends Command {
  static paths = [Command.Default];
  
  static usage = Command.Usage({
    description: 'Generate sequential datetime prefix in yyMMdd[x]_ format',
    details: `
      Generates yyMMdd[x]_ prefix for planning and conversation docs.
      Scans folder for existing files and returns next letter in sequence.
    `,
    examples: [
      ['Planning folder', 'generate-sequential-datetime-prefix planning/'],
      ['Conversations', 'generate-sequential-datetime-prefix docs/conversations/'],
    ],
  });

  folderPath = Option.String({ required: true });
  verbose = Option.Boolean('-v,--verbose', false);

  async execute(): Promise<number> {
    try {
      const targetFolder = resolve(this.folderPath);
      const datePrefix = this.getCurrentDatePrefix();
      
      if (this.verbose) {
        this.context.stdout.write(`Scanning ${targetFolder} for ${datePrefix}*\n`);
      }

      const files = await readdir(targetFolder).catch(err => {
        if (err.code === 'ENOENT') throw new UsageError(`Folder not found: ${targetFolder}`);
        throw err;
      });

      const pattern = new RegExp(`^${datePrefix}([a-z])_`);
      const usedLetters = new Set(
        files
          .map(file => file.match(pattern)?.[1])
          .filter(Boolean)
      );

      const nextLetter = 'abcdefghijklmnopqrstuvwxyz'
        .split('')
        .find(letter => !usedLetters.has(letter)) || 'a';

      this.context.stdout.write(`${datePrefix}${nextLetter}_\n`);
      return 0;
    } catch (error) {
      if (error instanceof UsageError) throw error;
      throw new UsageError(`Error: ${error.message}`);
    }
  }

  private getCurrentDatePrefix(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }
}

const cli = new Cli({
  binaryName: 'generate-sequential-datetime-prefix',
});

cli.register(GenerateSequentialDatetimePrefixCommand);
cli.runExit(process.argv.slice(2));