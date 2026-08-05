import React, { useState } from 'react';

export default function RemarkModal({ lead, onClose, onSubmit }) {
  const [newRemark, setNewRemark] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newRemark.trim()) return;
    onSubmit(lead, newRemark);
    setNewRemark('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h3 className="text-lg font-bold text-gray-800">Remarks for {lead?.name || 'Lead'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold text-2xl">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          {lead?.remarks ? (
            <div className="whitespace-pre-wrap text-sm text-gray-800 bg-white p-5 rounded border shadow-sm font-mono leading-relaxed">
              {lead.remarks}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic text-center py-8">No remarks yet.</div>
          )}
        </div>
        
        <div className="p-4 border-t bg-white rounded-b-lg">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              rows="3"
              placeholder="Type your new remark here..."
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={!newRemark.trim()} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 disabled:opacity-50">Add Remark</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
