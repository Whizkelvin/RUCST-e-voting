// app/admin/generate-nomination-codes/page.js
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-toastify';
import { FaKey, FaSpinner, FaDownload, FaCopy, FaTrash } from 'react-icons/fa';

export default function GenerateNominationCodes() {
  const [isLoading, setIsLoading] = useState(false);
  const [codes, setCodes] = useState([]);
  const [formData, setFormData] = useState({
    candidate_email: '',
    candidate_name: '',
    position: '',
    department: '',
    year_of_study: '',
    number_of_codes: 1
  });

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
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
      
      const { data, error } = await supabase
        .from('nomination_codes')
        .insert(codesToInsert)
        .select();
      
      if (error) throw error;
      
      setCodes([...codes, ...data]);
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
    const headers = ['Code', 'Email', 'Name', 'Position', 'Department', 'Year', 'Expires At'];
    const rows = codes.map(code => [
      code.code,
      code.candidate_email,
      code.candidate_name,
      code.position,
      code.department || '',
      code.year_of_study || '',
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

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Generate Nomination Codes</h1>
        
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Code(s)</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Candidate Email *</label>
                <input
                  type="email"
                  required
                  value={formData.candidate_email}
                  onChange={(e) => setFormData({...formData, candidate_email: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  placeholder="candidate@regent.edu.gh"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Candidate Name *</label>
                <input
                  type="text"
                  required
                  value={formData.candidate_name}
                  onChange={(e) => setFormData({...formData, candidate_name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  placeholder="Full name"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Position *</label>
                <select
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Select position</option>
                  <option value="President">President</option>
                  <option value="Vice President">Vice President</option>
                  <option value="General Secretary">General Secretary</option>
                  <option value="Treasurer">Treasurer</option>
                  <option value="Academic Affairs">Academic Affairs</option>
                  <option value="Welfare Officer">Welfare Officer</option>
                  <option value="Sports Officer">Sports Officer</option>
                  <option value="Public Relations Officer">Public Relations Officer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                  placeholder="Department (optional)"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Year of Study</label>
                <select
                  value={formData.year_of_study}
                  onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Select year (optional)</option>
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Number of Codes</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.number_of_codes}
                  onChange={(e) => setFormData({...formData, number_of_codes: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 rounded-lg font-semibold text-white hover:from-green-500 hover:to-green-400 transition disabled:opacity-50"
              >
                {isLoading ? <FaSpinner className="animate-spin mx-auto" /> : 'Generate Code(s)'}
              </button>
            </form>
          </div>
          
          {/* Generated Codes Section */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Generated Codes</h2>
              {codes.length > 0 && (
                <button
                  onClick={downloadCodes}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition"
                >
                  <FaDownload /> Download CSV
                </button>
              )}
            </div>
            
            {codes.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {codes.map((code) => (
                  <div key={code.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FaKey className="text-green-400" />
                          <code className="text-green-400 font-mono text-lg font-bold">{code.code}</code>
                          <button
                            onClick={() => copyToClipboard(code.code)}
                            className="text-gray-400 hover:text-white transition"
                            title="Copy code"
                          >
                            <FaCopy />
                          </button>
                        </div>
                        <p className="text-gray-300 text-sm">
                          <strong>Candidate:</strong> {code.candidate_name}
                        </p>
                        <p className="text-gray-300 text-sm">
                          <strong>Email:</strong> {code.candidate_email}
                        </p>
                        <p className="text-gray-300 text-sm">
                          <strong>Position:</strong> {code.position}
                        </p>
                        {code.department && (
                          <p className="text-gray-300 text-sm">
                            <strong>Department:</strong> {code.department}
                          </p>
                        )}
                        <p className="text-gray-400 text-xs mt-2">
                          Expires: {new Date(code.expires_at).toLocaleString()}
                        </p>
                        {code.is_used && (
                          <p className="text-yellow-400 text-xs mt-1">
                            Used on: {new Date(code.used_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${code.is_used ? 'bg-yellow-600 text-yellow-100' : 'bg-green-600 text-green-100'}`}>
                          {code.is_used ? 'Used' : 'Available'}
                        </span>
                        {!code.is_used && (
                          <button
                            onClick={() => deleteCode(code.id)}
                            className="text-red-400 hover:text-red-300 transition"
                            title="Delete code"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>ac
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                <FaKey className="text-4xl mx-auto mb-3 opacity-50" />
                <p>No codes generated yet</p>
                <p className="text-sm mt-1">Fill out the form to create nomination codes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}