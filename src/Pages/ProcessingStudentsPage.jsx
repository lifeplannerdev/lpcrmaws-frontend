import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../Components/layouts/Navbar';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import { List, Columns, Table, Plus } from 'lucide-react';

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ProcessingStudentsPage() {
  const { hasPermission } = usePermissions();
  const { accessToken } = useAuth();
  const [students, setStudents] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for layout & toggles
  const [activeCategory, setActiveCategory] = useState('All Students');
  const [activeView, setActiveView] = useState('spreadsheet'); // 'list', 'kanban', 'spreadsheet'
  const [search, setSearch] = useState('');

  const canEditAny = hasPermission('processing_students:edit_any');
  const canEditOwn = hasPermission('processing_students:edit_own');

  const categories = ['All Students', 'GCC Students', 'European Students'];

  const fetchDynamicFields = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/trainers/processing-students/dynamic-fields/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setDynamicFields(res.data);
    } catch (err) {
      console.error('Error fetching dynamic fields', err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/trainers/processing-students/`, {
        params: { category: activeCategory !== 'All Students' ? activeCategory : undefined, search },
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setStudents(res.data.results || []);
    } catch (err) {
      console.error('Error fetching students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDynamicFields();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [activeCategory, search]);

  const handleUpdateField = async (studentId, field, value) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, [field]: value } : s));
    try {
      await axios.patch(`${API_BASE_URL}/api/trainers/processing-students/${studentId}/`, { [field]: value }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch (err) {
      console.error('Error updating field', err);
      fetchStudents();
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const openAddModal = () => {
    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const debouncedUpdateField = useCallback(debounce(handleUpdateField, 1000), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Processing Students
              </h1>
              <p className="text-gray-600 text-lg">Manage abroad study processing and track statuses</p>
            </div>
            {(canEditAny || canEditOwn) && (
              <button onClick={openAddModal} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold">
                <Plus size={18} /> Add Student
              </button>
            )}
          </div>
        </div>

        {/* Controls: Categories, Search, View Toggle */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 justify-between items-center mb-6">
          <div className="flex items-center space-x-2 border-b border-gray-200">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 font-medium text-sm transition-colors ${activeCategory === cat
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search students..."
              className="px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveView('list')}
                className={`p-2 rounded-md ${activeView === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                title="List View"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setActiveView('kanban')}
                className={`p-2 rounded-md ${activeView === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                title="Kanban View"
              >
                <Columns size={18} />
              </button>
              <button
                onClick={() => setActiveView('spreadsheet')}
                className={`p-2 rounded-md ${activeView === 'spreadsheet' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                title="Spreadsheet View"
              >
                <Table size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 overflow-hidden flex-1 flex flex-col">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeView === 'list' && <ListView students={students} dynamicFields={dynamicFields} onStudentClick={openEditModal} />}
              {activeView === 'kanban' && <KanbanView students={students} dynamicFields={dynamicFields} handleUpdateField={handleUpdateField} onStudentClick={openEditModal} />}
              {activeView === 'spreadsheet' && <SpreadsheetView students={students} dynamicFields={dynamicFields} debouncedUpdateField={debouncedUpdateField} />}
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <StudentModal
          student={selectedStudent}
          dynamicFields={dynamicFields}
          onClose={() => setIsModalOpen(false)}
          accessToken={accessToken}
          onSave={() => {
            setIsModalOpen(false);
            fetchStudents();
          }}
        />
      )}
    </div>
  );
}

