// app/admin/layout.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  FaSpinner,
  FaSignOutAlt,
  FaUserShield,
  FaUsers,
  FaKey,
  FaHome,
  FaBars,
  FaTimes,
  FaChartBar,
  FaCog,
  FaUserTag,
  FaUniversity,
  FaFileAlt,
  FaClock,
  FaChartLine,
  FaUserGraduate,
} from "react-icons/fa";
import Link from "next/link";

export default function AdminLayout({ children }) {
  const { admin, isAuthenticated, loading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Handle responsive sidebar
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Only redirect after loading is complete and not authenticated
    if (!loading && !isAuthenticated) {
      console.log("Not authenticated, redirecting to home");
      router.push("/");
    }
  }, [loading, isAuthenticated, router]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const navigation = [
  {
    name: "Manage Voters",
    href: "/admin/manage-voters",
    icon: FaUsers,
    color: "blue",
  },
  {
    name: "Nomination Codes",
    href: "/admin/generate-nomination-codes",
    icon: FaKey,
    color: "purple",
  },
  {
    name: "Manage Roles",
    href: "/admin/manage-roles",
    icon: FaUserTag,
    color: "green",
  },
  {
    name: "Election Results",  // This is the correct admin results page
    href: "/admin/election-results",  // Admin results page
    icon: FaChartBar,
    color: "amber",
  },
  {
    name: "Candidates",
    href: "/admin/manage-candidates",
    icon: FaUserGraduate,
    color: "teal",
  },
  {
  name: "Voting Period",
  href: "/admin/voting-period",
  icon: FaClock,
  color: "purple",
},
 {
    name: "Manage Elections",
    href: "/admin/manage-elections",
    icon: FaUserTag,
    color: "green",
  },
{
  name: "Audit Report",
  href: "/admin/audit-report",
  icon: FaChartLine,
  color: "red",
},
];

  const getIconColor = (color) => {
    const colors = {
      blue: "text-blue-400",
      purple: "text-purple-400",
      green: "text-green-400",
      amber: "text-amber-400",
      teal: "text-teal-400",
      gray: "text-gray-400",
    };
    return colors[color] || "text-gray-400";
  };

  const isActiveLink = (href) => {
    return pathname === href;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center px-4">
          <FaSpinner className="animate-spin text-3xl sm:text-4xl text-green-500 mx-auto mb-4" />
          <p className="text-white text-sm sm:text-base">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Mobile Header - Only visible on mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-black/30 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="flex justify-between items-center h-14 px-4">
          <div className="flex items-center gap-2">
            <FaUserShield className="text-xl text-purple-400" />
            <div>
              <h1 className="text-white font-semibold text-sm">Admin Panel</h1>
              <p className="text-[10px] text-gray-400 truncate max-w-[100px]">
                {admin?.name?.split(" ")[0] || admin?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-2 text-gray-300 hover:text-white transition"
            >
              <FaHome className="text-lg" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-300 hover:text-white transition"
            >
              {mobileMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-14 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-b border-white/10 z-50 lg:hidden max-h-[calc(100vh-56px)] overflow-y-auto">
            <div className="py-4 px-4">
              {/* Admin Info */}
              <div className="px-3 py-3 border-b border-white/10 mb-3">
                <p className="text-white font-medium text-base">{admin?.name}</p>
                <p className="text-gray-400 text-xs truncate mt-1">
                  {admin?.email}
                </p>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition ${
                        isActiveLink(item.href)
                          ? "bg-white/10 text-white font-medium"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`text-lg ${getIconColor(item.color)}`} />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-white/10 my-3"></div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  closeMobileMenu();
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
              >
                <FaSignOutAlt className="text-lg" />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-900/95 backdrop-blur-lg border-r border-white/10 z-40 transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        } hidden lg:block`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <FaUserShield className="text-2xl text-purple-400" />
                <div>
                  <h1 className="text-white font-semibold">Admin Panel</h1>
                  <p className="text-[10px] text-gray-400 truncate max-w-[120px]">
                    {admin?.name?.split(" ")[0] || admin?.name}
                  </p>
                </div>
              </div>
            ) : (
              <FaUserShield className="text-2xl text-purple-400 mx-auto" />
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white transition"
            >
              <FaBars className="text-sm" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 overflow-y-auto">
            <div className="space-y-1 px-3">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveLink(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition group ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon
                      className={`text-lg transition ${
                        isActive
                          ? getIconColor(item.color)
                          : "text-gray-400 group-hover:text-white"
                      }`}
                    />
                    {sidebarOpen && (
                      <span className="text-sm font-medium">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={logout}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition w-full ${
                !sidebarOpen && "justify-center"
              }`}
            >
              <FaSignOutAlt className="text-lg" />
              {sidebarOpen && <span className="text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        {/* Desktop Header - Hidden on mobile */}
        <div className="hidden lg:block bg-black/30 backdrop-blur-lg border-b border-white/10 sticky top-0 z-30">
          <div className="flex justify-end items-center h-16 px-6">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-gray-300 transition text-sm"
              >
                <FaHome className="text-sm" />
                <span>Home</span>
              </Link>
              <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-800/50 rounded-lg">
                <FaUserShield className="text-purple-400 text-sm" />
                <span className="text-white text-sm font-medium">
                  {admin?.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Mobile content padding (to account for mobile header) */}
          <div className="lg:hidden h-14"></div>
          {children}
        </main>
      </div>
    </div>
  );
}