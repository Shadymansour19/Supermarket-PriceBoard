/**
 * A small local log of every push notification this device has received,
 * written by the service worker's `push` handler and read by
 * NotificationsPage — shared as plain IndexedDB (not a page-only store)
 * because the writer runs in the service worker, which has no access to
 * React state. This exists so a push that arrives but fails to display as
 * a system notification (permission quirks, OS suppression, etc.) is still
 * visible somewhere, instead of looking identical to a push that never
 * arrived at all.
 */

export type NotificationLogEntry = {
  id: number;
  title: string;
  body: string;
  url: string;
  receivedAt: number;
};

const DB_NAME = "hamada-notification-log";
const DB_VERSION = 1;
const STORE_NAME = "log";
const MAX_ENTRIES = 100;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function logReceivedNotification(entry: Omit<NotificationLogEntry, "id">): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
      const request = store.add(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    await trimOldEntries(db);
  } finally {
    db.close();
  }
}

async function trimOldEntries(db: IDBDatabase): Promise<void> {
  const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
  const countRequest = store.count();
  const count = await new Promise<number>((resolve, reject) => {
    countRequest.onsuccess = () => resolve(countRequest.result);
    countRequest.onerror = () => reject(countRequest.error);
  });
  if (count <= MAX_ENTRIES) return;

  let deleted = 0;
  const toDelete = count - MAX_ENTRIES;
  await new Promise<void>((resolve, reject) => {
    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor || deleted >= toDelete) {
        resolve();
        return;
      }
      cursor.delete();
      deleted++;
      cursor.continue();
    };
    cursorRequest.onerror = () => reject(cursorRequest.error);
  });
}

export async function getNotificationLog(): Promise<NotificationLogEntry[]> {
  const db = await openDb();
  try {
    const entries = await new Promise<NotificationLogEntry[]>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as NotificationLogEntry[]);
      request.onerror = () => reject(request.error);
    });
    return entries.sort((a, b) => b.receivedAt - a.receivedAt);
  } finally {
    db.close();
  }
}

export async function clearNotificationLog(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
