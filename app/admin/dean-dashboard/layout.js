// app/admin/dean-dashboard/layout.js
'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  FaUsers, 
  FaUserCheck, 
  FaChartBar, 
  FaVoteYea,
  FaSignOutAlt,
  FaUniversity,
  FaHome
} from 'react-icons/fa';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export default function DeanDashboardLayout({ children }) {
  const { admin, isAuthenticated, logout, loading } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-green-500 mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || admin?.role !== 'dean') {
    router.push('/');
    return null;
  }

  const navItems = [
    {
      name: 'Overview',
      href: '/admin/dean-dashboard',
      icon: FaHome,
      exact: true
    },
    {
      name: 'Candidates',
      href: '/admin/dean-dashboard/candidates',
      icon: FaUsers,
      exact: false
    },
    {
      name: 'Pending Approvals',
      href: '/admin/dean-dashboard/pending-approvals',
      icon: FaUserCheck,
      exact: false,
      badge: 'Pending'
    },
    {
      name: 'Election Results',
      href: '/admin/dean-dashboard/results',
      icon: FaChartBar,
      exact: false
    }
  ];

  const isActive = (item) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900/95 backdrop-blur-lg border-r border-white/10 z-20">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <FaUniversity className="text-green-400 text-xl" />
            </div>
            <div>
              <h2 className="text-white font-bold">Dean Dashboard</h2>
              <p className="text-green-400 text-xs">Student Affairs</p>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            <p>Welcome,</p>
            <p className="text-white font-medium">{admin?.full_name || admin?.email}</p>
          </div>
        </div>

        <nav className="p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-lg mb-2 transition ${
                  active
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="text-lg" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-500/10 transition"
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}