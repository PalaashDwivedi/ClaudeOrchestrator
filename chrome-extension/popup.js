// popup.js
const ws = new WebSocket('ws://localhost:43210');

function setStatus(id, on, label) {
  const dot = document.getElementById(id + '-dot');
  const text = document.getElementById(id + '-text');
  dot.className = 'dot ' + (on ? 'on' : 'off');
  text.className = 'status-text ' + (on ? 'on' : 'off');
  text.textContent = label;
}

ws.onopen = () => {
  setStatus('bridge', true, 'running');
  ws.send(JSON.stringify({ type: 'register', client: 'claude-ai' }));
};

ws.onclose = () => {
  setStatus('bridge', false, 'not running');
  setStatus('claude', false, 'unknown');
  setStatus('vscode', false, 'unknown');
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'status' || msg.type === 'registered') {
    setStatus('claude', msg.claudeAI, msg.claudeAI ? 'connected' : 'waiting');
    setStatus('vscode', msg.vscode,   msg.vscode   ? 'connected' : 'waiting');
  }
};

// Show bridge as offline initially
setStatus('bridge', false, 'connecting...');
setStatus('claude', false, 'waiting');
setStatus('vscode', false, 'waiting');
