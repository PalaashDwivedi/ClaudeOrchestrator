# Claude Orchestrator

Bridges **claude.ai** (this chat) with **Claude Code in VS Code** — so Claude can read what Claude Code outputs and send it instructions back, automatically.

---

## How it works

```
claude.ai chat  ←→  Chrome Extension  ←→  Bridge Server  ←→  VS Code Extension  ←→  Claude Code terminal
```

- **Bridge server** — a tiny local WebSocket server (runs on your machine, port 43210)
- **Chrome extension** — sits on your claude.ai tab, reads responses, injects messages
- **VS Code extension** — monitors Claude Code's terminal, forwards output, receives instructions

---

## Setup (one time)

### 1. Start the bridge server

Double-click `start-bridge.bat`

Or manually:
```bash
cd bridge
npm install
node server.js
```

You should see: `Bridge server running on ws://localhost:43210`

---

### 2. Install the Chrome extension

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder

You'll see the Claude Orchestrator extension appear. Click its icon to check status.

---

### 3. Install the VS Code extension

1. Open VS Code
2. Press `Ctrl+Shift+P` → type `Install from VSIX` — **or** for development:
   - Open the `vscode-extension/` folder in VS Code
   - Press `F5` to launch an Extension Development Host

The extension auto-connects to the bridge on startup. Look for the status bar item at the bottom right.

---

### 4. Open claude.ai in Chrome

Navigate to **claude.ai** — you'll see a small badge in the bottom-right corner:
- 🟢 `Orchestrator connected` — everything is working
- 🔴 `Orchestrator disconnected` — bridge isn't running

---

## Usage

Once all three are connected (bridge ✓, chrome extension ✓, VS Code ✓):

1. Open a terminal in VS Code and run `claude` to start Claude Code
2. Type your message in the **Claude Orchestrator terminal panel** in VS Code and press Enter — it gets sent to claude.ai
3. Claude's response automatically gets forwarded to Claude Code's terminal
4. The loop runs — Claude Code works, you watch (or don't)

### Manual send
Press `Ctrl+Shift+P` → `Claude Orchestrator: Send current terminal output to Claude` to manually forward anything.

---

## Folder structure

```
ClaudeOrchestrator/
├── bridge/                  # Local WebSocket bridge server
│   ├── server.js
│   └── package.json
├── chrome-extension/        # Chrome extension for claude.ai
│   ├── manifest.json
│   ├── content.js           # Reads/writes the claude.ai chat
│   ├── background.js
│   ├── popup.html           # Extension status popup
│   └── popup.js
├── vscode-extension/        # VS Code extension
│   ├── package.json
│   └── src/
│       └── extension.js     # Connects to bridge, manages terminals
└── start-bridge.bat         # One-click bridge startup (Windows)
```

---

## Troubleshooting

**Badge shows disconnected**
→ Make sure `start-bridge.bat` is running and you see "Bridge server running"

**VS Code status bar shows disconnected**
→ Bridge isn't running, or port 43210 is blocked. Check Windows Firewall.

**Messages not going through**
→ Click the Chrome extension icon and check all three dots are green.
