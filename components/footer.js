const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black text-white mt-20">
      {/* Top Footer Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Logo and Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              {/* Regent University Logo */}
              <img 
                src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1762440313/RUCST_logo-removebg-preview_hwdial.png" 
                alt="Regent University Logo" 
                className="h-12 w-12 object-contain"
              />
              {/* RGSP Logo */}
              <img 
                src="https://res.cloudinary.com/dnkk72bpt/image/upload/v1774528110/Gemini_Generated_Image_57c2xl57c2xl57c2_ykckzf.png" 
                alt="RGSP Logo" 
                className="h-12 w-12 object-contain"
              />
              <div className="border-l-2 border-gray-700 pl-3 ml-1">
                <h3 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-teal-500 bg-clip-text text-transparent">
                  Regent University
                </h3>
                <p className="text-sm text-gray-400">E-Voting System</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              A secure, transparent, and reliable digital voting platform for student elections.
              Ensuring fair elections through blockchain-verified technology.
            </p>
            <div className="flex space-x-3 pt-2">
              <a href="#" className="text-gray-400 hover:text-teal-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-teal-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-teal-400 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-400 hover:text-teal-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>Home Dashboard</span>
                </a>
              </li>
              <li>
                <a href="/vote" className="text-gray-400 hover:text-teal-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>Voting Portal</span>
                </a>
              </li>
              <li>
                <a href="/results" className="text-gray-400 hover:text-teal-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>Election Results</span>
                </a>
              </li>
              <li>
                <a href="/candidates" className="text-gray-400 hover:text-teal-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>Meet Candidates</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="/how-it-works" className="text-gray-400 hover:text-teal-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>How It Works</span>
                </a>
              </li>
              <li>
                <a href="/faq" className="text-gray-400 hover:text-teal-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>FAQ</span>
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-gray-400 hover:text-teal-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>Privacy Policy</span>
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-400 hover:text-teal-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>Terms of Service</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-gray-400 text-sm">Regent University College</p>
                  <p className="text-gray-400 text-sm">Science & Technology</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:+233302123456" className="text-gray-400 hover:text-teal-400 transition-colors text-sm">
                  +233 30 212 3456
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:elections@regent.edu.gh" className="text-gray-400 hover:text-teal-400 transition-colors text-sm">
                  elections@regent.edu.gh
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Security Badges */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
                <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-300">SSL Encrypted</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
                <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-300">Secure Voting</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
                <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-300">Anonymous</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wider">System Status</div>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-teal-400 font-medium">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="bg-black py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-gray-500 text-sm">
                © {currentYear} Regent University College of Science and Technology. All rights reserved.
              </p>
              <p className="text-gray-600 text-xs mt-1">
                This voting system is protected under the Digital Voting Security Act.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="/sitemap" className="text-gray-500 hover:text-teal-400 text-sm transition-colors">
                Sitemap
              </a>
              <a href="/accessibility" className="text-gray-500 hover:text-teal-400 text-sm transition-colors">
                Accessibility
              </a>
              <a href="/report-issue" className="text-gray-500 hover:text-teal-400 text-sm transition-colors">
                Report Issue
              </a>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500 text-sm">v2.1.4</span>
                <div className="w-1 h-1 bg-teal-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Copyright Notice */}
          <div className="text-center mt-6 pt-6 border-t border-gray-900">
            <p className="text-gray-600 text-xs">
              The Regent University E-Voting System is a product of the Student Government Association.
              All election data is encrypted and stored securely. Voting records are kept confidential
              and are only accessible to authorized election officials as per university policy.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              If you encounter any issues, please contact the Election Committee immediately at 
              <a href="mailto:support@regentelections.edu.gh" className="text-teal-400 hover:text-teal-300 ml-1">
                support@regentelections.edu.gh
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;