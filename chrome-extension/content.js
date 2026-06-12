// content.js — runs on claude.ai pages
// Connects to bridge, watches for Claude responses, injects messages into input

let ws = null;
let lastObservedResponse = '';
let connected = false;

function connectBridge() {
  ws = new WebSocket('ws://localhost:43210');

  ws.onopen = () => {
    connected = true;
    ws.send(JSON.stringify({ type: 'register', client: 'claude-ai' }));
    console.log('[Orchestrator] Connected to bridge');
    showBadge(true);
  };

  ws.onclose = () => {
    connected = false;
    console.log('[Orchestrator] Disconnected from bridge, retrying in 3s...');
    showBadge(false);
    setTimeout(connectBridge, 3000);
  };

  ws.onerror = () => {
    ws.close();
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    // Bridge is asking us to inject a message into the chat input
    if (msg.type === 'inject_message') {
      injectAndSend(msg.text);
    }
  };
}

// Watch for new Claude responses in the DOM
function watchForResponses() {
  const observer = new MutationObserver(() => {
    // Claude.ai renders responses in divs with data-is-streaming attribute
    // Once streaming stops, grab the last complete response
    const responses = document.querySelectorAll('[data-testid="assistant-message"]');
    if (!responses.length) return;

    const last = responses[responses.length - 1];
    const streaming = last.querySelector('[data-is-streaming="true"]');
    if (streaming) return; // Still typing, wait

    const text = last.innerText?.trim();
    if (!text || text === lastObservedResponse) return;

    lastObservedResponse = text;

    if (connected && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'claude_response', text }));
      console.log('[Orchestrator] Sent Claude response to bridge');
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Type a message into the chat input and submit it
function injectAndSend(text) {
  // Find the contenteditable input Claude.ai uses
  const input = document.querySelector('[contenteditable="true"][data-testid="chat-input"]')
             || document.querySelector('[contenteditable="true"].ProseMirror')
             || document.querySelector('[contenteditable="true"]');

  if (!input) {
    console.warn('[Orchestrator] Could not find chat input');
    return;
  }

  // Focus and set content
  input.focus();
  input.innerHTML = '';

  // Use execCommand to properly trigger React's synthetic events
  document.execCommand('insertText', false, text);

  // Wait a tick then submit
  setTimeout(() => {
    const submitBtn = document.querySelector('button[aria-label="Send message"]')
                   || document.querySelector('button[type="submit"]');
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
      console.log('[Orchestrator] Message sent to Claude');
    } else {
      // Fallback: press Enter
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }
  }, 100);
}

// Small visual indicator in the page corner showing connection status
function showBadge(isConnected) {
  let badge = document.getElementById('orchestrator-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'orchestrator-badge';
    badge.style.cssText = `
      position: fixed; bottom: 16px; right: 16px; z-index: 9999;
      padding: 6px 12px; border-radius: 20px; font-size: 12px;
      font-family: monospace; font-weight: 600; pointer-events: none;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(badge);
  }
  badge.textContent = isConnected ? '⬤ Orchestrator connected' : '⬤ Orchestrator disconnected';
  badge.style.background = isConnected ? '#1a3a1a' : '#3a1a1a';
  badge.style.color = isConnected ? '#4ade80' : '#f87171';
}

// Start
connectBridge();
watchForResponses();
