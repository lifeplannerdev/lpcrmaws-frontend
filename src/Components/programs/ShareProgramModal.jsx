import React, { useState, useEffect } from 'react';
import { useApi } from '../../context/ApiContext';
import { useVoxbayCall } from '../../hooks/useVoxbayCall';
import { Share2, X, Search, Phone, Mail, MessageSquare, Copy, Check, Send, User } from 'lucide-react';
import toast from 'react-hot-toast';

const ShareProgramModal = ({ isOpen, onClose, program }) => {
  const { authFetch, apiBaseUrl } = useApi();
  const { callingNumber } = useVoxbayCall();
  const [leads, setLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [contactInfo, setContactInfo] = useState({
    phone: callingNumber || '',
    email: ''
  });

  const [message, setMessage] = useState('');

  // Generate initial template when program changes
  useEffect(() => {
    if (program) {
      const feesText = program.fees_structure && program.fees_structure.length > 0
        ? program.fees_structure.map(f => `• ${f.name}: ${f.amount}`).join('\n')
        : 'Contact for details';
        
      const servicesText = program.services && program.services.length > 0
        ? program.services.map(s => `✓ ${s}`).join('\n')
        : '';

      const template = `Hello,

Here are the details for the *${program.title}* program in *${program.country || 'N/A'}*.

🏛️ Institution: ${program.university || 'N/A'}
⏱️ Duration: ${program.course_duration || 'N/A'}
📅 Intake: ${program.intake || 'N/A'}

📋 Qualifications Required:
${program.qualification || 'N/A'}

💰 Fee Structure:
${feesText}
${servicesText ? `\n🎁 Services Included:\n${servicesText}\n` : ''}
Feel free to contact us if you have any questions or would like to proceed with your application!`;

      setMessage(template);
    }
  }, [program]);

  // Search leads
  useEffect(() => {
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
      const timeoutId = setTimeout(fetchLeads, 400);
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

  const handleClearLead = () => {
    setSelectedLead(null);
    setSearchQuery('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Message copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    if (!contactInfo.phone) {
      toast.error('Please enter a WhatsApp number.');
      return;
    }
    const cleanPhone = contactInfo.phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const shareViaEmail = () => {
    if (!contactInfo.email) {
      toast.error('Please enter an email address.');
      return;
    }
    const subject = encodeURIComponent(`Academic Program Details: ${program.title} (${program.country || ''})`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${contactInfo.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[90vh] flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="shrink-0 p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Share Program Details</h3>
              <p className="text-xs text-slate-500 truncate max-w-sm">{program.title} • {program.country}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Lead Search */}
          <div className="relative">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Search Lead (Auto-fill Contact)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search lead by name, phone or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
              />
              {selectedLead && (
                <button 
                  type="button" 
                  onClick={handleClearLead}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown search results */}
            {searchQuery.length > 2 && (!selectedLead || searchQuery !== selectedLead.name) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                {isSearching ? (
                  <div className="p-3 text-xs text-slate-500 text-center">Searching leads...</div>
                ) : leads.length > 0 ? (
                  leads.map(lead => (
                    <div 
                      key={lead.id} 
                      onClick={() => handleSelectLead(lead)}
                      className="p-3 hover:bg-blue-50/70 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {lead.name ? lead.name[0].toUpperCase() : 'L'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{lead.name}</div>
                          <div className="text-xs text-slate-500">{lead.phone || lead.email || 'No contact'}</div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/50">
                        {lead.status || 'Lead'}
                      </span>
                    </div>
                  ))
                ) : hasSearched ? (
                  <div className="p-3 text-xs text-slate-400 text-center">No leads found matching "{searchQuery}"</div>
                ) : null}
              </div>
            )}
          </div>

          {/* Contact Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                WhatsApp Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={contactInfo.phone} 
                  onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})} 
                  placeholder="+91..."
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="email" 
                  value={contactInfo.email} 
                  onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})} 
                  placeholder="student@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Customizable Message Preview
              </label>
              <button 
                type="button" 
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <textarea 
              rows="8" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 text-xs font-sans text-slate-800 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs resize-y leading-relaxed"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 text-sm transition-colors cursor-pointer text-center"
          >
            Close
          </button>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button 
              type="button" 
              onClick={shareViaWhatsApp}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-green-500/20 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              Share on WhatsApp
            </button>
            <button 
              type="button" 
              onClick={shareViaEmail}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareProgramModal;

