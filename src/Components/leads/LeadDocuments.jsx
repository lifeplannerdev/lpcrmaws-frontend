import React, { useState, useEffect } from 'react';
import { UploadCloud, File, Trash2, Download, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function LeadDocuments({ leadId, authFetch }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [leadId]);

  const fetchDocuments = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/leads/${leadId}/documents/`);
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', file.name);

    setUploading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/leads/${leadId}/documents/`, {
        method: 'POST',
        headers: {}, // Remove Content-Type so browser sets it with boundary for FormData
        body: formData
      });
      if (res.ok) {
        fetchDocuments();
      } else {
        alert("Upload failed.");
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <File size={20} className="text-indigo-600" /> Documents
      </h3>
      
      {/* Upload Zone */}
      <div 
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 font-medium mb-1">Drag and drop files here</p>
        <p className="text-xs text-gray-400 mb-4">or click to browse from your computer</p>
        
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          onChange={handleChange} 
        />
        <label 
          htmlFor="file-upload" 
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-indigo-600 cursor-pointer hover:bg-gray-50 shadow-sm"
        >
          {uploading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4"/> Uploading...</span> : 'Select File'}
        </label>
      </div>

      {/* Document List */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-500">Loading documents...</p>
        ) : documents.length > 0 ? (
          documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <File size={18} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm line-clamp-1">{doc.description}</p>
                  <p className="text-xs text-gray-500">
                    Uploaded by {doc.uploaded_by?.first_name || 'System'} on {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={doc.file} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Download/View"
                >
                  <Download size={16} />
                </a>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 italic">No documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
