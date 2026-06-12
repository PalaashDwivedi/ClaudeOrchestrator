// extension.js — VS Code extension
// Connects to bridge server, monitors Claude Code terminal, forwards output/input

const vscode = require('vscode');
const WebSocket = require('ws');

let ws = null;
let statusBar = null;
let connected = false;
let terminalBuffer = '';
let bufferFlushTimer = null;
let activeTerminal = null;
let writeEmitter = null;

function activate(context) {
  // Status bar item
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'claudeOrchestrator.start';
  setStatus('disconnected');
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeOrchestrator.start', () => connectBridge()),
    vscode.commands.registerCommand('claudeOrchestrator.stop',  () => disconnectBridge()),
    vscode.commands.registerCommand('claudeOrchestrator.sendToClaude', () => flushBuffer(true))
  );

  // Auto-start
  connectBridge();

  // Create the Claude Code pseudo-terminal that we can read/write
  setupTerminal(context);
}

function setupTerminal(context) {
  writeEmitter = new vscode.EventEmitter();

  const pty = {
    onDidWrite: writeEmitter.event,
    open: () => {
      writeEmitter.fire('\x1b[1;35mClaude Orchestrator terminal ready.\x1b\n');
      writeEmitter.fire('Type a message and press Enter to send to Claude, or output will be forwarded automatically.\r\n\r\n');
    },
    close: () => {},
    handleInput: (data) => {
      // User typed in the terminal — collect until Enter
      if (data === '\r') {
        // Enter pressed — send buffer to Claude
        const text = terminalBuffer.trim();
        terminalBuffer = '';
        writeEmitter.fire('\r\n');
        if (text) sendToClaude(text);
      } else if (data === '\x7f') {
        // Backspace
        if (terminalBuffer.length > 0) {
          terminalBuffer = terminalBuffer.slice(0, -1);
          writeEmitter.fire('\b \b');
        }
      } else {
        terminalBuffer += data;
        writeEmitter.fire(data);
      }
    }
  };

  activeTerminal = vscode.window.createTerminal({
    name: 'Claude Orchestrator',
    pty
  });

  context.subscriptions.push(activeTerminal);
}

function connectBridge() {
  if (ws) ws.close();

  ws = new WebSocket('ws://localhost:43210');

  ws.on('open', () => {
    connected = true;
    ws.send(JSON.stringify({ type: 'register', client: 'vscode' }));
    setStatus('connected');
    log('Connected to bridge server');
  });

  ws.on('close', () => {
    connected = false;
    setStatus('disconnected');
    log('Disconnected from bridge. Retrying in 3s...');
    setTimeout(connectBridge, 3000);
  });

  ws.on('error', () => ws.close());

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);

    // Claude responded — write it to our terminal so user can see, 
    // AND send it to whatever Claude Code terminal is active
    if (msg.type === 'send_to_claudecode') {
      log(`Claude → Claude Code: ${msg.text?.slice(0, 80)}...`);
      displayInTerminal('\x1b[1;36m[Claude]\x1b[0m ' + msg.text);
      sendToClaudeCodeTerminal(msg.text);
    }

    if (msg.type === 'status') {
      const bothConnected = msg.claudeAI && msg.vscode;
      setStatus(bothConnected ? 'active' : connected ? 'connected' : 'disconnected');
    }
  });
}

function disconnectBridge() {
  if (ws) { ws.close(); ws = null; }
  setStatus('disconnected');
}

// Forward text to whatever terminal Claude Code is running in
function sendToClaudeCodeTerminal(text) {
  const terminals = vscode.window.terminals;
  // Find a terminal named 'claude' or just use the most recent non-orchestrator one
  const target = terminals.find(t => t.name.toLowerCase().includes('claude') && t !== activeTerminal)
              || terminals.find(t => t !== activeTerminal);

  if (target) {
    target.sendText(text, true);
    log(`Sent to terminal: ${target.name}`);
  } else {
    log('No target terminal found — open a terminal and run claude');
    vscode.window.showWarningMessage('Claude Orchestrator: No terminal found. Open a terminal and run `claude`.');
  }
}

// Send text from VS Code side to Claude via bridge
function sendToClaude(text) {
  if (!connected || !ws) {
    vscode.window.showErrorMessage('Claude Orchestrator: Not connected to bridge.');
    return;
  }
  ws.send(JSON.stringify({ type: 'vscode_output', text }));
  displayInTerminal('\x1b[1;33m[You → Claude]\x1b[0m ' + text);
}

// Write a line into our orchestrator terminal
function displayInTerminal(text) {
  if (writeEmitter) {
    writeEmitter.fire(text.replace(/\n/g, '\r\n') + '\r\n');
  }
}

function log(msg) {
  console.log(`[Claude Orchestrator] ${msg}`);
  displayInTerminal('\x1b[2m' + msg + '\x1b[0m');
}

function setStatus(state) {
  const states = {
    disconnected: { text: '$(circle-slash) Orchestrator', tooltip: 'Not connected — click to start', color: new vscode.ThemeColor('statusBarItem.errorBackground') },
    connected:    { text: '$(radio-tower) Orchestrator',  tooltip: 'Connected to bridge, waiting for Claude.ai', color: undefined },
    active:       { text: '$(zap) Orchestrator',          tooltip: 'Active — claude.ai and VS Code bridged', color: new vscode.ThemeColor('statusBarItem.warningBackground') },
  };
  const s = states[state] || states.disconnected;
  statusBar.text = s.text;
  statusBar.tooltip = s.tooltip;
  statusBar.backgroundColor = s.color;
}

function deactivate() {
  if (ws) ws.close();
}

module.exports = { activate, deactivate };
