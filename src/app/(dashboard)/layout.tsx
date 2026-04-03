"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { startBackgroundSync } from '@/lib/sync-manager';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      const cleanup = startBackgroundSync();
      return cleanup;
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen h-full bg-slate-50 flex overflow-hidden">
      <OfflineIndicator />
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0">
        <Sidebar />
      </div>

      {/* Mobile Nav */}
      <MobileNav isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

      {/* Main Content */}
      <div className="flex flex-col flex-1 w-full md:pl-64">
        <Topbar onMenuClick={() => setIsMobileNavOpen(true)} title={`Hello, ${user.full_name.split(' ')[0]}`} />
        
        <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
