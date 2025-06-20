#!/usr/bin/env npx tsx

import { Cli, Command, Option, UsageError } from 'clipanion';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve, dirname, basename } from 'path';
import { execSync } from 'child_process';

interface ClaudeMessage {
  uuid: string;
  text: string;
  content: Array<{
    type: string;
    text?: string;
    thinking?: string;
    summaries?: Array<{ summary: string }>;
  }>;
  sender: 'human' | 'assistant';
  created_at: string;
  updated_at: string;
}

interface ClaudeConversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  chat_messages: ClaudeMessage[];
}

interface ConversationExport {
  conversation: ClaudeConversation;
  artifacts: Array<{
    identifier: string;
    type: string;
    language?: string;
    title: string;
    content: string;
  }>;
}

class ExtractClaudeConversationCommand extends Command {
  static paths = [['extract-claude-conversation'], Command.Default];
  
  static usage = Command.Usage({
    description: 'Extract Claude.ai conversations from JSON export to structured markdown',
    details: `
      Extracts specific conversations from a Claude.ai JSON export file and converts them
      to structured markdown following the CAPTURE_SOUNDING_BOARD_CONVERSATION.md format.
      
      The script will:
      - Parse the Claude.ai JSON export format
      - Extract conversation messages and metadata
      - Identify and extract any Claude artifacts as appendices
      - Generate structured markdown with proper formatting
      - Include the original Claude.ai conversation URL (if determinable)
      - Follow British spelling conventions
      
      Output files are automatically named using the yyMMdd[letter]_description format
      and saved to the specified output directory (defaults to docs/conversations/).
    `,
    examples: [
      ['Extract single conversation', 'extract-claude-conversation --uuid 33bbbd21-a6bd-485b-8056-ece64b476480 --input backup/conversations.json'],
      ['Extract multiple conversations', 'extract-claude-conversation --uuid uuid1,uuid2 --input backup/conversations.json --output docs/conversations/'],
      ['Extract with verbose output', 'extract-claude-conversation --uuid 33bbbd21-a6bd-485b-8056-ece64b476480 --input backup/conversations.json --verbose'],
    ],
  });

  // Define options
  inputFile = Option.String('--input', {
    description: 'Path to Claude.ai JSON export file',
    required: true,
  });

  conversationUuids = Option.String('--uuid', {
    description: 'Conversation UUID(s) to extract (comma-separated for multiple)',
    required: true,
  });

  outputDir = Option.String('--output', 'docs/conversations', {
    description: 'Output directory for generated markdown files',
  });

  verbose = Option.Boolean('-v,--verbose', false, {
    description: 'Enable verbose output',
  });

  async execute(): Promise<number> {
    try {
      // Validate input file exists
      const inputPath = resolve(this.inputFile);
      const outputPath = resolve(this.outputDir);

      if (this.verbose) {
        this.context.stdout.write(`📂 Reading from: ${inputPath}\n`);
        this.context.stdout.write(`📝 Writing to: ${outputPath}\n`);
      }

      // Read and parse JSON
      const jsonContent = await readFile(inputPath, 'utf-8');
      const conversations: ClaudeConversation[] = JSON.parse(jsonContent);

      // Parse UUIDs
      const targetUuids = this.conversationUuids.split(',').map(uuid => uuid.trim());

      // Ensure output directory exists
      await mkdir(outputPath, { recursive: true });

      let extractedCount = 0;

      for (const uuid of targetUuids) {
        const conversation = conversations.find(conv => conv.uuid === uuid);
        
        if (!conversation) {
          this.context.stderr.write(`⚠️ Conversation with UUID ${uuid} not found\n`);
          continue;
        }

        if (this.verbose) {
          this.context.stdout.write(`🔍 Processing: "${conversation.name}" (${conversation.chat_messages.length} messages)\n`);
        }

        // Extract conversation and artifacts
        const extracted = this.extractConversationData(conversation);
        
        // Generate markdown
        const markdown = this.generateMarkdown(extracted);
        
        // Generate filename
        const filename = this.generateFilename(conversation.name);
        const outputFile = resolve(outputPath, `${filename}.md`);
        
        // Write file
        await writeFile(outputFile, markdown, 'utf-8');
        
        this.context.stdout.write(`✅ Extracted: ${outputFile}\n`);
        extractedCount++;
      }

      if (extractedCount === 0) {
        this.context.stderr.write(`❌ No conversations were extracted\n`);
        return 1;
      }

      this.context.stdout.write(`\n🎉 Successfully extracted ${extractedCount} conversation(s)\n`);
      return 0;

    } catch (error) {
      if (error instanceof Error) {
        this.context.stderr.write(`❌ Error: ${error.message}\n`);
        
        if (this.verbose) {
          this.context.stderr.write(`Stack trace: ${error.stack}\n`);
        }
        
        // Provide recovery suggestions
        this.context.stderr.write('\n🔧 Recovery options:\n');
        this.context.stderr.write('   • Check file permissions and path\n');
        this.context.stderr.write('   • Verify JSON format is valid Claude.ai export\n');
        this.context.stderr.write('   • Ensure UUIDs exist in the export file\n');
        this.context.stderr.write('   • Try with --verbose for detailed error information\n');
      }
      return 1;
    }
  }

