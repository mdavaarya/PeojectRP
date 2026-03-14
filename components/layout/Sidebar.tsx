'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  GraduationCap, LayoutDashboard, User, Briefcase, Award,
  Search, Users, FileText, LogOut, ChevronRight,
  Radar, Settings2, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface SidebarProps {
  role: 'alumni' | 'admin';
}

const alumniLinks = [
  { href: '/dashboard',     label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/profile',       label: 'My Profile',        icon: User },
  { href: '/milestones',    label: 'Career Milestones', icon: Briefcase },
  { href: '/certifications',label: 'Certifications',    icon: Award },
  { href: '/tracking',      label: 'Tracking Karir',    icon: Radar },  // NEW
  { href: '/search',        label: 'Search Alumni',     icon: Search },
];

const adminLinks = [
  { href: '/admin',                 label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/admin/alumni',          label: 'Alumni Management', icon: Users },
  { href: '/admin/tracking',        label: 'Tracking Monitor',  icon: Activity },   // NEW
  { href: '/admin/search-profiles', label: 'Search Profiles',   icon: Settings2 },  // NEW
  { href: '/admin/reports',         label: 'Reports & Export',  icon: FileText },
];

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const links    = role === 'admin' ? adminLinks : alumniLinks;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out');
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-64 min-h-screen bg-primary-900 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-primary-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-800" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">SILUMNI</p>
            <p className="text-primary-300 text-xs mt-0.5">
              {role === 'admin' ? 'Admin Panel' : 'Alumni Portal'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== '/admin' && href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'sidebar-link',
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-primary-700">
        <button
          onClick={handleLogout}
          className="sidebar-link sidebar-link-inactive w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
