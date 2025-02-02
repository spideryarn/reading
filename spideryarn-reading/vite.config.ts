import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'
import path from 'path'
import type { ViteDevServer, Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

function consoleLogPlugin(): Plugin {
  return {
    name: 'console-log-plugin',
    configureServer(server: ViteDevServer) {
      // Ensure logs directory exists
      const logsDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
        console.log('Created logs directory:', logsDir);
      }

      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const originalWrite = res.write;
        const originalEnd = res.end;

        if (req.headers.accept?.includes('text/html')) {
          console.log('Injecting console logger into HTML response');
          res.write = function (chunk: any, ...args: any[]) {
            let html = chunk.toString();
            const script = `
              <script>
                console.log('Console logger initialized');
                const originalConsole = { ...console };
                const methods = ['log', 'info', 'warn', 'error', 'debug'];
                
                function stringifyValue(value) {
                  try {
                    return JSON.stringify(value);
                  } catch (e) {
                    return String(value);
                  }
                }

                window.onerror = function(msg, url, line, col, error) {
                  console.log('Window error caught:', msg);
                  fetch('/__console_log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      level: 'error',
                      args: [{
                        message: msg,
                        url: url,
                        line: line,
                        col: col,
                        stack: error?.stack
                      }]
                    })
                  }).catch(err => console.error('Failed to send error to server:', err));
                  return false;
                };

                window.addEventListener('unhandledrejection', function(event) {
                  console.log('Unhandled promise rejection:', event.reason);
                  fetch('/__console_log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      level: 'error',
                      args: [event.reason ? event.reason.toString() : 'Unhandled rejection']
                    })
                  }).catch(err => console.error('Failed to send unhandled rejection to server:', err));
                });

                methods.forEach(method => {
                  console[method] = (...args) => {
                    originalConsole[method](...args);
                    const serializedArgs = args.map(stringifyValue);
                    fetch('/__console_log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ level: method, args: serializedArgs })
                    }).catch(err => originalConsole.error('Failed to send log to server:', err));
                  };
                });
              </script>`;
            html = html.replace('</head>', `${script}</head>`);
            // @ts-ignore
            return originalWrite.call(res, html);
          };
        }
        next();
      });

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url === '/__console_log') {
          console.log('Received console log request');
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            try {
              const data = JSON.parse(Buffer.concat(chunks).toString());
              const timestamp = new Date().toLocaleTimeString();
              let logMessage = `${timestamp} [${data.level.toUpperCase()}] `;
              
              if (data.args[0]?.message && data.args[0]?.stack) {
                // Format error objects specially
                logMessage += `Error: ${data.args[0].message}\n`;
                logMessage += `Stack: ${data.args[0].stack}\n`;
              } else {
                logMessage += data.args.join(' ') + '\n';
              }
              
              const logFile = path.join(logsDir, 'browser-console.log');
              fs.appendFileSync(logFile, logMessage);
              console.log('Wrote to log file:', logFile);
              res.statusCode = 200;
              res.end('OK');
            } catch (error) {
              console.error('Error processing console log:', error);
              res.statusCode = 500;
              res.end('Internal Server Error');
            }
          });
        } else {
          next();
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), consoleLogPlugin()]
})
