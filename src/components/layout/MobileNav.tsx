"use client";

import * as React from 'react';
import { Sidebar } from './Sidebar';
import { X } from 'lucide-react';

export function MobileNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Sidebar Panel */}
      <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white transform transition-transform">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
        >
          <X className="h-6 w-6" />
        </button>
        <Sidebar className="w-full flex-1" />
      </div>
    </div>
  );
}
