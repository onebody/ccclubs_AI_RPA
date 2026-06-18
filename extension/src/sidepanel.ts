interface SessionInfo {
  sessionId: string;
  status: string;
  startTime: string;
}

interface TaskInfo {
  taskId: string;
  type: string;
  status: string;
}

let currentSession: SessionInfo | null = null;
let tasks: TaskInfo[] = [];

async function fetchSessionList(): Promise<SessionInfo[]> {
  try {
    const token = await chrome.storage.local.get('authToken');
    const response = await fetch('http://localhost:3000/session', {
      headers: {
        Authorization: `Bearer ${token.authToken}`,
      },
    });
    return await response.json();
  } catch {
    return [];
  }
}

async function createSession(): Promise<SessionInfo | null> {
  try {
    const token = await chrome.storage.local.get('authToken');
    const response = await fetch('http://localhost:3000/session/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.authToken}`,
      },
      body: JSON.stringify({
        memoryLimit: '2Gi',
        cpuLimit: '1',
        maxLifetime: 30,
      }),
    });
    const data = await response.json();
    return {
      sessionId: data.sessionId,
      status: 'running',
      startTime: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function renderSessionList(sessions: SessionInfo[]) {
  const list = document.getElementById('session-list');
  if (!list) return;

  list.innerHTML = sessions
    .map(
      (session) => `
      <div class="session-item ${currentSession?.sessionId === session.sessionId ? 'active' : ''}" data-session-id="${session.sessionId}">
        <div class="session-id">${session.sessionId.slice(0, 8)}...</div>
        <div class="session-status ${session.status}">${session.status}</div>
        <div class="session-time">${new Date(session.startTime).toLocaleTimeString()}</div>
      </div>
    `
    )
    .join('');

  list.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest('.session-item');
    if (item) {
      const sessionId = item.getAttribute('data-session-id');
      currentSession = sessions.find((s) => s.sessionId === sessionId) || null;
      renderSessionList(sessions);
      renderTaskList([]);
    }
  });
}

function renderTaskList(taskList: TaskInfo[]) {
  const list = document.getElementById('task-list');
  if (!list) return;

  list.innerHTML = taskList
    .map(
      (task) => `
      <div class="task-item">
        <div class="task-id">${task.taskId.slice(0, 8)}...</div>
        <div class="task-type">${task.type}</div>
        <div class="task-status ${task.status}">${task.status}</div>
      </div>
    `
    )
    .join('');
}

function setupEventListeners() {
  document.getElementById('refresh-sessions')?.addEventListener('click', async () => {
    const sessions = await fetchSessionList();
    renderSessionList(sessions);
  });

  document.getElementById('create-session')?.addEventListener('click', async () => {
    const session = await createSession();
    if (session) {
      currentSession = session;
      const sessions = await fetchSessionList();
      renderSessionList(sessions);
    }
  });

  document.getElementById('close-session')?.addEventListener('click', async () => {
    if (!currentSession) return;

    const token = await chrome.storage.local.get('authToken');
    await fetch(`http://localhost:3000/session/${currentSession.sessionId}/close`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.authToken}`,
      },
    });

    currentSession = null;
    const sessions = await fetchSessionList();
    renderSessionList(sessions);
    renderTaskList([]);
  });

  document.getElementById('ai-command-input')?.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter' && currentSession) {
      const input = event.target as HTMLInputElement;
      const command = input.value.trim();
      if (!command) return;

      input.value = '';

      const token = await chrome.storage.local.get('authToken');
      await fetch(`http://localhost:3000/ai/${currentSession.sessionId}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.authToken}`,
        },
        body: JSON.stringify({ command }),
      });
    }
  });
}

async function init() {
  setupEventListeners();
  const sessions = await fetchSessionList();
  renderSessionList(sessions);
}

document.addEventListener('DOMContentLoaded', init);