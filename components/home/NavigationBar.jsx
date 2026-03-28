'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaChevronRight, FaUserPlus } from 'react-icons/fa';
import { GiStairsGoal, GiVote, GiChart } from 'react-icons/gi';

const NavigationBar = ({ isVotingActive }) => {
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

  // Helper to check if link is active
  const isActive = (path) => pathname === path;

  return (
    <nav className="bg-white/90 backdrop-blur-lg shadow-lg border-b border-gray-100 py-3 fixed top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            data-aos="fade-right"
            className="flex items-center space-x-4 group cursor-pointer" 
            onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
          >
            {/* Regent University Logo */}
            <div className="relative">
              <Image 
                src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png" 
                alt="Regent University Logo" 
                width={48}
                height={48}
                className="h-12 w-12 transition-transform duration-300 group-hover:scale-110 object-contain"
              />
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-950 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            
            {/* New Logo */}
            <div className="relative">
              <Image 
                src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png" 
                alt="Logo" 
                width={48}
                height={48}
                className="h-12 w-12 transition-transform duration-300 group-hover:scale-110 object-contain"
              />
            </div>
            
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-950 to-emerald-700 bg-clip-text text-transparent">
                RUCST
              </h1>
              <p className="text-xs text-gray-600 font-medium">Secure E-Voting Portal</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            {/* How It Works - using Link for client-side navigation */}
            <Link 
              data-aos="fade-down"
              data-aos-delay="100"
              href="/how-to-vote"
              className={`transition-all duration-300 hover:font-medium flex items-center space-x-1 ${
                isActive('/how-to-vote') 
                  ? 'text-green-950 font-semibold' 
                  : 'text-gray-700 hover:text-green-950'
              }`}
            >
              <GiStairsGoal className="w-4 h-4" />
              <span>How To Vote</span>
            </Link>
            
            {/* Elections - scroll to section (keeping as anchor for hash links) */}
            <a 
              data-aos="fade-down"
              data-aos-delay="200"
              href="#elections" 
              className="text-gray-700 hover:text-green-950 transition-all duration-300 hover:font-medium flex items-center space-x-1"
            >
              <GiVote className="w-4 h-4" />
              <span>Elections</span>
            </a>
            
            {/* Become a Candidate - using Link for client-side navigation */}
            <Link 
              data-aos="fade-down"
              data-aos-delay="250"
              href="/candidate-nomination"
              className={`transition-all duration-300 hover:font-medium flex items-center space-x-1 ${
                isActive('/candidate-nomination') 
                  ? 'text-green-950 font-semibold' 
                  : 'text-gray-700 hover:text-green-950'
              }`}
            >
              <FaUserPlus className="w-4 h-4" />
              <span>Become a Candidate</span>
            </Link>
            
            {/* Candidate only - scroll to section (keeping as anchor for hash links) */}
            <a 
              data-aos="fade-down"
              data-aos-delay="300"
              href="#progress" 
              className="text-gray-700 hover:text-green-950 transition-all duration-300 hover:font-medium flex items-center space-x-1"
            >
              <GiChart className="w-4 h-4" />
              <span>Candidate only</span>
            </a>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              data-aos="fade-left"
              onClick={handleAction}
              className="bg-gradient-to-r from-green-950 to-emerald-800 hover:from-green-800 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2 group"
            >
              <span>{isVotingActive ? 'Vote Now' : 'View Results'}</span>
              <FaChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;