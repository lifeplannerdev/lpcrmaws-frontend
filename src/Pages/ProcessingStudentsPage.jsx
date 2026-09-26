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

const fixedDocumentTypes = [
  'Enrollment documentation',
  'Application Documents',
  'Offer Letter',
  'Visa Documentation Info',
  'Visa Appointment',
  'Visa Results',
  'Accommodation'
];

export default function ProcessingStudentsPage() {
  const { hasPermission } = usePermissions();
  const { accessToken, user } = useAuth();
  const isOperationRole = user?.role_names?.includes('OPERATION') || user?.role_names?.includes('MANAGING_DIRECTOR');
  const [students, setStudents] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [sourceStaffList, setSourceStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for layout & toggles
  const [activeCategory, setActiveCategory] = useState('All Students');
  const [activeView, setActiveView] = useState('spreadsheet'); // 'list', 'kanban', 'spreadsheet'
  const [search, setSearch] = useState('');

  const canEditAny = hasPermission('processing_students:edit_any');
  const canEditOwn = hasPermission('processing_students:edit_own');
  const canManageFees = hasPermission('processing_students:manage_fees');

  const categories = ['All Students', 'GCC Students', 'European Students'];

  const fetchStaff = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/employees/?roles=DOCUMENTATION,OPERATION`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Error fetching staff', err);
    }
  };

  const fetchSourceStaffList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/employees/?source_filter=true`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setSourceStaffList(res.data || []);
    } catch (err) {
      console.error('Error fetching source staff', err);
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

  const fetchStudents = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/processing-students/`, {
        params: { category: activeCategory !== 'All Students' ? activeCategory : undefined, search },
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const results = res.data.results || [];
      const sortedStudents = [...results].sort((a, b) => {
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idB - idA;
      });
      setStudents(sortedStudents);
    } catch (err) {
      console.error('Error fetching students', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDynamicFields();
    fetchStaff();
    fetchSourceStaffList();
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
      let errorMsg = 'Failed to update field. Please check your input.';
      if (err.response?.data) {
        if (typeof err.response.data === 'object' && !Array.isArray(err.response.data)) {
          const firstKey = Object.keys(err.response.data)[0];
          errorMsg = `Validation Error (${firstKey}): ${err.response.data[firstKey]}`;
        } else if (typeof err.response.data === 'string') {
          errorMsg = err.response.data;
        }
      }
      alert(errorMsg);
      fetchStudents(false);
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
    if (students.length === 0) {
      alert("No data to export.");
      return;
    }
    const data = students.map(student => ({
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
      "Registration Fee Receipt Status": student.registration_fee_receipt_status,
      "Enrollment Process Status": student.enrollment_process_status,
      "App Documents Status": student.application_documents_status,
      "Application Status": student.application_status,
      "Offer Letter Status": student.offer_letter_status,
      "Visa Appointment Date": student.visa_appointment_date,
      "Visa Documentation": student.visa_documentation,
      "Visa Results": student.visa_results,
      "App/Reg Fee Amount": student.processing_fee_amount || 0,
      "App/Reg Fee Paid": student.processing_fee_paid || 0,
      "App/Reg Fee Status": student.processing_fee_status,
      "Admission Fee Amount": student.fee_admission_amount || 0,
      "Admission Fee Paid": student.fee_admission_paid || 0,
      "Admission Fee Status": student.fee_admission_status,
      "Language Conf. Fee Amount": student.fee_language_amount || 0,
      "Language Conf. Fee Paid": student.fee_language_paid || 0,
      "Language Conf. Fee Status": student.fee_language_status,
      "Visa Approval Fee Amount": student.fee_visa_amount || 0,
      "Visa Approval Fee Paid": student.fee_visa_paid || 0,
      "Visa Approval Fee Status": student.fee_visa_status,
      "Ministry Letter Fee Amount": student.fee_ministry_amount || 0,
      "Ministry Letter Fee Paid": student.fee_ministry_paid || 0,
      "Ministry Letter Fee Status": student.fee_ministry_status,
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
              {activeView === 'list' && (
                <ListView 
                  students={students} 
                  dynamicFields={dynamicFields} 
                  onStudentClick={openEditModal} 
                  onDeleteStudent={handleDeleteStudent}
                  canDelete={canEditAny || canEditOwn}
                />
              )}
              {activeView === 'kanban' && <KanbanView students={students} dynamicFields={dynamicFields} handleUpdateField={handleUpdateField} onStudentClick={openEditModal} />}
              {activeView === 'spreadsheet' && (
                <SpreadsheetView 
                  students={students} 
                  dynamicFields={dynamicFields} 
                  handleUpdateField={handleUpdateField} 
                  staffList={staffList} 
                  onStudentClick={openEditModal} 
                  onDeleteStudent={handleDeleteStudent}
                  canManageFees={canManageFees} 
                  canDelete={canEditAny || canEditOwn}
                  isOperationRole={isOperationRole}
                />
              )}
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <StudentModal
          student={selectedStudent}
          dynamicFields={dynamicFields}
          staffList={staffList}
          sourceStaffList={sourceStaffList}
          onClose={() => setIsModalOpen(false)}
          onDelete={handleDeleteStudent}
          accessToken={accessToken}
          user={user}
          isOperationRole={isOperationRole}
          canManageFees={canManageFees}
          onSave={() => {
            setIsModalOpen(false);
            fetchStudents();
          }}
        />
      )}
    </div>
  );
}

function ListView({ students, dynamicFields, onStudentClick, onDeleteStudent, canDelete = false }) {
  if (students.length === 0) return <div className="text-gray-500 text-center p-8">No students found.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {students.map(student => (
        <div key={student.id} className="border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
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
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={() => onStudentClick(student)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-blue-600 font-medium py-2 rounded-lg text-sm border border-gray-200 transition-colors">
              View Details
            </button>
            {canDelete && onDeleteStudent && (
              <button 
                onClick={() => onDeleteStudent(student.id)} 
                className="px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm border border-red-200 transition-colors font-medium"
                title="Delete Student"
              >
                Delete
              </button>
            )}
          </div>
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

function SpreadsheetView({ students, dynamicFields, handleUpdateField, staffList, onStudentClick, onDeleteStudent, canManageFees, canDelete = false, isOperationRole }) {
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
    { key: 'registration_fee_receipt_status', label: 'Receipt Status' },
    { key: 'enrollment_process_status', label: 'Enrollment Status' },
    { key: 'application_documents_status', label: 'App Docs Status' },
    { key: 'application_status', label: 'Application Status' },
    { key: 'offer_letter_status', label: 'Offer Letter' },
    { key: 'visa_appointment_date', label: 'Visa Appointment Date' },
    { key: 'visa_documentation', label: 'Visa Docs' },
    { key: 'visa_results', label: 'Visa Results' },
    { key: 'processing_fee_amount', label: 'App/Reg Fee Amount' },
    { key: 'processing_fee_paid', label: 'App/Reg Fee Paid' },
    { key: 'processing_fee_status', label: 'App/Reg Fee Status' },
    { key: 'fee_admission_amount', label: 'Admission Fee Amount' },
    { key: 'fee_admission_paid', label: 'Admission Fee Paid' },
    { key: 'fee_admission_status', label: 'Admission Fee Status' },
    { key: 'fee_language_amount', label: 'Language Conf. Fee Amount' },
    { key: 'fee_language_paid', label: 'Language Conf. Fee Paid' },
    { key: 'fee_language_status', label: 'Language Conf. Fee Status' },
    { key: 'fee_visa_amount', label: 'Visa Approval Fee Amount' },
    { key: 'fee_visa_paid', label: 'Visa Approval Fee Paid' },
    { key: 'fee_visa_status', label: 'Visa Approval Fee Status' },
    { key: 'fee_ministry_amount', label: 'Ministry Letter Fee Amount' },
    { key: 'fee_ministry_paid', label: 'Ministry Letter Fee Paid' },
    { key: 'fee_ministry_status', label: 'Ministry Letter Fee Status' }
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
              <td className="px-4 py-2 border-r text-gray-500 sticky left-0 z-10 bg-white">{students.length - idx}</td>
              {fixedColumns.map(col => {
                if (col.key === 'category') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <select
                        defaultValue={student[col.key] || 'All Students'}
                        className="w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                        onChange={(e) => handleUpdateField(student.id, col.key, e.target.value)}
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
                        disabled={!isOperationRole}
                        className="w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded disabled:text-gray-500"
                        onChange={(e) => handleUpdateField(student.id, col.key, e.target.value)}
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
                        onChange={(e) => handleUpdateField(student.id, col.key, e.target.value)}
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
                        onChange={(e) => handleUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid without gst">Paid without gst</option>
                        <option value="Paid with gst">Paid with gst</option>
                      </select>
                    </td>
                  );
                }
                if (col.key === 'registration_fee_receipt_status') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <select
                        defaultValue={student[col.key] || 'Pending'}
                        disabled={student.registration_fee_status !== 'Paid with gst'}
                        className="w-full h-full min-w-[150px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                        onChange={(e) => handleUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Shared with student">Shared with student</option>
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
                        onChange={(e) => handleUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Collected">Collected</option>
                      </select>
                    </td>
                  );
                }
                if (col.key === 'date_of_registration' || col.key === 'visa_appointment_date') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <input
                        type="date"
                        defaultValue={student[col.key] || ''}
                        className="w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                        onChange={(e) => handleUpdateField(student.id, col.key, e.target.value)}
                      />
                    </td>
                  );
                }
                
                if (col.key === 'visa_documentation') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <select
                        defaultValue={student[col.key] || 'Pending'}
                        className="w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                        onChange={(e) => handleUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Process">In Process</option>
                        <option value="Complete">Complete</option>
                      </select>
                    </td>
                  );
                }

                if (col.key === 'visa_results') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0">
                      <select
                        defaultValue={student[col.key] || ''}
                        className="w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded"
                        onChange={(e) => handleUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="">Select Result</option>
                        <option value="Granted">Granted</option>
                        <option value="Refused">Refused</option>
                      </select>
                    </td>
                  );
                }
                let isFeeApplicable = true;
                if (col.key.startsWith('processing_fee_')) isFeeApplicable = student.processing_fee_applicable !== false;
                else if (col.key.startsWith('fee_admission_')) isFeeApplicable = student.fee_admission_applicable !== false;
                else if (col.key.startsWith('fee_language_')) isFeeApplicable = student.fee_language_applicable !== false;
                else if (col.key.startsWith('fee_visa_')) isFeeApplicable = student.fee_visa_applicable !== false;
                else if (col.key.startsWith('fee_ministry_')) isFeeApplicable = student.fee_ministry_applicable !== false;

                if (col.key === 'processing_fee_status' || col.key === 'fee_admission_status' || col.key === 'fee_language_status' || col.key === 'fee_visa_status' || col.key === 'fee_ministry_status') {
                  return (
                    <td key={col.key} className="px-4 py-2 border-r p-0 bg-gray-50">
                      <select
                        defaultValue={student[col.key] || 'PENDING'}
                        disabled={!canManageFees || !isFeeApplicable}
                        className={`w-full h-full min-w-[140px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed ${!isFeeApplicable ? 'opacity-50' : ''}`}
                        onChange={(e) => handleUpdateField(student.id, col.key, e.target.value)}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="PAID">Paid</option>
                      </select>
                    </td>
                  );
                }
                
                return (
                  <td key={col.key} className={`px-4 py-2 border-r p-0 ${!isFeeApplicable ? 'bg-gray-100' : ''}`}>
                    <input
                      type={col.key.endsWith('_amount') || col.key.endsWith('_paid') ? 'number' : 'text'}
                      defaultValue={!isFeeApplicable ? '' : (student[col.key] || '')}
                      disabled={((col.key.startsWith('processing_fee_') || col.key.startsWith('fee_')) && !canManageFees) || !isFeeApplicable}
                      placeholder={!isFeeApplicable ? 'N/A' : ''}
                      className={`w-full h-full min-w-[120px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-transparent border-transparent hover:border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed ${!isFeeApplicable ? 'opacity-50 placeholder-gray-400' : ''}`}
                      onBlur={(e) => {
                        if (e.target.value !== (student[col.key] || '')) {
                          handleUpdateField(student.id, col.key, e.target.value);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        }
                      }}
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
                    onBlur={(e) => {
                      if (e.target.value !== (student.dynamic_data?.[field.name] || '')) {
                        const newDynamicData = { ...student.dynamic_data, [field.name]: e.target.value };
                        handleUpdateField(student.id, 'dynamic_data', newDynamicData);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.target.blur();
                      }
                    }}
                  />
                </td>
              ))}
              <td className="px-4 py-2 border-l sticky right-0 z-10 bg-white text-center shadow-sm">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => onStudentClick(student)} className="text-blue-600 font-medium hover:text-blue-800 hover:underline">
                    Edit
                  </button>
                  {canDelete && onDeleteStudent && (
                    <button onClick={() => onDeleteStudent(student.id)} className="text-red-600 font-medium hover:text-red-800 hover:underline">
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentModal({ student, dynamicFields, staffList, sourceStaffList, onClose, onDelete, onSave, accessToken, user, isOperationRole, canManageFees = false }) {
  const [formData, setFormData] = useState({
    name: '', mobile_number: '', whatsapp_number: '', email: '', parent_contact: '',
    program_applied: '', university: '', intake: '', registration_fee_status: 'Pending',
    registration_fee_receipt_status: 'Pending',
    enrollment_process_status: 'Pending', application_documents_status: 'Pending',
    application_status: '', offer_letter_status: '', 
    visa_appointment_date: '', visa_documentation: 'Pending', visa_results: '',
    category: 'All Students', assigned_to: '', source: '',
    processing_fee_amount: '', processing_fee_paid: '', processing_fee_status: 'PENDING', processing_fee_applicable: false,
    fee_admission_amount: '', fee_admission_paid: '', fee_admission_status: 'PENDING', fee_admission_applicable: false,
    fee_language_amount: '', fee_language_paid: '', fee_language_status: 'PENDING', fee_language_applicable: false,
    fee_visa_amount: '', fee_visa_paid: '', fee_visa_status: 'PENDING', fee_visa_applicable: false,
    fee_ministry_amount: '', fee_ministry_paid: '', fee_ministry_status: 'PENDING', fee_ministry_applicable: false
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
        assigned_to: student.assigned_to || '',
        source: student.source || ''
      });
      setDynamicData(student.dynamic_data || {});
      fetchTimeline();
      fetchDocuments();
      fetchReminders();
    } else if (!isOperationRole && user) {
      // Auto-assign to self if creating new and not OPERATION
      setFormData(prev => ({ ...prev, assigned_to: user.id }));
    }
  }, [student, isOperationRole, user]);

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

  const [uploadingDocType, setUploadingDocType] = useState(null);

  const handleFileUpload = async (e, titleOverride = null) => {
    const file = e.target.files[0];
    if (!file || !student) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', titleOverride || file.name);

    if (titleOverride) {
      setUploadingDocType(titleOverride);
    } else {
      setUploadingDoc(true);
    }
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
      if (titleOverride) setUploadingDocType(null);
      else setUploadingDoc(false);
      e.target.value = null; // Reset input to allow re-uploading the same file
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleDynamicChange = (e, fieldName) => {
    setDynamicData(prev => ({ ...prev, [fieldName]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, dynamic_data: dynamicData };
      if (!payload.assigned_to) payload.assigned_to = null;
      if (!payload.source) payload.source = null;
      if (payload.processing_fee_amount === '') payload.processing_fee_amount = null;
      if (payload.processing_fee_paid === '') payload.processing_fee_paid = null;

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
      if (err.response?.data) {
        const errors = typeof err.response.data === 'object' 
          ? Object.entries(err.response.data).map(([k, v]) => `${k}: ${v}`).join('\n')
          : err.response.data;
        alert(`Failed to save student details:\n${errors}`);
      } else {
        alert('Failed to save student details');
      }
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
                <select name="assigned_to" value={formData.assigned_to} onChange={handleChange} disabled={!isOperationRole} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500">
                  <option value="">Unassigned</option>
                  {staffList?.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select name="source" value={formData.source} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">None</option>
                  {sourceStaffList?.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Fee Status</label>
                <select name="registration_fee_status" value={formData.registration_fee_status} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="Pending">Pending</option>
                  <option value="Paid without gst">Paid without gst</option>
                  <option value="Paid with gst">Paid with gst</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Status</label>
                <select 
                  name="registration_fee_receipt_status" 
                  value={formData.registration_fee_receipt_status} 
                  onChange={handleChange} 
                  disabled={formData.registration_fee_status !== 'Paid with gst'}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="Pending">Pending</option>
                  <option value="Shared with student">Shared with student</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Appointment Date</label>
                <input type="date" name="visa_appointment_date" value={formData.visa_appointment_date || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Documentation</label>
                <select name="visa_documentation" value={formData.visa_documentation} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="Pending">Pending</option>
                  <option value="In Process">In Process</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visa Results</label>
                <select name="visa_results" value={formData.visa_results || ''} onChange={handleChange} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">Select Result</option>
                  <option value="Granted">Granted</option>
                  <option value="Refused">Refused</option>
                </select>
              </div>
              
              {/* Fee Section */}
              <div className="md:col-span-2 pt-4 border-t mt-4">
                {(!canManageFees && !formData.processing_fee_applicable) ? null : (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <input type="checkbox" name="processing_fee_applicable" checked={formData.processing_fee_applicable} onChange={handleChange} disabled={!canManageFees} className="w-4 h-4 text-blue-600 rounded" />
                      <h4 className="text-md font-semibold text-gray-700">Application/Registration Fee</h4>
                    </div>
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${!formData.processing_fee_applicable ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Amount</label>
                        <input type="number" name="processing_fee_amount" value={formData.processing_fee_amount || ''} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Paid</label>
                        <input type="number" name="processing_fee_paid" value={formData.processing_fee_paid || ''} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Status</label>
                        <select name="processing_fee_status" value={formData.processing_fee_status} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500">
                          <option value="PENDING">Pending</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="PAID">Paid</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {(!canManageFees && !formData.fee_admission_applicable) ? null : (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <input type="checkbox" name="fee_admission_applicable" checked={formData.fee_admission_applicable} onChange={handleChange} disabled={!canManageFees} className="w-4 h-4 text-blue-600 rounded" />
                      <h4 className="text-md font-semibold text-gray-700">On Admission/Ausbildung/Offer Letter</h4>
                    </div>
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${!formData.fee_admission_applicable ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Amount</label>
                        <input type="number" name="fee_admission_amount" value={formData.fee_admission_amount || ''} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Paid</label>
                        <input type="number" name="fee_admission_paid" value={formData.fee_admission_paid || ''} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Status</label>
                        <select name="fee_admission_status" value={formData.fee_admission_status} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500">
                          <option value="PENDING">Pending</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="PAID">Paid</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {(!canManageFees && !formData.fee_language_applicable) ? null : (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <input type="checkbox" name="fee_language_applicable" checked={formData.fee_language_applicable} onChange={handleChange} disabled={!canManageFees} className="w-4 h-4 text-blue-600 rounded" />
                      <h4 className="text-md font-semibold text-gray-700">On Language Confirmation</h4>
                    </div>
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${!formData.fee_language_applicable ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Amount</label>
                        <input type="number" name="fee_language_amount" value={formData.fee_language_amount || ''} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Paid</label>
                        <input type="number" name="fee_language_paid" value={formData.fee_language_paid || ''} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Status</label>
                        <select name="fee_language_status" value={formData.fee_language_status} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500">
                          <option value="PENDING">Pending</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="PAID">Paid</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {(!canManageFees && !formData.fee_visa_applicable) ? null : (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <input type="checkbox" name="fee_visa_applicable" checked={formData.fee_visa_applicable} onChange={handleChange} disabled={!canManageFees} className="w-4 h-4 text-blue-600 rounded" />
                      <h4 className="text-md font-semibold text-gray-700">On Visa Approval</h4>
                    </div>
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${!formData.fee_visa_applicable ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Amount</label>
                        <input type="number" name="fee_visa_amount" value={formData.fee_visa_amount || ''} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Paid</label>
                        <input type="number" name="fee_visa_paid" value={formData.fee_visa_paid || ''} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Status</label>
                        <select name="fee_visa_status" value={formData.fee_visa_status} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500">
                          <option value="PENDING">Pending</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="PAID">Paid</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {(!canManageFees && !formData.fee_ministry_applicable) ? null : (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <input type="checkbox" name="fee_ministry_applicable" checked={formData.fee_ministry_applicable} onChange={handleChange} disabled={!canManageFees} className="w-4 h-4 text-blue-600 rounded" />
                      <h4 className="text-md font-semibold text-gray-700">On Ministry Letter</h4>
                    </div>
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${!formData.fee_ministry_applicable ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Amount</label>
                        <input type="number" name="fee_ministry_amount" value={formData.fee_ministry_amount || ''} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Paid</label>
                        <input type="number" name="fee_ministry_paid" value={formData.fee_ministry_paid || ''} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Status</label>
                        <select name="fee_ministry_status" value={formData.fee_ministry_status} onChange={handleChange} disabled={!canManageFees} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500">
                          <option value="PENDING">Pending</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="PAID">Paid</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {!canManageFees && (
                  <p className="text-xs text-amber-600 mt-2">Only accounts with fee management permissions can edit processing fees.</p>
                )}
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
              <h3 className="text-lg font-semibold text-gray-800">Checklist & Documents</h3>
              <div>
                <input
                  type="file"
                  id="doc-upload-other"
                  className="hidden"
                  onChange={(e) => {
                    const title = window.prompt("Enter a title for this document (e.g. Passport, ID):");
                    if (!title) {
                      e.target.value = null;
                      return;
                    }
                    handleFileUpload(e, title);
                  }}
                />
                <label
                  htmlFor="doc-upload-other"
                  className={`cursor-pointer px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors ${uploadingDoc ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {uploadingDoc ? 'Uploading...' : 'Add Other Document'}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {fixedDocumentTypes.map(docType => {
                 const existingDoc = documents.find(d => d.title === docType);
                 return (
                   <div key={docType} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded ${existingDoc ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {existingDoc ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              )}
                           </svg>
                         </div>
                         <div>
                           <p className={`font-medium ${existingDoc ? 'text-gray-800' : 'text-gray-500'}`}>{docType}</p>
                           {existingDoc && (
                             <p className="text-xs text-gray-500">Uploaded by {existingDoc.uploaded_by_name} on {new Date(existingDoc.uploaded_at).toLocaleDateString()}</p>
                           )}
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {existingDoc ? (
                          <>
                            <a 
                              href={existingDoc.file_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                            >
                              View
                            </a>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteDocument(existingDoc.id)}
                              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <input
                              type="file"
                              id={`doc-upload-${docType.replace(/\s+/g, '-')}`}
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, docType)}
                            />
                            <label
                              htmlFor={`doc-upload-${docType.replace(/\s+/g, '-')}`}
                              className={`cursor-pointer px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors ${uploadingDocType === docType ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              {uploadingDocType === docType ? 'Uploading...' : 'Upload'}
                            </label>
                          </>
                        )}
                      </div>
                   </div>
                 );
              })}
              
              {/* Other Documents */}
              {documents.filter(d => !fixedDocumentTypes.includes(d.title)).map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{doc.title} <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 ml-2">Other</span></p>
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
