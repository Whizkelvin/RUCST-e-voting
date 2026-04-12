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
                <h3 className="text-xl font-bold text-white">
                  Regent University College of Science and Technology
                </h3>
                <p className="text-sm text-gray-400">E-Voting System</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              A secure, transparent, and reliable digital voting platform for student elections.
              Ensuring fair elections through blockchain-verified technology.
            </p>
            
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-400 hover:text-green-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>Home Dashboard</span>
                </a>
              </li>
              <li>
                <a href="/login" className="text-gray-400 hover:text-green-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>Login</span>
                </a>
              </li>

               <li>
                <a href="/how-to-vote" className="text-gray-400 hover:text-green-400 transition-colors text-sm flex items-center space-x-2">
                  <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                  <span>How To Vote</span>
                </a>
              </li>
            
            </ul>
          </div>

        

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-gray-400 text-sm">Regent University College of</p>
                  <p className="text-gray-400 text-sm">Science & Technology</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:+233302123456" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                  +233 55 142 3628
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:elections@regent.edu.gh" className="text-gray-400 hover:text-green-400 transition-colors text-sm">
                  elections@regent.edu.gh
                </a>
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
            
            
          </div>
          
          {/* Copyright Notice */}
          <div className="text-center mt-6 pt-6 border-t border-gray-900">
            <p className="text-gray-600 text-xs">
              The Regent University College of Science and Technology E-Voting System is a product of the Student Government Association.
              All election data is encrypted and stored securely. Voting records are kept confidential
              and are only accessible to authorized election officials as per university policy.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              If you encounter any issues, please contact the Election Committee immediately at 
              <a href="mailto:yaw.galo@regent.edu.gh" className="text-green-950 hover:text-green-300 ml-1">
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