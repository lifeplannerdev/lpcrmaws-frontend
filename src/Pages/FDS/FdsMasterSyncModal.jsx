import React, { useState, useRef } from 'react';
import { X, Upload, RefreshCw, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { fdsApi } from './fdsApi';

export default function FdsMasterSyncModal({ isOpen, onClose, onSyncComplete, authFetchJson, authFetch }) {
  const [wb1File, setWb1File] = useState(null);
  const [wb2File, setWb2File] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);

  if (!isOpen) return null;

  const handleUploadAndSync = async () => {
    if (!wb1File && !wb2File) {
      setError('Please select at least one downloaded Google Sheets Excel workbook (.xlsx).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      if (wb1File) fd.append('workbook1', wb1File);
      if (wb2File) fd.append('workbook2', wb2File);

      let res;
      if (authFetch) {
        const rawRes = await fdsApi.syncMasterSheets(authFetch, fd);
        const data = await rawRes.json().catch(() => ({}));
        if (!rawRes.ok) {
          throw new Error(data.error || data.detail || `Server error (${rawRes.status})`);
        }
        res = data;
      } else {
        res = await fdsApi.syncMasterSheets(authFetchJson, fd);
      }

      setResult(res);
      if (onSyncComplete) {
        onSyncComplete(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to sync workbooks to EC2.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setWb1File(null);
    setWb2File(null);
    setResult(null);
    setError(null);
    if (fileInputRef1.current) fileInputRef1.current.value = '';
    if (fileInputRef2.current) fileInputRef2.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <RefreshCw size={20} className={loading ? 'animate-spin text-amber-400' : ''} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Sync Master Google Sheets</h3>
              <p className="text-xs text-slate-400">Upload downloaded workbooks directly to your EC2 CRM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <CheckCircle2 size={18} />
                <span>{result.message || 'Sync successful!'}</span>
              </div>

              {result.stats && (
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-emerald-900/60">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Enquiries:</span> <strong className="text-amber-300">{result.stats.enquiries || 0}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Trials:</span> <strong className="text-amber-300">{result.stats.trials || 0}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Lead Sourcing:</span> <strong className="text-amber-300">{result.stats.lead_sourcing || 0}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Students:</span> <strong className="text-amber-300">{result.stats.students || 0}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Fee Structures:</span> <strong className="text-amber-300">{result.stats.fee_structures || 0}</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400">Fee Collections:</span> <strong className="text-amber-300">{result.stats.collections || 0}</strong>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
                >
                  Upload Again
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-300 leading-relaxed">
                Download your master workbooks from Google Sheets as <strong>.xlsx</strong> and select them below. The CRM server on EC2 will parse and mirror all sheets with zero data loss.
              </p>

              {/* Workbook 1 */}
              <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <FileSpreadsheet size={15} />
                    <span>Workbook 1: Enquiry, Trial & Lead Sourcing</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Sheets 1, 2, 3</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Matches file: <code>FDS KTM-ENQUIRY_ TRIAL-2026.xlsx</code>
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    ref={fileInputRef1}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => setWb1File(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef1.current?.click()}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Upload size={13} />
                    {wb1File ? 'Change File' : 'Choose File'}
                  </button>
                  <span className="text-xs truncate max-w-[280px] text-slate-300">
                    {wb1File ? wb1File.name : 'No file chosen'}
                  </span>
                  {wb1File && (
                    <button
                      type="button"
                      onClick={() => { setWb1File(null); if (fileInputRef1.current) fileInputRef1.current.value = ''; }}
                      className="text-slate-400 hover:text-red-400 text-xs ml-auto"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Workbook 2 */}
              <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <FileSpreadsheet size={15} />
                    <span>Workbook 2: Registration Details & Accounts</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Sheets 4, 5, 6</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Matches file: <code>FDS KTM-2026-JOINING DETAILS & ACCOUNTS...xlsx</code>
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    ref={fileInputRef2}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => setWb2File(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef2.current?.click()}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Upload size={13} />
                    {wb2File ? 'Change File' : 'Choose File'}
                  </button>
                  <span className="text-xs truncate max-w-[280px] text-slate-300">
                    {wb2File ? wb2File.name : 'No file chosen'}
                  </span>
                  {wb2File && (
                    <button
                      type="button"
                      onClick={() => { setWb2File(null); if (fileInputRef2.current) fileInputRef2.current.value = ''; }}
                      className="text-slate-400 hover:text-red-400 text-xs ml-auto"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        {!result && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/90">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUploadAndSync}
              disabled={loading || (!wb1File && !wb2File)}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Uploading & Syncing to EC2...</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>Upload & Sync to CRM</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
