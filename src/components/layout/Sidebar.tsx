"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Activity, LayoutDashboard, Users, User, History, FileText, Router, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  if (!user) return null;

  const getLinks = () => {
    switch (user.role) {
      case 'patient':
        return [
          { name: 'Dashboard', href: '/patient', icon: LayoutDashboard },
          { name: 'Appointments', href: '/patient/appointments', icon: Router },
          { name: 'Symptoms', href: '/patient/symptoms', icon: FileText },
          { name: 'History', href: '/patient/history', icon: History },
          { name: 'Profile', href: '/patient/profile', icon: User },
        ];
      case 'doctor':
        return [
          { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
          { name: 'Appointments', href: '/doctor/appointments', icon: Router },
        ];
      case 'admin':
        return [
          { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
          { name: 'Users', href: '/admin/users', icon: Users },
          { name: 'Devices', href: '/admin/devices', icon: Cpu },
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-slate-100 p-4", className)}>
      <div className="flex items-center space-x-2 mb-8 px-2">
        <Activity className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-500">
          TeleMedic
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== `/${user.role}` && pathname.startsWith(`${link.href}/`));
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <link.icon className={cn("h-5 w-5", isActive ? "text-blue-700" : "text-slate-400")} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col space-y-3">
        <div className="px-3 flex flex-col">
          <span className="text-sm font-medium text-slate-900">{user.full_name}</span>
          <span className="text-xs text-slate-500 capitalize">{user.role}</span>
          {user.role === 'doctor' && user.specialization && (
            <span className="text-xs text-blue-600 mt-1">{user.specialization}</span>
          )}
        </div>
        <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={logout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
