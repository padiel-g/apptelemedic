import { getPendingRequests, removePendingRequest, savePendingRequest } from './offline-store';

export async function syncPendingRequests() {
  const requests = await getPendingRequests();
  if (requests.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  let synced = 0;
  let failed = 0;

  for (const req of requests) {
    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });

      if (res.ok) {
        await removePendingRequest(req.id);
        synced++;
      } else if (res.status >= 400 && res.status < 500) {
        // Bad request or unauthorized, no point keeping it
        await removePendingRequest(req.id);
        failed++;
      } else {
        // 5xx error, could be temporary down
        failed++;
      }
    } catch (e) {
      // Network error, keep for next sync
      failed++;
    }
  }

  const remaining = await getPendingRequests();
  return { synced, failed, remaining: remaining.length };
}

export function startBackgroundSync() {
  if (typeof window === 'undefined') return;

  const runSync = async () => {
    if (navigator.onLine) {
       await syncPendingRequests();
       window.dispatchEvent(new Event('sync-completed'));
    }
  };

  if (navigator.onLine) runSync();

  window.addEventListener('online', runSync);

  const intv = setInterval(runSync, 30000);
  
  return () => {
    window.removeEventListener('online', runSync);
    clearInterval(intv);
  };
}

export async function submitWithOfflineSupport(url: string, body: object, type: 'vital' | 'appointment' | 'symptom') {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return { success: true, offline: false, data: await res.json() };
    const errData = await res.json().catch(()=>({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  } catch (error) {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      await savePendingRequest({
        id: crypto.randomUUID(),
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timestamp: Date.now(),
        type,
      });
      return { success: true, offline: true };
    }
    throw error;
  }
}
