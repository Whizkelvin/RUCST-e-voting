// app/admin/generate-nomination-codes/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Toaster, toast } from 'sonner';
import { 
  FaKey, 
  FaSpinner, 
  FaDownload, 
  FaCopy, 
  FaTrash, 
  FaSun, 
  FaMoon,
  FaEnvelope,
  FaUser,
  FaBriefcase,
  FaBuilding,
  FaGraduationCap,
  FaHashtag
} from 'react-icons/fa';

export default function GenerateNominationCodes() {
  const [isLoading, setIsLoading] = useState(false);
  const [codes, setCodes] = useState([]);
  const [theme, setTheme] = useState('light');
  const [formData, setFormData] = useState({
    candidate_email: '',
    candidate_name: '',
    position: '',
    department: '',
    year_of_study: '',
    number_of_codes: 1
  });

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('nominationTheme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('nominationTheme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Fetch existing codes on load
  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('nomination_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast.error('Failed to load existing codes');
    }
  };

  const generateSecretCode = () => {
    const prefix = 'EC';
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}${random}${timestamp.slice(-4)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const codesToInsert = [];
      for (let i = 0; i < formData.number_of_codes; i++) {
        codesToInsert.push({
          code: generateSecretCode(),
          candidate_email: formData.candidate_email.toLowerCase().trim(),
          candidate_name: formData.candidate_name,
          position: formData.position,
          department: formData.department,
          year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_used: false,
          created_at: new Date().toISOString()
        });
      }
      
      const { data, error } = await supabase
        .from('nomination_codes')
        .insert(codesToInsert)
        .select();
      
      if (error) throw error;
      
      setCodes([...data, ...codes]);
      toast.success(`Successfully generated ${data.length} nomination code(s)`);
      
      // Reset form
      setFormData({
        candidate_email: '',
        candidate_name: '',
        position: '',
        department: '',
        year_of_study: '',
        number_of_codes: 1
      });
      
    } catch (error) {
      console.error('Error generating codes:', error);
      toast.error('Failed to generate codes');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Code copied to clipboard');
  };

  const downloadCodes = () => {
    const headers = ['Code', 'Email', 'Name', 'Position', 'Department', 'Year', 'Status', 'Expires At'];
    const rows = codes.map(code => [
      code.code,
      code.candidate_email,
      code.candidate_name,
      code.position,
      code.department || '',
      code.year_of_study || '',
      code.is_used ? 'Used' : 'Available',
      new Date(code.expires_at).toLocaleString()
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nomination_codes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Codes downloaded successfully');
  };

  const deleteCode = async (codeId) => {
    if (!confirm('Are you sure you want to delete this nomination code?')) return;
    
    try {
      const { error } = await supabase
        .from('nomination_codes')
        .delete()
        .eq('id', codeId);
      
      if (error) throw error;
      
      setCodes(codes.filter(code => code.id !== codeId));
      toast.success('Nomination code deleted successfully');
    } catch (error) {
      console.error('Error deleting code:', error);
      toast.error('Failed to delete code');
    }
  };

  const positions = [
    'President',
    'Vice President',
    'General Secretary',
    'Treasurer',
    'Academic Affairs',
    'Welfare Officer',
    'Sports Officer',
    'Public Relations Officer',
    'Organizing Secretary',
    'Financial Secretary'
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'light' ? 'bg-gray-50' : 'bg-gradient-to-br from-gray-900 to-gray-800'
    }`}>
      <Toaster position="top-center" richColors closeButton />

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        style={{
          backgroundColor: theme === 'light' ? '#0f766e' : '#fbbf24',
          color: theme === 'light' ? '#ffffff' : '#1f2937',
        }}
      >
        {theme === 'light' ? <FaMoon size={20} /> : <FaSun size={20} />}
      </button>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <h1 className={`text-3xl font-bold mb-2 ${
          theme === 'light' ? 'text-gray-900' : 'text-white'
        }`}>
          Generate Nomination Codes
        </h1>
        <p className={`mb-8 ${
          theme === 'light' ? 'text-gray-600' : 'text-gray-300'
        }`}>
          Create secure nomination codes for candidates to register for elections
        </p>
        
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className={`rounded-xl p-6 ${
            theme === 'light'
              ? 'bg-white border border-gray-200 shadow-sm'
              : 'bg-gray-800/50 backdrop-blur-sm border border-gray-700'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}>
              Create New Code(s)
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block mb-2 text-sm font-medium ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Candidate Email *
                </label>
                <div className="relative">
                  <FaEnvelope className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                  }`} />
                  <input
                    type="email"
                    required
                    value={formData.candidate_email}
                    onChange={(e) => setFormData({...formData, candidate_email: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                        : 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    }`}
                    placeholder="candidate@regent.edu.gh"
                  />
                </div>
              </div>
              
              <div>
                <label className={`block mb-2 text-sm font-medium ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Candidate Name *
                </label>
                <div className="relative">
                  <FaUser className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                  }`} />
                  <input
                    type="text"
                    required
                    value={formData.candidate_name}
                    onChange={(e) => setFormData({...formData, candidate_name: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="Full name"
                  />
                </div>
              </div>
              
              <div>
                <label className={`block mb-2 text-sm font-medium ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Position *
                </label>
                <div className="relative">
                  <FaBriefcase className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                  }`} />
                  <select
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">Select position</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className={`block mb-2 text-sm font-medium ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Department
                </label>
                <div className="relative">
                  <FaBuilding className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                  }`} />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                    placeholder="Department (optional)"
                  />
                </div>
              </div>
              
              <div>
                <label className={`block mb-2 text-sm font-medium ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Year of Study
                </label>
                <div className="relative">
                  <FaGraduationCap className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                  }`} />
                  <select
                    value={formData.year_of_study}
                    onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  >
                    <option value="">Select year (optional)</option>
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className={`block mb-2 text-sm font-medium ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  Number of Codes
                </label>
                <div className="relative">
                  <FaHashtag className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === 'light' ? 'text-teal-500' : 'text-teal-400'
                  }`} />
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.number_of_codes}
                    onChange={(e) => setFormData({...formData, number_of_codes: parseInt(e.target.value)})}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900'
                        : 'bg-gray-700 border-gray-600 text-white'
                    }`}
                  />
                </div>
                <p className={`text-xs mt-1 ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Generate up to 10 codes at once
                </p>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 rounded-lg font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <FaSpinner className="animate-spin" /> : <FaKey />}
                {isLoading ? 'Generating...' : 'Generate Code(s)'}
              </button>
            </form>
          </div>
          
          {/* Generated Codes Section */}
          <div className={`rounded-xl p-6 ${
            theme === 'light'
              ? 'bg-white border border-gray-200 shadow-sm'
              : 'bg-gray-800/50 backdrop-blur-sm border border-gray-700'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className={`text-xl font-semibold ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}>
                Generated Codes
                <span className={`text-sm ml-2 ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  ({codes.length} total)
                </span>
              </h2>
              {codes.length > 0 && (
                <button
                  onClick={downloadCodes}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-white transition text-sm"
                >
                  <FaDownload /> Download CSV
                </button>
              )}
            </div>
            
            {codes.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {codes.map((code) => (
                  <div
                    key={code.id}
                    className={`rounded-lg p-4 transition ${
                      theme === 'light'
                        ? 'bg-gray-50 border border-gray-200'
                        : 'bg-gray-700/50 border border-gray-600'
                    } ${code.is_used ? 'opacity-75' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <FaKey className="text-teal-500" />
                          <code className="text-teal-600 dark:text-teal-400 font-mono text-base sm:text-lg font-bold">
                            {code.code}
                          </code>
                          <button
                            onClick={() => copyToClipboard(code.code)}
                            className={`p-1 rounded transition ${
                              theme === 'light'
                                ? 'text-gray-400 hover:text-gray-600'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                            title="Copy code"
                          >
                            <FaCopy size={14} />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
                            <strong>Candidate:</strong> {code.candidate_name}
                          </p>
                          <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
                            <strong>Email:</strong> {code.candidate_email}
                          </p>
                          <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
                            <strong>Position:</strong> {code.position}
                          </p>
                          {code.department && (
                            <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
                              <strong>Department:</strong> {code.department}
                            </p>
                          )}
                          {code.year_of_study && (
                            <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
                              <strong>Year:</strong> Level {code.year_of_study}
                            </p>
                          )}
                        </div>
                        
                        <p className={`text-xs mt-2 ${
                          theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Expires: {new Date(code.expires_at).toLocaleString()}
                        </p>
                        
                        {code.is_used && code.used_at && (
                          <p className={`text-xs mt-1 ${
                            theme === 'light' ? 'text-amber-600' : 'text-amber-400'
                          }`}>
                            Used on: {new Date(code.used_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-row sm:flex-col items-center gap-2 sm:items-end">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                          code.is_used
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                        }`}>
                          {code.is_used ? 'Used' : 'Available'}
                        </span>
                        {!code.is_used && (
                          <button
                            onClick={() => deleteCode(code.id)}
                            className="text-red-500 hover:text-red-600 transition p-1"
                            title="Delete code"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-12 ${
                theme === 'light' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <FaKey className="text-4xl mx-auto mb-3 opacity-50" />
                <p>No codes generated yet</p>
                <p className="text-sm mt-1">Fill out the form to create nomination codes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${theme === 'light' ? '#f1f1f1' : '#374151'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${theme === 'light' ? '#cbd5e1' : '#4b5563'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'light' ? '#94a3b8' : '#6b7280'};
        }
      `}</style>
    </div>
  );
}