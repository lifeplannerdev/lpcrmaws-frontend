import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import Navbar from '../Components/layouts/Navbar';
import { Plus } from 'lucide-react';
import StatsCards from '../Components/students/StatsCards';
import StudentsSearchFilters from '../Components/students/StudentsSearchFilters';
import StudentGrid from '../Components/students/StudentGrid';
import Pagination from '../Components/common/Pagination';
import { BATCH_CHOICES } from '../Components/utils/studentConstants';
import { downloadCSV, downloadPDF } from '../utils/exportUtils';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function StudentsPage() {
  const navigate = useNavigate();
  const { accessToken, refreshAccessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canEditStudents = hasPermission('students:edit_any') || hasPermission('students:edit_tenant') || hasPermission('students:edit_own');

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef(null);

  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [branches, setBranches] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 when search changes
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);

      let token = accessToken;
      if (!token) token = await refreshAccessToken();
      if (!token) return;

      // Build params object
      const params = {
        page,
        page_size: 50, // Request 50 items per page
      };

      // Add search if present
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      // Add batch filter if not "all"
      if (filterCourse !== "all") {
        params.batch = filterCourse;
      }

      // Add status filter if not "all" - convert to uppercase
      if (filterStatus !== "all") {
        params.status = filterStatus.toUpperCase();
      }

      // Add branch filter if not "all"
      if (filterBranch !== "all") {
        params.branch_id = filterBranch;
      }

      const res = await axios.get(`${API_BASE_URL}/students/`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      // Get students from response
      const studentsData = res.data.results || res.data;
      setStudents(studentsData);

      // Calculate total pages based on 50 items per page
      const totalCount = res.data.count || studentsData.length || 0;
      setTotalPages(Math.ceil(totalCount / 50));
    } catch (err) {
      console.error("Failed to load students", err);
      console.error("Error details:", err.response?.data);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken, debouncedSearch, filterCourse, filterStatus, filterBranch, page]);

  useEffect(() => {
    // Fetch branches
    const fetchBranches = async () => {
      try {
        let token = accessToken;
        if (!token) return;
        const res = await axios.get(`${API_BASE_URL}/branches/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBranches(res.data || []);
      } catch (err) {
        console.error('Failed to load branches', err);
      }
    };
    if (accessToken) {
      fetchBranches();
    }
    fetchStudents();
  }, [fetchStudents, accessToken]);

  // Handle student deletion
  const handleStudentDeleted = useCallback((deletedStudentId) => {
    // Remove the deleted student from the local state
    setStudents(prev => prev.filter(student => student.id !== deletedStudentId));
    
    // Optionally refetch to ensure data is in sync
    // fetchStudents();
  }, []);

  const handleExportCSV = () => {
    const data = students.map(s => ({
      ID: s.id,
      Name: s.name,
      Phone: s.phone,
      Course: s.course,
      Branch: s.branch_name || 'N/A',
      Status: s.status,
      Balance: s.balance_amount
    }));
    downloadCSV(data, 'students_export.csv');
  };

  const handleExportPDF = () => {
    const el = document.getElementById('students-exportable-view');
    if (el) downloadPDF(el, 'students_export.pdf');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Students Management
              </h1>
              <p className="text-gray-600 text-lg">Manage student enrollments and track progress</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all text-sm"
              >
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all text-sm"
              >
                PDF
              </button>
              {canEditStudents && (
                <button 
                  onClick={() => navigate('/students/add')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
                >
                  <Plus size={20} />
                  Add New Student
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Status Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'all', label: 'All Students' },
              { id: 'active', label: 'Active' },
              { id: 'paused', label: 'Paused' },
              { id: 'dropped', label: 'Dropped' },
              { id: 'completed', label: 'Completed' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setFilterStatus(tab.id); setPage(1); }}
                className={`
                  whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${filterStatus === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search & Filters */}
        <StudentsSearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterCourse={filterCourse}
          setFilterCourse={setFilterCourse}
          filterBranch={filterBranch}
          setFilterBranch={setFilterBranch}
          courses={BATCH_CHOICES} 
          branches={branches}
        />

        {/* Student Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading students…</div>
        ) : (
          <div id="students-exportable-view">
            <StudentGrid 
              students={students} 
              onStudentDeleted={handleStudentDeleted}
            />
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination 
            currentPage={page} 
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-8"
          />
        )}
      </div>
    </div>
  );
}