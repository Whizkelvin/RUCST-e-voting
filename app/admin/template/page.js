// app/admin/template/page.js (or you can provide a download link in the admin page)
'use client';

export default function TemplateDownload() {
  const downloadTemplate = () => {
    const template = [
      ['Name', 'Email', 'SchoolID', 'Department', 'Year'],
      ['John Doe', 'john.doe@regent.edu.gh', '12345678', 'Computer Science', '400'],
      ['Jane Smith', 'jane.smith@regent.edu.gh', '87654321', 'Business Administration', '300']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Voter Template');
    XLSX.writeFile(wb, 'voter_template.xlsx');
  };
  
  return (
    <button onClick={downloadTemplate} className="text-blue-400 hover:text-blue-300">
      Download Template
    </button>
  );
}