function ListView({ students, dynamicFields }) {
  if (students.length === 0) return <div className="text-gray-500 text-center p-8">No students found.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {students.map(student => (
        <div key={student.id} className="border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold text-lg text-gray-800 mb-1">{student.name}</h3>
          <p className="text-sm text-gray-500 mb-4">{student.program_applied || 'No program'}</p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Phone:</span>
              <span className="font-medium text-gray-800">{student.mobile_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{student.enrollment_process_status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Assigned To:</span>
              <span className="text-gray-800">{student.assigned_to_name || 'Unassigned'}</span>
            </div>
          </div>

          <button onClick={() => onStudentClick(student)} className="w-full mt-5 bg-gray-50 hover:bg-gray-100 text-blue-600 font-medium py-2 rounded-lg text-sm border border-gray-200 transition-colors">
            View Details
          </button>
        </div>
      ))}
    </div>
  );
}

function KanbanView({ students, dynamicFields, handleUpdateField, onStudentClick }) {
  const statuses = ['Pending', 'Shared', 'Completed'];

  const handleDragStart = (e, studentId) => {
    e.dataTransfer.setData('studentId', studentId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const studentId = parseInt(e.dataTransfer.getData('studentId'));
    if (!isNaN(studentId)) {
      handleUpdateField(studentId, 'enrollment_process_status', newStatus);
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 h-full">
      {statuses.map(status => (
        <div
          key={status}
          className="bg-gray-50 rounded-xl p-4 min-w-[300px] w-[300px] flex flex-col"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, status)}
        >
          <h3 className="font-bold text-gray-700 mb-4 flex items-center justify-between">
            {status}
            <span className="bg-white text-gray-500 text-xs py-1 px-2 rounded-full shadow-sm border border-gray-100">
              {students.filter(s => s.enrollment_process_status === status).length}
            </span>
          </h3>
          <div className="flex-1 space-y-3 min-h-[100px]">
            {students.filter(s => s.enrollment_process_status === status).map(student => (
              <div
                key={student.id}
                draggable
                onDragStart={(e) => handleDragStart(e, student.id)}
                onClick={() => onStudentClick(student)}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-pointer hover:border-blue-300 active:cursor-grabbing"
              >
                <h4 className="font-medium text-gray-800">{student.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{student.university || 'No university'}</p>
                <div className="mt-3 flex justify-between items-center">
                  <div className="text-xs text-gray-400">{student.mobile_number}</div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                    {student.assigned_to_name ? student.assigned_to_name.split(' ')[0] : 'Unassigned'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SpreadsheetView({ students, dynamicFields, debouncedUpdateField }) {
  const fixedColumns = [
    { key: 'name', label: 'Student Name' },
    { key: 'mobile_number', label: 'Mobile Number' },
    { key: 'whatsapp_number', label: 'WhatsApp' },
    { key: 'email', label: 'Email' },
    { key: 'parent_contact', label: 'Parent Contact' },
    { key: 'program_applied', label: 'Program Applied' },
    { key: 'university', label: 'University' },
    { key: 'intake', label: 'Intake' },
    { key: 'registration_fee_status', label: 'Reg Fee Status' },
    { key: 'enrollment_process_status', label: 'Enrollment Status' },
    { key: 'application_status', label: 'Application Status' },
    { key: 'offer_letter_status', label: 'Offer Letter' },
    { key: 'visa_results', label: 'Visa Results' }
  ];

  if (students.length === 0) return <div className="text-gray-500 text-center p-8">No students found.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-r sticky left-0 z-10 bg-gray-50">Sl No</th>
            {fixedColumns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left font-semibold text-gray-600 border-b border-r whitespace-nowrap">
                {col.label}
              </th>
            ))}
            {dynamicFields.map(field => (
              <th key={field.name} className="px-4 py-3 text-left font-semibold text-blue-600 border-b border-r whitespace-nowrap bg-blue-50/50">
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {students.map((student, idx) => (
            <tr key={student.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-r text-gray-500 sticky left-0 z-10 bg-white">{idx + 1}</td>
              {fixedColumns.map(col => (
                <td key={col.key} className="px-4 py-2 border-r p-0">
                  <input
                    type="text"
                    defaultValue={student[col.key] || ''}
                    className="w-full h-full min-w-[120px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                    onChange={(e) => debouncedUpdateField(student.id, col.key, e.target.value)}
                  />
                </td>
              ))}
              {dynamicFields.map(field => (
                <td key={field.name} className="px-4 py-2 border-r p-0 bg-blue-50/10">
                  <input
                    type="text"
                    defaultValue={student.dynamic_data?.[field.name] || ''}
                    className="w-full h-full min-w-[120px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                    onChange={(e) => {
                      const newDynamicData = { ...student.dynamic_data, [field.name]: e.target.value };
                      debouncedUpdateField(student.id, 'dynamic_data', newDynamicData);
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentModal({ student, dynamicFields, onClose, onSave, accessToken }) {
  const [formData, setFormData] = useState({
    name: '', mobile_number: '', whatsapp_number: '', email: '', parent_contact: '',
    program_applied: '', university: '', intake: '', registration_fee_status: 'Pending',
    enrollment_process_status: 'Pending', application_documents_status: 'Pending',
    application_status: '', offer_letter_status: '', visa_documentation_info_status: '',
    visa_appointment: '', visa_documentation: '', accommodation: '', visa_results: '',
    category: 'All Students', assigned_to: ''
  });
  const [dynamicData, setDynamicData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        ...student,
        assigned_to: student.assigned_to || ''
      });
      setDynamicData(student.dynamic_data || {});
    }
  }, [student]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDynamicChange = (e, fieldName) => {
    setDynamicData(prev => ({ ...prev, [fieldName]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, dynamic_data: dynamicData };
      if (student) {
        await axios.put(`${API_BASE_URL}/api/trainers/processing-students/${student.id}/`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/trainers/processing-students/`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
      onSave();
    } catch (err) {
      console.error('Error saving student', err);
      alert('Failed to save student details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">{student ? 'Edit Student' : 'Add New Student'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="student-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2 text-indigo-600">Personal Info</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                <input required name="name" value={formData.name || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input required name="mobile_number" value={formData.mobile_number || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                <input name="whatsapp_number" value={formData.whatsapp_number || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Contact</label>
                <input name="parent_contact" value={formData.parent_contact || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2 text-indigo-600">Application Info</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Applied</label>
                <input name="program_applied" value={formData.program_applied || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
                <input name="university" value={formData.university || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intake</label>
                <input name="intake" value={formData.intake || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="All Students">All Students</option>
                  <option value="GCC Students">GCC Students</option>
                  <option value="European Students">European Students</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Status</label>
                <select name="enrollment_process_status" value={formData.enrollment_process_status} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="Pending">Pending</option>
                  <option value="Shared">Shared</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            {dynamicFields.length > 0 && (
              <div className="md:col-span-2 space-y-4 mt-4">
                <h3 className="font-semibold text-lg border-b pb-2 text-indigo-600">Additional Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dynamicFields.map(field => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                      <input
                        value={dynamicData[field.name] || ''}
                        onChange={(e) => handleDynamicChange(e, field.name)}
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} type="button" className="px-4 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50">Cancel</button>
          <button form="student-form" type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
            {loading ? 'Saving...' : 'Save Student'}
          </button>
        </div>
      </div>
    </div>
  );
}
