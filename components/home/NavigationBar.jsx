// components/home/NavigationBar.js
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AOS from 'aos';
import 'aos/dist/aos.css';
import Image from 'next/image';
import { FaChevronRight, FaUserPlus, FaHome, FaVoteYea, FaChartBar, FaCrown, FaBars, FaTimes, FaSun, FaMoon } from 'react-icons/fa';
import { GiStairsGoal, GiVote, GiChart } from 'react-icons/gi';

const NavigationBar = ({ isVotingActive, isMobileMenuOpen, setIsMobileMenuOpen, theme, toggleTheme }) => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
    });
  }, []);

  const handleAction = () => {
    if (isVotingActive) {
      router.push('/login');
    } else {
      router.push('/election-result');
    }
  };

  const isActive = (path) => pathname === path;

  const navLinks = [
    { name: 'How to Vote', href: '/how-to-vote', icon: GiStairsGoal, mobileOnly: false },
    { name: 'Elections', href: '#elections', icon: GiVote, mobileOnly: false, isAnchor: true },
    { name: 'Become a Candidate', href: '/candidate-nomination', icon: FaUserPlus, mobileOnly: false },
    { name: 'Candidate only', href: '#progress', icon: GiChart, mobileOnly: false, isAnchor: true },
  ];

  const closeMobileMenu = () => {
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`${
      theme === 'light' 
        ? 'bg-white/90 border-gray-100' 
        : 'bg-gray-900/90 border-gray-800'
    } backdrop-blur-lg shadow-lg border-b py-2 sm:py-3 fixed top-0 z-50 w-full transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-16">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden transition p-1 ${
              theme === 'light' ? 'text-gray-700 hover:text-green-950' : 'text-gray-300 hover:text-teal-400'
            }`}
          >
            {isMobileMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
          </button>
          
          {/* Logo Section */}
          <div 
            data-aos="fade-right"
            className="flex items-center space-x-2 sm:space-x-4 group cursor-pointer" 
            onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
          >
            <div className="relative">
              <Image 
                src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png" 
                alt="Regent University Logo" 
                width={40}
                height={40}
                className="h-8 w-8 sm:h-12 sm:w-12 transition-transform duration-300 group-hover:scale-110 object-contain"
              />
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 sm:h-3 sm:w-3 bg-green-950 rounded-full border border-white animate-pulse"></div>
            </div>
            
            <div className="relative">
              <Image 
                src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png" 
                alt="Logo" 
                width={40}
                height={40}
                className="h-8 w-8 sm:h-12 sm:w-12 transition-transform duration-300 group-hover:scale-110 object-contain"
              />
            </div>
            
            <div className="sm:block">
              <h1 className={`text-base sm:text-xl font-bold bg-gradient-to-r from-green-950 to-emerald-700 bg-clip-text text-transparent ${
                theme === 'dark' && 'brightness-110'
              }`}>
                RUCST
              </h1>
              <p className={`text-[10px] sm:text-xs font-medium ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              }`}>
                <span className='hidden md:block'>Secure </span>E-Voting Portal
              </p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
            {navLinks.map((link, index) => {
              const Icon = link.icon;
              if (link.isAnchor) {
                return (
                  <a 
                    key={link.name}
                    data-aos="fade-down"
                    data-aos-delay={(index + 1) * 100}
                    href={link.href}
                    className={`transition-all duration-300 hover:font-medium flex items-center space-x-1 text-sm ${
                      theme === 'light' 
                        ? 'text-gray-700 hover:text-green-950' 
                        : 'text-gray-300 hover:text-teal-400'
                    }`}
                  >
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{link.name}</span>
                  </a>
                );
              }
              return (
                <Link 
                  key={link.name}
                  data-aos="fade-down"
                  data-aos-delay={(index + 1) * 100}
                  href={link.href}
                  className={`transition-all duration-300 hover:font-medium flex items-center space-x-1 text-sm ${
                    isActive(link.href) 
                      ? (theme === 'light' ? 'text-green-950 font-semibold' : 'text-teal-400 font-semibold')
                      : (theme === 'light' ? 'text-gray-700 hover:text-green-950' : 'text-gray-300 hover:text-teal-400')
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
            
            {/* Desktop Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all duration-300 ${
                theme === 'light'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {theme === 'light' ? <FaMoon size={16} /> : <FaSun size={16} />}
            </button>
          </div>
          
          {/* Action Button */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              data-aos="fade-left"
              onClick={handleAction}
              className="bg-gradient-to-r from-green-950 to-emerald-800 hover:from-green-800 hover:to-emerald-700 text-white px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-1 sm:space-x-2 group text-xs sm:text-sm"
            >
              <span>{isVotingActive ? 'Vote Now' : 'View Results'}</span>
              <FaChevronRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className={`md:hidden absolute top-12 sm:top-16 left-0 right-0 backdrop-blur-lg border-b shadow-lg z-50 transition-colors duration-300 ${
          theme === 'light'
            ? 'bg-white/95 border-gray-200'
            : 'bg-gray-900/95 border-gray-800'
        }`}>
          <div className="flex flex-col py-3 px-4 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              if (link.isAnchor) {
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition ${
                      theme === 'light'
                        ? 'text-gray-700 hover:text-green-950 hover:bg-gray-50'
                        : 'text-gray-300 hover:text-teal-400 hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{link.name}</span>
                  </a>
                );
              }
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition ${
                    isActive(link.href)
                      ? (theme === 'light'
                        ? 'text-green-950 bg-green-50 font-semibold'
                        : 'text-teal-400 bg-gray-800 font-semibold')
                      : (theme === 'light'
                        ? 'text-gray-700 hover:text-green-950 hover:bg-gray-50'
                        : 'text-gray-300 hover:text-teal-400 hover:bg-gray-800')
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{link.name}</span>
                </Link>
              );
            })}
            
            {/* Mobile Theme Toggle Button */}
            <button
              onClick={() => {
                toggleTheme();
                closeMobileMenu();
              }}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition mt-2 ${
                theme === 'light'
                  ? 'text-gray-700 hover:text-green-950 hover:bg-gray-50'
                  : 'text-gray-300 hover:text-teal-400 hover:bg-gray-800'
              }`}
            >
              {theme === 'light' ? <FaMoon className="w-4 h-4" /> : <FaSun className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavigationBar;