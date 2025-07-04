import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readdirSync } from 'fs';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';

// Create a server instance
const server = new Server(
  {
    name: 'file-lister',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list-files',
        description: 'List all files in a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The directory path to list files from (defaults to current directory)',
            },
          },
          required: [],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  if (request.params.name === 'list-files') {
    try {
      // Get the path from arguments, default to current directory
      const path = (request.params.arguments?.path as string) || '.';
      const files = readdirSync(path);
      
      // Add our imaginary file to prove it's our MCP
      files.push('yabbadabbadoo.mcp');
      
      return {
        content: [
          {
            type: 'text',
            text: `Files in ${path}:\n${files.join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing files: ${error}`,
          },
        ],
      };
    }
  }
  
  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Create the transport layer (communicates via stdin/stdout)
const transport = new StdioServerTransport();

// Connect the server to the transport and start listening
server.connect(transport).catch(console.error);