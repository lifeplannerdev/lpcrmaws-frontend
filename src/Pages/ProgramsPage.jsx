import React, { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionsContext';
import Navbar from '../Components/layouts/Navbar';
import ProgramFormModal from '../Components/programs/ProgramFormModal';
import ShareProgramModal from '../Components/programs/ShareProgramModal';
import { 
  BookOpen, Search, Plus, Share2, Edit2, Trash2, Eye, EyeOff, 
  Globe, Clock, Calendar, IndianRupee, Layers, Building2, MapPin, 
  X, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import './ProgramsPage.css';

const ProgramsPage = () => {
  const { authFetch, apiBaseUrl } = useApi();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('All');

  const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  const canManage = hasPermission('programs:manage');

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/programs/`);
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.results || data || []);
      }
    } catch (err) {
      console.error('Error fetching programs', err);
      toast.error('Failed to load academic programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPrograms();
    }
  }, [apiBaseUrl, authFetch, user]);

  const handleAddClick = () => {
    setSelectedProgram(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (program) => {
    setSelectedProgram(program);
    setIsFormOpen(true);
  };

  const handleShareClick = (program) => {
    setSelectedProgram(program);
    setIsShareOpen(true);
  };

  const handleDeleteClick = async (programId) => {
    if (!window.confirm('Are you sure you want to delete this program? This action cannot be undone.')) return;
    
    try {
      const res = await authFetch(`${apiBaseUrl}/programs/${programId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Program deleted successfully');
        fetchPrograms();
      } else {
        toast.error('Failed to delete program');
      }
    } catch (err) {
      console.error('Error deleting program', err);
      toast.error('Error deleting program');
    }
  };

  const handleToggleVisibility = async (program) => {
    try {
      const res = await authFetch(`${apiBaseUrl}/programs/${program.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: !program.is_hidden })
      });
      if (res.ok) {
        toast.success(program.is_hidden ? 'Program is now visible' : 'Program hidden from view');
        fetchPrograms();
      }
    } catch (err) {
      console.error('Error toggling visibility', err);
      toast.error('Error toggling visibility');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      const url = selectedProgram 
        ? `${apiBaseUrl}/programs/${selectedProgram.id}/`
        : `${apiBaseUrl}/programs/`;
      const method = selectedProgram ? 'PUT' : 'POST';
      
      const res = await authFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setIsFormOpen(false);
        toast.success(selectedProgram ? 'Program updated successfully' : 'Program created successfully');
        fetchPrograms();
      } else {
        toast.error('Failed to save program.');
      }
    } catch (err) {
      console.error('Error saving program', err);
      toast.error('Error saving program');
    }
  };

  // Filter programs based on search, selected letter, and selected country
  const filteredPrograms = programs.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (p.title || '').toLowerCase().includes(q) || 
      (p.university || '').toLowerCase().includes(q) ||
      (p.country || '').toLowerCase().includes(q) ||
      (p.qualification || '').toLowerCase().includes(q);

    const matchesLetter = selectedLetter === 'All' || 
      (p.title || '').toUpperCase().startsWith(selectedLetter);

    const matchesCountry = selectedCountry === 'All' || 
      (p.country || 'Other') === selectedCountry;

    return matchesSearch && matchesLetter && matchesCountry;
  });

  // Group programs by country
  const programsByCountry = filteredPrograms.reduce((acc, curr) => {
    const country = curr.country || 'Other';
    if (!acc[country]) acc[country] = [];
    acc[country].push(curr);
    return acc;
  }, {});

  // Extract all unique countries from the full programs set for the filter dropdown
  const allUniqueCountries = Array.from(
    new Set(programs.map(p => p.country || 'Other'))
  ).filter(Boolean).sort();

  const displayedCountries = Object.keys(programsByCountry).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header & Action Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Academic Programs & Fees</h1>
              <p className="text-sm text-slate-500 mt-0.5">Explore institutional curriculum, intakes, qualification criteria, and fee structures.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search programs, colleges..." 
                className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Country Selector */}
            <div className="relative">
              <select 
                className="px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs pr-8 cursor-pointer"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
              >
                <option value="All">All Countries ({programs.length})</option>
                {allUniqueCountries.map(c => {
                  const count = programs.filter(p => (p.country || 'Other') === c).length;
                  return (
                    <option key={c} value={c}>{c} ({count})</option>
                  );
                })}
              </select>
            </div>

            {/* Add Program Button */}
            {canManage && (
              <button 
                onClick={handleAddClick}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add New Program
              </button>
            )}
          </div>
        </div>

        {/* Alphabet A-Z Filter Strip */}
        <div className="bg-white/80 backdrop-blur-xs border border-slate-200/80 rounded-2xl p-2 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 programs-scrollbar">
            <button 
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedLetter === 'All' 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              onClick={() => setSelectedLetter('All')}
            >
              All Letters
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1 flex-shrink-0" />
            {alphabet.map(letter => {
              const count = programs.filter(p => (p.title || '').toUpperCase().startsWith(letter)).length;
              const isActive = selectedLetter === letter;
              return (
                <button 
                  key={letter}
                  className={`w-7 h-7 flex-shrink-0 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' 
                      : count > 0 
                        ? 'text-slate-700 hover:bg-blue-50 hover:text-blue-700' 
                        : 'text-slate-300 hover:bg-slate-50 hover:text-slate-400'
                  }`}
                  onClick={() => setSelectedLetter(letter)}
                  title={`${count} program${count === 1 ? '' : 's'}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-sm">Loading academic curriculum and program fees...</p>
          </div>
        ) : displayedCountries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center shadow-sm max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Academic Programs Found</h3>
            <p className="text-sm text-slate-500 mb-6">
              No programs match your current search, country, or alphabetical filters.
            </p>
            <div className="flex items-center justify-center gap-3">
              {(searchQuery || selectedCountry !== 'All' || selectedLetter !== 'All') && (
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedCountry('All'); setSelectedLetter('All'); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
              {canManage && (
                <button 
                  onClick={handleAddClick}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  + Add First Program
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {displayedCountries.map(country => (
              <div key={country} className="space-y-4">
                {/* Country Heading */}
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">
                    {country}
                  </h2>
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
                    {programsByCountry[country].length} {programsByCountry[country].length === 1 ? 'Program' : 'Programs'}
                  </span>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {programsByCountry[country].map(program => {
                    const startingFee = program.fees_structure && program.fees_structure.length > 0
                      ? program.fees_structure[0]
                      : null;

                    return (
                      <div 
                        key={program.id} 
                        className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 group ${
                          program.is_hidden 
                            ? 'border-amber-200/80 bg-amber-50/10' 
                            : 'border-slate-200/80 hover:border-blue-300'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="p-5 border-b border-slate-100 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {program.title}
                            </h3>
                            {program.is_hidden && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">
                                <EyeOff className="w-3 h-3" />
                                Hidden
                              </span>
                            )}
                          </div>

                          {program.university && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80 max-w-full truncate">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{program.university}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Body */}
                        <div className="p-5 flex-1 space-y-3 text-sm text-slate-600">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Duration</span>
                                <span className="font-medium text-slate-700">{program.course_duration || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Intake</span>
                                <span className="font-medium text-slate-700">{program.intake || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Fee Highlight */}
                          {startingFee && (
                            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-100 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                                <IndianRupee className="w-3.5 h-3.5" />
                                <span>{startingFee.name || 'Starting Fee'}:</span>
                              </div>
                              <span className="font-bold text-blue-950 text-sm">{startingFee.amount}</span>
                            </div>
                          )}

                          {/* Services Preview badge */}
                          {program.services && program.services.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{program.services.length} inclusive service{program.services.length === 1 ? '' : 's'}</span>
                            </div>
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button 
                            onClick={() => handleShareClick(program)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Share
                          </button>

                          {canManage && (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleToggleVisibility(program)}
                                title={program.is_hidden ? "Show Program" : "Hide Program"}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer text-xs"
                              >
                                {program.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <button 
                                onClick={() => handleEditClick(program)}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(program.id)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Program Add / Edit Modal */}
      <ProgramFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedProgram}
      />
      
      {/* Share Program Modal */}
      <ShareProgramModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)}
        program={selectedProgram}
      />
    </div>
  );
};

export default ProgramsPage;
