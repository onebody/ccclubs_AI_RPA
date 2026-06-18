import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

async function getStoredToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('authToken');
  return result.authToken || null;
}

async function connectToServer() {
  const token = await getStoredToken();
  if (!token) return;

  socket = io(process.env.BACKEND_URL || 'http://localhost:3000', {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Connected to backend');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from backend');
  });

  socket.on('message', (data) => {
    handleMessage(data);
  });
}

function handleMessage(data: { sessionId: string; type: string; data: any }) {
  switch (data.type) {
    case 'navigate':
      navigateToUrl(data.data.url);
      break;
    case 'execute':
      executeScript(data.data.script);
      break;
    case 'screenshot':
      takeScreenshot(data.sessionId);
      break;
  }
}

async function navigateToUrl(url: string) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) {
    await chrome.tabs.update(tabs[0].id!, { url });
  }
}

async function executeScript(script: string) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) {
    await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id! },
      func: () => {
        // Script will be injected
      },
    });
  }
}

async function takeScreenshot(sessionId: string) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) {
    const screenshot = await chrome.tabs.captureVisibleTab(tabs[0].windowId);
    socket?.emit('message', {
      sessionId,
      type: 'screenshot',
      data: { screenshot },
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.action.onClicked.addListener(() => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'connect':
      connectToServer();
      sendResponse({ status: 'connecting' });
      break;
    case 'sendMessage':
      socket?.emit('message', message.data);
      sendResponse({ status: 'sent' });
      break;
    case 'getStatus':
      sendResponse({ connected: socket?.connected || false });
      break;
  }
});

connectToServer();