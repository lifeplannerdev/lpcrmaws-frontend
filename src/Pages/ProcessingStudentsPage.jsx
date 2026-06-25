import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, List, Grid, Trello, X, Download, Columns, Table } from 'lucide-react';
import Navbar from '../Components/layouts/Navbar';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';

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
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for layout & toggles
  const [activeCategory, setActiveCategory] = useState('All Students');
  const [activeView, setActiveView] = useState('spreadsheet'); // 'list', 'kanban', 'spreadsheet'
  const [search, setSearch] = useState('');

  const canEditAny = hasPermission('processing_students:edit_any');
  const canEditOwn = hasPermission('processing_students:edit_own');

  const categories = ['All Students', 'GCC Students', 'European Students'];

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/employees/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Error fetching staff', err);
    }
  };

  const fetchDynamicFields = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/processing-students/dynamic-fields/`, {
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
      const res = await axios.get(`${API_BASE_URL}/processing-students/`, {
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
    fetchStaff();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [activeCategory, search]);

  const handleUpdateField = async (studentId, field, value) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, [field]: value } : s));
    try {
      await axios.patch(`${API_BASE_URL}/processing-students/${studentId}/`, { [field]: value }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } catch (err) {
      console.error('Error updating field', err);
      fetchStudents();
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/processing-students/${studentId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchStudents();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error deleting student', err);
      alert('Failed to delete student');
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

  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      alert("No data to export.");
      return;
    }
    const data = filteredStudents.map(student => ({
      "Student Name": student.name,
      "Mobile Number": student.mobile_number,
      "WhatsApp Number": student.whatsapp_number,
      "Email": student.email,
      "Parent Contact": student.parent_contact,
      "Program Applied": student.program_applied,
      "University": student.university,
      "Intake": student.intake,
      "Date of Registration": student.date_of_registration,
      "Category": student.category,
      "Assigned To": student.assigned_to_name || 'Unassigned',
      "Registration Fee Status": student.registration_fee_status,
      "Enrollment Process Status": student.enrollment_process_status,
      "App Documents Status": student.application_documents_status,
      "Application Status": student.application_status,
      "Offer Letter Status": student.offer_letter_status,
      "Visa Doc Info Status": student.visa_documentation_info_status,
      "Visa Appointment": student.visa_appointment,
      "Visa Documentation": student.visa_documentation,
      "Accommodation": student.accommodation,
      "Visa Results": student.visa_results,
      ...student.dynamic_data
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Processing Students");
    XLSX.writeFile(wb, "Processing_Students.xlsx");
  };

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
            <div className="flex gap-3">
              <button onClick={handleExportExcel} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl flex items-center gap-2 transition-all shadow-sm font-semibold">
                <Download size={18} /> Export
              </button>
              {(canEditAny || canEditOwn) && (
                <button onClick={openAddModal} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold">
                  <Plus size={18} /> Add Student
                </button>
              )}
            </div>
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
              {activeView === 'spreadsheet' && <SpreadsheetView students={students} dynamicFields={dynamicFields} debouncedUpdateField={debouncedUpdateField} staffList={staffList} onStudentClick={openEditModal} />}
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <StudentModal
          student={selectedStudent}
          dynamicFields={dynamicFields}
          staffList={staffList}
          onClose={() => setIsModalOpen(false)}
          onDelete={handleDeleteStudent}
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

function ListView({ students, dynamicFields, onStudentClick }) {
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

function SpreadsheetView({ students, dynamicFields, debouncedUpdateField, staffList, onStudentClick }) {
  const fixedColumns = [
    { key: 'name', label: 'Student Name' },
    { key: 'mobile_number', label: 'Mobile Number' },
    { key: 'whatsapp_number', label: 'WhatsApp' },
    { key: 'email', label: 'Email' },
    { key: 'parent_contact', label: 'Parent Contact' },
    { key: 'program_applied', label: 'Program Applied' },
    { key: 'university', label: 'University' },
    { key: 'intake', label: 'Intake' },
    { key: 'date_of_registration', label: 'Reg Date' },
    { key: 'category', label: 'Category' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'registration_fee_status', label: 'Reg Fee Status' },
    { key: 'enrollment_process_status', label: 'Enrollment Status' },
    { key: 'application_documents_status', label: 'App Docs Status' },
    { key: 'application_status', label: 'Application Status' },
    { key: 'offer_letter_status', label: 'Offer Letter' },
    { key: 'visa_documentation_info_status', label: 'Visa Doc Info' },
    { key: 'visa_appointment', label: 'Visa Appointment' },
    { key: 'visa_documentation', label: 'Visa Docs' },
    { key: 'accommodation', label: 'Accommodation' },
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
            <th className="px-4 py-3 text-center font-semibold text-gray-600 border-b border-l sticky right-0 z-10 bg-gray-50 shadow-sm">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {students.map((student, idx) => (
            <tr key={student.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border-r text-gray-500 sticky left-0 z-10 bg-white">{idx + 1}</td>
              {fixedColumns.map(col => {
                if (col.key === 'category') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <select
                        defaultValue={student[col.key] || 'All Students'}
                        className="w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                        onChange={(e) => debouncedUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="All Students">All Students</option>
                        <option value="GCC Students">GCC Students</option>
                        <option value="European Students">European Students</option>
                      </select>
                    </td>
                  );
                }
                if (col.key === 'assigned_to') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <select
                        defaultValue={student[col.key] || ''}
                        className="w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                        onChange={(e) => debouncedUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {staffList?.map(staff => (
                          <option key={staff.id} value={staff.id}>{staff.name}</option>
                        ))}
                      </select>
                    </td>
                  );
                }
                if (col.key === 'enrollment_process_status') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <select
                        defaultValue={student[col.key] || 'Pending'}
                        className="w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                        onChange={(e) => debouncedUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Shared">Shared</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>
                  );
                }
                if (col.key === 'registration_fee_status') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <select
                        defaultValue={student[col.key] || 'Pending'}
                        className="w-full h-full min-w-[150px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                        onChange={(e) => debouncedUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Shared with student">Shared with student</option>
                        <option value="Without Tax amount">Without Tax amount</option>
                      </select>
                    </td>
                  );
                }
                if (col.key === 'application_documents_status') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <select
                        defaultValue={student[col.key] || 'Pending'}
                        className="w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                        onChange={(e) => debouncedUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Collected">Collected</option>
                      </select>
                    </td>
                  );
                }
                if (col.key === 'date_of_registration') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <input
                        type="date"
                        defaultValue={student[col.key] || ''}
                        className="w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                        onChange={(e) => debouncedUpdateField(student.id, col.key, e.target.value)}
                      />
                    </td>
                  );
                }
                
                return (
                  <td key={col.key} className="px-4 py-2 border-r p-0">
                    <input
                      type="text"
                      defaultValue={student[col.key] || ''}
                      className="w-full h-full min-w-[120px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                      onChange={(e) => debouncedUpdateField(student.id, col.key, e.target.value)}
                    />
                  </td>
                );
              })}
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
              <td className="px-4 py-2 border-l sticky right-0 z-10 bg-white text-center shadow-sm">
                <button onClick={() => onStudentClick(student)} className="text-blue-600 font-medium hover:text-blue-800 hover:underline">
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentModal({ student, dynamicFields, staffList, onClose, onDelete, onSave, accessToken }) {
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
  const [timeline, setTimeline] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({ date: '', time: '', note: '' });

  const fetchTimeline = async () => {
    if (!student) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/processing-students/${student.id}/activity/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setTimeline(res.data);
    } catch (err) {
      console.error('Error fetching timeline', err);
    }
  };

  const fetchDocuments = async () => {
    if (!student) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/processing-students/${student.id}/documents/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setDocuments(res.data);
    } catch (err) {
      console.error('Error fetching documents', err);
    }
  };

  const fetchReminders = async () => {
    if (!student) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/followups/?processing_student=${student.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setReminders(res.data);
    } catch (err) {
      console.error('Error fetching reminders', err);
    }
  };

  useEffect(() => {
    if (student) {
      setFormData({
        ...student,
        assigned_to: student.assigned_to || ''
      });
      setDynamicData(student.dynamic_data || {});
      fetchTimeline();
      fetchDocuments();
      fetchReminders();
    }
  }, [student]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await axios.post(`${API_BASE_URL}/processing-students/${student.id}/note/`, { note: newNote }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setNewNote('');
      fetchTimeline();
    } catch (err) {
      console.error('Error adding note', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !student) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    setUploadingDoc(true);
    try {
      await axios.post(`${API_BASE_URL}/processing-students/${student.id}/documents/`, formData, {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      fetchDocuments();
      fetchTimeline();
    } catch (err) {
      console.error('Error uploading document', err);
      alert('Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/processing-student-documents/${docId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      fetchDocuments();
      fetchTimeline();
    } catch (err) {
      console.error('Error deleting document', err);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.date || !newReminder.time) return alert("Date and Time are required.");
    try {
      await axios.post(`${API_BASE_URL}/followups/`, {
        processing_student: student.id,
        followup_date: newReminder.date,
        followup_time: newReminder.time,
        notes: newReminder.note,
        phone_number: student.mobile_number || "0000000000",
        status: "pending",
        followup_type: "call",
        priority: "medium"
      }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setNewReminder({ date: '', time: '', note: '' });
      fetchReminders();
      fetchTimeline();
    } catch (err) {
      console.error('Error creating reminder', err);
      alert('Failed to schedule reminder');
    }
  };

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
        await axios.put(`${API_BASE_URL}/processing-students/${student.id}/`, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/processing-students/`, payload, {
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[90vw] lg:max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">{student ? 'Edit Student' : 'Add New Student'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Main Content Section */}
          <div className="flex-1 flex flex-col overflow-hidden lg:border-r border-gray-200">
            {student && (
              <div className="flex border-b bg-white px-4 pt-2">
                <button
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'documents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('documents')}
                >
                  Documents
                </button>
                <button
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${activeTab === 'reminders' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  onClick={() => setActiveTab('reminders')}
                >
                  Reminders
                </button>
              </div>
            )}
            
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'details' && (
                <form id="student-form" onSubmit={handleSubmit} className="space-y-8">
                  <div>
                    <h3 className="font-semibold text-lg border-b pb-2 text-indigo-600 mb-4">Personal Info</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            <div>
              <h3 className="font-semibold text-lg border-b pb-2 text-indigo-600 mb-4">Application Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Registration</label>
                <input type="date" name="date_of_registration" value={formData.date_of_registration || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select name="assigned_to" value={formData.assigned_to} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Unassigned</option>
                  {staffList?.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Fee Status</label>
                <select name="registration_fee_status" value={formData.registration_fee_status} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="Pending">Pending</option>
                  <option value="Shared with student">Shared with student</option>
                  <option value="Without Tax amount">Without Tax amount</option>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App Documents Status</label>
                <select name="application_documents_status" value={formData.application_documents_status} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="Pending">Pending</option>
                  <option value="Collected">Collected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Application Status</label>
                <input name="application_status" value={formData.application_status || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Letter Status</label>
                <input name="offer_letter_status" value={formData.offer_letter_status || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Doc Info Status</label>
                <input name="visa_documentation_info_status" value={formData.visa_documentation_info_status || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Appointment</label>
                <input name="visa_appointment" value={formData.visa_appointment || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Documentation</label>
                <input name="visa_documentation" value={formData.visa_documentation || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accommodation</label>
                <input name="accommodation" value={formData.accommodation || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Results</label>
                <input name="visa_results" value={formData.visa_results || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              </div>
            </div>

            {dynamicFields.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg border-b pb-2 text-indigo-600 mb-4">Additional Fields</h3>
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
        )}

        {activeTab === 'documents' && student && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Student Documents</h3>
              <div>
                <input
                  type="file"
                  id="doc-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <label
                  htmlFor="doc-upload"
                  className={`cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors ${uploadingDoc ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                </label>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 border border-dashed rounded-lg">
                <p className="text-gray-500">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{doc.title}</p>
                        <p className="text-xs text-gray-500">Uploaded by {doc.uploaded_by_name} on {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={doc.file_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                      >
                        View
                      </a>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reminders' && student && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Schedule Reminder</h3>
            <form onSubmit={handleCreateReminder} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" required value={newReminder.date} onChange={e => setNewReminder({...newReminder, date: e.target.value})} className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input type="time" required value={newReminder.time} onChange={e => setNewReminder({...newReminder, time: e.target.value})} className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows="2" value={newReminder.note} onChange={e => setNewReminder({...newReminder, note: e.target.value})} className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="E.g. Call to check visa status..."></textarea>
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors">
                  Add Reminder
                </button>
              </div>
            </form>

            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mt-8">Scheduled Reminders</h3>
            {reminders.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 border border-dashed rounded-lg">
                <p className="text-gray-500">No reminders scheduled.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {reminders.map(rem => (
                  <div key={rem.id} className="flex items-start justify-between p-4 bg-white border rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{rem.notes || 'Reminder'}</p>
                        <p className="text-xs text-gray-500 font-semibold">{rem.followup_date} at {rem.followup_time}</p>
                        <p className="text-xs text-gray-400 mt-1">Status: {rem.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Timeline Section */}
      {student && (
        <div className="w-full lg:w-96 bg-gray-50 flex flex-col overflow-hidden border-t lg:border-t-0">
          <div className="p-4 border-b bg-white">
            <h3 className="font-semibold text-lg text-gray-800">Activity Timeline</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {timeline.length === 0 ? (
              <div className="text-gray-500 text-sm text-center italic">No recent activity</div>
            ) : (
              timeline.map(log => (
                <div key={log.id} className="relative pl-4 border-l-2 border-indigo-200">
                  <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-indigo-500"></div>
                  <div className="text-sm font-semibold text-gray-800">{log.action}</div>
                  <div className="text-sm text-gray-600 mt-1">{log.description}</div>
                  <div className="text-xs text-gray-400 mt-2 flex justify-between">
                    <span>{log.user}</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

            <div className="p-4 border-t bg-white flex flex-col gap-2">
              <textarea
                rows="2"
                placeholder="Add an internal note..."
                className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              ></textarea>
              <button
                type="button"
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="self-end px-4 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Add Note
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t flex justify-between gap-3 bg-gray-50 w-full">
          <div>
            {student && (
              <button type="button" onClick={() => onDelete(student.id)} className="px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
                Delete Student
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} type="button" className="px-4 py-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-50">Cancel</button>
            <button form="student-form" type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
              {loading ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
