import React, { useState, useEffect } from 'react';
import CreatableSelect from './CreatableSelect';
import { useApi } from '../../context/ApiContext';
import { X, Plus, Trash2, BookOpen, IndianRupee, Layers, CheckCircle2 } from 'lucide-react';

const ProgramFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { authFetch, apiBaseUrl } = useApi();
  const [countries, setCountries] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [intakes, setIntakes] = useState([]);

  const fetchOptions = async () => {
    try {
      const [cRes, uRes, iRes] = await Promise.all([
        authFetch(`${apiBaseUrl}/program-countries/`),
        authFetch(`${apiBaseUrl}/program-universities/`),
        authFetch(`${apiBaseUrl}/program-intakes/`)
      ]);
      if (cRes.ok) { const data = await cRes.json(); setCountries(data.results || data); }
      if (uRes.ok) { const data = await uRes.json(); setUniversities(data.results || data); }
      if (iRes.ok) { const data = await iRes.json(); setIntakes(data.results || data); }
    } catch (err) {
      console.error('Error fetching options:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen, apiBaseUrl]);

  const [formData, setFormData] = useState({
    title: '',
    country: '',
    qualification: '',
    course_duration: '',
    university: '',
    intake: '',
    fees_structure: [{ name: '', amount: '' }],
    services: ['']
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        country: initialData.country || '',
        qualification: initialData.qualification || '',
        course_duration: initialData.course_duration || '',
        university: initialData.university || '',
        intake: initialData.intake || '',
        fees_structure: initialData.fees_structure && initialData.fees_structure.length > 0 
          ? initialData.fees_structure 
          : [{ name: '', amount: '' }],
        services: initialData.services && initialData.services.length > 0 
          ? initialData.services 
          : ['']
      });
    } else {
      setFormData({
        title: '',
        country: '',
        qualification: '',
        course_duration: '',
        university: '',
        intake: '',
        fees_structure: [{ name: '', amount: '' }],
        services: ['']
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFeeChange = (index, field, value) => {
    const newFees = [...formData.fees_structure];
    newFees[index][field] = value;
    setFormData({ ...formData, fees_structure: newFees });
  };

  const handleServiceChange = (index, value) => {
    const newServices = [...formData.services];
    newServices[index] = value;
    setFormData({ ...formData, services: newServices });
  };

  const addFee = () => {
    setFormData({ ...formData, fees_structure: [...formData.fees_structure, { name: '', amount: '' }] });
  };

  const removeFee = (index) => {
    const newFees = formData.fees_structure.filter((_, i) => i !== index);
    setFormData({ ...formData, fees_structure: newFees });
  };

  const addService = () => {
    setFormData({ ...formData, services: [...formData.services, ''] });
  };

  const removeService = (index) => {
    const newServices = formData.services.filter((_, i) => i !== index);
    setFormData({ ...formData, services: newServices });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="shrink-0 p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {initialData ? 'Edit Academic Program' : 'Add New Academic Program'}
                </h3>
                <p className="text-xs text-slate-500">Configure program specifications, fee breakdowns, and inclusive services</p>
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

          {/* Form Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Program Title <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="title" 
                  placeholder="e.g. Master of Business Administration" 
                  value={formData.title} 
                  onChange={handleChange} 
                  required 
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
                />
              </div>
              <div>
                <CreatableSelect 
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  options={countries}
                  endpoint="program-countries"
                  onOptionAdded={(newOpt) => setCountries([...countries, newOpt])}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <CreatableSelect 
                  label="University / Institution"
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  options={universities}
                  endpoint="program-universities"
                  onOptionAdded={(newOpt) => setUniversities([...universities, newOpt])}
                />
              </div>
              <div>
                <CreatableSelect 
                  label="Intake Season"
                  name="intake"
                  value={formData.intake}
                  onChange={handleChange}
                  options={intakes}
                  endpoint="program-intakes"
                  onOptionAdded={(newOpt) => setIntakes([...intakes, newOpt])}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Course Duration
              </label>
              <input 
                type="text" 
                name="course_duration" 
                placeholder="e.g. 2 Years (4 Semesters) or 1 Year Fast-track" 
                value={formData.course_duration} 
                onChange={handleChange} 
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Qualification & Eligibility Criteria
              </label>
              <textarea 
                name="qualification" 
                placeholder="e.g. Bachelor's degree with min 55% marks. IELTS: 6.5 (no band less than 6.0)" 
                value={formData.qualification} 
                onChange={handleChange} 
                rows="3" 
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-xs resize-y"
              />
            </div>

            {/* Dynamic Fees Section */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fee Structure Breakdown</h4>
                </div>
                <button 
                  type="button" 
                  onClick={addFee}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Fee
                </button>
              </div>

              <div className="space-y-2.5">
                {formData.fees_structure.map((fee, index) => (
                  <div key={index} className="flex items-center gap-2.5">
                    <input 
                      type="text" 
                      placeholder="Fee Name (e.g. Tuition Fee / Registration)" 
                      value={fee.name} 
                      onChange={(e) => handleFeeChange(index, 'name', e.target.value)} 
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                    <input 
                      type="text" 
                      placeholder="Amount (e.g. $14,000 / ₹2,50,000)" 
                      value={fee.amount} 
                      onChange={(e) => handleFeeChange(index, 'amount', e.target.value)} 
                      className="w-44 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                    <button 
                      type="button" 
                      onClick={() => removeFee(index)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove fee"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Services Section */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Services Included</h4>
                </div>
                <button 
                  type="button" 
                  onClick={addService}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Service
                </button>
              </div>

              <div className="space-y-2.5">
                {formData.services.map((service, index) => (
                  <div key={index} className="flex items-center gap-2.5">
                    <input 
                      type="text" 
                      placeholder="Service description (e.g. Free Visa Guidance & Airport Pickup)" 
                      value={service} 
                      onChange={(e) => handleServiceChange(index, e.target.value)} 
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                    />
                    <button 
                      type="button" 
                      onClick={() => removeService(index)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove service"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-xl font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {initialData ? 'Update Program' : 'Save Program'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProgramFormModal;

