const WebSocket = require('ws');
const http = require('http');

const PORT = 43210;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let claudeAISocket = null;   // Chrome extension (claude.ai tab)
let vscodeSocket = null;     // VS Code extension

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

wss.on('connection', (ws, req) => {
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // Registration
    if (msg.type === 'register') {
      if (msg.client === 'claude-ai') {
        claudeAISocket = ws;
        log('Claude.ai chrome extension connected');
        ws.send(JSON.stringify({ type: 'registered', client: 'claude-ai' }));
      } else if (msg.client === 'vscode') {
        vscodeSocket = ws;
        log('VS Code extension connected');
        ws.send(JSON.stringify({ type: 'registered', client: 'vscode' }));
      }
      broadcastStatus();
      return;
    }

    // VS Code → Claude.ai: Claude Code said something, forward to claude.ai
    if (msg.type === 'vscode_output') {
      log(`VS Code → Claude.ai: ${msg.text?.slice(0, 80)}...`);
      if (claudeAISocket?.readyState === WebSocket.OPEN) {
        claudeAISocket.send(JSON.stringify({ type: 'inject_message', text: msg.text }));
      } else {
        log('WARNING: Claude.ai extension not connected');
      }
    }

    // Claude.ai → VS Code: Claude responded, forward to VS Code
    if (msg.type === 'claude_response') {
      log(`Claude.ai → VS Code: ${msg.text?.slice(0, 80)}...`);
      if (vscodeSocket?.readyState === WebSocket.OPEN) {
        vscodeSocket.send(JSON.stringify({ type: 'send_to_claudecode', text: msg.text }));
      } else {
        log('WARNING: VS Code extension not connected');
      }
    }
  });

  ws.on('close', () => {
    if (ws === claudeAISocket) { claudeAISocket = null; log('Claude.ai extension disconnected'); }
    if (ws === vscodeSocket)   { vscodeSocket = null;   log('VS Code extension disconnected'); }
    broadcastStatus();
  });
});

function broadcastStatus() {
  const status = {
    type: 'status',
    claudeAI: claudeAISocket?.readyState === WebSocket.OPEN,
    vscode:   vscodeSocket?.readyState   === WebSocket.OPEN,
  };
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(status));
    }
  }
}

server.listen(PORT, '0.0.0.0', () => log(`Bridge server running on ws://localhost:${PORT}`));