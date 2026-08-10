import React, { useState, useEffect } from 'react';
import { useApi } from '../../context/ApiContext';
import { useVoxbayCall } from '../../hooks/useVoxbayCall';
import './ProgramFormModal.css'; // Reusing some modal styles

const ShareProgramModal = ({ isOpen, onClose, program }) => {
  const { authFetch, apiBaseUrl } = useApi();
  const { callingNumber } = useVoxbayCall(); // If there is an active call in this context
  const [leads, setLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [contactInfo, setContactInfo] = useState({
    phone: callingNumber || '',
    email: ''
  });

  const [message, setMessage] = useState('');

  // Generate initial template when program changes
  useEffect(() => {
    if (program) {
      const feesText = program.fees_structure && program.fees_structure.length > 0
        ? program.fees_structure.map(f => `- ${f.name}: ${f.amount}`).join('\n')
        : 'Contact for details';
        
      const servicesText = program.services && program.services.length > 0
        ? program.services.map(s => `✓ ${s}`).join('\n')
        : '';

      const template = `Hello,

Here are the details for the ${program.title} program in ${program.country}.

Institution: ${program.university || 'N/A'}
Duration: ${program.course_duration || 'N/A'}
Intake: ${program.intake || 'N/A'}

Qualifications Required:
${program.qualification || 'N/A'}

Fee Structure:
${feesText}

Services Included:
${servicesText}

Please let me know if you have any questions!`;

      setMessage(template);
    }
  }, [program]);

  // Search leads
  useEffect(() => {
    // Do not search if the query exactly matches the selected lead's name
    if (searchQuery.length > 2 && (!selectedLead || searchQuery !== selectedLead.name)) {
      setIsSearching(true);
      const fetchLeads = async () => {
        try {
          const res = await authFetch(`${apiBaseUrl}/leads/?search=${searchQuery}`);
          if (res.ok) {
            const data = await res.json();
            setLeads(data.results || data);
            setHasSearched(true);
          }
        } catch (err) {
          console.error('Error fetching leads:', err);
        } finally {
          setIsSearching(false);
        }
      };
      const timeoutId = setTimeout(fetchLeads, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setLeads([]);
      setHasSearched(false);
      setIsSearching(false);
    }
  }, [searchQuery, apiBaseUrl, authFetch, selectedLead]);

  if (!isOpen || !program) return null;

  const handleSelectLead = (lead) => {
    setSelectedLead(lead);
    setContactInfo({
      phone: lead.phone || '',
      email: lead.email || ''
    });
    setSearchQuery(lead.name);
    setLeads([]);
  };

  const shareViaWhatsApp = () => {
    if (!contactInfo.phone) {
      alert('Please enter a phone number to share via WhatsApp.');
      return;
    }
    const cleanPhone = contactInfo.phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const shareViaEmail = () => {
    if (!contactInfo.email) {
      alert('Please enter an email address to share via Email.');
      return;
    }
    const subject = encodeURIComponent(`Details for ${program.title} - ${program.country}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${contactInfo.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content program-modal">
        <h2>Share Program: {program.title}</h2>
        
        <div className="share-section program-form">
          <div className="form-group" style={{position: 'relative'}}>
            <label>Search Existing Lead (Optional)</label>
            <input 
              type="text" 
              style={{ padding: '10px' }}
              placeholder="Search by name, email, or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery.length > 2 && (!selectedLead || searchQuery !== selectedLead.name) && (
              <ul className="lead-dropdown" style={{
                position: 'absolute', top: '100%', left: 0, right: 0, 
                background: 'white', border: '1px solid #ccc', zIndex: 1000,
                maxHeight: '150px', overflowY: 'auto', listStyle: 'none', padding: 0, margin: 0,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                {isSearching ? (
                  <li style={{padding: '8px', color: '#666'}}>Searching...</li>
                ) : leads.length > 0 ? (
                  leads.map(lead => (
                    <li 
                      key={lead.id} 
                      onClick={() => handleSelectLead(lead)}
                      style={{padding: '8px', borderBottom: '1px solid #eee', cursor: 'pointer'}}
                    >
                      <strong>{lead.name}</strong> - {lead.phone}
                    </li>
                  ))
                ) : hasSearched ? (
                  <li style={{padding: '8px', color: '#666'}}>No leads found.</li>
                ) : null}
              </ul>
            )}
          </div>

          <div className="form-row" style={{marginTop: '15px'}}>
            <div className="form-group">
              <label>WhatsApp Number</label>
              <input 
                type="text" 
                value={contactInfo.phone} 
                onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})} 
                placeholder="+91..."
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                value={contactInfo.email} 
                onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})} 
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="form-group" style={{marginTop: '15px'}}>
            <label>Message Preview (Edit before sending)</label>
            <textarea 
              rows="10" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              style={{width: '100%'}}
            />
          </div>
        </div>

        <div className="modal-actions" style={{justifyContent: 'space-between', marginTop: '20px'}}>
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <div style={{display: 'flex', gap: '10px'}}>
            <button className="btn-submit" style={{background: '#25D366'}} onClick={shareViaWhatsApp}>
              Share via WhatsApp
            </button>
            <button className="btn-submit" onClick={shareViaEmail}>
              Share via Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareProgramModal;
