// app/admin/layout.js
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Toaster } from "sonner";
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
  FaUserTag,
  FaUniversity,
  FaClock,
  FaChartLine,
  FaUserGraduate,
  FaSun,
  FaMoon,
  FaVoteYea,
  FaEye,
} from "react-icons/fa";
import Link from "next/link";

export default function AdminLayout({ children }) {
  const { admin, isAuthenticated, loading, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const router = useRouter();
  const pathname = usePathname();

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem("adminTheme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem("adminTheme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  useEffect(() => {
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
    if (!loading && !isAuthenticated) {
      router.push("/");
    }
  }, [loading, isAuthenticated, router]);

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

  // Check user role
  const userRole = admin?.role || "admin";
  const isEC = userRole === "electoral_commission" || userRole === "ec";

  // Navigation based on role
// In app/admin/layout.js, update the getNavigation function:

const getNavigation = () => {
  // Dashboard for both
  const dashboard = { name: "Dashboard", href: "/admin/ec", icon: FaHome };
  
  // Common navigation for both Admin and EC
  const commonNav = [
    { name: "Manage Voters", href: "/admin/manage-voters", icon: FaUsers },
    { name: "Manage Candidates", href: "/admin/manage-candidates", icon: FaUserGraduate },
    { name: "Manage Elections", href: "/admin/manage-elections", icon: FaUniversity },
    { name: "Voting Period", href: "/admin/voting-period", icon: FaClock },
    { name: "Election Results", href: "/admin/election-results", icon: FaChartBar },
  ];

  // Admin-only navigation
  const adminOnlyNav = [
    { name: "Nomination Codes", href: "/admin/generate-nomination-codes", icon: FaKey },
    { name: "Manage Roles", href: "/admin/manage-roles", icon: FaUserTag },
    { name: "Audit Report", href: "/admin/audit-report", icon: FaChartLine },
  ];

  if (isEC) {
    return [dashboard, ...commonNav];  // EC gets Dashboard + common items
  }
  
  return [dashboard, ...commonNav, ...adminOnlyNav];  // Admin gets Dashboard + ALL items
};

  const navigation = getNavigation();
  const portalTitle = isEC ? "EC Portal" : "Admin Portal";
  const portalColor = isEC ? "emerald" : "teal";

  const isActiveLink = (href) => pathname === href;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === "light" ? "bg-gray-50" : "bg-gradient-to-br from-gray-900 to-gray-800"
      }`}>
        <div className="text-center px-4">
          <FaSpinner className="animate-spin text-3xl sm:text-4xl text-teal-500 mx-auto mb-4" />
          <p className={theme === "light" ? "text-gray-600" : "text-white"}>
            Verifying access...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === "light" 
        ? "bg-gray-50" 
        : "bg-gradient-to-br from-gray-900 to-gray-800"
    }`}>
      <Toaster position="top-center" richColors closeButton />

      {/* Theme Toggle Button - Mobile only */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 lg:hidden"
        style={{
          backgroundColor: theme === "light" ? "#0f766e" : "#fbbf24",
          color: theme === "light" ? "#ffffff" : "#1f2937",
        }}
      >
        {theme === "light" ? <FaMoon size={20} /> : <FaSun size={20} />}
      </button>

      {/* Mobile Header */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-50 ${
        theme === "light"
          ? "bg-white/90 backdrop-blur-lg border-b border-gray-200"
          : "bg-black/30 backdrop-blur-lg border-b border-white/10"
      }`}>
        <div className="flex justify-between items-center h-14 px-4">
          <div className="flex items-center gap-2">
            <FaUserShield className={`text-xl text-${portalColor}-500`} />
            <div>
              <h1 className={`font-semibold text-sm ${
                theme === "light" ? "text-gray-900" : "text-white"
              }`}>{portalTitle}</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                {admin?.name?.split(" ")[0] || admin?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition ${
                theme === "light"
                  ? "text-gray-600 hover:bg-gray-100"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              {theme === "light" ? <FaMoon size={16} /> : <FaSun size={16} />}
            </button>
            <Link
              href="/"
              className={`p-2 rounded-lg transition ${
                theme === "light"
                  ? "text-gray-600 hover:bg-gray-100"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <FaHome className="text-lg" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg transition ${
                theme === "light"
                  ? "text-gray-600 hover:bg-gray-100"
                  : "text-gray-300 hover:bg-white/10"
              }`}
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
          <div className={`fixed top-14 left-0 right-0 z-50 lg:hidden max-h-[calc(100vh-56px)] overflow-y-auto ${
            theme === "light"
              ? "bg-white/95 backdrop-blur-lg border-b border-gray-200"
              : "bg-gray-900/95 backdrop-blur-lg border-b border-white/10"
          }`}>
            <div className="py-4 px-4">
              {/* User Info */}
              <div className={`px-3 py-3 border-b mb-3 ${
                theme === "light" ? "border-gray-200" : "border-white/10"
              }`}>
                <p className={`font-medium text-base ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}>{admin?.name}</p>
                <p className={`text-xs truncate mt-1 ${
                  theme === "light" ? "text-gray-500" : "text-gray-400"
                }`}>{admin?.email}</p>
                <span className={`inline-block mt-1 text-xs text-${portalColor}-600 dark:text-${portalColor}-400`}>
                  {isEC ? "Electoral Commission" : "Administrator"}
                </span>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveLink(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition ${
                        isActive
                          ? theme === "light"
                            ? `bg-${portalColor}-50 text-${portalColor}-700 font-medium`
                            : "bg-white/10 text-white font-medium"
                          : theme === "light"
                            ? "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`text-lg text-${portalColor}-500`} />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              <div className={`my-3 ${
                theme === "light" ? "border-t border-gray-200" : "border-t border-white/10"
              }`}></div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  closeMobileMenu();
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
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
        className={`fixed top-0 left-0 h-full z-40 transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        } hidden lg:block ${
          theme === "light"
            ? "bg-white/95 backdrop-blur-lg border-r border-gray-200"
            : "bg-gray-900/95 backdrop-blur-lg border-r border-white/10"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`h-16 flex items-center justify-between px-4 ${
            theme === "light" ? "border-b border-gray-200" : "border-b border-white/10"
          }`}>
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <FaUserShield className={`text-2xl text-${portalColor}-500`} />
                <div>
                  <h1 className={`font-semibold ${
                    theme === "light" ? "text-gray-900" : "text-white"
                  }`}>{portalTitle}</h1>
                  <p className={`text-[10px] truncate max-w-[120px] ${
                    theme === "light" ? "text-gray-500" : "text-gray-400"
                  }`}>
                    {admin?.name?.split(" ")[0] || admin?.name}
                  </p>
                </div>
              </div>
            ) : (
              <FaUserShield className={`text-2xl text-${portalColor}-500 mx-auto`} />
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`transition ${
                theme === "light"
                  ? "text-gray-500 hover:text-gray-700"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FaBars className="text-sm" />
            </button>
          </div>

          {/* Theme Toggle in Sidebar (Desktop) */}
          {sidebarOpen && (
            <div className="px-3 py-4 border-b border-gray-200 dark:border-white/10">
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                  theme === "light"
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    : "bg-white/5 hover:bg-white/10 text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {theme === "light" ? <FaMoon size={14} /> : <FaSun size={14} />}
                  <span className="text-sm">{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
                </div>
                <span className="text-xs opacity-60">Toggle</span>
              </button>
            </div>
          )}

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
                        ? theme === "light"
                          ? `bg-${portalColor}-50 text-${portalColor}-700`
                          : "bg-white/10 text-white"
                        : theme === "light"
                          ? "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`text-lg transition ${
                      isActive
                        ? `text-${portalColor}-500`
                        : theme === "light"
                          ? "text-gray-400 group-hover:text-gray-600"
                          : "text-gray-400 group-hover:text-white"
                    }`} />
                    {sidebarOpen && (
                      <span className="text-sm font-medium">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className={`p-4 ${
            theme === "light" ? "border-t border-gray-200" : "border-t border-white/10"
          }`}>
            <button
              onClick={logout}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition w-full ${
                theme === "light"
                  ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                  : "text-red-400 hover:text-red-300 hover:bg-red-500/10"
              } ${!sidebarOpen && "justify-center"}`}
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
        {/* Desktop Header */}
        <div className={`hidden lg:block sticky top-0 z-30 ${
          theme === "light"
            ? "bg-white/90 backdrop-blur-lg border-b border-gray-200"
            : "bg-black/30 backdrop-blur-lg border-b border-white/10"
        }`}>
          <div className="flex justify-between items-center h-16 px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition ${
                  theme === "light"
                    ? "text-gray-600 hover:bg-gray-100"
                    : "text-gray-300 hover:bg-white/10"
                }`}
              >
                {theme === "light" ? <FaMoon size={16} /> : <FaSun size={16} />}
              </button>
              <Link
                href="/"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm ${
                  theme === "light"
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    : "bg-white/5 hover:bg-white/10 text-gray-300"
                }`}
              >
                <FaHome className="text-sm" />
                <span>Home</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg ${
                theme === "light"
                  ? "bg-gray-100"
                  : "bg-white/5"
              }`}>
                <FaUserShield className={`text-${portalColor}-500 text-sm`} />
                <span className={`text-sm font-medium ${
                  theme === "light" ? "text-gray-700" : "text-white"
                }`}>
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