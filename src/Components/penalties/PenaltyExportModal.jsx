import { useMemo, useState } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  FileText,
  Calendar,
  Users,
  Search,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import {
  MONTHS_LIST,
  filterPenaltiesForExport,
  buildPeriodLabel,
  exportPenaltiesToExcel,
  exportPenaltiesToPDF,
  printPenaltiesReport,
  getPenaltyUserId,
} from '../../utils/penaltyExport';

export default function PenaltyExportModal({
  isOpen,
  onClose,
  penalties = [],
  employeeOptions = [],
  company = 'LP',
  getEmployeeName,
  initialMonth = '',
  initialEmployee = '',
}) {
  const initialYear = initialMonth ? initialMonth.split('-')[0] : String(new Date().getFullYear());
  const initialMonthPart = initialMonth ? initialMonth.split('-')[1] : '';

  const [dateMode, setDateMode] = useState(initialMonth ? 'month_year' : 'all');
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonthPart);
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [employeeScope, setEmployeeScope] = useState(initialEmployee ? 'single' : 'all');
  const [singleEmployeeId, setSingleEmployeeId] = useState(initialEmployee ? String(initialEmployee) : '');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [exportingType, setExportingType] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const availableYears = useMemo(() => {
    const yearsSet = new Set([String(new Date().getFullYear())]);
    penalties.forEach((p) => {
      const y = (p.month || p.date || '').slice(0, 4);
      if (/^\d{4}$/.test(y)) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [penalties]);

  const filteredEmployeeOptions = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return employeeOptions;
    return employeeOptions.filter((emp) => emp.label.toLowerCase().includes(term));
  }, [employeeOptions, employeeSearch]);

  const filters = useMemo(
    () => ({
      dateMode,
      year,
      month,
      specificDate,
      startDate,
      endDate,
      employeeScope,
      singleEmployeeId,
      selectedEmployeeIds,
    }),
    [dateMode, year, month, specificDate, startDate, endDate, employeeScope, singleEmployeeId, selectedEmployeeIds]
  );

  const matchedPenalties = useMemo(
    () => filterPenaltiesForExport(penalties, filters),
    [penalties, filters]
  );

  const totalAmount = useMemo(
    () => matchedPenalties.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    [matchedPenalties]
  );

  const periodLabel = useMemo(() => buildPeriodLabel(filters), [filters]);

  const employeeScopeLabel = useMemo(() => {
    if (employeeScope === 'all') return 'All Staff';
    if (employeeScope === 'single') {
      const emp = employeeOptions.find((e) => String(e.id) === String(singleEmployeeId));
      return emp ? emp.label : 'Single Employee';
    }
    return `${selectedEmployeeIds.length} Selected Staff`;
  }, [employeeScope, singleEmployeeId, selectedEmployeeIds, employeeOptions]);

  if (!isOpen) return null;

  const toggleMultiEmployee = (id) => {
    const strId = String(id);
    setSelectedEmployeeIds((prev) =>
      prev.includes(strId) ? prev.filter((item) => item !== strId) : [...prev, strId]
    );
  };

  const selectAllVisibleEmployees = () => {
    const visibleIds = filteredEmployeeOptions.map((e) => String(e.id));
    setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearSelectedEmployees = () => {
    setSelectedEmployeeIds([]);
  };

  const handleExcel = () => {
    setErrorMsg('');
    try {
      setExportingType('excel');
      exportPenaltiesToExcel({
        penalties: matchedPenalties,
        company,
        periodLabel,
        employeeScopeLabel,
        getEmployeeName,
      });
    } catch (err) {
      console.error('Excel export failed:', err);
      setErrorMsg(err.message || 'Failed to export Excel');
    } finally {
      setExportingType('');
    }
  };

  const handlePDF = async () => {
    setErrorMsg('');
    try {
      setExportingType('pdf');
      await exportPenaltiesToPDF({
        penalties: matchedPenalties,
        company,
        periodLabel,
        employeeScopeLabel,
        getEmployeeName,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      setErrorMsg(err.message || 'Failed to export PDF');
    } finally {
      setExportingType('');
    }
  };

  const handlePrint = () => {
    setErrorMsg('');
    try {
      printPenaltiesReport({
        penalties: matchedPenalties,
        company,
        periodLabel,
        employeeScopeLabel,
        getEmployeeName,
      });
    } catch (err) {
      console.error('Print failed:', err);
      setErrorMsg(err.message || 'Failed to open print dialog');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Print & Export Penalties</h2>
              <p className="text-indigo-100 text-xs mt-0.5">
                Company: {company} • Filter by period & staff, then export as Excel, PDF, or Print
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. Date / Period Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>1. Select Period</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'month_year', label: 'Month / Year' },
                { id: 'date', label: 'Specific Date' },
                { id: 'range', label: 'Custom Range' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDateMode(opt.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    dateMode === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {dateMode === 'month_year' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Years</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Months</option>
                    {MONTHS_LIST.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {dateMode === 'date' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Select Date</label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {dateMode === 'range' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Employee Scope Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>2. Select Staff / Employees</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All Staff' },
                { id: 'single', label: 'Single Employee' },
                { id: 'multiple', label: 'Multiple Employees' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setEmployeeScope(opt.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    employeeScope === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {employeeScope === 'single' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Employee</label>
                <select
                  value={singleEmployeeId}
                  onChange={(e) => setSingleEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose an employee --</option>
                  {employeeOptions.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {employeeScope === 'multiple' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Search employees..."
                      className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllVisibleEmployees}
                      className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-100"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearSelectedEmployees}
                      className="px-2.5 py-1.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Clear ({selectedEmployeeIds.length})
                    </button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {filteredEmployeeOptions.length === 0 ? (
                    <p className="p-3 text-xs text-gray-500 text-center">No matching employees</p>
                  ) : (
                    filteredEmployeeOptions.map((emp) => {
                      const checked = selectedEmployeeIds.includes(String(emp.id));
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-indigo-50/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMultiEmployee(emp.id)}
                            className="sr-only"
                          />
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                          <span className="text-gray-800 truncate">{emp.label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Live Preview Summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  Export Summary
                </p>
                <p className="text-sm text-gray-700 mt-0.5">
                  <span className="font-semibold">{matchedPenalties.length}</span>{' '}
                  {matchedPenalties.length === 1 ? 'record' : 'records'} • {periodLabel} • {employeeScopeLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-700 font-medium">Total Penalty</p>
                <p className="text-xl font-bold text-red-700">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>

            {matchedPenalties.length > 0 && (
              <div className="mt-3 max-h-32 overflow-y-auto bg-white rounded-lg border border-indigo-100">
                <table className="w-full text-xs">
                  <thead className="bg-indigo-50/70 text-gray-600 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Employee</th>
                      <th className="px-3 py-1.5 text-left">Act / Reason</th>
                      <th className="px-3 py-1.5 text-right">Amount</th>
                      <th className="px-3 py-1.5 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {matchedPenalties.slice(0, 8).map((p) => {
                      const uId = getPenaltyUserId(p);
                      const name = getEmployeeName ? getEmployeeName(uId, p) : p.user_name;
                      return (
                        <tr key={p.id}>
                          <td className="px-3 py-1.5 font-medium text-gray-800 whitespace-nowrap">{name}</td>
                          <td className="px-3 py-1.5 text-gray-600 truncate max-w-[240px]">{p.act}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-red-600 whitespace-nowrap">
                            ₹{(parseFloat(p.amount) || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-500 whitespace-nowrap">{p.date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {matchedPenalties.length > 8 && (
                  <p className="text-[11px] text-center text-gray-500 py-1 bg-gray-50">
                    + {matchedPenalties.length - 8} more records will be included in the export
                  </p>
                )}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExcel}
              disabled={matchedPenalties.length === 0 || !!exportingType}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center gap-2 transition-colors shadow-sm"
            >
              {exportingType === 'excel' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Export Excel
            </button>

            <button
              type="button"
              onClick={handlePDF}
              disabled={matchedPenalties.length === 0 || !!exportingType}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center gap-2 transition-colors shadow-sm"
            >
              {exportingType === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Export PDF
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={matchedPenalties.length === 0 || !!exportingType}
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center gap-2 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
