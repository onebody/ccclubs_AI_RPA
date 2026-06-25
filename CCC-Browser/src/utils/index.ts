export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return year + month + day + '_' + hours + minutes + seconds;
}

export function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  return fn().catch(error => {
    if (retries > 0) {
      return delay(delayMs).then(() => retry(fn, retries - 1, delayMs * 2));
    }
    throw error;
  });
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}