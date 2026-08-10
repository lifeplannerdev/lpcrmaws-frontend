import React, { useState, useEffect } from 'react';
import './ProgramFormModal.css';

const ProgramFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
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
    <div className="modal-overlay">
      <div className="modal-content program-modal">
        <h2>{initialData ? 'Edit Program' : 'Add Program'}</h2>
        <form onSubmit={handleSubmit} className="program-form">
          <div className="form-row">
            <div className="form-group">
              <label>Title (Program Name)</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input type="text" name="country" value={formData.country} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>University / College</label>
              <input type="text" name="university" value={formData.university} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Intake</label>
              <input type="text" name="intake" value={formData.intake} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Course Duration</label>
              <input type="text" name="course_duration" value={formData.course_duration} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Qualification Requirements</label>
            <textarea name="qualification" value={formData.qualification} onChange={handleChange} rows="3" />
          </div>

          <div className="dynamic-section">
            <div className="section-header">
              <h3>Fees Structure</h3>
              <button type="button" className="btn-add" onClick={addFee}>+ Add Fee</button>
            </div>
            {formData.fees_structure.map((fee, index) => (
              <div key={index} className="fee-row">
                <input 
                  type="text" 
                  placeholder="Fee Name (e.g. Application Fee)" 
                  value={fee.name} 
                  onChange={(e) => handleFeeChange(index, 'name', e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="Amount" 
                  value={fee.amount} 
                  onChange={(e) => handleFeeChange(index, 'amount', e.target.value)} 
                />
                <button type="button" className="btn-remove" onClick={() => removeFee(index)}>X</button>
              </div>
            ))}
          </div>

          <div className="dynamic-section">
            <div className="section-header">
              <h3>Services Included</h3>
              <button type="button" className="btn-add" onClick={addService}>+ Add Service</button>
            </div>
            {formData.services.map((service, index) => (
              <div key={index} className="service-row">
                <input 
                  type="text" 
                  placeholder="Service description" 
                  value={service} 
                  onChange={(e) => handleServiceChange(index, e.target.value)} 
                />
                <button type="button" className="btn-remove" onClick={() => removeService(index)}>X</button>
              </div>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit">Save Program</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProgramFormModal;
