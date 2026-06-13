import React, { useState } from 'react';
import { X, Upload, Loader2, AlertCircle } from 'lucide-react';
import Button from '../common/Button';
import FormField from '../common/FormField';
import Alert from '../common/Alert';

export default function UploadDocumentModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  accessToken, 
  refreshAccessToken,
  apiBaseUrl 
}) {
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    document_name: '',
    month: new Date().toISOString().slice(0, 7), 
    date: new Date().toISOString().split('T')[0],
    company: 'LP',
    file: null
  });
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, file: 'File size must be less than 10MB' }));
        return;
      }
      setFormData(prev => ({ ...prev, file }));
      setErrors(prev => ({ ...prev, file: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.document_name.trim()) {
      newErrors.document_name = 'Document name is required';
    }
    if (!formData.month) {
      newErrors.month = 'Month is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.file) {
      newErrors.file = 'File is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setUploading(true);
    
    try {
      let token = accessToken || await refreshAccessToken();
      if (!token) throw new Error('Authentication required');

      const submitData = new FormData();
      submitData.append('name', formData.document_name);
      submitData.append('month', formData.month);
      submitData.append('date', formData.date);
      submitData.append('company', formData.company);
      submitData.append('file', formData.file);

      const response = await fetch(`${apiBaseUrl}/api/hr/attendance/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload document');
      }

      // Success - reset form and close modal
      setFormData({
        document_name: '',
        month: new Date().toISOString().slice(0, 7),
        date: new Date().toISOString().split('T')[0],
        company: 'LP',
        file: null
      });
      setErrors({});
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error uploading document:', err);
      setErrors({ submit: err.message || 'Failed to upload document' });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      document_name: '',
      month: new Date().toISOString().slice(0, 7),
      date: new Date().toISOString().split('T')[0],
      company: 'LP',
      file: null
    });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-xl flex flex-col relative">
        <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="text-2xl font-bold text-gray-900">Upload Attendance Document</h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {errors.submit && (
            <Alert
              type="error"
              message={errors.submit}
              className="mb-6"
            />
          )}

          <div className="space-y-5">
            {/* Document Name */}
            <FormField
              label="Document Name"
              name="document_name"
              type="text"
              value={formData.document_name}
              onChange={handleInputChange}
              placeholder="e.g., November 2024 Attendance Sheet"
              error={errors.document_name}
              required
            />

            {/* Month */}
            <FormField
              label="Month"
              name="month"
              type="month"
              value={formData.month}
              onChange={handleInputChange}
              error={errors.month}
              required
            />

            {/* Date */}
            <FormField
              label="Date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleInputChange}
              error={errors.date}
              required
            />

            {/* Company */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Company <span className="text-red-500">*</span>
              </label>
              <select
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors bg-white text-gray-900"
              >
                <option value="LP">LP Group</option>
                <option value="FLAG">FLAG</option>
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Attendance File <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={`w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors ${
                    errors.file ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">
                    {formData.file ? formData.file.name : 'Click to upload file'}
                  </span>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Max file size: 10MB. Accepted formats: PDF, Excel, CSV, Word
              </p>
              {errors.file && (
                <p className="mt-1 text-sm text-red-500">{errors.file}</p>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 p-6 border-t border-gray-100 bg-white flex items-center justify-end gap-3 rounded-b-3xl z-10">
          <Button
            onClick={handleClose}
            disabled={uploading}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading}
            variant="primary"
            icon={uploading ? Loader2 : Upload}
            className="bg-gradient-to-r from-indigo-600 to-purple-600"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>
    </div>
  );
}