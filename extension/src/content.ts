interface MessageFromBackground {
  type: string;
  data: any;
}

interface ElementSelector {
  tagName: string;
  id: string;
  className: string;
  xpath: string;
}

function generateXPath(element: Element): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  if (element.tagName === 'BODY') {
    return '//body';
  }

  let xpath = '';
  let current: Element | null = element;

  while (current && current.tagName !== 'BODY') {
    const tagName = current.tagName.toLowerCase();
    const parent = current.parentElement;

    if (!parent) break;

    const siblings = Array.from(parent.children).filter(
      (child) => child.tagName === current.tagName
    );

    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      xpath = `/${tagName}[${index}]${xpath}`;
    } else {
      xpath = `/${tagName}${xpath}`;
    }

    current = parent;
  }

  return `//body${xpath}`;
}

function getElementInfo(element: Element): ElementSelector {
  return {
    tagName: element.tagName,
    id: element.id,
    className: element.className.toString(),
    xpath: generateXPath(element),
  };
}

let selectedElement: Element | null = null;

function handleMouseClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('.ai-browser-overlay')) {
    event.stopPropagation();
    return;
  }

  selectedElement = event.target as Element;

  chrome.runtime.sendMessage({
    type: 'elementSelected',
    data: getElementInfo(selectedElement),
  });
}

function highlightElement(element: Element | null) {
  const existingOverlay = document.querySelector('.ai-browser-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  if (!element) return;

  const rect = element.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.className = 'ai-browser-overlay';
  overlay.style.position = 'fixed';
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.border = '2px solid #00ff00';
  overlay.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
  overlay.style.zIndex = '999999';
  overlay.style.pointerEvents = 'none';

  document.body.appendChild(overlay);
}

function capturePageState() {
  return {
    url: window.location.href,
    title: document.title,
    dom: document.documentElement.outerHTML,
  };
}

chrome.runtime.onMessage.addListener((message: MessageFromBackground, sender, sendResponse) => {
  switch (message.type) {
    case 'selectElement':
      document.addEventListener('click', handleMouseClick);
      sendResponse({ status: 'listening' });
      break;
    case 'stopSelecting':
      document.removeEventListener('click', handleMouseClick);
      sendResponse({ status: 'stopped' });
      break;
    case 'highlight':
      if (message.data.xpath) {
        const element = document.evaluate(
          message.data.xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
        highlightElement(element as Element);
      }
      sendResponse({ status: 'highlighted' });
      break;
    case 'captureState':
      sendResponse(capturePageState());
      break;
    case 'execute':
      try {
        const result = eval(message.data);
        sendResponse({ status: 'success', result });
      } catch (error) {
        sendResponse({ status: 'error', error: error.message });
      }
      break;
  }
});

console.log('AI Browser Content Script loaded');