  private extractConversationData(conversation: ClaudeConversation): ConversationExport {
    const artifacts: ConversationExport['artifacts'] = [];
    
    // Look for artifacts in assistant messages
    for (const message of conversation.chat_messages) {
      if (message.sender === 'assistant' && message.text) {
        const artifactMatches = message.text.matchAll(/<antArtifact identifier="([^"]+)" type="([^"]+)"(?:\s+language="([^"]+)")?\s+title="([^"]+)">([\s\S]*?)<\/antArtifact>/g);
        
        for (const match of artifactMatches) {
          artifacts.push({
            identifier: match[1],
            type: match[2],
            language: match[3] || undefined,
            title: match[4],
            content: match[5].trim(),
          });
        }
      }
    }

    return {
      conversation,
      artifacts,
    };
  }

  private generateMarkdown(data: ConversationExport): string {
    const { conversation, artifacts } = data;
    const conversationDate = new Date(conversation.created_at).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });

    const claudeUrl = `https://claude.ai/chat/${conversation.uuid}`;
    
    let markdown = `---
Date: ${conversationDate}
Duration: ${this.estimateDuration(conversation)}
Type: Research Review
Status: Active
Claude URL: ${claudeUrl}
Related Docs: []
---

# ${conversation.name} - ${conversationDate}

> **Original Claude.ai conversation:** [${claudeUrl}](${claudeUrl})

## Context & Goals

[Auto-extracted from Claude.ai export - manual curation recommended]

${this.extractContextFromFirstMessages(conversation)}

## Main Discussion

`;

    // Process messages in chronological order
    let currentSection = '';
    for (const message of conversation.chat_messages) {
      if (message.sender === 'human') {
        // Human messages often introduce new topics
        const messagePreview = this.truncateText(message.text, 100);
        if (messagePreview.length > 20) {
          currentSection = this.generateSectionTitle(messagePreview);
          markdown += `\n### ${currentSection}\n\n`;
        }
        markdown += `**User:** "${this.cleanText(message.text)}"\n\n`;
      } else {
        // Assistant responses
        const cleanedText = this.cleanText(this.removeArtifacts(message.text));
        if (cleanedText.trim()) {
          markdown += `${this.synthesiseAssistantResponse(cleanedText)}\n\n`;
        }
      }
    }

    // Add artifacts as appendices if any exist
    if (artifacts.length > 0) {
      markdown += `## Appendices

### Generated Artifacts

The following artifacts were generated during this conversation:

`;
      
      for (const artifact of artifacts) {
        markdown += `#### ${artifact.title}

**Type:** ${artifact.type}${artifact.language ? ` (${artifact.language})` : ''}  
**Identifier:** \`${artifact.identifier}\`

\`\`\`${artifact.language || 'text'}
${artifact.content}
\`\`\`

`;
      }
    }

    markdown += `## Sources & References

- Original conversation: [Claude.ai](${claudeUrl})
- Export date: ${new Date().toLocaleDateString('en-GB')}
- Total messages: ${conversation.chat_messages.length}
${artifacts.length > 0 ? `- Artifacts generated: ${artifacts.length}` : ''}

## Related Work

[To be filled manually based on any resulting documentation or implementation]

`;

    return markdown;
  }

  private estimateDuration(conversation: ClaudeConversation): string {
    const start = new Date(conversation.created_at);
    const end = new Date(conversation.updated_at);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `~${durationMinutes} minutes`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return `~${hours}h ${minutes}m`;
    }
  }

  private extractContextFromFirstMessages(conversation: ClaudeConversation): string {
    const firstFewMessages = conversation.chat_messages.slice(0, 3);
    const context = firstFewMessages
      .filter(msg => msg.sender === 'human')
      .map(msg => this.truncateText(msg.text, 200))
      .join(' ');
    
    return context || '[Context to be manually extracted from conversation]';
  }

  private generateSectionTitle(text: string): string {
    // Simple heuristic to generate section titles from message content
    const words = text.toLowerCase().split(/\s+/).slice(0, 5);
    return words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/[^\w\s]/g, '');
  }

  private cleanText(text: string): string {
    // Remove excessive whitespace and clean up formatting
    return text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Collapse multiple newlines
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/\s+/g, ' '); // Normalise whitespace
  }

  private removeArtifacts(text: string): string {
    // Remove artifact tags but keep surrounding context
    return text.replace(/<antArtifact[^>]*>[\s\S]*?<\/antArtifact>/g, '[Artifact generated - see Appendices]');
  }

  private synthesiseAssistantResponse(text: string): string {
    // Basic synthesis - in a real implementation, this could be more sophisticated
    if (text.length > 500) {
      const summary = this.truncateText(text, 300);
      return `**Claude:** ${summary}... [Response condensed - see full context in original conversation]`;
    }
    return `**Claude:** ${text}`;
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).replace(/\s\S*$/, '') + '...';
  }

  private generateFilename(conversationTitle: string): string {
    // Get current date in yyMMdd format
    const today = execSync('date +"%y%m%d"', { encoding: 'utf8' }).trim();
    
    // Convert title to filename-safe format
    const description = conversationTitle
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    // For auto-incrementing letter, we'll start with 'a'
    // In a real implementation, this could check existing files
    return `${today}a_${description}`;
  }
}

// CLI setup
const cli = new Cli({
  binaryLabel: 'Claude Conversation Extractor',
  binaryName: 'extract-claude-conversation',
  binaryVersion: '1.0.0',
});

cli.register(ExtractClaudeConversationCommand);
cli.runExit(process.argv.slice(2));