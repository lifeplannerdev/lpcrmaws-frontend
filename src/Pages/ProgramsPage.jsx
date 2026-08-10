import React, { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { usePermissions } from '../context/PermissionsContext';
import ProgramFormModal from '../Components/programs/ProgramFormModal';
import ShareProgramModal from '../Components/programs/ShareProgramModal';
import './ProgramsPage.css';

const ProgramsPage = () => {
  const { authFetch, apiBaseUrl } = useApi();
  const { hasPermission } = usePermissions();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState('All');

  const canManage = hasPermission('programs:manage');

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/programs/`);
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.results || data);
      }
    } catch (err) {
      console.error('Error fetching programs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, [apiBaseUrl, authFetch]);

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
    if (!window.confirm('Are you sure you want to delete this program?')) return;
    
    try {
      const res = await authFetch(`${apiBaseUrl}/programs/${programId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchPrograms();
      }
    } catch (err) {
      console.error('Error deleting program', err);
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
        fetchPrograms();
      } else {
        alert('Failed to save program.');
      }
    } catch (err) {
      console.error('Error saving program', err);
    }
  };

  // Group programs by country
  const programsByCountry = programs.reduce((acc, curr) => {
    const country = curr.country || 'Other';
    if (!acc[country]) acc[country] = [];
    acc[country].push(curr);
    return acc;
  }, {});

  const allCountries = Object.keys(programsByCountry).sort();

  if (loading) {
    return <div className="programs-page loading">Loading programs...</div>;
  }

  return (
    <div className="programs-page">
      <div className="programs-header">
        <h1>Academic Programs & Fees Structure</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <select 
            className="form-select" 
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
          >
            <option value="All">All Countries</option>
            {allCountries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {canManage && (
            <button className="btn-add-main" onClick={handleAddClick}>
              + Add New Program
            </button>
          )}
        </div>
      </div>

      <div className="programs-content">
        {allCountries
          .filter(country => selectedCountry === 'All' || country === selectedCountry)
          .map(country => (
          <div key={country} className="country-section">
            <h2 className="country-title">{country.toUpperCase()}</h2>
            <div className="programs-grid">
              {programsByCountry[country].map(program => (
                <div key={program.id} className="program-card">
                  <div className="card-header">
                    <h3>{program.title}</h3>
                    {program.university && <span className="uni-badge">{program.university}</span>}
                  </div>
                  
                  <div className="card-body">
                    <p><strong>Duration:</strong> {program.course_duration || 'N/A'}</p>
                    <p><strong>Intake:</strong> {program.intake || 'N/A'}</p>
                    
                    {program.fees_structure && program.fees_structure.length > 0 && (
                      <div className="fee-highlight">
                        <strong>Starting from:</strong> {program.fees_structure[0].amount}
                      </div>
                    )}
                  </div>
                  
                  <div className="card-footer">
                    <button className="btn-share" onClick={() => handleShareClick(program)}>
                      Share
                    </button>
                    {canManage && (
                      <div className="admin-actions">
                        <button className="btn-edit" onClick={() => handleEditClick(program)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDeleteClick(program.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {programs.length === 0 && (
          <div className="no-programs">No programs found. Please add some.</div>
        )}
      </div>

      <ProgramFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedProgram}
      />
      
      <ShareProgramModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)}
        program={selectedProgram}
      />
    </div>
  );
};

export default ProgramsPage;
