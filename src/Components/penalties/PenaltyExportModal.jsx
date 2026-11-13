import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  FileText,
  Calendar,
  Users,
  Building2,
  Search,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import {
  COMPANY_OPTIONS,
  MONTHS_LIST,
  filterPenaltiesForExport,
  buildPeriodLabel,
  buildCompanyScopeLabel,
  exportPenaltiesToExcel,
  exportPenaltiesToPDF,
  printPenaltiesReport,
  getPenaltyUserId,
  getPenaltyCompany,
} from '../../utils/penaltyExport';

export default function PenaltyExportModal({
  isOpen,
  onClose,
  penalties = [],
  employees = [],
  company = 'LP',
  getEmployeeName,
  fetchAllPenalties,
  initialMonth = '',
  initialEmployee = '',
}) {
  const initialYear = initialMonth ? initialMonth.split('-')[0] : String(new Date().getFullYear());
  const initialMonthPart = initialMonth ? initialMonth.split('-')[1] : '';

  const [allPenalties, setAllPenalties] = useState(null);
  const [loadingAll, setLoadingAll] = useState(false);

  const [companyScope, setCompanyScope] = useState('single');
  const [singleCompany, setSingleCompany] = useState(company || 'LP');
  const [selectedCompanies, setSelectedCompanies] = useState([company || 'LP']);

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

  useEffect(() => {
    if (!isOpen) return;
    setSingleCompany(company || 'LP');
    setSelectedCompanies([company || 'LP']);
    if (fetchAllPenalties) {
      let cancelled = false;
      setLoadingAll(true);
      fetchAllPenalties()
        .then((list) => {
          if (!cancelled && Array.isArray(list)) {
            setAllPenalties(list);
          }
        })
        .catch((err) => {
          console.error('Failed to load cross-company penalties for export:', err);
        })
        .finally(() => {
          if (!cancelled) setLoadingAll(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [isOpen, company, fetchAllPenalties]);

  const sourcePenalties = allPenalties ?? penalties;

  const activeCompanySet = useMemo(() => {
    if (companyScope === 'all') return null;
    if (companyScope === 'single') return new Set([String(singleCompany).toUpperCase()]);
    return new Set(selectedCompanies.map((c) => String(c).toUpperCase()));
  }, [companyScope, singleCompany, selectedCompanies]);

  const scopedEmployeeOptions = useMemo(() => {
    const map = new Map();
    const matchesCompany = (comp) => {
      if (!activeCompanySet) return true;
      return activeCompanySet.has(String(comp || '').toUpperCase());
    };

    employees.forEach((emp) => {
      const empComp = (emp.company || '').toUpperCase();
      if (!matchesCompany(empComp)) return;
      const baseName = emp.full_name || emp.username || `Employee #${emp.id}`;
      map.set(emp.id, {
        id: emp.id,
        company: empComp,
        label: companyScope === 'single' ? baseName : `${baseName}${empComp ? ` (${empComp})` : ''}`,
      });
    });

    sourcePenalties.forEach((p) => {
      const uId = getPenaltyUserId(p);
      const pComp = getPenaltyCompany(p);
      if (!uId || !matchesCompany(pComp) || map.has(uId)) return;
      const baseName =
        p.user_name || p.user_details?.full_name || p.user_details?.username || `Employee #${uId}`;
      map.set(uId, {
        id: uId,
        company: pComp,
        label:
          companyScope === 'single'
            ? `${baseName} (Inactive)`
            : `${baseName}${pComp ? ` (${pComp})` : ''} (Inactive)`,
      });
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [employees, sourcePenalties, activeCompanySet, companyScope]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set([String(new Date().getFullYear())]);
    sourcePenalties.forEach((p) => {
      const y = (p.month || p.date || '').slice(0, 4);
      if (/^\d{4}$/.test(y)) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [sourcePenalties]);

  const filteredEmployeeOptions = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return scopedEmployeeOptions;
    return scopedEmployeeOptions.filter((emp) => emp.label.toLowerCase().includes(term));
  }, [scopedEmployeeOptions, employeeSearch]);

  const filters = useMemo(
    () => ({
      companyScope,
      singleCompany,
      selectedCompanies,
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
    [
      companyScope,
      singleCompany,
      selectedCompanies,
      dateMode,
      year,
      month,
      specificDate,
      startDate,
      endDate,
      employeeScope,
      singleEmployeeId,
      selectedEmployeeIds,
    ]
  );

  const matchedPenalties = useMemo(
    () => filterPenaltiesForExport(sourcePenalties, filters),
    [sourcePenalties, filters]
  );

  const totalAmount = useMemo(
    () => matchedPenalties.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    [matchedPenalties]
  );

  const companyLabel = useMemo(() => buildCompanyScopeLabel(filters), [filters]);
  const periodLabel = useMemo(() => buildPeriodLabel(filters), [filters]);

  const employeeScopeLabel = useMemo(() => {
    if (employeeScope === 'all') return 'All Staff';
    if (employeeScope === 'single') {
      const emp = scopedEmployeeOptions.find((e) => String(e.id) === String(singleEmployeeId));
      return emp ? emp.label : 'Single Employee';
    }
    return `${selectedEmployeeIds.length} Selected Staff`;
  }, [employeeScope, singleEmployeeId, selectedEmployeeIds, scopedEmployeeOptions]);

  if (!isOpen) return null;

  const toggleCompany = (key) => {
    setSelectedCompanies((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

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

  const resolveEmployeeName = (uId, p) => {
    if (p?.user_name) return p.user_name;
    if (p?.user_details?.full_name) return p.user_details.full_name;
    if (p?.user_details?.username) return p.user_details.username;
    return getEmployeeName ? getEmployeeName(uId, p) : `Employee #${uId}`;
  };

  const handleExcel = () => {
    setErrorMsg('');
    try {
      setExportingType('excel');
      exportPenaltiesToExcel({
        penalties: matchedPenalties,
        company: companyLabel,
        periodLabel,
        employeeScopeLabel,
        getEmployeeName: resolveEmployeeName,
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
        company: companyLabel,
        periodLabel,
        employeeScopeLabel,
        getEmployeeName: resolveEmployeeName,
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
        company: companyLabel,
        periodLabel,
        employeeScopeLabel,
        getEmployeeName: resolveEmployeeName,
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
                Filter by company, period & staff, then export as Excel, PDF, or Print
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
        <div className="p-6 overflow-y-auto space-y-5">
          {/* 1. Company Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>1. Select Company</span>
              </div>
              {loadingAll && (
                <span className="text-xs text-indigo-600 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading all companies...
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All Companies' },
                { id: 'single', label: 'Single Company' },
                { id: 'multiple', label: 'Multiple Companies' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCompanyScope(opt.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    companyScope === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {companyScope === 'single' && (
              <div className="grid grid-cols-3 gap-2">
                {COMPANY_OPTIONS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSingleCompany(c.key)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      singleCompany === c.key
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-500 ring-1 ring-indigo-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {companyScope === 'multiple' && (
              <div className="grid grid-cols-3 gap-2">
                {COMPANY_OPTIONS.map((c) => {
                  const checked = selectedCompanies.includes(c.key);
                  return (
                    <label
                      key={c.key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                        checked
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCompany(c.key)}
                        className="sr-only"
                      />
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                      <span>{c.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Date / Period Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>2. Select Period</span>
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

          {/* 3. Employee Scope Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>3. Select Staff / Employees</span>
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
                  {scopedEmployeeOptions.map((emp) => (
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

          {/* 4. Live Preview Summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  Export Summary
                </p>
                <p className="text-sm text-gray-700 mt-0.5">
                  <span className="font-semibold">{matchedPenalties.length}</span>{' '}
                  {matchedPenalties.length === 1 ? 'record' : 'records'} • {companyLabel} • {periodLabel} •{' '}
                  {employeeScopeLabel}
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
                      <th className="px-3 py-1.5 text-left">Company</th>
                      <th className="px-3 py-1.5 text-left">Employee</th>
                      <th className="px-3 py-1.5 text-left">Act / Reason</th>
                      <th className="px-3 py-1.5 text-right">Amount</th>
                      <th className="px-3 py-1.5 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {matchedPenalties.slice(0, 8).map((p) => {
                      const uId = getPenaltyUserId(p);
                      const name = resolveEmployeeName(uId, p);
                      return (
                        <tr key={p.id}>
                          <td className="px-3 py-1.5 font-semibold text-indigo-700 whitespace-nowrap">
                            {getPenaltyCompany(p) || '-'}
                          </td>
                          <td className="px-3 py-1.5 font-medium text-gray-800 whitespace-nowrap">{name}</td>
                          <td className="px-3 py-1.5 text-gray-600 truncate max-w-[200px]">{p.act}</td>
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
