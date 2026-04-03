"use client";

import { Bell, Menu } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function Topbar({ onMenuClick, title }: { onMenuClick?: () => void, title?: string }) {
  const { user } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center">
        {onMenuClick && (
          <button 
            type="button" 
            className="md:hidden -ml-2 mr-3 p-2 rounded-md text-slate-500 hover:text-slate-900" 
            onClick={onMenuClick}
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-xl font-semibold text-slate-900">{title || 'Dashboard'}</h1>
      </div>

      <div className="flex items-center space-x-4">
        <button className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
        </button>
        
        {user && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
              {getInitials(user.full_name)}
            </div>
            {user.role === 'doctor' && user.specialization && (
              <span className="text-xs text-blue-600 font-medium">{user.specialization}</span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
