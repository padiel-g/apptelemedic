"use client";

import { useEffect, useState } from 'react';
import { getPendingCount } from '@/lib/offline-store';
import { syncPendingRequests } from '@/lib/sync-manager';
import { CloudOff, Wifi, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const updateCount = async () => {
      try {
        const count = await getPendingCount();
        setPendingCount(count);
      } catch { /* IndexedDB unavailable */ }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setJustSynced(true);
      setSyncing(true);
      syncPendingRequests().then(() => {
        updateCount();
        setSyncing(false);
        setTimeout(() => setJustSynced(false), 3000);
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustSynced(false);
    };

    const handleSyncCompleted = () => updateCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-completed', handleSyncCompleted);

    updateCount();
    const interval = setInterval(updateCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-completed', handleSyncCompleted);
      clearInterval(interval);
    };
  }, []);

  // Nothing to show
  if (isOnline && !justSynced && pendingCount === 0) return null;

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ease-in-out',
      !isOnline
        ? 'bg-amber-500 text-amber-950'
        : justSynced
          ? 'bg-emerald-500 text-white'
          : pendingCount > 0
            ? 'bg-blue-500 text-white'
            : ''
    )}>
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-sm font-medium">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <>
              <CloudOff className="w-4 h-4" />
              <span>You are offline — data will sync when connection is restored</span>
            </>
          ) : syncing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Back online — syncing...</span>
            </>
          ) : justSynced ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>Back online — all data synced!</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>{pendingCount} item{pendingCount !== 1 ? 's' : ''} waiting to sync</span>
            </>
          ) : null}
        </div>
        {pendingCount > 0 && isOnline && (
          <span className="text-xs opacity-80">{pendingCount} pending</span>
        )}
      </div>
    </div>
  );
}
